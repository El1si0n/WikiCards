/**
 * @file Rôle : Contrôleur des routes utilisateurs (/api/users) : annuaire SQLite pré-indexé, anonymisation publique (`publicId`), rate-limiting Cloudflare, synchronisation et suppression.
 * Dépendances : `../utils/jsonStorage.js`, `../utils/validators.js`, `./marketRoute.js`.
 * Effets de bord : Lecture, écriture transactionnelle SQLite et limitation de débit en mémoire.
 */

import {
  marketFile,
  tradesFile,
  loadUserFile,
  saveUserFile,
  deleteUserFile,
  getAllUserSummaries,
  loadJsonArrayFile,
  saveJsonArrayFile,
  addCardsToUserCollection,
  readJsonBody,
  withTransaction,
} from '../utils/jsonStorage.js';
import {
  sanitizeCode,
  isValidUserCode,
  sanitizeUserPayload,
  toPublicUserId,
  isPublicUserId,
  maskCodeForViewer,
} from '../utils/validators.js';
import { resolveExpiredMarketAuctions } from './marketRoute.js';

const failedLookupAttempts = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_FAILED_LOOKUPS_PER_MIN = 20;

/**
 * Extrait l'adresse IP réelle du client en tenant compte de Cloudflare Tunnel (`CF-Connecting-IP`).
 * @param {import('node:http').IncomingMessage} req - Requête HTTP entrante
 * @returns {string} Adresse IP du client
 */
