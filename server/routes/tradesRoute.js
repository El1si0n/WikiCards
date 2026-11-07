/**
 * @file Rôle : Contrôleur des routes d'échanges (/api/trades) : consultation, création, acceptation atomique, refus et annulation.
 * Dépendances : `../utils/jsonStorage.js`, `../utils/validators.js`.
 * Effets de bord : Lecture et écriture atomique dans `data/trades.json` sous verrou de concurrence ('trades') et mise à jour des inventaires dans `data/users/`.
 */

import {
  tradesFile,
  loadUserFile,
  saveUserFile,
  loadJsonArrayFile,
  saveJsonArrayFile,
  addCardsToUserCollection,
  removeCardsFromUserCollection,
  readJsonBody,
  withLock,
} from '../utils/jsonStorage.js';
import { sanitizeCode } from '../utils/validators.js';

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
  // 1. Lister les échanges : GET /api/trades (avec filtre optionnel ?code=...)
  if (req.method === 'GET' && pathname === '/api/trades') {
    const filterCode = sanitizeCode(urlObj.searchParams.get('code') || '');
    const allTrades = loadJsonArrayFile(tradesFile);
    const filtered = filterCode
      ? allTrades.filter(
          (t) => t.fromCode === filterCode || t.toCode === filterCode
        )
      : allTrades;
    filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, trades: filtered }));
    return true;
  }

  // 2. Créer une nouvelle offre d'échange : POST /api/trades
  if (req.method === 'POST' && pathname === '/api/trades') {
    return await withLock('trades', async () => {
      const body = await readJsonBody(req);
      const fromCode = sanitizeCode(body.fromCode);
      const toCode = sanitizeCode(body.toCode);

      if (!fromCode || !toCode || fromCode === toCode) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Codes utilisateurs invalides pour cet échange.',
          })
        );
        return true;
      }

      const fromUser = loadUserFile(fromCode);
      const toUser = loadUserFile(toCode);
      if (!fromUser || !toUser) {
        res.statusCode = 404;
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Un des deux profils est introuvable.',
          })
        );
        return true;
      }

      const offeredCards = Array.isArray(body.offeredCards) ? body.offeredCards : [];
      const requestedCards = Array.isArray(body.requestedCards) ? body.requestedCards : [];

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

      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, trade: newTrade }));
      return true;
    });
  }

  // 3. Actions sur une offre : POST /api/trades/:id/(accept|decline|cancel)
  const tradeActionMatch = pathname.match(
    /^\/api\/trades\/([^/]+)\/(accept|decline|cancel)$/
  );
  if (req.method === 'POST' && tradeActionMatch) {
    return await withLock('trades', async () => {
      const tradeId = decodeURIComponent(tradeActionMatch[1]);
      const action = tradeActionMatch[2];
      const allTrades = loadJsonArrayFile(tradesFile);
      const idx = allTrades.findIndex((t) => t.id === tradeId);

      if (idx === -1) {
        res.statusCode = 404;
        res.end(JSON.stringify({ ok: false, error: 'Offre introuvable.' }));
        return true;
      }

      const trade = allTrades[idx];
      if (trade.status !== 'pending') {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Cette offre a déjà été traitée.',
          })
        );
        return true;
      }

      if (action === 'decline' || action === 'cancel') {
        trade.status = action === 'decline' ? 'declined' : 'cancelled';
        trade.resolvedAt = Date.now();
        saveJsonArrayFile(tradesFile, allTrades);
        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true, trade }));
        return true;
      }

      // Action === 'accept' : transfert atomique croisé des cartes entre fromUser et toUser
      const fromUser = loadUserFile(trade.fromCode);
      const toUser = loadUserFile(trade.toCode);
      if (!fromUser || !toUser) {
        res.statusCode = 404;
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Un des joueurs est introuvable.',
          })
        );
        return true;
      }

      const remFrom = removeCardsFromUserCollection(
        fromUser.collection || [],
        trade.offeredCards || []
      );
      if (!remFrom.ok) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            ok: false,
            error: `${trade.fromUsername} ne possède plus toutes les cartes proposées.`,
          })
        );
        return true;
      }

      const remTo = removeCardsFromUserCollection(
        toUser.collection || [],
        trade.requestedCards || []
      );
      if (!remTo.ok) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Vous ne possédez plus toutes les cartes demandées dans cet échange.',
          })
        );
        return true;
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

      res.statusCode = 200;
      res.end(
        JSON.stringify({
          ok: true,
          trade,
          updatedFrom,
          updatedTo,
        })
      );
      return true;
    });
  }

  return false;
}
