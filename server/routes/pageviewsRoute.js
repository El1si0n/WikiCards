/**
 * @file Rôle : Routeur proxy pour l'API Wikimedia Pageviews (unitaire + batch) avec cache RAM, cache SQLite 24h et cache Edge Cloudflare 24h.
 * Dépendances : `../utils/jsonStorage.js`.
 * Effets de bord : Appels réseau sortants vers `wikimedia.org`, cache mémoire TTL, lecture/écriture SQLite `pageviews_cache`.
 */

import {
  readJsonBody,
  getCachedPageviewsBatch,
  saveCachedPageviewsBatch,
} from '../utils/jsonStorage.js';

const pageviewsCache = new Map();
const PAGEVIEWS_RAM_TTL_MS = 6 * 60 * 60 * 1000; // 6 heures en RAM
const PAGEVIEWS_DB_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures en SQLite
const MAX_PAGEVIEWS_CACHE_SIZE = 2000;
const DATE_PARAM_RE = /^\d{8,10}$/;

function setPublicEdgeCacheHeaders(res) {
  res.removeHeader('Pragma');
  res.removeHeader('Expires');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
}

function setRamCachedView(cacheKey, views) {
  if (pageviewsCache.size >= MAX_PAGEVIEWS_CACHE_SIZE) {
    const oldestKey = pageviewsCache.keys().next().value;
    if (oldestKey !== undefined) pageviewsCache.delete(oldestKey);
  }
  pageviewsCache.set(cacheKey, {
    views,
    expiry: Date.now() + PAGEVIEWS_RAM_TTL_MS,
  });
}

/**
 * Interroge l'API Wikimedia Pageviews pour un titre unique.
 * Retourne `{ views, cacheable }` (ne met pas en cache les erreurs réseau transitoires).
 *
 * @param {string} normalizedTitle - Titre normalisé avec underscores
 * @param {string} start - Date début YYYYMMDD00
 * @param {string} end - Date fin YYYYMMDD00
 * @returns {Promise<{ views: number, cacheable: boolean }>}
 */
