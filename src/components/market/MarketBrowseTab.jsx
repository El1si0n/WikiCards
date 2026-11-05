/**
 * @file Rôle : Onglet de consultation et d'enchères en direct sur les annonces du marché.
 * Dépendances : React, `lucide-react`, `../WikiCard`, `../WikithuneIcon`, `../../config/rarities`.
 * Effets de bord : Saisie des enchères et déclenchement d'achats/offres.
 */

import React from 'react';
import WikiCard from '../WikiCard';
import WikithuneIcon from '../WikithuneIcon';
import { RARITY_TIERS } from '../../config/rarities';
import { Gavel, ShoppingBag, Clock, Check, X } from 'lucide-react';

/**
 * Sous-composant de parcours des annonces actives avec compte à rebours de 24h et actions.
 * @param {Object} props
 * @param {Array<Object>} props.activeListings - Ensemble des annonces actives
 * @param {Array<Object>} props.filteredBrowseListings - Annonces filtrées par rareté
 * @param {string} props.rarityFilter - Filtre de rareté actif
 * @param {function(string): void} props.setRarityFilter - Sélecteur de rareté
 * @param {string} props.userCode - Code du joueur courant
 * @param {number} props.wikithunes - Solde de monnaie
 * @param {Object} props.bidInputs - Saisies manuelles d'enchère par annonce
 * @param {function(function(Object): Object): void} props.setBidInputs - Mise à jour des saisies
 * @param {function(string, string, Object=): Promise<void>} props.handleMarketAction - Action d'achat ou d'enchère
 * @param {number} props.now - Horodatage courant pour le compte à rebours
 * @param {function(number|null, string|null, number): string} props.formatRemainingTime - Formateur de temps restant
 * @param {function(string|number|null): string} props.sanitizeNumberInput - Nettoyeur numérique
 * @returns {JSX.Element} Vue de parcours des enchères
 */
