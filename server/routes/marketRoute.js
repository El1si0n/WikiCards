/**
 * @file Rôle : Contrôleur du marché aux enchères et ventes directes (/api/market).
 * Dépendances : `../utils/jsonStorage.js`, `../utils/validators.js`.
 * Effets de bord : Lecture et écriture atomique dans `data/market.json` sous verrou de concurrence ('market') et synchronisation financière dans `data/users/`.
 */

import {
  marketFile,
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

/** Durée initiale d'une enchère à compter de la 1re offre (24 heures) */
export const AUCTION_DURATION_MS = 24 * 60 * 60 * 1000;
/** Seuil de déclenchement de l'anti-sniping (5 minutes avant la fin) */
export const ANTI_SNIPE_WINDOW_MS = 5 * 60 * 1000;
/** Durée de prolongation en cas d'enchère dans la fenêtre d'anti-sniping (+5 minutes) */
export const ANTI_SNIPE_EXTENSION_MS = 5 * 60 * 1000;

/**
 * Clôture automatiquement les enchères dont le délai de 24h est écoulé.
 * Verse les Wikithunes au vendeur, attribue la carte au meilleur enchérisseur et persiste le résultat.
 *
 * @param {Array<object>} listings - Liste courante des annonces
 * @returns {Array<object>} Liste mise à jour
 */
export function resolveExpiredMarketAuctions(listings) {
  const now = Date.now();
  let changed = false;

  for (const listing of listings) {
    if (
      listing.status === 'active' &&
      listing.highestBidderCode &&
      listing.bidExpiresAt &&
      now >= listing.bidExpiresAt
    ) {
      const seller = loadUserFile(listing.sellerCode);
      const winner = loadUserFile(listing.highestBidderCode);

      if (seller) {
        saveUserFile(listing.sellerCode, {
          ...seller,
          wikithunes: (seller.wikithunes || 0) + listing.currentBid,
        });
      }

      if (winner) {
        const nextCol = addCardsToUserCollection(
          winner.collection || [],
          [{ card: listing.card, qty: 1 }]
        );
        saveUserFile(listing.highestBidderCode, {
          ...winner,
          collection: nextCol,
        });
      }

      listing.status = 'sold';
      listing.buyerCode = listing.highestBidderCode;
      listing.buyerUsername = listing.highestBidderUsername;
      listing.finalPrice = listing.currentBid;
      listing.resolvedAt = listing.bidExpiresAt;
      changed = true;
    }
  }

  if (changed) {
    saveJsonArrayFile(marketFile, listings);
  }
  return listings;
}

/**
 * Traite les requêtes HTTP ciblant les routes du marché `/api/market`.
 *
 * @param {import('node:http').IncomingMessage} req - Requête HTTP entrante
 * @param {import('node:http').ServerResponse} res - Réponse HTTP sortante
 * @param {string} pathname - Chemin d'accès de l'URL
 * @returns {Promise<boolean>} Vrai si la requête a été prise en charge
 */
export async function handleMarketRoute(req, res, pathname) {
  // 1. Consulter les annonces : GET /api/market
  if (req.method === 'GET' && pathname === '/api/market') {
    let listings = loadJsonArrayFile(marketFile);
    listings = resolveExpiredMarketAuctions(listings);
    listings.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, listings }));
    return true;
  }

  // 2. Créer une nouvelle annonce : POST /api/market
  if (req.method === 'POST' && pathname === '/api/market') {
    return await withLock('market', async () => {
      const body = await readJsonBody(req);
      const sellerCode = sanitizeCode(body.sellerCode);
      const cardId = String(body.cardId || '');
      const buyoutPrice = Math.max(10, Math.round(Number(body.buyoutPrice || 100)));
      const startingBid = Math.max(
        5,
        Math.min(
          buyoutPrice,
          Math.round(Number(body.startingBid || Math.floor(buyoutPrice * 0.6)))
        )
      );

      const seller = loadUserFile(sellerCode);
      if (!seller) {
        res.statusCode = 404;
        res.end(JSON.stringify({ ok: false, error: 'Vendeur introuvable.' }));
        return true;
      }

      const cardObj = (seller.collection || []).find(
        (c) => String(c.id) === cardId
      );
      if (!cardObj) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Carte introuvable dans votre classeur.',
          })
        );
        return true;
      }

      // Retirer 1 exemplaire du classeur du vendeur pour le mettre en vente
      const rem = removeCardsFromUserCollection(seller.collection || [], [
        { id: cardId, qty: 1 },
      ]);
      if (!rem.ok) {
        res.statusCode = 400;
        res.end(JSON.stringify({ ok: false, error: 'Exemplaire indisponible.' }));
        return true;
      }

      const updatedSeller = saveUserFile(sellerCode, {
        ...seller,
        collection: rem.collection,
      });

      const listings = loadJsonArrayFile(marketFile);
      const newListing = {
        id: `MKT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        sellerCode,
        sellerUsername: seller.profile?.username || sellerCode,
        sellerAvatar:
          seller.profile?.avatar ||
          'https://fr.wikipedia.org/static/images/icons/wikipedia.png',
        card: { ...cardObj, count: 1 },
        startingBid,
        currentBid: startingBid,
        highestBidderCode: null,
        highestBidderUsername: null,
        bidExpiresAt: null,
        buyoutPrice,
        status: 'active',
        createdAt: Date.now(),
      };

      listings.unshift(newListing);
      saveJsonArrayFile(marketFile, listings);

      res.statusCode = 200;
      res.end(
        JSON.stringify({
          ok: true,
          listing: newListing,
          updatedUser: updatedSeller,
        })
      );
      return true;
    });
  }

  // 3. Actions sur une annonce : /api/market/:id/(buy|bid|cancel|accept_bid)
  const marketActionMatch = pathname.match(
    /^\/api\/market\/([^/]+)\/(buy|bid|cancel|accept_bid)$/
  );
  if (req.method === 'POST' && marketActionMatch) {
    return await withLock('market', async () => {
      const listingId = decodeURIComponent(marketActionMatch[1]);
    const action = marketActionMatch[2];
    const body = await readJsonBody(req);
    const actorCode = sanitizeCode(body.userCode);

    let listings = loadJsonArrayFile(marketFile);
    listings = resolveExpiredMarketAuctions(listings);
    const idx = listings.findIndex((l) => l.id === listingId);

    if (idx === -1) {
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false, error: 'Annonce introuvable.' }));
      return true;
    }

    const listing = listings[idx];
    if (listing.status !== 'active') {
      res.statusCode = 400;
      res.end(
        JSON.stringify({
          ok: false,
          error: 'Cette vente est déjà terminée.',
        })
      );
      return true;
    }

    // Annuler son annonce (avec réintégration de la carte et remboursement éventuel)
    if (action === 'cancel') {
      if (listing.sellerCode !== actorCode) {
        res.statusCode = 403;
        res.end(JSON.stringify({ ok: false, error: 'Action non autorisée.' }));
        return true;
      }

      // Si quelqu'un avait déjà surenchéri, on lui rembourse sa mise
      if (listing.highestBidderCode) {
        const prevBidder = loadUserFile(listing.highestBidderCode);
        if (prevBidder) {
          saveUserFile(listing.highestBidderCode, {
            ...prevBidder,
            wikithunes:
              (prevBidder.wikithunes || 0) + (listing.currentBid || 0),
          });
        }
      }

      const seller = loadUserFile(listing.sellerCode);
      let updatedSeller = null;
      if (seller) {
        const nextCol = addCardsToUserCollection(
          seller.collection || [],
          [{ card: listing.card, qty: 1 }]
        );
        updatedSeller = saveUserFile(listing.sellerCode, {
          ...seller,
          collection: nextCol,
        });
      }

      listing.status = 'cancelled';
      listing.resolvedAt = Date.now();
      saveJsonArrayFile(marketFile, listings);

      res.statusCode = 200;
      res.end(
        JSON.stringify({
          ok: true,
          listing,
          updatedUser: updatedSeller,
        })
      );
      return true;
    }

    // Accepter manuellement l'enchère actuelle par le vendeur
    if (action === 'accept_bid') {
      if (listing.sellerCode !== actorCode || !listing.highestBidderCode) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Aucune enchère active à accepter.',
          })
        );
        return true;
      }

      const seller = loadUserFile(listing.sellerCode);
      const winner = loadUserFile(listing.highestBidderCode);
      if (!seller || !winner) {
        res.statusCode = 404;
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Profil acheteur ou vendeur introuvable.',
          })
        );
        return true;
      }

      const updatedSeller = saveUserFile(listing.sellerCode, {
        ...seller,
        wikithunes: (seller.wikithunes || 0) + listing.currentBid,
      });

      const nextWinnerCol = addCardsToUserCollection(
        winner.collection || [],
        [{ card: listing.card, qty: 1 }]
      );
      saveUserFile(listing.highestBidderCode, {
        ...winner,
        collection: nextWinnerCol,
      });

      listing.status = 'sold';
      listing.buyerCode = listing.highestBidderCode;
      listing.buyerUsername = listing.highestBidderUsername;
      listing.finalPrice = listing.currentBid;
      listing.resolvedAt = Date.now();
      saveJsonArrayFile(marketFile, listings);

      res.statusCode = 200;
      res.end(
        JSON.stringify({
          ok: true,
          listing,
          updatedUser: updatedSeller,
        })
      );
      return true;
    }

    // Placer une enchère (action === 'bid')
    if (action === 'bid') {
      if (listing.sellerCode === actorCode) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Vous ne pouvez pas enchérir sur votre propre carte.',
          })
        );
        return true;
      }

      const bidAmount = Math.round(Number(body.bidAmount || 0));
      const minRequired = listing.highestBidderCode
        ? listing.currentBid + 10
        : listing.startingBid;

      if (bidAmount < minRequired) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            ok: false,
            error: `L'enchère doit être d'au moins ${minRequired} ₩.`,
          })
        );
        return true;
      }

      const bidder = loadUserFile(actorCode);
      if (!bidder) {
        res.statusCode = 404;
        res.end(JSON.stringify({ ok: false, error: 'Profil introuvable.' }));
        return true;
      }

      // Si c'est le même joueur qui surenchérit, il ne paie que la différence
      const alreadyLocked =
        listing.highestBidderCode === actorCode ? listing.currentBid : 0;
      const toPayNow = bidAmount - alreadyLocked;

      if ((bidder.wikithunes || 0) < toPayNow) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Solde de Wikifeet insuffisant.',
          })
        );
        return true;
      }

      // Rembourser l'ancien enchérisseur s'il est différent
      if (
        listing.highestBidderCode &&
        listing.highestBidderCode !== actorCode
      ) {
        const prevBidder = loadUserFile(listing.highestBidderCode);
        if (prevBidder) {
          saveUserFile(listing.highestBidderCode, {
            ...prevBidder,
            wikithunes:
              (prevBidder.wikithunes || 0) + listing.currentBid,
          });
        }
      }

      const updatedBidder = saveUserFile(actorCode, {
        ...bidder,
        wikithunes: (bidder.wikithunes || 0) - toPayNow,
      });

      const now = Date.now();
      const isFirstBid = !listing.highestBidderCode || !listing.bidExpiresAt;
      let antiSnipeExtended = false;

      listing.currentBid = bidAmount;
      listing.highestBidderCode = actorCode;
      listing.highestBidderUsername = bidder.profile?.username || actorCode;
      listing.lastBidAt = now;

      if (isFirstBid) {
        // La 1re enchère lance le compte à rebours initial de 24h
        listing.firstBidAt = now;
        listing.bidExpiresAt = now + AUCTION_DURATION_MS;
      } else {
        // Surenchère : prolongation anti-sniping uniquement s'il reste moins de 5 minutes,
        // sans jamais dépasser 24h à partir de l'instant présent.
        const remainingMs = listing.bidExpiresAt - now;
        if (remainingMs > 0 && remainingMs < ANTI_SNIPE_WINDOW_MS) {
          const nextExpiry = Math.min(
            now + AUCTION_DURATION_MS,
            listing.bidExpiresAt + ANTI_SNIPE_EXTENSION_MS
          );
          if (nextExpiry > listing.bidExpiresAt) {
            listing.bidExpiresAt = nextExpiry;
            antiSnipeExtended = true;
          }
        }
      }

      // Si l'enchère atteint ou dépasse le prix d'achat immédiat, la vente est conclue immédiatement
      if (bidAmount >= listing.buyoutPrice) {
        const seller = loadUserFile(listing.sellerCode);
        if (seller) {
          saveUserFile(listing.sellerCode, {
            ...seller,
            wikithunes: (seller.wikithunes || 0) + bidAmount,
          });
        }
        const nextBidderCol = addCardsToUserCollection(
          updatedBidder.collection || [],
          [{ card: listing.card, qty: 1 }]
        );
        const finalBidder = saveUserFile(actorCode, {
          ...updatedBidder,
          collection: nextBidderCol,
        });

        listing.status = 'sold';
        listing.buyerCode = actorCode;
        listing.buyerUsername = bidder.profile?.username || actorCode;
        listing.finalPrice = bidAmount;
        listing.resolvedAt = Date.now();
        saveJsonArrayFile(marketFile, listings);

        res.statusCode = 200;
        res.end(
          JSON.stringify({
            ok: true,
            listing,
            updatedUser: finalBidder,
          })
        );
        return true;
      }

      saveJsonArrayFile(marketFile, listings);
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          ok: true,
          listing,
          antiSnipeExtended,
          updatedUser: updatedBidder,
        })
      );
      return true;
    }

    // Achat immédiat direct (action === 'buy')
    if (action === 'buy') {
      if (listing.sellerCode === actorCode) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Vous ne pouvez pas acheter votre propre carte.',
          })
        );
        return true;
      }

      const buyer = loadUserFile(actorCode);
      if (!buyer) {
        res.statusCode = 404;
        res.end(JSON.stringify({ ok: false, error: 'Acheteur introuvable.' }));
        return true;
      }

      const alreadyLocked =
        listing.highestBidderCode === actorCode ? listing.currentBid : 0;
      const priceToPay = listing.buyoutPrice - alreadyLocked;

      if ((buyer.wikithunes || 0) < priceToPay) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Solde de Wikifeet insuffisant.',
          })
        );
        return true;
      }

      // Rembourser l'ancien enchérisseur s'il est différent
      if (
        listing.highestBidderCode &&
        listing.highestBidderCode !== actorCode
      ) {
        const prevBidder = loadUserFile(listing.highestBidderCode);
        if (prevBidder) {
          saveUserFile(listing.highestBidderCode, {
            ...prevBidder,
            wikithunes:
              (prevBidder.wikithunes || 0) + listing.currentBid,
          });
        }
      }

      const seller = loadUserFile(listing.sellerCode);
      if (seller) {
        saveUserFile(listing.sellerCode, {
          ...seller,
          wikithunes: (seller.wikithunes || 0) + listing.buyoutPrice,
        });
      }

      const nextBuyerCol = addCardsToUserCollection(
        buyer.collection || [],
        [{ card: listing.card, qty: 1 }]
      );
      const updatedBuyer = saveUserFile(actorCode, {
        ...buyer,
        wikithunes: (buyer.wikithunes || 0) - priceToPay,
        collection: nextBuyerCol,
      });

      listing.status = 'sold';
      listing.buyerCode = actorCode;
      listing.buyerUsername = buyer.profile?.username || actorCode;
      listing.finalPrice = listing.buyoutPrice;
      listing.resolvedAt = Date.now();
      saveJsonArrayFile(marketFile, listings);

      res.statusCode = 200;
      res.end(
        JSON.stringify({
          ok: true,
          listing,
          updatedUser: updatedBuyer,
        })
      );
      return true;
    }

    return true;
  });
}

  return false;
}
