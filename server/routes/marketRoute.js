/**
 * @file Rôle : Contrôleur du marché aux enchères et ventes directes (/api/market) avec transactions ACID SQLite et anonymisation publique.
 * Dépendances : `../utils/jsonStorage.js`, `../utils/validators.js`.
 * Effets de bord : Transactions SQLite atomiques sur `kv_store('market')` et comptes `users`.
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
  withTransaction,
} from '../utils/jsonStorage.js';
import {
  sanitizeCode,
  isPublicUserId,
  maskCodeForViewer,
} from '../utils/validators.js';

/** Durée initiale d'une enchère à compter de la 1re offre (24 heures) */
export const AUCTION_DURATION_MS = 24 * 60 * 60 * 1000;
/** Seuil de déclenchement de l'anti-sniping (5 minutes avant la fin) */
export const ANTI_SNIPE_WINDOW_MS = 5 * 60 * 1000;
/** Durée de prolongation en cas d'enchère dans la fenêtre d'anti-sniping (+5 minutes) */
export const ANTI_SNIPE_EXTENSION_MS = 5 * 60 * 1000;

/**
 * Masque les codes secrets (`sellerCode`, `highestBidderCode`, `buyerCode`) d'une annonce
 * avant l'envoi au client, sauf pour le joueur authentifié concerné.
 *
 * @param {object} listing - Annonce brute stockée en base
 * @param {string} viewerCode - Code secret du joueur effectuant la requête
 * @returns {object} Annonce sécurisée pour la réponse HTTP
 */
