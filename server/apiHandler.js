/**
 * @file Rôle : Contrôleur et routeur HTTP autonome pour l'ensemble des routes /api/* (users, trades, market, proxy).
 * Dépendances : `./routes/pageviewsRoute.js`, `./routes/usersRoute.js`, `./routes/tradesRoute.js`, `./routes/marketRoute.js`.
 * Effets de bord : Dispatch des requêtes API et écriture de réponses HTTP JSON.
 */

import { handlePageviewsRoute } from './routes/pageviewsRoute.js';
import { handleUsersRoute } from './routes/usersRoute.js';
import { handleTradesRoute } from './routes/tradesRoute.js';
import { handleMarketRoute } from './routes/marketRoute.js';

/**
 * Traite les requêtes HTTP entrantes préfixées par `/api/`.
 * Distribue les requêtes vers les sous-routeurs spécialisés et intercepte toute exception.
 *
 * @param {import('node:http').IncomingMessage} req - Requête HTTP entrante
 * @param {import('node:http').ServerResponse} res - Réponse HTTP sortante
 * @returns {Promise<boolean>} Vrai si la requête a été prise en charge par ce routeur, faux sinon
 */
export async function handleApiRequest(req, res) {
  if (!req.url || !req.url.startsWith('/api/')) {
    return false;
  }

  if (res.headersSent) {
    return true;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const urlObj = new URL(req.url, 'http://localhost');
    const pathname = urlObj.pathname;

    // 1. Healthchecks API
    if (pathname === '/api/health' || pathname === '/api/ping') {
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, status: 'healthy' }));
      return true;
    }

    // 2. Proxy Wikimedia Pageviews (/api/pageviews)
    if (await handlePageviewsRoute(req, res, urlObj)) {
      return true;
    }

    // 3. Utilisateurs (/api/users)
    if (await handleUsersRoute(req, res, pathname)) {
      return true;
    }

    // 4. Échanges entre joueurs (/api/trades)
    if (await handleTradesRoute(req, res, pathname, urlObj)) {
      return true;
    }

    // 5. Marché aux enchères et ventes directes (/api/market)
    if (await handleMarketRoute(req, res, pathname)) {
      return true;
    }

    // 6. Route inconnue
    if (!res.headersSent) {
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false, error: 'Route inconnue' }));
    }
    return true;
  } catch (err) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          ok: false,
          error: err?.message || 'Erreur serveur',
        })
      );
    }
    return true;
  }
}
