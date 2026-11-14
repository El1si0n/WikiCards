/**
 * @file Rôle : Routeur proxy pour l'API Wikimedia Pageviews avec gestion d'erreurs et mise en cache silencieuse.
 * Dépendances : Aucune (utilise l'API globale `fetch`).
 * Effets de bord : Appels réseau sortants vers `wikimedia.org`, cache mémoire TTL.
 */

const pageviewsCache = new Map();
const PAGEVIEWS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 heure de cache mémoire
const MAX_PAGEVIEWS_CACHE_SIZE = 1500;

/**
 * Traite les requêtes de proxy vers l'API Wikimedia Pageviews (`GET /api/pageviews`).
 * Évite les erreurs 404 rouges dans la console du navigateur lorsqu'un article n'a aucune vue.
 *
 * @param {import('node:http').IncomingMessage} _req - Requête HTTP entrante
 * @param {import('node:http').ServerResponse} res - Réponse HTTP sortante
 * @param {URL} urlObj - URL analysée de la requête
 * @returns {Promise<boolean>} Vrai si la requête a été traitée
 */
export async function handlePageviewsRoute(_req, res, urlObj) {
  if (urlObj.pathname !== '/api/pageviews') {
    return false;
  }

  const title = urlObj.searchParams.get('title') || '';
  const start = urlObj.searchParams.get('start') || '';
  const end = urlObj.searchParams.get('end') || '';

  if (!title || !start || !end) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, views: 0 }));
    return true;
  }

  const normalizedTitle = title.trim().replace(/ /g, '_');
  const cacheKey = `${normalizedTitle}::${start}::${end}`;
  const now = Date.now();
  const cached = pageviewsCache.get(cacheKey);
  if (cached && now < cached.expiry) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, views: cached.views }));
    return true;
  }

  try {
    const wikiUrl = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/user/${encodeURIComponent(normalizedTitle)}/daily/${start}/${end}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2200);

    const wikiRes = await fetch(wikiUrl, {
      headers: { 'User-Agent': 'WikiCards/1.0 (https://wikicards.elision.dev)' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    let views = 0;
    if (wikiRes.ok) {
      const data = await wikiRes.json();
      views = Array.isArray(data?.items)
        ? data.items.reduce((sum, item) => sum + (item.views || 0), 0)
        : 0;
    }

    if (pageviewsCache.size >= MAX_PAGEVIEWS_CACHE_SIZE) {
      const oldestKey = pageviewsCache.keys().next().value;
      if (oldestKey !== undefined) pageviewsCache.delete(oldestKey);
    }
    pageviewsCache.set(cacheKey, {
      views,
      expiry: Date.now() + PAGEVIEWS_CACHE_TTL_MS,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, views }));
    return true;
  } catch {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, views: 0 }));
    return true;
  }
}
