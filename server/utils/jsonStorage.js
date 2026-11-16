/**
 * @file Rôle : Moteur de persistance SQLite natif (`node:sqlite` en mode WAL) avec migration automatique des anciens fichiers JSON et cache d'annuaire.
 * Dépendances : `node:fs`, `node:path`, `node:sqlite`, `./validators.js`.
 * Effets de bord : Création/ouverture de `data/wikicards.db` (WAL), migration unique des anciens JSON et requêtes SQL transactionnelles.
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  sanitizeCode,
  isValidUserCode,
  toPublicUserId,
  isPublicUserId,
} from './validators.js';

const memoryLocks = new Map();
let directoryCacheInvalidator = null;

export const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data');

export const usersDir = path.join(dataDir, 'users');
export const dbFile = path.join(dataDir, 'wikicards.db');
export const tradesFile = path.join(dataDir, 'trades.json');
export const marketFile = path.join(dataDir, 'market.json');

let dbInstance = null;
let cachedSummaries = null;
let transactionDepth = 0;

/**
 * Enregistre une fonction de rappel appelée lors de la modification d'un profil joueur pour vider le cache d'annuaire.
 * @param {() => void} fn - Fonction d'invalidation
 */
export function registerDirectoryCacheInvalidator(fn) {
  directoryCacheInvalidator = fn;
}

/**
 * Déclenche l'invalidation du cache d'annuaire des utilisateurs.
 */
export function triggerDirectoryCacheInvalidation() {
  cachedSummaries = null;
  if (typeof directoryCacheInvalidator === 'function') {
    try {
      directoryCacheInvalidator();
    } catch {
      // Ignorer toute erreur d'invalidation
    }
  }
}

/**
 * Exécute une fonction asynchrone sous un verrou de concurrence exclusif basé sur une clé (file d'attente FIFO).
 *
 * @template T
 * @param {string} lockKey - Clé d'identification du verrou (ex: 'market', 'trades')
 * @param {() => Promise<T>} asyncFn - Fonction asynchrone à exécuter en exclusion mutuelle
 * @returns {Promise<T>} Résultat de la fonction asynchrone
 */
export async function withLock(lockKey, asyncFn) {
  const prevPromise = memoryLocks.get(lockKey) || Promise.resolve();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const currentPromise = prevPromise.then(
    () => gate,
    () => gate
  );
  memoryLocks.set(lockKey, currentPromise);

  try {
    await prevPromise;
  } catch {
    // Ignorer l'erreur d'une opération précédente dans la file d'attente
  }

  try {
    return await asyncFn();
  } finally {
    release();
    if (memoryLocks.get(lockKey) === currentPromise) {
      memoryLocks.delete(lockKey);
    }
  }
}

/**
 * Assure que le répertoire `data/` existe sur le disque.
 */
export function ensureDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Construit le résumé léger d'annuaire d'un joueur pour la route `GET /api/users`.
 * Pré-calculé à la sauvegarde pour éviter de désérialiser toutes les collections lors des requêtes communautaires.
 *
 * @param {object} userObj - Objet compte joueur complet
 * @returns {object} Résumé statistique et vitrine pour l'annuaire
 */
