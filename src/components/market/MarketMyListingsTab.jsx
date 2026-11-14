/**
 * @file Rôle : Onglet de consultation et de gestion des annonces publiées par le joueur courant.
 * Dépendances : React, `lucide-react`.
 * Effets de bord : Retrait de vente ou acceptation manuelle d'enchère.
 */

import React from 'react';
import { Check, X, Loader2 } from 'lucide-react';

/**
 * Sous-composant affichant l'historique et l'état des ventes du joueur.
 * @param {Object} props
 * @param {Array<Object>} props.myListings - Annonces dont l'auteur est le joueur courant
 * @param {boolean} [props.isLoading=false] - Indicateur de chargement initial du marché
 * @param {function(string, string): Promise<void>} props.handleMarketAction - Action d'acceptation ou de retrait
 * @param {number} props.now - Horodatage courant
 * @param {function(number|null, string|null, number): string} props.formatRemainingTime - Formateur de temps restant
 * @returns {JSX.Element} Vue de gestion de ses annonces
 */
export default function MarketMyListingsTab({
  myListings,
  isLoading = false,
  handleMarketAction,
  now,
  formatRemainingTime,
}) {
  return (
    <div className="space-y-3">
      {myListings.length > 0 ? (
        myListings.map((listing) => (
          <div
            key={listing.id}
            className="bg-[#f8f9fa] border border-[#c8ccd1] rounded-[2px] p-3.5 flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <span className="font-bold text-[14px] text-[#202122]">
                {listing.card?.title} ({listing.card?.rarity})
              </span>
              <span
                className={`px-2 py-0.5 text-[11.5px] font-bold rounded-[2px] border ${
                  listing.status === 'sold'
                    ? 'bg-[#dff2eb] border-[#099979] text-[#177860]'
                    : listing.status === 'cancelled'
                    ? 'bg-[#ffe9e5] border-[#f54739] text-[#bf3c2c]'
                    : 'bg-[#eaf3ff] border-[#3366cc] text-[#3366cc]'
                }`}
              >
                {listing.status === 'sold'
                  ? `Vendue (${listing.finalPrice || listing.currentBid || 0} ₩ à ${listing.buyerUsername || 'un joueur'})`
                  : listing.status === 'cancelled'
                  ? 'Retirée'
                  : listing.highestBidderCode
                  ? `Enchère de 24h en cours (${listing.currentBid || 0} ₩ par ${listing.highestBidderUsername || 'un joueur'} • Fin dans ${formatRemainingTime(listing.bidExpiresAt, listing.highestBidderCode, now)})`
                  : `En attente de 1ère offre (Mise à prix : ${listing.startingBid || 0} ₩ / Achat : ${listing.buyoutPrice || 0} ₩)`}
              </span>
            </div>

            {listing.status === 'active' && (
              <div className="flex items-center gap-2">
                {listing.highestBidderCode && (
                  <button
                    type="button"
                    onClick={() => handleMarketAction(listing.id, 'accept_bid')}
                    className="wiki-casino-btn wiki-casino-btn--success !min-h-[30px] !py-1 !px-3 !text-[12px]"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accepter l'enchère ({listing.currentBid} ₩)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleMarketAction(listing.id, 'cancel')}
                  className="wiki-casino-btn wiki-casino-btn--neutral !min-h-[30px] !py-1 !px-3 !text-[12px]"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Retirer</span>
                </button>
              </div>
            )}
          </div>
        ))
      ) : isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-center bg-[#f8f9fa] dark:bg-[#161a20] border border-[#eaecf0] dark:border-[#2d3542] rounded-[2px]">
          <Loader2 className="w-5 h-5 animate-spin text-[#3366cc]" />
          <p className="text-[13.5px] font-medium text-[#54595d] dark:text-[#a2a9b1] m-0">
            Chargement de vos annonces...
          </p>
        </div>
      ) : (
        <div className="py-12 text-center bg-[#f8f9fa] dark:bg-[#161a20] border border-[#eaecf0] dark:border-[#2d3542] rounded-[2px]">
          <p className="text-[14px] text-[#54595d] dark:text-[#a2a9b1] m-0">
            Vous n'avez pas encore publié d'annonce sur le marché.
          </p>
        </div>
      )}
    </div>
  );
}
