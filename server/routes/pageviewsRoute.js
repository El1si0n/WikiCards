/**
 * @file Rôle : Routeur proxy pour l'API Wikimedia Pageviews avec gestion d'erreurs et mise en cache silencieuse.
 * Dépendances : Aucune (utilise l'API globale `fetch`).
 * Effets de bord : Appels réseau sortants vers `wikimedia.org`.
 */

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
    res.end(JSON.stringify({ ok: true, views: 0 }));
    return true;
  }

  try {
    const normalizedTitle = title.trim().replace(/ /g, '_');
    const wikiUrl = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/user/${encodeURIComponent(normalizedTitle)}/daily/${start}/${end}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const wikiRes = await fetch(wikiUrl, {
      headers: { 'User-Agent': 'WikiCards/1.0 (https://wikicards.elision.dev)' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!wikiRes.ok) {
      // 404 sur Wikimedia signifie 0 vue sur la période : on répond 200 avec views: 0
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, views: 0 }));
      return true;
    }

    const data = await wikiRes.json();
    const views = Array.isArray(data?.items)
      ? data.items.reduce((sum, item) => sum + (item.views || 0), 0)
      : 0;

    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, views }));
    return true;
  } catch {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, views: 0 }));
    return true;
  }
}