async function fetchSingleFromWikimedia(normalizedTitle, start, end) {
  const wikiUrl = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/user/${encodeURIComponent(normalizedTitle)}/daily/${start}/${end}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const wikiRes = await fetch(wikiUrl, {
      headers: { 'User-Agent': 'WikiCards/1.0 (https://wikicards.elision.dev)' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (wikiRes.ok) {
      const data = await wikiRes.json();
      const views = Array.isArray(data?.items)
        ? data.items.reduce((sum, item) => sum + (item.views || 0), 0)
        : 0;
      return { views, cacheable: true };
    }

    if (wikiRes.status === 404) {
      return { views: 0, cacheable: true };
    }

    return { views: 0, cacheable: false };
  } catch {
    return { views: 0, cacheable: false };
  }
}

/**
 * Résout un lot de titres Wikipédia en combinant cache RAM, cache SQLite 24h et appels Wikimedia parallèles.
 *
 * @param {string[]} rawTitles - Liste de titres d'articles
 * @param {string} start - Date de début
 * @param {string} end - Date de fin
 * @returns {Promise<{ viewsByTitle: Record<string, number>, allCacheable: boolean }>}
 */
async function resolvePageviewsBatch(rawTitles, start, end) {
  const now = Date.now();
  const uniqueEntries = [];
  const seenNormalized = new Set();

  for (const rawTitle of rawTitles) {
    const clean = String(rawTitle || '').trim();
    if (!clean) continue;
    const normalized = clean.replace(/ /g, '_');
    const cacheKey = `${normalized}::${start}::${end}`;
    if (seenNormalized.has(cacheKey)) continue;
    seenNormalized.add(cacheKey);
    uniqueEntries.push({ rawTitle: clean, normalized, cacheKey });
  }

  const viewsByKey = new Map();
  const missingAfterRam = [];

  for (const entry of uniqueEntries) {
    const ramHit = pageviewsCache.get(entry.cacheKey);
    if (ramHit && now < ramHit.expiry) {
      viewsByKey.set(entry.cacheKey, ramHit.views);
    } else {
      missingAfterRam.push(entry);
    }
  }

  const missingAfterDb = [];
  if (missingAfterRam.length > 0) {
    const dbHits = getCachedPageviewsBatch(
      missingAfterRam.map((e) => e.cacheKey)
    );
    for (const entry of missingAfterRam) {
      if (dbHits.has(entry.cacheKey)) {
        const v = dbHits.get(entry.cacheKey);
        viewsByKey.set(entry.cacheKey, v);
        setRamCachedView(entry.cacheKey, v);
      } else {
        missingAfterDb.push(entry);
      }
    }
  }

  let allCacheable = true;
  if (missingAfterDb.length > 0) {
    const fetchedResults = await Promise.all(
      missingAfterDb.map(async (entry) => ({
        entry,
        ...(await fetchSingleFromWikimedia(entry.normalized, start, end)),
      }))
    );

    const dbEntriesToSave = [];
    const expiresAt = Date.now() + PAGEVIEWS_DB_TTL_MS;
    for (const resItem of fetchedResults) {
      viewsByKey.set(resItem.entry.cacheKey, resItem.views);
      if (resItem.cacheable) {
        setRamCachedView(resItem.entry.cacheKey, resItem.views);
        dbEntriesToSave.push({
          cacheKey: resItem.entry.cacheKey,
          views: resItem.views,
          expiresAt,
        });
      } else {
        allCacheable = false;
      }
    }

    if (dbEntriesToSave.length > 0) {
      try {
        saveCachedPageviewsBatch(dbEntriesToSave);
      } catch {
        // Ignorer une erreur SQLite non bloquante sur le cache
      }
    }
  }

  const viewsByTitle = {};
  for (const rawTitle of rawTitles) {
    const clean = String(rawTitle || '').trim();
    if (!clean) continue;
    const key = `${clean.replace(/ /g, '_')}::${start}::${end}`;
    viewsByTitle[rawTitle] = viewsByKey.get(key) ?? 0;
  }

  return { viewsByTitle, allCacheable };
}

/**
 * Traite les requêtes de proxy vers l'API Wikimedia Pageviews (`GET /api/pageviews` et `POST /api/pageviews/batch`).
 *
 * @param {import('node:http').IncomingMessage} req - Requête HTTP entrante
 * @param {import('node:http').ServerResponse} res - Réponse HTTP sortante
 * @param {URL} urlObj - URL analysée de la requête
 * @returns {Promise<boolean>} Vrai si la requête a été traitée
 */
export async function handlePageviewsRoute(req, res, urlObj) {
  if (urlObj.pathname === '/api/pageviews/batch' && req.method === 'POST') {
    const body = await readJsonBody(req).catch(() => ({}));
    const rawTitles = Array.isArray(body?.titles)
      ? body.titles.slice(0, 18)
      : [];
    const start = String(body?.start || '');
    const end = String(body?.end || '');

    if (
      rawTitles.length === 0 ||
      !DATE_PARAM_RE.test(start) ||
      !DATE_PARAM_RE.test(end)
    ) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: true, viewsByTitle: {} }));
      return true;
    }

    const { viewsByTitle } = await resolvePageviewsBatch(rawTitles, start, end);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true, viewsByTitle }));
    return true;
  }

  if (urlObj.pathname !== '/api/pageviews') {
    return false;
  }

  const title = urlObj.searchParams.get('title') || '';
  const start = urlObj.searchParams.get('start') || '';
  const end = urlObj.searchParams.get('end') || '';

  if (!title || !DATE_PARAM_RE.test(start) || !DATE_PARAM_RE.test(end)) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true, views: 0 }));
    return true;
  }

  const { viewsByTitle, allCacheable } = await resolvePageviewsBatch(
    [title],
    start,
    end
  );
  const views = viewsByTitle[title] ?? 0;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (allCacheable) {
    setPublicEdgeCacheHeaders(res);
  }
  res.end(JSON.stringify({ ok: true, views }));
  return true;
}
