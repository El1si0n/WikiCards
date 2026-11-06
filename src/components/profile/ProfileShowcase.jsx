/**
 * @file Rôle : Vitrine d'exposition des 4 cartes d'honneur sur le profil du joueur.
 * Dépendances : React, `lucide-react`, `../WikiCard`.
 * Effets de bord : Sélection d'un emplacement pour affectation ou mise en favori.
 */

import React from 'react';
import { Plus } from 'lucide-react';
import WikiCard from '../WikiCard';

/**
 * Composant affichant les 4 emplacements de la vitrine du collectionneur.
 * @param {Object} props
 * @param {Array<Object|null>} props.showcaseCards - Les 4 cartes exposées ou null
 * @param {number|null} props.activeShowcaseSlot - Index du slot actuellement ouvert pour choix
 * @param {Array<string>} [props.favorites=[]] - Liste des IDs favoris
 * @param {function(string): void} [props.onToggleFavorite] - Callback de bascule favori
 * @param {function(number): void} props.onSelectSlot - Sélection / bascule d'un slot
 * @returns {JSX.Element}
 */
export default function ProfileShowcase({
  showcaseCards,
  activeShowcaseSlot,
  favorites = [],
  onToggleFavorite,
  onSelectSlot,
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 justify-items-center">
      {[0, 1, 2, 3].map((slotIdx) => {
        const card = showcaseCards[slotIdx];
        const isSlotActive = activeShowcaseSlot === slotIdx;

        return (
          <div
            key={slotIdx}
            className="w-full max-w-[284px] flex flex-col items-center"
          >
            {card ? (
              <div
                className={`w-full rounded-[11px] sm:rounded-[14px] transition-all ${
                  isSlotActive ? 'ring-3 ring-[#3366cc]' : ''
                }`}
              >
                <WikiCard
                  card={card}
                  compact={true}
                  isFavorite={favorites.includes(card.id)}
                  onToggleFavorite={onToggleFavorite}
                  onSelectCard={() => onSelectSlot(slotIdx)}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSelectSlot(slotIdx)}
                className={`w-full aspect-[284/443] rounded-[14px] border-2 border-dashed flex flex-col items-center justify-center p-3 sm:p-6 text-center cursor-pointer transition-colors ${
                  isSlotActive
                    ? 'border-[#3366cc] bg-[#eaf3ff]/50 text-[#3366cc]'
                    : 'border-[#c8ccd1] bg-[#f8f9fa] hover:bg-white hover:border-[#72777d] text-[#54595d]'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center border mb-2 ${
                    isSlotActive
                      ? 'bg-[#3366cc] text-white border-[#3366cc]'
                      : 'bg-white text-[#54595d] border-[#c8ccd1]'
                  }`}
                >
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-[13px] font-bold">
                  {isSlotActive
                    ? 'Sélectionnez une carte ci-dessous'
                    : 'Exposer une carte'}
                </span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
