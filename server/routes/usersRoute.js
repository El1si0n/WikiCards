/**
 * @file Rôle : Contrôleur des routes utilisateurs (/api/users) : annuaire mis en cache TTL, consultation, synchronisation et suppression.
 * Dépendances : `node:fs`, `node:path`, `../utils/jsonStorage.js`, `../utils/validators.js`.
 * Effets de bord : Lecture, écriture atomique et suppression des fichiers de compte dans `data/users/`, cache mémoire d'annuaire.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  usersDir,
  marketFile,
  tradesFile,
  ensureDir,
  getUserFilePath,
  atomicWriteJsonSync,
  loadJsonArrayFile,
  saveJsonArrayFile,
  addCardsToUserCollection,
  readJsonBody,
  registerDirectoryCacheInvalidator,
} from '../utils/jsonStorage.js';
import { sanitizeCode, sanitizeUserPayload } from '../utils/validators.js';
import { resolveExpiredMarketAuctions } from './marketRoute.js';

let cachedUsersDirectoryJson = null;
let cachedUsersDirectoryExpiry = 0;
const DIRECTORY_CACHE_TTL_MS = 5000;

/**
 * Détecte si le fichier JSON sur le disque a été modifié manuellement (hors API)
 * en comparant son horodatage système (`mtimeMs`) au champ `updatedAt` interne.
 * Si le fichier a été édité manuellement (ex: modération anti-triche), met à jour `updatedAt`,
 * ajuste automatiquement `stats.wonCards` et `stats.totalCardsDrawn` si des cartes dupliquées
 * ont été retirées, et active un jeton `adminOverrideAt` pour forcer le navigateur du joueur à adopter cet état.
 *
 * @param {string} filePath - Chemin absolu du fichier JSON
 * @param {object} parsed - Contenu JSON désérialisé
 * @returns {{ user: object, changed: boolean }} Objet utilisateur éventuellement mis à jour
 */
function detectAndApplyManualFileEdit(filePath, parsed) {
  if (!filePath || !parsed || typeof parsed !== 'object') {
    return { user: parsed, changed: false };
  }
  try {
    const stat = fs.statSync(filePath);
    const fileMtime = Math.floor(stat.mtimeMs || 0);
    const jsonUpdatedAt = Number(parsed.updatedAt || 0);

    // Marge de 1500ms pour ignorer le léger décalage naturel entre Date.now() et fs.writeFileSync
    if (fileMtime > jsonUpdatedAt + 1500) {
      const col = Array.isArray(parsed.collection) ? parsed.collection : [];
      const actualCopies = col.reduce((s, c) => s + (Number(c?.count) || 1), 0);
      const rawStats = parsed.stats && typeof parsed.stats === 'object' ? parsed.stats : {};
      const boostersOpened = Number(rawStats.boostersOpened || 0);
      const lostCards = Number(rawStats.lostCards || 0);
      const wonCards = Number(rawStats.wonCards || 0);

      // Si des cartes ont été supprimées manuellement de `collection`, le net de cartes gagnées
      // ne peut pas excéder le nombre réel de cartes possédées au-delà des boosters ouverts
      const maxPlausibleWonCards = Math.max(
        0,
        actualCopies + lostCards - Math.min(actualCopies, boostersOpened * 6)
      );
      const adjustedWonCards = Math.min(wonCards, maxPlausibleWonCards);
      const adjustedTotalDraws = Math.min(
        Number(rawStats.totalCardsDrawn || 0),
        Math.max(actualCopies + lostCards, boostersOpened * 6)
      );

      const updatedUser = {
        ...parsed,
        stats: {
          ...rawStats,
          wonCards: adjustedWonCards,
          totalCardsDrawn: adjustedTotalDraws,
        },
        updatedAt: fileMtime,
        adminOverrideAt: fileMtime,
      };
      return { user: updatedUser, changed: true };
    }
  } catch {
    // ignore
  }
  return { user: parsed, changed: false };
}

