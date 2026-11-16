/**
 * @file Rôle : Contrôleur des routes d'échanges (/api/trades) : consultation, création, acceptation atomique SQLite, refus et annulation.
 * Dépendances : `../utils/jsonStorage.js`, `../utils/validators.js`.
 * Effets de bord : Transactions SQLite atomiques sur `kv_store('trades')` et mise à jour des inventaires `users`.
 */

import {
  tradesFile,
  loadUserFile,
  saveUserFile,
  resolveUserCode,
  loadJsonArrayFile,
  saveJsonArrayFile,
  addCardsToUserCollection,
  removeCardsFromUserCollection,
  readJsonBody,
  withTransaction,
} from '../utils/jsonStorage.js';
import {
  sanitizeCode,
  isPublicUserId,
  maskCodeForViewer,
} from '../utils/validators.js';

/**
 * Masque les codes secrets (`fromCode`, `toCode`) d'une offre d'échange
 * pour les joueurs tiers tout en conservant le code du joueur authentifié.
 *
 * @param {object} trade - Offre d'échange brute stockée en base
 * @param {string} viewerCode - Code secret du joueur effectuant la requête
 * @returns {object} Offre sécurisée pour la réponse HTTP
 */
function formatTradeForClient(trade, viewerCode) {
  if (!trade || typeof trade !== 'object') return trade;
  return {
    ...trade,
    fromCode: maskCodeForViewer(trade.fromCode, viewerCode),
    toCode: maskCodeForViewer(trade.toCode, viewerCode),
  };
}

/**
 * Traite les requêtes HTTP ciblant les routes d'échanges `/api/trades`.
 *
 * @param {import('node:http').IncomingMessage} req - Requête HTTP entrante
 * @param {import('node:http').ServerResponse} res - Réponse HTTP sortante
 * @param {string} pathname - Chemin d'accès de l'URL
 * @param {URL} urlObj - Objet URL complet
 * @returns {Promise<boolean>} Vrai si la requête a été prise en charge
 */