export default function MarketBrowseTab({
  activeListings,
  filteredBrowseListings,
  rarityFilter,
  setRarityFilter,
  userCode,
  wikithunes,
  bidInputs,
  setBidInputs,
  handleMarketAction,
  now,
  formatRemainingTime,
  sanitizeNumberInput,
}) {
  return (
    <div className="space-y-4">
      {/* Barre de filtrage par rareté */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#eaecf0]">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRarityFilter('ALL')}
            className={`px-2.5 py-1 text-[12px] rounded-[2px] border cursor-pointer transition-colors ${
              rarityFilter === 'ALL'
                ? 'bg-[#202122] text-white border-[#202122] font-semibold'
                : 'bg-[#f8f9fa] text-[#202122] border-[#a2a9b1] hover:bg-white'
            }`}
          >
            Toutes ({activeListings.length})
          </button>
          {[...RARITY_TIERS].reverse().map((tier) => {
            const cnt = activeListings.filter((l) => l.card?.rarity === tier.code).length;
            return (
              <button
                key={tier.code}
                type="button"
                onClick={() => setRarityFilter(tier.code)}
                className={`px-2.5 py-1 text-[12px] rounded-[2px] border cursor-pointer transition-all flex items-center gap-1.5 ${
                  rarityFilter === tier.code
                    ? 'ring-2 ring-[#3366cc] font-bold bg-white border-[#3366cc]'
                    : 'bg-[#f8f9fa] hover:bg-white border-[#c8ccd1]'
                }`}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: tier.borderColor }}
                />
                <span>
                  {tier.code} ({cnt})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredBrowseListings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 justify-items-center">
          {filteredBrowseListings.map((listing) => {
            const isMine = listing.sellerCode === userCode;
            const minNextBid = listing.highestBidderCode
              ? listing.currentBid + 10
              : listing.startingBid;
            const currentBidInputStr = bidInputs[listing.id];
            const bidVal =
              currentBidInputStr !== undefined && currentBidInputStr !== ''
                ? Number(currentBidInputStr)
                : minNextBid;

            return (
              <div
                key={listing.id}
                className="w-full max-w-[310px] sm:max-w-[300px] bg-[#f8f9fa] border border-[#c8ccd1] rounded-[2px] p-3 flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between text-[11.5px] text-[#54595d] border-b border-[#eaecf0] pb-1.5">
                  <span className="truncate">
                    Vendeur : <strong className="text-[#202122]">{listing.sellerUsername}</strong>
                  </span>
                  {isMine && (
                    <span className="px-1.5 py-0.2 bg-[#eaf3ff] text-[#3366cc] border border-[#3366cc] rounded-[2px] text-[10.5px] font-bold">
                      Votre vente
                    </span>
                  )}
                </div>

                <div className="flex justify-center">
                  <div className="w-full max-w-[284px]">
                    <WikiCard card={listing.card} compact={true} />
                  </div>
                </div>

                <div className="bg-white border border-[#eaecf0] rounded-[2px] p-2.5 space-y-1.5 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#54595d]">
                      {listing.highestBidderCode
                        ? `Meilleure offre (${listing.highestBidderUsername || 'Joueur'})`
                        : 'Mise à prix'}
                    </span>
                    <span className="font-extrabold text-[#202122] inline-flex items-center gap-1">
                      <span>{new Intl.NumberFormat('fr-FR').format(Number(listing.currentBid || 0))}</span>
                      <WikithuneIcon className="w-3.5 h-3.5 text-[#3366cc]" />
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#54595d]">Achat immédiat</span>
                    <span className="font-extrabold text-[#177860] inline-flex items-center gap-1">
                      <span>{new Intl.NumberFormat('fr-FR').format(Number(listing.buyoutPrice || 0))}</span>
                      <WikithuneIcon className="w-3.5 h-3.5 text-[#177860]" />
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#eaecf0]">
                    <span className="text-[#54595d] inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#3366cc]" />
                      <span>Fin d'enchère :</span>
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        listing.highestBidderCode ? 'text-[#3366cc]' : 'text-[#72777d]'
                      }`}
                    >
                      {formatRemainingTime(listing.bidExpiresAt, listing.highestBidderCode, now)}
                    </span>
                  </div>
                </div>

                {!isMine ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder={String(minNextBid)}
                        value={currentBidInputStr !== undefined ? currentBidInputStr : minNextBid}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const clean = sanitizeNumberInput(e.target.value);
                          setBidInputs((prev) => ({
                            ...prev,
                            [listing.id]: clean,
                          }));
                        }}
                        onBlur={() => {
                          if (!currentBidInputStr || Number(currentBidInputStr) < minNextBid) {
                            setBidInputs((prev) => ({
                              ...prev,
                              [listing.id]: String(minNextBid),
                            }));
                          }
                        }}
                        className="w-full h-[32px] px-2 text-[12.5px] font-bold bg-white border border-[#a2a9b1] rounded-[2px] focus:border-[#3366cc] focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={wikithunes < bidVal}
                        onClick={() =>
                          handleMarketAction(listing.id, 'bid', {
                            bidAmount: bidVal,
                          })
                        }
                        className="wiki-casino-btn wiki-casino-btn--subtle !min-h-[32px] !py-1 !px-2.5 !text-[12px] shrink-0"
                      >
                        <Gavel className="w-3.5 h-3.5" />
                        <span>Enchérir</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={wikithunes < listing.buyoutPrice}
                      onClick={() => handleMarketAction(listing.id, 'buy')}
                      className="wiki-casino-btn wiki-casino-btn--success w-full !min-h-[34px] !py-1 !text-[12.5px]"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Acheter ({listing.buyoutPrice} ₩)</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {listing.highestBidderCode && (
                      <button
                        type="button"
                        onClick={() => handleMarketAction(listing.id, 'accept_bid')}
                        className="wiki-casino-btn wiki-casino-btn--success w-full !min-h-[32px] !py-1 !text-[12px]"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accepter l'offre ({listing.currentBid} ₩)</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleMarketAction(listing.id, 'cancel')}
                      className="wiki-casino-btn wiki-casino-btn--neutral w-full !min-h-[32px] !py-1 !text-[12px]"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Retirer de la vente</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px]">
          <p className="text-[14px] text-[#54595d] m-0">
            Aucune carte en vente actuellement. Cliquez sur « Mettre en vente » pour publier la première enchère !
          </p>
        </div>
      )}
    </div>
  );
}
