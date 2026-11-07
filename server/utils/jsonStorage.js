/**
 * @file Rôle : Gestionnaire de persistance JSON atomique, verrous de concurrence en mémoire et invalidation de cache.
 * Dépendances : `node:fs`, `node:path`, `./validators.js`.
 * Effets de bord : Lecture et écriture atomique de fichiers JSON dans `data/` (users, trades, market), verrous mémoire.
 */

import fs from 'node:fs';
import path from 'node:path';
import { sanitizeCode } from './validators.js';

const memoryLocks = new Map();
let directoryCacheInvalidator = null;

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

export const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data');

export const usersDir = path.join(dataDir, 'users');
export const tradesFile = path.join(dataDir, 'trades.json');
export const marketFile = path.join(dataDir, 'market.json');

/**
 * Assure que les répertoires `data/` et `data/users/` existent sur le disque.
 */
export function ensureDir() {
  if (!fs.existsSync(usersDir)) {
    fs.mkdirSync(usersDir, { recursive: true });
  }
}

/**
 * Écrit de manière atomique des données sérialisées en JSON dans un fichier cible.
 * Résilient sous Windows (fallback copy + unlink si renameSync rencontre EPERM/EACCES/EBUSY).
 * Nettoie systématiquement tout fichier temporaire en bloc `finally`.
 *
 * @param {string} filePath - Chemin absolu du fichier de destination
 * @param {unknown} data - Données JavaScript à sérialiser
 */
export function atomicWriteJsonSync(filePath, data) {
  ensureDir();
  const dir = path.dirname(filePath);
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const tmpPath = path.join(dir, `.tmp.${path.basename(filePath)}.${process.pid}.${Date.now()}.${randomSuffix}`);
  const serialized = JSON.stringify(data, null, 2);

  try {
    fs.writeFileSync(tmpPath, serialized, 'utf-8');
    try {
      fs.renameSync(tmpPath, filePath);
    } catch (renameErr) {
      // Fallback Windows : en cas de verrou temporaire sur le fichier cible
      if (['EPERM', 'EACCES', 'EBUSY'].includes(renameErr.code)) {
        fs.copyFileSync(tmpPath, filePath);
        try {
          fs.unlinkSync(tmpPath);
        } catch {
          // Ignorer si la suppression du temporaire est différée par l'OS
        }
      } else {
        throw renameErr;
      }
    }
  } finally {
    if (fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // Ignorer l'échec de nettoyage du temporaire
      }
    }
  }
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
 * Calcule le chemin absolu du fichier d'un utilisateur d'après son code.
 * @param {string} code - Code du compte joueur
 * @returns {string|null} Chemin absolu ou null si le code est invalide
 */
export function getUserFilePath(code) {
  ensureDir();
  const clean = sanitizeCode(code);
  if (!clean) return null;
  return path.join(usersDir, `${clean}.json`);
}

/**
 * Charge les données d'un compte utilisateur depuis son fichier JSON.
 * @param {string} code - Code du compte joueur
 * @returns {object|null} Objet utilisateur ou null si inexistant/invalide
 */
export function loadUserFile(code) {
  const fp = getUserFilePath(code);
  if (!fp) return null;
  return safeReadJsonSync(fp, null);
}

/**
 * Sauvegarde les données d'un compte utilisateur avec écriture atomique et horodatage.
 * @param {string} code - Code du compte joueur
 * @param {object} userObj - Données de compte à enregistrer
 * @returns {object|null} Objet utilisateur persisté
 */
export function saveUserFile(code, userObj) {
  const fp = getUserFilePath(code);
  if (!fp) return null;
  const next = {
    ...userObj,
    code: sanitizeCode(code),
    updatedAt: Date.now(),
  };
  atomicWriteJsonSync(fp, next);
  triggerDirectoryCacheInvalidation();
  return next;
}

/**
 * Charge un fichier JSON contenant un tableau de données (ex: trades.json ou market.json).
 * @param {string} filePath - Chemin absolu du fichier tableau
 * @returns {Array<object>} Tableau désérialisé ou tableau vide si absent
 */
export function loadJsonArrayFile(filePath) {
  ensureDir();
  const parsed = safeReadJsonSync(filePath, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Sauvegarde un tableau d'objets de manière atomique dans un fichier JSON.
 * @param {string} filePath - Chemin absolu du fichier tableau
 * @param {Array<object>} arr - Données à persister
 */
export function saveJsonArrayFile(filePath, arr) {
  ensureDir();
  atomicWriteJsonSync(filePath, Array.isArray(arr) ? arr : []);
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
        obtainedAt: now + idx,
      });
    } else {
      map.set(idKey, {
        ...card,
        count: qty,
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
export function removeCardsFromUserCollection(collection = [], cardsToRemove = []) {
  const removeMap = {};
  cardsToRemove.forEach((entry) => {
    const idKey = String(entry.id || entry.card?.id);
    const qty = Math.max(1, Number(entry.qty || 1));
    removeMap[idKey] = (removeMap[idKey] || 0) + qty;
  });

  // Vérifier que l'utilisateur possède bien tous les exemplaires demandés
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