function formatListingForClient(listing, viewerCode) {
  if (!listing || typeof listing !== 'object') return listing;
  return {
    ...listing,
    sellerCode: maskCodeForViewer(listing.sellerCode, viewerCode),
    highestBidderCode: listing.highestBidderCode
      ? maskCodeForViewer(listing.highestBidderCode, viewerCode)
      : null,
    buyerCode: listing.buyerCode
      ? maskCodeForViewer(listing.buyerCode, viewerCode)
      : listing.buyerCode,
  };
}

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
        const nextCol = addCardsToUserCollection(winner.collection || [], [
          { card: listing.card, qty: 1 },
        ]);
        const prevWins = Array.isArray(winner.claimedMarketWins)
          ? winner.claimedMarketWins
          : [];
        const nextWins = prevWins.includes(listing.id)
          ? prevWins
          : [...prevWins.slice(-200), listing.id];
        saveUserFile(listing.highestBidderCode, {
          ...winner,
          collection: nextCol,
          claimedMarketWins: nextWins,
        });
      }

      listing.status = 'sold';
      listing.buyerCode = listing.highestBidderCode;
      listing.buyerUsername = listing.highestBidderUsername;
      listing.finalPrice = listing.currentBid;
      listing.resolvedAt = now;
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
  const headerViewerCode = sanitizeCode(req.headers?.['x-user-code'] || '');

  // 1. Consulter les annonces : GET /api/market
  if (req.method === 'GET' && pathname === '/api/market') {
    const listings = withTransaction(() => {
      let current = loadJsonArrayFile(marketFile);
      current = resolveExpiredMarketAuctions(current);
      return current;
    });

    listings.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const safeListings = listings.map((l) =>
      formatListingForClient(l, headerViewerCode)
    );
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, listings: safeListings }));
    return true;
  }

  // 2. Créer une nouvelle annonce : POST /api/market
  if (req.method === 'POST' && pathname === '/api/market') {
    const body = await readJsonBody(req);
    const sellerCode = sanitizeCode(body.sellerCode);
    const viewerCode = headerViewerCode || sellerCode;

    if (!sellerCode || isPublicUserId(sellerCode)) {
      res.statusCode = 403;
      res.end(JSON.stringify({ ok: false, error: 'Code vendeur invalide.' }));
      return true;
    }

    const cardId = String(body.cardId || '');
    const buyoutPrice = Math.max(
      10,
      Math.round(Number(body.buyoutPrice || 100))
    );
    const startingBid = Math.max(
      5,
      Math.min(
        buyoutPrice,
        Math.round(Number(body.startingBid || Math.floor(buyoutPrice * 0.6)))
      )
    );

    const outcome = withTransaction(() => {
      const seller = loadUserFile(sellerCode);
      if (!seller) {
        return { status: 404, error: 'Vendeur introuvable.' };
      }

      const cardObj = (seller.collection || []).find(
        (c) => String(c.id) === cardId
      );
      if (!cardObj) {
        return {
          status: 400,
          error: 'Carte introuvable dans votre classeur.',
        };
      }

      const rem = removeCardsFromUserCollection(seller.collection || [], [
        { id: cardId, qty: 1 },
      ]);
      if (!rem.ok) {
        return { status: 400, error: 'Exemplaire indisponible.' };
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

      return {
        status: 200,
        listing: formatListingForClient(newListing, viewerCode),
        updatedUser: updatedSeller,
      };
    });

    res.statusCode = outcome.status;
    if (outcome.error) {
      res.end(JSON.stringify({ ok: false, error: outcome.error }));
    } else {
      res.end(
        JSON.stringify({
          ok: true,
          listing: outcome.listing,
          updatedUser: outcome.updatedUser,
        })
      );
    }
    return true;
  }

  // 3. Actions sur une annonce : /api/market/:id/(buy|bid|cancel|accept_bid)
  const marketActionMatch = pathname.match(
    /^\/api\/market\/([^/]+)\/(buy|bid|cancel|accept_bid)$/
  );
  if (req.method === 'POST' && marketActionMatch) {
    const listingId = decodeURIComponent(marketActionMatch[1]);
    const action = marketActionMatch[2];
    const body = await readJsonBody(req);
    const actorCode = sanitizeCode(body.userCode);
    const viewerCode = headerViewerCode || actorCode;

    if (!actorCode || isPublicUserId(actorCode)) {
      res.statusCode = 403;
      res.end(JSON.stringify({ ok: false, error: 'Code joueur invalide.' }));
      return true;
    }

    const outcome = withTransaction(() => {
      let listings = loadJsonArrayFile(marketFile);
      listings = resolveExpiredMarketAuctions(listings);
      const idx = listings.findIndex((l) => l.id === listingId);

      if (idx === -1) {
        return { status: 404, error: 'Annonce introuvable.' };
      }

      const listing = listings[idx];
      if (listing.status !== 'active') {
        return { status: 400, error: 'Cette vente est déjà terminée.' };
      }

      // Annuler son annonce (avec réintégration de la carte et remboursement éventuel)
      if (action === 'cancel') {
        if (listing.sellerCode !== actorCode) {
          return { status: 403, error: 'Action non autorisée.' };
        }

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
          const nextCol = addCardsToUserCollection(seller.collection || [], [
            { card: listing.card, qty: 1 },
          ]);
          updatedSeller = saveUserFile(listing.sellerCode, {
            ...seller,
            collection: nextCol,
          });
        }

        listing.status = 'cancelled';
        listing.resolvedAt = Date.now();
        saveJsonArrayFile(marketFile, listings);

        return {
          status: 200,
          listing: formatListingForClient(listing, viewerCode),
          updatedUser: updatedSeller,
        };
      }

      // Accepter manuellement l'enchère actuelle par le vendeur
      if (action === 'accept_bid') {
        if (listing.sellerCode !== actorCode || !listing.highestBidderCode) {
          return { status: 400, error: 'Aucune enchère active à accepter.' };
        }

        const seller = loadUserFile(listing.sellerCode);
        const winner = loadUserFile(listing.highestBidderCode);
        if (!seller || !winner) {
          return {
            status: 404,
            error: 'Profil acheteur ou vendeur introuvable.',
          };
        }

        const updatedSeller = saveUserFile(listing.sellerCode, {
          ...seller,
          wikithunes: (seller.wikithunes || 0) + listing.currentBid,
        });

        const nextWinnerCol = addCardsToUserCollection(winner.collection || [], [
          { card: listing.card, qty: 1 },
        ]);
        const prevAcceptWins = Array.isArray(winner.claimedMarketWins)
          ? winner.claimedMarketWins
          : [];
        saveUserFile(listing.highestBidderCode, {
          ...winner,
          collection: nextWinnerCol,
          claimedMarketWins: prevAcceptWins.includes(listing.id)
            ? prevAcceptWins
            : [...prevAcceptWins.slice(-200), listing.id],
        });

        listing.status = 'sold';
        listing.buyerCode = listing.highestBidderCode;
        listing.buyerUsername = listing.highestBidderUsername;
        listing.finalPrice = listing.currentBid;
        listing.resolvedAt = Date.now();
        saveJsonArrayFile(marketFile, listings);

        return {
          status: 200,
          listing: formatListingForClient(listing, viewerCode),
          updatedUser: updatedSeller,
        };
      }

      // Placer une enchère (action === 'bid')
      if (action === 'bid') {
        if (listing.sellerCode === actorCode) {
          return {
            status: 400,
            error: 'Vous ne pouvez pas enchérir sur votre propre carte.',
          };
        }

        const bidAmount = Math.round(Number(body.bidAmount || 0));
        const minRequired = listing.highestBidderCode
          ? listing.currentBid + 10
          : listing.startingBid;

        if (bidAmount < minRequired) {
          return {
            status: 400,
            error: `L'enchère doit être d'au moins ${minRequired} ₩.`,
          };
        }

        const bidder = loadUserFile(actorCode);
        if (!bidder) {
          return { status: 404, error: 'Profil introuvable.' };
        }

        const alreadyLocked =
          listing.highestBidderCode === actorCode ? listing.currentBid : 0;
        const toPayNow = bidAmount - alreadyLocked;

        if ((bidder.wikithunes || 0) < toPayNow) {
          return { status: 400, error: 'Solde de Wikifeet insuffisant.' };
        }

        if (
          listing.highestBidderCode &&
          listing.highestBidderCode !== actorCode
        ) {
          const prevBidder = loadUserFile(listing.highestBidderCode);
          if (prevBidder) {
            saveUserFile(listing.highestBidderCode, {
              ...prevBidder,
              wikithunes: (prevBidder.wikithunes || 0) + listing.currentBid,
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
          listing.firstBidAt = now;
          listing.bidExpiresAt = now + AUCTION_DURATION_MS;
        } else {
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
          const prevBidBuyoutWins = Array.isArray(
            updatedBidder.claimedMarketWins
          )
            ? updatedBidder.claimedMarketWins
            : [];
          const finalBidder = saveUserFile(actorCode, {
            ...updatedBidder,
            collection: nextBidderCol,
            claimedMarketWins: prevBidBuyoutWins.includes(listing.id)
              ? prevBidBuyoutWins
              : [...prevBidBuyoutWins.slice(-200), listing.id],
          });

          listing.status = 'sold';
          listing.buyerCode = actorCode;
          listing.buyerUsername = bidder.profile?.username || actorCode;
          listing.finalPrice = bidAmount;
          listing.resolvedAt = Date.now();
          saveJsonArrayFile(marketFile, listings);

          return {
            status: 200,
            listing: formatListingForClient(listing, viewerCode),
            updatedUser: finalBidder,
          };
        }

        saveJsonArrayFile(marketFile, listings);
        return {
          status: 200,
          listing: formatListingForClient(listing, viewerCode),
          antiSnipeExtended,
          updatedUser: updatedBidder,
        };
      }

      // Achat immédiat direct (action === 'buy')
      if (action === 'buy') {
        if (listing.sellerCode === actorCode) {
          return {
            status: 400,
            error: 'Vous ne pouvez pas acheter votre propre carte.',
          };
        }

        const buyer = loadUserFile(actorCode);
        if (!buyer) {
          return { status: 404, error: 'Acheteur introuvable.' };
        }

        const alreadyLocked =
          listing.highestBidderCode === actorCode ? listing.currentBid : 0;
        const priceToPay = listing.buyoutPrice - alreadyLocked;

        if ((buyer.wikithunes || 0) < priceToPay) {
          return { status: 400, error: 'Solde de Wikifeet insuffisant.' };
        }

        if (
          listing.highestBidderCode &&
          listing.highestBidderCode !== actorCode
        ) {
          const prevBidder = loadUserFile(listing.highestBidderCode);
          if (prevBidder) {
            saveUserFile(listing.highestBidderCode, {
              ...prevBidder,
              wikithunes: (prevBidder.wikithunes || 0) + listing.currentBid,
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

        const nextBuyerCol = addCardsToUserCollection(buyer.collection || [], [
          { card: listing.card, qty: 1 },
        ]);
        const prevBuyWins = Array.isArray(buyer.claimedMarketWins)
          ? buyer.claimedMarketWins
          : [];
        const updatedBuyer = saveUserFile(actorCode, {
          ...buyer,
          wikithunes: (buyer.wikithunes || 0) - priceToPay,
          collection: nextBuyerCol,
          claimedMarketWins: prevBuyWins.includes(listing.id)
            ? prevBuyWins
            : [...prevBuyWins.slice(-200), listing.id],
        });

        listing.status = 'sold';
        listing.buyerCode = actorCode;
        listing.buyerUsername = buyer.profile?.username || actorCode;
        listing.finalPrice = listing.buyoutPrice;
        listing.resolvedAt = Date.now();
        saveJsonArrayFile(marketFile, listings);

        return {
          status: 200,
          listing: formatListingForClient(listing, viewerCode),
          updatedUser: updatedBuyer,
        };
      }

      return { status: 400, error: 'Action de marché inconnue.' };
    });

    res.statusCode = outcome.status;
    if (outcome.error) {
      res.end(JSON.stringify({ ok: false, error: outcome.error }));
    } else {
      const payload = {
        ok: true,
        listing: outcome.listing,
        updatedUser: outcome.updatedUser,
      };
      if (outcome.antiSnipeExtended !== undefined) {
        payload.antiSnipeExtended = outcome.antiSnipeExtended;
      }
      res.end(JSON.stringify(payload));
    }
    return true;
  }

  return false;
}
