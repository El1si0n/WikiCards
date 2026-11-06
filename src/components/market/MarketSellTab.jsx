/**
 * @file Rôle : Onglet de mise en vente d'une carte du classeur aux enchères du marché.
 * Dépendances : React, `lucide-react`, `../WikiCard`, `../../config/rarities`.
 * Effets de bord : Sélection de cartes et soumission de création d'annonce.
 */

import React from 'react';
import WikiCard from '../WikiCard';
import { RARITY_TIERS } from '../../config/rarities';
import { Tag } from 'lucide-react';

/**
 * Sous-composant de publication d'une carte aux enchères.
 * @param {Object} props
 * @param {Array<Object>} props.collection - Collection de cartes du joueur
 * @param {Array<string>} props.favorites - IDs des cartes favorites
 * @param {string} props.sellRarityFilter - Filtre de rareté actif pour la sélection
 * @param {function(string): void} props.setSellRarityFilter - Mise à jour du filtre de rareté
 * @param {Object|null} props.selectedSellCard - Carte actuellement sélectionnée pour la vente
 * @param {string|null} props.selectedSellCardId - ID de la carte sélectionnée
 * @param {string} props.startingBidInput - Champ texte de la mise à prix de départ
 * @param {function(string): void} props.setStartingBidInput - Mise à jour de la mise à prix
 * @param {string} props.buyoutPriceInput - Champ texte du prix d'achat immédiat
 * @param {function(string): void} props.setBuyoutPriceInput - Mise à jour du prix d'achat
 * @param {boolean} props.isCreatingListing - Indique si une création est en cours
 * @param {function(React.FormEvent): Promise<void>} props.handleCreateListing - Callback de création d'annonce
 * @param {function(Object): void} props.handleSelectCardToSell - Sélection d'une carte du classeur
 * @param {function(string|number|null): string} props.sanitizeNumberInput - Nettoyeur numérique
 * @param {React.RefObject} props.sellFormRef - Référence pour le défilement fluide vers le formulaire
 * @returns {JSX.Element} Vue de mise en vente
 */
export default function MarketSellTab({
  collection,
  favorites,
  sellRarityFilter,
  setSellRarityFilter,
  selectedSellCard,
  selectedSellCardId,
  startingBidInput,
  setStartingBidInput,
  buyoutPriceInput,
  setBuyoutPriceInput,
  isCreatingListing,
  handleCreateListing,
  handleSelectCardToSell,
  sanitizeNumberInput,
  sellFormRef,
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Aperçu de la carte choisie + Formulaire de prix */}
        <div
          ref={sellFormRef}
          className="lg:col-span-4 bg-[#f8f9fa] border border-[#c8ccd1] rounded-[2px] p-4 flex flex-col items-center gap-4"
        >
          <div className="w-full border-b border-[#eaecf0] pb-2">
            <span className="text-[13px] font-bold text-[#202122] uppercase tracking-wider">
              Carte à mettre en vente
            </span>
          </div>

          {selectedSellCard ? (
            <>
              <div className="w-full max-w-[284px]">
                <WikiCard card={selectedSellCard} compact={true} />
              </div>

              <form
                onSubmit={handleCreateListing}
                className="w-full space-y-3 pt-2 border-t border-[#eaecf0]"
              >
                <div>
                  <label className="block text-[12px] font-bold text-[#202122] mb-1">
                    Prix de départ (enchère minimale en ₩)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Ex : 50"
                    value={startingBidInput}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setStartingBidInput(sanitizeNumberInput(e.target.value))
                    }
                    onBlur={() => {
                      if (!startingBidInput || Number(startingBidInput) < 5) {
                        setStartingBidInput('5');
                      }
                    }}
                    className="w-full h-[34px] px-2.5 text-[13.5px] font-bold bg-white border border-[#a2a9b1] rounded-[2px] focus:border-[#3366cc] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#202122] mb-1">
                    Prix d'achat immédiat (₩)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Ex : 150"
                    value={buyoutPriceInput}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setBuyoutPriceInput(sanitizeNumberInput(e.target.value))
                    }
                    onBlur={() => {
                      const minBuyout = Math.max(10, Number(startingBidInput) || 5);
                      if (!buyoutPriceInput || Number(buyoutPriceInput) < minBuyout) {
                        setBuyoutPriceInput(String(minBuyout));
                      }
                    }}
                    className="w-full h-[34px] px-2.5 text-[13.5px] font-bold bg-white border border-[#a2a9b1] rounded-[2px] focus:border-[#3366cc] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingListing}
                  className="wiki-casino-btn wiki-casino-btn--primary w-full"
                >
                  <Tag className="w-4 h-4" />
                  <span>
                    {isCreatingListing
                      ? 'Publication...'
                      : "Publier l'annonce sur le marché"}
                  </span>
                </button>
              </form>
            </>
          ) : (
            <div className="w-full max-w-[284px] aspect-[284/443] rounded-[14px] border-2 border-dashed border-[#c8ccd1] bg-white flex items-center justify-center p-6 text-center text-[13px] text-[#54595d]">
              Sélectionnez une carte dans votre classeur à droite pour fixer son prix de départ et son prix d'achat immédiat.
            </div>
          )}
        </div>

        {/* Sélection de la carte dans le classeur (une seule rareté à la fois) */}
        <div className="lg:col-span-8 bg-white border border-[#c8ccd1] rounded-[2px] p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eaecf0] pb-3">
            <span className="text-[13px] font-bold text-[#202122] uppercase tracking-wider">
              Choisissez une carte de votre classeur
            </span>

            <div className="flex flex-wrap gap-1.5 py-1">
              {RARITY_TIERS.map((tier) => {
                const cnt = collection.filter((c) => c.rarity === tier.code).length;
                return (
                  <button
                    key={tier.code}
                    type="button"
                    onClick={() => setSellRarityFilter(tier.code)}
                    className={`my-0.5 px-2.5 py-1 text-[12px] rounded-[2px] border cursor-pointer transition-all flex items-center gap-1.5 ${
                      sellRarityFilter === tier.code
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

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 justify-items-center max-h-[620px] overflow-y-auto p-1">
            {collection
              .filter((c) => c.rarity === sellRarityFilter)
              .map((card) => {
                const isFavProtected =
                  favorites.includes(card.id) && (card.count || 1) <= 1;
                const isSelected = selectedSellCardId === card.id;
                return (
                  <WikiCard
                    key={card.id}
                    card={card}
                    mini={true}
                    duplicateCount={card.count || 1}
                    isFavorite={favorites.includes(card.id)}
                    isSelected={isSelected}
                    isDisabledSelection={isFavProtected}
                    selectionBadgeText={
                      isFavProtected
                        ? '★ Protégée'
                        : isSelected
                        ? 'Sélectionnée'
                        : 'Vendre'
                    }
                    onSelectCard={() => handleSelectCardToSell(card)}
                  />
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