function getClientIp(req) {
  const cfIp = req.headers?.['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) return cfIp.trim();
  const xff = req.headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function isLookupRateLimited(ip) {
  const now = Date.now();
  const entry = failedLookupAttempts.get(ip);
  if (!entry) return false;
  if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    failedLookupAttempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_FAILED_LOOKUPS_PER_MIN;
}

function recordFailedLookup(ip) {
  const now = Date.now();
  const entry = failedLookupAttempts.get(ip);
  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    if (failedLookupAttempts.size > 2000) {
      failedLookupAttempts.clear();
    }
    failedLookupAttempts.set(ip, { windowStart: now, count: 1 });
    return;
  }
  entry.count += 1;
}

/**
 * Vérifie dans le registre `market` si l'utilisateur a remporté des enchères (`status === 'sold'`)
 * dont les cartes n'auraient pas encore été intégrées ou acquittées dans son profil.
 *
 * @param {object} userObj - Données actuelles du joueur
 * @param {string} cleanCode - Code secret normalisé du joueur
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
        (listing.buyerCode === cleanCode ||
          listing.highestBidderCode === cleanCode) &&
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
 * Compare rapidement deux états d'un compte joueur sans re-sérialiser toute la collection ni les snapshots.
 * @param {object|null} existing - État actuel en base
 * @param {object} merged - Nouvel état fusionné
 * @param {number} clientTimestamp - Horodatage soumis par le client
 * @returns {boolean} Vrai si une écriture en base est nécessaire
 */
function hasUserAccountChanged(existing, merged, clientTimestamp) {
  if (!existing || !existing.code) return true;
  if (existing.wikithunes !== merged.wikithunes) return true;
  if (existing.freeBoostersCount !== merged.freeBoostersCount) return true;
  if (existing.lastDailyClaimDate !== merged.lastDailyClaimDate) return true;
  if (existing.lastFreeBoostersResetTime !== merged.lastFreeBoostersResetTime)
    return true;

  const existingCol = Array.isArray(existing.collection) ? existing.collection : [];
  const mergedCol = Array.isArray(merged.collection) ? merged.collection : [];
  if (existingCol.length !== mergedCol.length) return true;

  const sumCopies = (col) =>
    col.reduce((acc, c) => acc + (Number(c?.count) || 1), 0);
  if (sumCopies(existingCol) !== sumCopies(mergedCol)) return true;

  if (
    (existing.claimedMarketWins?.length || 0) !==
    (merged.claimedMarketWins?.length || 0)
  )
    return true;
  if (
    (existing.readNotifIds?.length || 0) !==
    (merged.readNotifIds?.length || 0)
  )
    return true;
  if (
    (existing.dismissedNotifIds?.length || 0) !==
    (merged.dismissedNotifIds?.length || 0)
  )
    return true;
  if ((existing.snapshots?.length || 0) !== (merged.snapshots?.length || 0))
    return true;

  if (clientTimestamp > 0 && clientTimestamp !== Number(existing.updatedAt || 0))
    return true;

  if (
    JSON.stringify(existing.favorites || []) !==
    JSON.stringify(merged.favorites || [])
  )
    return true;
  if (
    JSON.stringify(existing.stats || {}) !== JSON.stringify(merged.stats || {})
  )
    return true;
  if (
    JSON.stringify(existing.profile || {}) !==
    JSON.stringify(merged.profile || {})
  )
    return true;

  return false;
}

/**
 * Construit la représentation publique sécurisée d'un joueur lors de l'inspection par un pair (`PUB-XXXXXXXX`).
 * Ne contient jamais le code secret `WIKI-...` ni les paramètres privés.
 *
 * @param {object} user - Données complètes du joueur en base
 * @returns {object} Profil public anonymisé
 */
function buildPublicPeerProfile(user) {
  const pubId = user.publicId || toPublicUserId(user.code);
  return {
    code: pubId,
    publicId: pubId,
    profile: user.profile || {},
    collection: Array.isArray(user.collection) ? user.collection : [],
    wikithunes: typeof user.wikithunes === 'number' ? user.wikithunes : 0,
    stats: user.stats || {},
    createdAt: user.createdAt || 0,
    snapshots: Array.isArray(user.snapshots) ? user.snapshots.slice(-30) : [],
    updatedAt: user.updatedAt || 0,
  };
}

/**
 * Traite les requêtes HTTP ciblant les routes `/api/users`.
 *
 * @param {import('node:http').IncomingMessage} req - Requête HTTP entrante
 * @param {import('node:http').ServerResponse} res - Réponse HTTP sortante
 * @param {string} pathname - Chemin d'accès de l'URL
 * @param {URL} [urlObj] - Objet URL complet
 * @returns {Promise<boolean>} Vrai si la requête a été prise en charge
 */
export async function handleUsersRoute(req, res, pathname, urlObj) {
  const viewerCode = sanitizeCode(req.headers?.['x-user-code'] || '');

  // 1. Annuaire public des joueurs : GET /api/users (pré-indexé en SQLite, codes secrets masqués)
  if (req.method === 'GET' && pathname === '/api/users') {
    const summaries = getAllUserSummaries();
    const users = summaries.map((u) => ({
      ...u,
      code: maskCodeForViewer(u.code, viewerCode),
      publicId: u.publicId || toPublicUserId(u.code),
    }));

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true, users }));
    return true;
  }

  // 2. Opérations sur un compte spécifique : /api/users/:code
  const userMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
  if (!userMatch) {
    return false;
  }

  const rawId = decodeURIComponent(userMatch[1]);
  const cleanCode = sanitizeCode(rawId);
  const isPublicLookup = isPublicUserId(cleanCode);

  if (!cleanCode || (!isPublicLookup && !isValidUserCode(cleanCode))) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: 'Code invalide' }));
    return true;
  }

  // GET /api/users/:id (connexion par code secret OU inspection publique par PUB-XXXXXXXX)
  if (req.method === 'GET') {
    if (isPublicLookup) {
      if (urlObj?.searchParams?.get('login') === '1') {
        res.statusCode = 403;
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Ce code public ne permet pas de se connecter.',
          })
        );
        return true;
      }

      const peer = loadUserFile(cleanCode);
      if (!peer) {
        res.statusCode = 404;
        res.end(JSON.stringify({ ok: false, error: 'Utilisateur introuvable' }));
        return true;
      }

      const responseUser =
        viewerCode && peer.code === viewerCode
          ? peer
          : buildPublicPeerProfile(peer);
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, user: responseUser }));
      return true;
    }

    const clientIp = getClientIp(req);
    if (isLookupRateLimited(clientIp)) {
      res.statusCode = 429;
      res.end(
        JSON.stringify({
          ok: false,
          error: 'Trop de tentatives. Réessayez dans une minute.',
        })
      );
      return true;
    }

    try {
      const consolidated = withTransaction(() => {
        const loaded = loadUserFile(cleanCode);
        if (!loaded) return null;
        const { user, changed } = ensureUnclaimedMarketWinsApplied(
          loaded,
          cleanCode
        );
        if (changed) {
          return saveUserFile(cleanCode, user, { preserveUpdatedAt: true });
        }
        return user;
      });

      if (!consolidated) {
        recordFailedLookup(clientIp);
        res.statusCode = 404;
        res.end(JSON.stringify({ ok: false, error: 'Utilisateur introuvable' }));
        return true;
      }

      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, user: consolidated }));
    } catch {
      res.statusCode = 500;
      res.end(
        JSON.stringify({ ok: false, error: 'Erreur de lecture du profil' })
      );
    }
    return true;
  }

  // POST ou PUT /api/users/:code (synchronisation atomique avec protection anti-écrasement)
  if (req.method === 'POST' || req.method === 'PUT') {
    if (isPublicLookup) {
      res.statusCode = 403;
      res.end(
        JSON.stringify({
          ok: false,
          error: 'Action non autorisée avec un identifiant public.',
        })
      );
      return true;
    }

    const rawBody = await readJsonBody(req);

    const result = withTransaction(() => {
      let existing = loadUserFile(cleanCode);
      const exists = Boolean(existing && existing.code);

      if (exists) {
        const { user: consolidated, changed } = ensureUnclaimedMarketWinsApplied(
          existing,
          cleanCode
        );
        existing = consolidated;
        if (changed) {
          existing = saveUserFile(cleanCode, existing, {
            preserveUpdatedAt: true,
          });
        }
      } else {
        existing = {};
      }

      const body = sanitizeUserPayload(rawBody, existing);
      if (rawBody.forceOverwrite !== undefined)
        body.forceOverwrite = rawBody.forceOverwrite;
      if (rawBody.clientUpdatedAt !== undefined)
        body.clientUpdatedAt = rawBody.clientUpdatedAt;

      // Protection anti-écrasement : si le serveur possède une mutation asynchrone plus récente
      if (exists && existing.code && !body.forceOverwrite) {
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
        const incomingUpdatedAt = Number(
          body.clientUpdatedAt || body.updatedAt || 0
        );
        const serverAdminOverrideAt = Number(existing.adminOverrideAt || 0);
        const clientAdminOverrideAt = Number(rawBody.adminOverrideAt || 0);

        const hasUnacknowledgedManualEdit =
          serverAdminOverrideAt > 0 &&
          clientAdminOverrideAt < serverAdminOverrideAt;

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
          return { user: existing, serverIsNewer: true };
        }
      }

      const now = Date.now();
      const clientTimestamp = Number(
        body.clientUpdatedAt || body.updatedAt || 0
      );
      const {
        clientUpdatedAt: _omitClientTs,
        forceOverwrite: _omitForce,
        ...cleanBody
      } = body;

      const existingClaimDate = String(existing.lastDailyClaimDate || '');
      const incomingClaimDate = String(cleanBody.lastDailyClaimDate || '');
      const resolvedClaimDate =
        incomingClaimDate > existingClaimDate
          ? incomingClaimDate
          : existingClaimDate;

      const existingWins = Array.isArray(existing.claimedMarketWins)
        ? existing.claimedMarketWins
        : [];
      const incomingWins = Array.isArray(cleanBody.claimedMarketWins)
        ? cleanBody.claimedMarketWins
        : [];
      const mergedWins = Array.from(
        new Set([...existingWins, ...incomingWins])
      ).slice(-200);

      let mergedCollection = Array.isArray(cleanBody.collection)
        ? cleanBody.collection
        : existing.collection || [];

      if (
        existingWins.length > incomingWins.length &&
        Array.isArray(cleanBody.collection)
      ) {
        const missingWinIds = existingWins.filter(
          (id) => !incomingWins.includes(id)
        );
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
            // Ignorer
          }
        }
      }

      const merged = {
        ...existing,
        ...cleanBody,
        collection: mergedCollection,
        claimedMarketWins: mergedWins,
        code: cleanCode,
        publicId: toPublicUserId(cleanCode),
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

      let persisted = merged;
      if (hasUserAccountChanged(existing, merged, clientTimestamp)) {
        merged.updatedAt = exists
          ? Math.max(now, clientTimestamp)
          : clientTimestamp || now;
        persisted = saveUserFile(cleanCode, merged, {
          preserveUpdatedAt: true,
        });
      }

      return { user: persisted, serverIsNewer: false };
    });

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ok: true,
        user: result.user,
        serverIsNewer: result.serverIsNewer,
      })
    );
    return true;
  }

  // DELETE /api/users/:code (suppression de compte et nettoyage en cascade transactionnel)
  if (req.method === 'DELETE') {
    if (isPublicLookup) {
      res.statusCode = 403;
      res.end(
        JSON.stringify({
          ok: false,
          error: 'Action non autorisée avec un identifiant public.',
        })
      );
      return true;
    }

    withTransaction(() => {
      deleteUserFile(cleanCode);

      const allListings = loadJsonArrayFile(marketFile);
      const nextListings = allListings.filter((l) => l.sellerCode !== cleanCode);
      if (nextListings.length !== allListings.length) {
        saveJsonArrayFile(marketFile, nextListings);
      }

      const allTrades = loadJsonArrayFile(tradesFile);
      const nextTrades = allTrades.filter(
        (t) => t.fromCode !== cleanCode && t.toCode !== cleanCode
      );
      if (nextTrades.length !== allTrades.length) {
        saveJsonArrayFile(tradesFile, nextTrades);
      }
    });

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