export async function handleTradesRoute(req, res, pathname, urlObj) {
  const headerViewerCode = sanitizeCode(req.headers?.['x-user-code'] || '');

  // 1. Lister les échanges : GET /api/trades (avec filtre optionnel ?code=...)
  if (req.method === 'GET' && pathname === '/api/trades') {
    const rawQueryCode = sanitizeCode(urlObj.searchParams.get('code') || '');
    const viewerCode =
      headerViewerCode ||
      (rawQueryCode && !isPublicUserId(rawQueryCode) ? rawQueryCode : '');
    const filterCode = rawQueryCode ? resolveUserCode(rawQueryCode) : '';

    const allTrades = loadJsonArrayFile(tradesFile);
    const filtered = rawQueryCode
      ? filterCode
        ? allTrades.filter(
            (t) => t.fromCode === filterCode || t.toCode === filterCode
          )
        : []
      : allTrades;
    filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const safeTrades = filtered.map((t) => formatTradeForClient(t, viewerCode));
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, trades: safeTrades }));
    return true;
  }

  // 2. Créer une nouvelle offre d'échange : POST /api/trades
  if (req.method === 'POST' && pathname === '/api/trades') {
    const body = await readJsonBody(req);
    const fromCode = sanitizeCode(body.fromCode);
    const viewerCode = headerViewerCode || fromCode;

    if (!fromCode || isPublicUserId(fromCode)) {
      res.statusCode = 403;
      res.end(
        JSON.stringify({
          ok: false,
          error: 'Code utilisateur émetteur invalide.',
        })
      );
      return true;
    }

    const offeredCards = Array.isArray(body.offeredCards)
      ? body.offeredCards
      : [];
    const requestedCards = Array.isArray(body.requestedCards)
      ? body.requestedCards
      : [];

    if (offeredCards.length === 0 && requestedCards.length === 0) {
      res.statusCode = 400;
      res.end(
        JSON.stringify({
          ok: false,
          error: 'Sélectionnez au moins une carte pour créer une offre.',
        })
      );
      return true;
    }

    const outcome = withTransaction(() => {
      const toCode = resolveUserCode(body.toCode);
      if (!toCode || fromCode === toCode) {
        return {
          status: 400,
          error: 'Codes utilisateurs invalides pour cet échange.',
        };
      }

      const fromUser = loadUserFile(fromCode);
      const toUser = loadUserFile(toCode);
      if (!fromUser || !toUser) {
        return {
          status: 404,
          error: 'Un des deux profils est introuvable.',
        };
      }

      const allTrades = loadJsonArrayFile(tradesFile);
      const newTrade = {
        id: `TRD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        fromCode,
        fromUsername: fromUser.profile?.username || fromCode,
        fromAvatar:
          fromUser.profile?.avatar ||
          'https://fr.wikipedia.org/static/images/icons/wikipedia.png',
        toCode,
        toUsername: toUser.profile?.username || toCode,
        toAvatar:
          toUser.profile?.avatar ||
          'https://fr.wikipedia.org/static/images/icons/wikipedia.png',
        offeredCards,
        requestedCards,
        status: 'pending', // 'pending' | 'accepted' | 'declined' | 'cancelled'
        createdAt: Date.now(),
      };

      allTrades.unshift(newTrade);
      saveJsonArrayFile(tradesFile, allTrades);

      return {
        status: 200,
        trade: formatTradeForClient(newTrade, viewerCode),
      };
    });

    res.statusCode = outcome.status;
    if (outcome.error) {
      res.end(JSON.stringify({ ok: false, error: outcome.error }));
    } else {
      res.end(JSON.stringify({ ok: true, trade: outcome.trade }));
    }
    return true;
  }

  // 3. Actions sur une offre : POST /api/trades/:id/(accept|decline|cancel)
  const tradeActionMatch = pathname.match(
    /^\/api\/trades\/([^/]+)\/(accept|decline|cancel)$/
  );
  if (req.method === 'POST' && tradeActionMatch) {
    const rawBody = await readJsonBody(req).catch(() => ({}));
    const actorCode = sanitizeCode(rawBody?.userCode || '') || headerViewerCode;
    const tradeId = decodeURIComponent(tradeActionMatch[1]);
    const action = tradeActionMatch[2];

    if (!actorCode || isPublicUserId(actorCode)) {
      res.statusCode = 403;
      res.end(JSON.stringify({ ok: false, error: 'Action non autorisée.' }));
      return true;
    }

    const outcome = withTransaction(() => {
      const allTrades = loadJsonArrayFile(tradesFile);
      const idx = allTrades.findIndex((t) => t.id === tradeId);

      if (idx === -1) {
        return { status: 404, error: 'Offre introuvable.' };
      }

      const trade = allTrades[idx];
      if (trade.status !== 'pending') {
        return { status: 400, error: 'Cette offre a déjà été traitée.' };
      }

      if (action === 'cancel' && trade.fromCode !== actorCode) {
        return { status: 403, error: 'Action non autorisée.' };
      }
      if (
        (action === 'accept' || action === 'decline') &&
        trade.toCode !== actorCode
      ) {
        return { status: 403, error: 'Action non autorisée.' };
      }

      if (action === 'decline' || action === 'cancel') {
        trade.status = action === 'decline' ? 'declined' : 'cancelled';
        trade.resolvedAt = Date.now();
        saveJsonArrayFile(tradesFile, allTrades);
        return {
          status: 200,
          trade: formatTradeForClient(trade, actorCode),
        };
      }

      // Action === 'accept' : transfert atomique croisé des cartes entre fromUser et toUser
      const fromUser = loadUserFile(trade.fromCode);
      const toUser = loadUserFile(trade.toCode);
      if (!fromUser || !toUser) {
        return { status: 404, error: 'Un des joueurs est introuvable.' };
      }

      const remFrom = removeCardsFromUserCollection(
        fromUser.collection || [],
        trade.offeredCards || []
      );
      if (!remFrom.ok) {
        return {
          status: 400,
          error: `${trade.fromUsername} ne possède plus toutes les cartes proposées.`,
        };
      }

      const remTo = removeCardsFromUserCollection(
        toUser.collection || [],
        trade.requestedCards || []
      );
      if (!remTo.ok) {
        return {
          status: 400,
          error:
            'Vous ne possédez plus toutes les cartes demandées dans cet échange.',
        };
      }

      const nextFromCol = addCardsToUserCollection(
        remFrom.collection,
        trade.requestedCards || []
      );
      const nextToCol = addCardsToUserCollection(
        remTo.collection,
        trade.offeredCards || []
      );

      const updatedFrom = saveUserFile(trade.fromCode, {
        ...fromUser,
        collection: nextFromCol,
      });
      const updatedTo = saveUserFile(trade.toCode, {
        ...toUser,
        collection: nextToCol,
      });

      trade.status = 'accepted';
      trade.resolvedAt = Date.now();
      saveJsonArrayFile(tradesFile, allTrades);

      const updatedUser =
        actorCode === trade.fromCode ? updatedFrom : updatedTo;

      return {
        status: 200,
        trade: formatTradeForClient(trade, actorCode),
        updatedUser,
      };
    });

    res.statusCode = outcome.status;
    if (outcome.error) {
      res.end(JSON.stringify({ ok: false, error: outcome.error }));
    } else {
      res.end(
        JSON.stringify({
          ok: true,
          trade: outcome.trade,
          updatedUser: outcome.updatedUser,
        })
      );
    }
    return true;
  }

  return false;
}
