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
  readJsonBody,
  registerDirectoryCacheInvalidator,
} from '../utils/jsonStorage.js';
import { sanitizeCode, sanitizeUserPayload } from '../utils/validators.js';

let cachedUsersDirectoryJson = null;
let cachedUsersDirectoryExpiry = 0;
const DIRECTORY_CACHE_TTL_MS = 5000;

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
        const raw = fs.readFileSync(path.join(usersDir, file), 'utf-8');
        const parsed = JSON.parse(raw);
        const col = Array.isArray(parsed.collection) ? parsed.collection : [];
        const showcaseIds = Array.isArray(parsed.profile?.showcaseIds)
          ? parsed.profile.showcaseIds
          : [];
        const showcaseCards = showcaseIds
          .map((id) => (id ? col.find((c) => String(c.id) === String(id)) || null : null))
          .filter(Boolean);

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
          gifCount: col.filter(
            (c) =>
              c.isFoil ||
              c.isShiny ||
              c.isGif ||
              (typeof c.image === 'string' && c.image.toLowerCase().includes('.gif'))
          ).length,
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
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, user: JSON.parse(raw) }));
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
        existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch {
        existing = {};
      }
    }

    const body = sanitizeUserPayload(rawBody, existing);
    if (rawBody.forceOverwrite !== undefined) body.forceOverwrite = rawBody.forceOverwrite;
    if (rawBody.clientUpdatedAt !== undefined) body.clientUpdatedAt = rawBody.clientUpdatedAt;

    // Protection anti-écrasement : si un appareil obsolète tente d'écraser une session plus récente
    if (fileExists && existing.code && !body.forceOverwrite) {
      const existingDraws = Number(existing.stats?.totalCardsDrawn || 0);
      const existingBoosters = Number(existing.stats?.boostersOpened || 0);
      const incomingDraws = Number(body.stats?.totalCardsDrawn || 0);
      const incomingBoosters = Number(body.stats?.boostersOpened || 0);
      const existingUpdatedAt = Number(existing.updatedAt || 0);
      const incomingUpdatedAt = Number(body.clientUpdatedAt || body.updatedAt || 0);

      const isIncomingStrictlyOlder =
        incomingUpdatedAt > 0 &&
        existingUpdatedAt > 0 &&
        incomingUpdatedAt < existingUpdatedAt;

      const isIncomingBehindInProgress =
        (incomingDraws < existingDraws || incomingBoosters < existingBoosters) &&
        incomingUpdatedAt <= existingUpdatedAt;

      if (isIncomingStrictlyOlder && isIncomingBehindInProgress) {
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

    const merged = {
      ...existing,
      ...cleanBody,
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