export function buildUserDirectorySummary(userObj) {
  const cleanCode = sanitizeCode(userObj?.code);
  const col = Array.isArray(userObj?.collection) ? userObj.collection : [];
  const showcaseIds = Array.isArray(userObj?.profile?.showcaseIds)
    ? userObj.profile.showcaseIds
    : [];
  const showcaseCards = showcaseIds
    .map((id) =>
      id && id !== 'null'
        ? col.find((c) => String(c.id) === String(id)) || null
        : null
    )
    .filter(Boolean);

  const rawShelves =
    Array.isArray(userObj?.profile?.shelves) && userObj.profile.shelves.length > 0
      ? userObj.profile.shelves
      : [
          {
            id: 'shelf-1',
            name: 'Vitrine du collectionneur',
            cardIds: showcaseIds,
          },
        ];

  const resolvedShelves = rawShelves.slice(0, 4).map((shelf, idx) => {
    const cardIds = [0, 1, 2, 3, 4, 5].map((i) =>
      shelf?.cardIds?.[i] && shelf.cardIds[i] !== 'null'
        ? String(shelf.cardIds[i])
        : null
    );
    const fallbackName =
      idx === 0 ? 'Vitrine du collectionneur' : `Étagère ${idx + 1}`;
    return {
      id: String(shelf?.id || `shelf-${idx + 1}`).slice(0, 40),
      name:
        String(shelf?.name || fallbackName).trim().slice(0, 45) || fallbackName,
      cardIds,
      cards: cardIds.map((id) =>
        id ? col.find((c) => String(c.id) === String(id)) || null : null
      ),
    };
  });

  const baseMap = { C: 10, PC: 35, R: 125, SR: 420, UR: 710, L: 2100 };
  let totalCardsCount = 0;
  let legendaryCount = 0;
  let ultraRareCount = 0;
  let superRareCount = 0;
  let rareCount = 0;
  let uncommonCount = 0;
  let commonCount = 0;
  let gifCount = 0;
  let collectionValue = 0;

  for (const c of col) {
    if (!c) continue;
    const qty = Number(c.count) || 1;
    totalCardsCount += qty;
    if (c.rarity === 'L') legendaryCount += qty;
    else if (c.rarity === 'UR') ultraRareCount += qty;
    else if (c.rarity === 'SR') superRareCount += qty;
    else if (c.rarity === 'R') rareCount += qty;
    else if (c.rarity === 'PC') uncommonCount += qty;
    else if (c.rarity === 'C') commonCount += qty;

    const isGifCard = Boolean(
      c.isFoil ||
        c.isShiny ||
        c.isGif ||
        (typeof c.image === 'string' && c.image.toLowerCase().includes('.gif'))
    );
    if (isGifCard) gifCount += qty;

    const base = baseMap[c.rarity] || 10;
    const mult = c.isShiny ? 3 : 1;
    collectionValue += base * mult * qty;
  }

  return {
    code: cleanCode,
    publicId: toPublicUserId(cleanCode),
    username: userObj?.profile?.username || 'Wikipédien',
    avatar:
      userObj?.profile?.avatar ||
      'https://fr.wikipedia.org/static/images/icons/wikipedia.png',
    avatarTitle: userObj?.profile?.avatarTitle || '',
    avatarUrl: userObj?.profile?.avatarUrl || '',
    bio: userObj?.profile?.bio || '',
    showcaseIds,
    showcaseCards,
    shelves: resolvedShelves,
    uniqueCardsCount: col.length,
    totalCardsCount,
    legendaryCount,
    ultraRareCount,
    superRareCount,
    rareCount,
    uncommonCount,
    commonCount,
    gifCount,
    collectionValue,
    wikithunes: typeof userObj?.wikithunes === 'number' ? userObj.wikithunes : 0,
    stats: userObj?.stats || {},
    createdAt: userObj?.createdAt || 0,
    snapshots: Array.isArray(userObj?.snapshots)
      ? userObj.snapshots.slice(-30)
      : [],
    updatedAt: Number(userObj?.updatedAt || 0),
  };
}

/**
 * Lit et parse un fichier JSON en toute sécurité avec une valeur de repli en cas d'erreur.
 * @template T
 * @param {string} filePath - Chemin absolu du fichier
 * @param {T} fallback - Valeur retournée si le fichier est manquant ou invalide
 * @returns {T} Contenu désérialisé ou fallback
 */