/**
 * Vérifie dans `market.json` si l'utilisateur a remporté des enchères (status === 'sold')
 * dont les cartes n'auraient pas encore été intégrées ou acquittées dans son profil.
 * Protège également contre la perte de cartes si une synchro client intervient au même instant.
 *
 * @param {object} userObj - Données actuelles du joueur
 * @param {string} cleanCode - Code normalisé du joueur
 * @returns {{ user: object, changed: boolean }} Objet joueur consolidé
 */
function ensureUnclaimedMarketWinsApplied(userObj, cleanCode) {
  if (!userObj || !cleanCode) return { user: userObj, changed: false };
  try {
    let listings = loadJsonArrayFile(marketFile);
    listings = resolveExpiredMarketAuctions(listings);

    const claimed = new Set(
      Array.isArray(userObj.claimedMarketWins) ? userObj.claimedMarketWins : []
    );
    let currentCol = Array.isArray(userObj.collection) ? userObj.collection : [];
    let changed = false;

    for (const listing of listings) {
      if (
        listing &&
        (listing.status === 'sold' || listing.status === 'ended') &&
        (listing.buyerCode === cleanCode || listing.highestBidderCode === cleanCode) &&
        listing.sellerCode !== cleanCode &&
        listing.card &&
        listing.id &&
        !claimed.has(listing.id)
      ) {
        currentCol = addCardsToUserCollection(currentCol, [
          { card: listing.card, qty: 1 },
        ]);
        claimed.add(listing.id);
        changed = true;
      }
    }

    if (!changed) {
      return { user: userObj, changed: false };
    }

    return {
      user: {
        ...userObj,
        collection: currentCol,
        claimedMarketWins: Array.from(claimed).slice(-200),
        updatedAt: Date.now(),
      },
      changed: true,
    };
  } catch {
    return { user: userObj, changed: false };
  }
}

/**
 * Invalide immédiatement le cache mémoire de l'annuaire des utilisateurs.
 */
export function invalidateUsersDirectoryCache() {
  cachedUsersDirectoryJson = null;
  cachedUsersDirectoryExpiry = 0;
}

// Raccorde l'invalidation automatique lors de toute modification par saveUserFile
registerDirectoryCacheInvalidator(invalidateUsersDirectoryCache);

/**
 * Traite les requêtes HTTP ciblant les routes `/api/users`.
 *
 * @param {import('node:http').IncomingMessage} req - Requête HTTP entrante
 * @param {import('node:http').ServerResponse} res - Réponse HTTP sortante
 * @param {string} pathname - Chemin d'accès de l'URL
 * @returns {Promise<boolean>} Vrai si la requête a été prise en charge
 */