export function safeReadJsonSync(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Migre automatiquement les anciens fichiers `data/users/*.json`, `data/market.json` et `data/trades.json`
 * vers la base SQLite lors du premier démarrage, puis supprime les fichiers utilisateurs migrés.
 *
 * @param {DatabaseSync} db - Instance SQLite ouverte
 */
function migrateLegacyJsonFiles(db) {
  const insertUserStmt = db.prepare(`
    INSERT OR IGNORE INTO users (code, public_id, updated_at, data_json, summary_json)
    VALUES (?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN IMMEDIATE');
  try {
    // 1. Migration des comptes joueurs JSON dans data/users/
    if (fs.existsSync(usersDir)) {
      const files = fs
        .readdirSync(usersDir)
        .filter(
          (f) =>
            f.endsWith('.json') &&
            !f.startsWith('.tmp.') &&
            f !== 'WIKI-1234.json'
        );

      for (const file of files) {
        const fullPath = path.join(usersDir, file);
        try {
          const parsed = safeReadJsonSync(fullPath, null);
          if (!parsed || typeof parsed !== 'object') continue;
          const cleanCode = sanitizeCode(
            parsed.code || path.basename(file, '.json')
          );
          if (!isValidUserCode(cleanCode)) continue;

          const normalized = {
            ...parsed,
            code: cleanCode,
            publicId: toPublicUserId(cleanCode),
            updatedAt: Number(parsed.updatedAt) || Date.now(),
          };
          const summary = buildUserDirectorySummary(normalized);
          insertUserStmt.run(
            cleanCode,
            normalized.publicId,
            normalized.updatedAt,
            JSON.stringify(normalized),
            JSON.stringify(summary)
          );
          fs.unlinkSync(fullPath);
        } catch {
          // Conserver le fichier en cas d'erreur de lecture
        }
      }
    }

    // 2. Migration des registres market.json et trades.json vers kv_store
    const hasKvStmt = db.prepare('SELECT 1 FROM kv_store WHERE key = ?');
    const insertKvStmt = db.prepare(`
      INSERT OR IGNORE INTO kv_store (key, data_json, updated_at)
      VALUES (?, ?, ?)
    `);

    if (!hasKvStmt.get('market')) {
      const marketData = safeReadJsonSync(marketFile, []);
      const validMarket = Array.isArray(marketData) ? marketData : [];
      insertKvStmt.run('market', JSON.stringify(validMarket), Date.now());
    }

    if (!hasKvStmt.get('trades')) {
      const tradesData = safeReadJsonSync(tradesFile, []);
      const validTrades = Array.isArray(tradesData) ? tradesData : [];
      insertKvStmt.run('trades', JSON.stringify(validTrades), Date.now());
    }

    db.exec('COMMIT');
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignorer
    }
    console.error('[WikiCards SQLite Migration Error]:', err);
  }
}

/**
 * Retourne l'instance singleton SQLite configurée en mode WAL (initialisation paresseuse).
 * @returns {DatabaseSync} Instance SQLite prête à l'emploi
 */
export function getDb() {
  if (dbInstance) return dbInstance;
  ensureDir();

  const db = new DatabaseSync(dbFile);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA temp_store = MEMORY;
    PRAGMA cache_size = -8000;
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      code TEXT PRIMARY KEY,
      public_id TEXT UNIQUE NOT NULL,
      updated_at INTEGER NOT NULL,
      data_json TEXT NOT NULL,
      summary_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_public_id ON users(public_id);
    CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at DESC);

    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  migrateLegacyJsonFiles(db);
  dbInstance = db;

  process.once('exit', () => {
    if (dbInstance) {
      try {
        dbInstance.close();
      } catch {
        // Ignorer à la fermeture
      }
      dbInstance = null;
    }
  });

  return dbInstance;
}

/**
 * Exécute une fonction synchrone à l'intérieur d'une transaction SQLite atomique (`BEGIN IMMEDIATE ... COMMIT`).
 * Garantit l'isolation stricte ACID contre les conditions de concurrence (marché, échanges, synchro).
 *
 * @template T
 * @param {() => T} syncFn - Opérations SQLite synchrones à exécuter atomiquement
 * @returns {T} Valeur retournée par `syncFn`
 */
export function withTransaction(syncFn) {
  const db = getDb();
  if (transactionDepth > 0) {
    return syncFn();
  }

  transactionDepth += 1;
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = syncFn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignorer
    }
    throw err;
  } finally {
    transactionDepth -= 1;
  }
}

/**
 * Résout un identifiant joueur (code secret `WIKI-...` ou identifiant public `PUB-...`) en son code interne.
 * @param {string} codeOrPublicId - Code secret ou identifiant public
 * @returns {string|null} Code interne normalisé ou null s'il est introuvable/invalide
 */
export function resolveUserCode(codeOrPublicId) {
  const clean = sanitizeCode(codeOrPublicId);
  if (!clean) return null;
  const db = getDb();

  if (isPublicUserId(clean)) {
    const row = db
      .prepare('SELECT code FROM users WHERE public_id = ?')
      .get(clean);
    return row ? row.code : null;
  }

  if (!isValidUserCode(clean)) return null;
  const row = db.prepare('SELECT code FROM users WHERE code = ?').get(clean);
  return row ? row.code : clean;
}

/**
 * Charge les données d'un compte utilisateur depuis SQLite par son code secret ou son identifiant public.
 * @param {string} codeOrPublicId - Code du compte joueur ou identifiant public
 * @returns {object|null} Objet utilisateur complet ou null si inexistant/invalide
 */
export function loadUserFile(codeOrPublicId) {
  const clean = sanitizeCode(codeOrPublicId);
  if (!clean) return null;
  const db = getDb();

  const row = isPublicUserId(clean)
    ? db.prepare('SELECT data_json FROM users WHERE public_id = ?').get(clean)
    : isValidUserCode(clean)
    ? db.prepare('SELECT data_json FROM users WHERE code = ?').get(clean)
    : null;

  if (!row || !row.data_json) return null;
  try {
    const parsed = JSON.parse(row.data_json);
    if (!parsed || typeof parsed !== 'object') return null;
    const resolvedCode = sanitizeCode(parsed.code || clean);
    return {
      ...parsed,
      code: resolvedCode,
      publicId: toPublicUserId(resolvedCode),
    };
  } catch {
    return null;
  }
}

/**
 * Sauvegarde les données d'un compte utilisateur dans SQLite avec horodatage et mise à jour de son résumé d'annuaire.
 *
 * @param {string} code - Code secret du compte joueur
 * @param {object} userObj - Données de compte à enregistrer
 * @param {{ preserveUpdatedAt?: boolean }} [options={}] - Options d'enregistrement
 * @returns {object|null} Objet utilisateur persisté
 */
export function saveUserFile(code, userObj, options = {}) {
  const cleanCode = sanitizeCode(code);
  if (!isValidUserCode(cleanCode) || isPublicUserId(cleanCode)) return null;

  const db = getDb();
  const publicId = toPublicUserId(cleanCode);
  const nextUpdatedAt =
    options.preserveUpdatedAt && Number(userObj?.updatedAt) > 0
      ? Number(userObj.updatedAt)
      : Date.now();

  const next = {
    ...userObj,
    code: cleanCode,
    publicId,
    updatedAt: nextUpdatedAt,
  };

  const summary = buildUserDirectorySummary(next);

  db.prepare(`
    INSERT INTO users (code, public_id, updated_at, data_json, summary_json)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET
      public_id = excluded.public_id,
      updated_at = excluded.updated_at,
      data_json = excluded.data_json,
      summary_json = excluded.summary_json
  `).run(
    cleanCode,
    publicId,
    nextUpdatedAt,
    JSON.stringify(next),
    JSON.stringify(summary)
  );

  triggerDirectoryCacheInvalidation();
  return next;
}

/**
 * Supprime définitivement un compte joueur de la base SQLite.
 * @param {string} code - Code secret du compte à supprimer
 * @returns {boolean} Vrai si au moins une ligne a été supprimée
 */
export function deleteUserFile(code) {
  const cleanCode = sanitizeCode(code);
  if (!isValidUserCode(cleanCode) || isPublicUserId(cleanCode)) return false;

  const db = getDb();
  const info = db.prepare('DELETE FROM users WHERE code = ?').run(cleanCode);
  triggerDirectoryCacheInvalidation();
  return Boolean(info && info.changes > 0);
}

/**
 * Retourne la liste complète des résumés d'annuaire de tous les joueurs inscrits,
 * triée du plus récemment actif au plus ancien (avec mise en cache mémoire).
 *
 * @returns {Array<object>} Liste des résumés joueurs
 */
export function getAllUserSummaries() {
  if (Array.isArray(cachedSummaries)) {
    return cachedSummaries;
  }

  const db = getDb();
  const rows = db
    .prepare('SELECT summary_json FROM users ORDER BY updated_at DESC')
    .all();

  const summaries = [];
  for (const row of rows) {
    if (!row?.summary_json) continue;
    try {
      summaries.push(JSON.parse(row.summary_json));
    } catch {
      // Ignorer une entrée corrompue
    }
  }

  cachedSummaries = summaries;
  return summaries;
}

function resolveKvKeyFromPath(filePath) {
  const base = path.basename(String(filePath || ''));
  if (base === 'market.json') return 'market';
  if (base === 'trades.json') return 'trades';
  return null;
}

/**
 * Charge un tableau de données (`market` ou `trades`) depuis SQLite `kv_store`.
 * @param {string} filePath - Chemin identifiant le registre (`marketFile` ou `tradesFile`)
 * @returns {Array<object>} Tableau désérialisé ou tableau vide si absent
 */
export function loadJsonArrayFile(filePath) {
  const kvKey = resolveKvKeyFromPath(filePath);
  if (!kvKey) {
    const parsed = safeReadJsonSync(filePath, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  const db = getDb();
  const row = db
    .prepare('SELECT data_json FROM kv_store WHERE key = ?')
    .get(kvKey);
  if (!row?.data_json) return [];

  try {
    const parsed = JSON.parse(row.data_json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Persiste un tableau de données (`market` ou `trades`) dans SQLite `kv_store`.
 * @param {string} filePath - Chemin identifiant le registre (`marketFile` ou `tradesFile`)
 * @param {Array<object>} arr - Données à persister
 */
export function saveJsonArrayFile(filePath, arr) {
  const safeArr = Array.isArray(arr) ? arr : [];
  const kvKey = resolveKvKeyFromPath(filePath);
  if (!kvKey) return;

  const db = getDb();
  const now = Date.now();
  db.prepare(`
    INSERT INTO kv_store (key, data_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      data_json = excluded.data_json,
      updated_at = excluded.updated_at
  `).run(kvKey, JSON.stringify(safeArr), now);
}

/**
 * Ajoute une liste de cartes à la collection d'un utilisateur de manière idempotente.
 * Incrémente le champ `count` si la carte est déjà possédée et met à jour `obtainedAt`.
 *
 * @param {Array<object>} collection - Collection existante de cartes
 * @param {Array<object>} cardsToAdd - Cartes ou entrées { card, qty } à ajouter
 * @returns {Array<object>} Nouvelle collection mise à jour
 */
export function addCardsToUserCollection(collection = [], cardsToAdd = []) {
  const map = new Map(collection.map((item) => [String(item.id), { ...item }]));
  const now = Date.now();
  cardsToAdd.forEach((entry, idx) => {
    const card = entry.card || entry;
    const qty = Math.max(1, Number(entry.qty || 1));
    const idKey = String(card.id);
    if (map.has(idKey)) {
      const existing = map.get(idKey);
      map.set(idKey, {
        ...existing,
        count: (existing.count || 1) + qty,
        firstObtainedAt:
          existing.firstObtainedAt || existing.obtainedAt || now + idx,
        obtainedAt: now + idx,
      });
    } else {
      map.set(idKey, {
        ...card,
        count: qty,
        firstObtainedAt: now + idx,
        obtainedAt: now + idx,
      });
    }
  });
  return Array.from(map.values());
}

/**
 * Retire une liste de cartes de la collection d'un utilisateur en vérifiant les quantités disponibles.
 *
 * @param {Array<object>} collection - Collection initiale
 * @param {Array<object>} cardsToRemove - Cartes ou entrées { id, qty } à soustraire
 * @returns {{ ok: boolean, collection: Array<object> }} Résultat de l'opération et nouvelle collection
 */
export function removeCardsFromUserCollection(
  collection = [],
  cardsToRemove = []
) {
  const removeMap = {};
  cardsToRemove.forEach((entry) => {
    const idKey = String(entry.id || entry.card?.id);
    const qty = Math.max(1, Number(entry.qty || 1));
    removeMap[idKey] = (removeMap[idKey] || 0) + qty;
  });

  for (const [idKey, neededQty] of Object.entries(removeMap)) {
    const found = collection.find((c) => String(c.id) === idKey);
    if (!found || (found.count || 1) < neededQty) {
      return { ok: false, collection };
    }
  }

  const nextCollection = collection
    .map((item) => {
      const toRem = removeMap[String(item.id)] || 0;
      if (toRem <= 0) return item;
      return {
        ...item,
        count: Math.max(0, (item.count || 1) - toRem),
      };
    })
    .filter((item) => (item.count || 0) > 0);

  return { ok: true, collection: nextCollection };
}

/**
 * Lit et parse de manière asynchrone le corps JSON d'une requête HTTP Node.js.
 * @param {import('node:http').IncomingMessage} req - Requête HTTP entrante
 * @param {number} [maxSizeBytes=5242880] - Taille maximale autorisée en octets (défaut: 5 Mo)
 * @returns {Promise<any>} Données JSON parsées
 */
export function readJsonBody(req, maxSizeBytes = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytesReceived = 0;

    req.on('data', (chunk) => {
      bytesReceived += chunk.length;
      if (bytesReceived > maxSizeBytes) {
        reject(new Error('Taille de corps de requête dépassée (max 5 Mo)'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });

    req.on('error', reject);
  });
}