export async function handleUsersRoute(req, res, pathname) {
  // 1. Annuaire public des joueurs : GET /api/users (avec cache mémoire TTL 5s)
  if (req.method === 'GET' && pathname === '/api/users') {
    const now = Date.now();
    if (cachedUsersDirectoryJson && now < cachedUsersDirectoryExpiry) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(cachedUsersDirectoryJson);
      return true;
    }

    ensureDir();
    const files = fs
      .readdirSync(usersDir)
      .filter((f) => f.endsWith('.json') && !f.startsWith('.tmp.'));
    const users = [];

    for (const file of files) {
      try {
        const fullPath = path.join(usersDir, file);
        const raw = fs.readFileSync(fullPath, 'utf-8');
        let parsed = JSON.parse(raw);
        const manualEdit = detectAndApplyManualFileEdit(fullPath, parsed);
        if (manualEdit.changed) {
          parsed = manualEdit.user;
          atomicWriteJsonSync(fullPath, parsed);
        }
        const col = Array.isArray(parsed.collection) ? parsed.collection : [];
        const showcaseIds = Array.isArray(parsed.profile?.showcaseIds)
          ? parsed.profile.showcaseIds
          : [];
        const showcaseCards = showcaseIds
          .map((id) =>
            id && id !== 'null'
              ? col.find((c) => String(c.id) === String(id)) || null
              : null
          )
          .filter(Boolean);

        const rawShelves =
          Array.isArray(parsed.profile?.shelves) &&
          parsed.profile.shelves.length > 0
            ? parsed.profile.shelves
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
            name: String(shelf?.name || fallbackName).trim().slice(0, 45) || fallbackName,
            cardIds,
            cards: cardIds.map((id) =>
              id ? col.find((c) => String(c.id) === String(id)) || null : null
            ),
          };
        });

        users.push({
          code: parsed.code,
          username: parsed.profile?.username || 'Wikipédien',
          avatar:
            parsed.profile?.avatar ||
            'https://fr.wikipedia.org/static/images/icons/wikipedia.png',
          avatarTitle: parsed.profile?.avatarTitle || '',
          avatarUrl: parsed.profile?.avatarUrl || '',
          bio: parsed.profile?.bio || '',
          showcaseIds,
          showcaseCards,
          shelves: resolvedShelves,
          uniqueCardsCount: col.length,
          totalCardsCount: col.reduce((s, c) => s + (c.count || 1), 0),
          legendaryCount: col
            .filter((c) => c.rarity === 'L')
            .reduce((s, c) => s + (c.count || 1), 0),
          ultraRareCount: col
            .filter((c) => c.rarity === 'UR')
            .reduce((s, c) => s + (c.count || 1), 0),
          superRareCount: col
            .filter((c) => c.rarity === 'SR')
            .reduce((s, c) => s + (c.count || 1), 0),
          rareCount: col
            .filter((c) => c.rarity === 'R')
            .reduce((s, c) => s + (c.count || 1), 0),
          uncommonCount: col
            .filter((c) => c.rarity === 'PC')
            .reduce((s, c) => s + (c.count || 1), 0),
          commonCount: col
            .filter((c) => c.rarity === 'C')
            .reduce((s, c) => s + (c.count || 1), 0),
          gifCount: col.reduce((s, c) => {
            const isGifCard = Boolean(
              c.isFoil ||
                c.isShiny ||
                c.isGif ||
                (typeof c.image === 'string' && c.image.toLowerCase().includes('.gif'))
            );
            return isGifCard ? s + (c.count || 1) : s;
          }, 0),
          collectionValue: col.reduce((s, c) => {
            const baseMap = { C: 10, PC: 35, R: 125, SR: 420, UR: 710, L: 2100 };
            const base = baseMap[c.rarity] || 10;
            const mult = c.isShiny ? 3 : 1;
            return s + base * mult * (c.count || 1);
          }, 0),
          wikithunes: typeof parsed.wikithunes === 'number' ? parsed.wikithunes : 0,
          stats: parsed.stats || {},
          createdAt: parsed.createdAt || 0,
          snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots.slice(-30) : [],
          updatedAt: parsed.updatedAt || 0,
        });
      } catch {
        // Ignorer les fichiers temporaires ou malformés
      }
    }

    users.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const responseBody = JSON.stringify({ ok: true, users });
    cachedUsersDirectoryJson = responseBody;
    cachedUsersDirectoryExpiry = Date.now() + DIRECTORY_CACHE_TTL_MS;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(responseBody);
    return true;
  }

  // 2. Opérations sur un compte spécifique : /api/users/:code
  const userMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
  if (!userMatch) {
    return false;
  }

  const code = decodeURIComponent(userMatch[1]);
  const filePath = getUserFilePath(code);
  if (!filePath) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: 'Code invalide' }));
    return true;
  }

  // GET /api/users/:code
  if (req.method === 'GET') {
    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false, error: 'Utilisateur introuvable' }));
      return true;
    }
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      let parsed = JSON.parse(raw);
      const manualEdit = detectAndApplyManualFileEdit(filePath, parsed);
      const cleanCode = sanitizeCode(code);
      const { user: consolidated, changed } = ensureUnclaimedMarketWinsApplied(
        manualEdit.user,
        cleanCode
      );
      if (manualEdit.changed || changed) {
        atomicWriteJsonSync(filePath, consolidated);
        invalidateUsersDirectoryCache();
      }
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, user: consolidated }));
    } catch {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: 'Erreur de lecture du profil' }));
    }
    return true;
  }

  // POST ou PUT /api/users/:code (synchronisation avec protection anti-écrasement)
  if (req.method === 'POST' || req.method === 'PUT') {
    const rawBody = await readJsonBody(req);
    const cleanCode = sanitizeCode(code);
    const fileExists = fs.existsSync(filePath);
    let existing = {};

    if (fileExists) {
      try {
        const rawExisting = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const manualEdit = detectAndApplyManualFileEdit(filePath, rawExisting);
        const { user: consolidated, changed } = ensureUnclaimedMarketWinsApplied(
          manualEdit.user,
          cleanCode
        );
        existing = consolidated;
        if (manualEdit.changed || changed) {
          atomicWriteJsonSync(filePath, existing);
          invalidateUsersDirectoryCache();
        }
      } catch {
        existing = {};
      }
    }

    const body = sanitizeUserPayload(rawBody, existing);
    if (rawBody.forceOverwrite !== undefined) body.forceOverwrite = rawBody.forceOverwrite;
    if (rawBody.clientUpdatedAt !== undefined) body.clientUpdatedAt = rawBody.clientUpdatedAt;

    // Protection anti-écrasement : si le serveur a reçu une mutation asynchrone plus récente
    // (ex: édition manuelle sur le disque, gain d'enchère, vente créditée ou échange accepté)
    if (fileExists && existing.code && !body.forceOverwrite) {
      const existingDraws = Number(existing.stats?.totalCardsDrawn || 0);
      const existingBoosters = Number(existing.stats?.boostersOpened || 0);
      const incomingDraws = Number(
        body.stats?.totalCardsDrawn !== undefined
          ? body.stats.totalCardsDrawn
          : existingDraws
      );
      const incomingBoosters = Number(
        body.stats?.boostersOpened !== undefined
          ? body.stats.boostersOpened
          : existingBoosters
      );
      const existingUpdatedAt = Number(existing.updatedAt || 0);
      const incomingUpdatedAt = Number(body.clientUpdatedAt || body.updatedAt || 0);
      const serverAdminOverrideAt = Number(existing.adminOverrideAt || 0);
      const clientAdminOverrideAt = Number(rawBody.adminOverrideAt || 0);

      // Si le fichier a été modifié manuellement sur le serveur et que le client n'a pas encore reçu cette révision
      const hasUnacknowledgedManualEdit =
        serverAdminOverrideAt > 0 &&
        (clientAdminOverrideAt < serverAdminOverrideAt ||
          incomingUpdatedAt < serverAdminOverrideAt);

      const isIncomingStrictlyOlder =
        incomingUpdatedAt > 0 &&
        existingUpdatedAt > 0 &&
        incomingUpdatedAt < existingUpdatedAt;

      const isIncomingBehindInProgress =
        incomingDraws < existingDraws || incomingBoosters < existingBoosters;

      const hasServerAsyncUpdate =
        isIncomingStrictlyOlder &&
        incomingDraws <= existingDraws &&
        incomingBoosters <= existingBoosters;

      if (
        hasUnacknowledgedManualEdit ||
        hasServerAsyncUpdate ||
        (isIncomingBehindInProgress && incomingUpdatedAt <= existingUpdatedAt)
      ) {
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            ok: true,
            user: existing,
            serverIsNewer: true,
          })
        );
        return true;
      }
    }

    const now = Date.now();
    const clientTimestamp = Number(body.clientUpdatedAt || body.updatedAt || 0);
    const { clientUpdatedAt: _omitClientTs, forceOverwrite: _omitForce, ...cleanBody } = body;

    const existingClaimDate = String(existing.lastDailyClaimDate || '');
    const incomingClaimDate = String(cleanBody.lastDailyClaimDate || '');
    const resolvedClaimDate =
      incomingClaimDate > existingClaimDate ? incomingClaimDate : existingClaimDate;

    const existingWins = Array.isArray(existing.claimedMarketWins)
      ? existing.claimedMarketWins
      : [];
    const incomingWins = Array.isArray(cleanBody.claimedMarketWins)
      ? cleanBody.claimedMarketWins
      : [];
    const mergedWins = Array.from(new Set([...existingWins, ...incomingWins])).slice(-200);

    // Si le serveur vient de créditer une enchère qui n'était pas encore connue du client
    // au moment où le client a ouvert un booster simultanément, on fusionne la carte gagnée
    let mergedCollection = Array.isArray(cleanBody.collection)
      ? cleanBody.collection
      : existing.collection || [];

    if (existingWins.length > incomingWins.length && Array.isArray(cleanBody.collection)) {
      const missingWinIds = existingWins.filter((id) => !incomingWins.includes(id));
      if (missingWinIds.length > 0) {
        try {
          const allListings = loadJsonArrayFile(marketFile);
          for (const winId of missingWinIds) {
            const winListing = allListings.find((l) => l && l.id === winId);
            if (winListing?.card) {
              const hasCard = mergedCollection.some(
                (c) => String(c.id) === String(winListing.card.id)
              );
              if (!hasCard) {
                mergedCollection = addCardsToUserCollection(mergedCollection, [
                  { card: winListing.card, qty: 1 },
                ]);
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }

    const merged = {
      ...existing,
      ...cleanBody,
      collection: mergedCollection,
      claimedMarketWins: mergedWins,
      code: cleanCode,
      lastDailyClaimDate: resolvedClaimDate,
      createdAt: existing.createdAt || cleanBody.createdAt || now,
      updatedAt: existing.updatedAt || clientTimestamp || now,
    };

    if (Array.isArray(merged.snapshots)) {
      merged.snapshots = merged.snapshots
        .filter(
          (s) =>
            s &&
            typeof s.timestamp === 'number' &&
            (!s.userCode || s.userCode === cleanCode) &&
            !(
              s.uniqueCardsCount === 0 &&
              s.totalCardsCount === 0 &&
              (s.wikithunes === 3000 || s.wikithunes === 450)
            )
        )
        .map((s) => ({ ...s, userCode: cleanCode }));
    }

    const prevComparable = JSON.stringify({ ...existing, updatedAt: 0 });
    const nextComparable = JSON.stringify({ ...merged, updatedAt: 0 });

    if (prevComparable !== nextComparable || !fileExists) {
      merged.updatedAt = fileExists
        ? Math.max(now, clientTimestamp)
        : clientTimestamp || now;
      atomicWriteJsonSync(filePath, merged);
      invalidateUsersDirectoryCache();
    }

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ok: true,
        user: merged,
        serverIsNewer: false,
      })
    );
    return true;
  }

  // DELETE /api/users/:code (suppression de compte et nettoyage en cascade)
  if (req.method === 'DELETE') {
    const cleanCode = sanitizeCode(code);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        invalidateUsersDirectoryCache();
      } catch (unlinkErr) {
        console.error('[WikiCards Delete User Error]:', unlinkErr);
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Erreur lors de la suppression du fichier utilisateur',
          })
        );
        return true;
      }
    }

    // Nettoyer en cascade les annonces du marché créées par cet utilisateur
    try {
      const allListings = loadJsonArrayFile(marketFile);
      const nextListings = allListings.filter((l) => l.sellerCode !== cleanCode);
      if (nextListings.length !== allListings.length) {
        saveJsonArrayFile(marketFile, nextListings);
      }
    } catch (marketErr) {
      console.error('[Clean Market Error]:', marketErr);
    }

    // Nettoyer en cascade les offres d'échange impliquant cet utilisateur
    try {
      const allTrades = loadJsonArrayFile(tradesFile);
      const nextTrades = allTrades.filter(
        (t) => t.fromCode !== cleanCode && t.toCode !== cleanCode
      );
      if (nextTrades.length !== allTrades.length) {
        saveJsonArrayFile(tradesFile, nextTrades);
      }
    } catch (tradeErr) {
      console.error('[Clean Trades Error]:', tradeErr);
    }

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ok: true,
        message: 'Compte supprimé avec succès',
      })
    );
    return true;
  }

  return false;
}
