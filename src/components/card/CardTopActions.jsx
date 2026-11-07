/**
 * @file Rôle : Actions et badges supérieurs droits de la carte (doublons, statut recyclage, sélection et favori).
 * Dépendances : React, `lucide-react`, `../WikithuneIcon`.
 * Effets de bord : Émet les clics favori et recyclage.
 */

import React from 'react';
import { Star, Check } from 'lucide-react';
import WikithuneIcon from '../WikithuneIcon';

/**
 * Rangée d'actions et indicateurs en haut à droite de la carte.
 * @param {Object} props
 * @param {Object} props.card - Données de la carte
 * @param {number} props.duplicateCount - Nombre d'exemplaires possédés
 * @param {boolean} props.showSelectedDim - Indique si la carte est sélectionnée
 * @param {string|null} props.selectionBadgeText - Texte optionnel du badge de sélection
 * @param {boolean} props.isSelected - Carte actuellement sélectionnée
 * @param {boolean} props.isRecycleMode - Mode recyclage actif
 * @param {boolean} props.isProtectedInRecycleMode - Carte protégée contre le recyclage
 * @param {number} props.effectiveRecycleQty - Quantité sélectionnée pour recyclage
 * @param {number} props.recycleValue - Valeur de recyclage unitaire
 * @param {function(string): void} [props.onToggleFavorite] - Callback de mise en favori
 * @param {boolean} props.isFavorite - Carte marquée comme favorite
 */
export default function CardTopActions({
  card,
  duplicateCount,
  showSelectedDim,
  selectionBadgeText,
  isSelected,
  isRecycleMode,
  isProtectedInRecycleMode,
  effectiveRecycleQty,
  recycleValue,
  onToggleFavorite,
  isFavorite,
}) {
  return (
    <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-30 flex items-center gap-1.5">
      {duplicateCount > 1 && (
        <span
          className={`px-2 py-0.5 rounded-[3px] bg-black/70 backdrop-blur-xs text-white text-[10.5px] sm:text-[11px] font-bold shadow-xs border border-white/20 ${
            showSelectedDim ? 'grayscale opacity-65' : ''
          }`}
        >
          ×{duplicateCount}
        </span>
      )}

      {selectionBadgeText ? (
        <div
          className={`h-7 px-2 rounded-[3px] flex items-center gap-1 text-[11px] sm:text-[11.5px] font-bold shadow-xs transition-colors ${
            isSelected
              ? 'bg-[#3366cc] text-white border border-[#2a4b8d]'
              : 'bg-black/70 text-white border border-white/40'
          }`}
        >
          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          <span>{selectionBadgeText}</span>
        </div>
      ) : isRecycleMode ? (
        isProtectedInRecycleMode ? (
          <span
            className="px-2 py-0.5 rounded-[3px] bg-black/75 text-[#ffea5a] text-[10px] sm:text-[10.5px] font-bold border border-[#ffea5a]/40 shadow-xs"
            title="Retirez cette carte de vos favoris si vous souhaitez la recycler"
          >
            ★ Protégée
          </span>
        ) : effectiveRecycleQty > 0 ? (
          <div
            className="h-7 px-2 rounded-[3px] flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-bold shadow-xs bg-[#006b24] text-white border border-[#00571d]"
            title={`${effectiveRecycleQty} exemplaire${
              effectiveRecycleQty > 1 ? 's' : ''
            } sélectionné${effectiveRecycleQty > 1 ? 's' : ''} (${effectiveRecycleQty}/${duplicateCount})`}
          >
            <span className="w-3.5 h-3.5 rounded-[2px] flex items-center justify-center bg-white text-[#006b24] border border-white">
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
            {duplicateCount > 1 && (
              <span className="font-mono text-[10.5px] sm:text-[11px] bg-black/25 px-1 py-0.2 rounded-[2px]">
                ×{effectiveRecycleQty}
              </span>
            )}
            <span>
              +{new Intl.NumberFormat('fr-FR').format(recycleValue * effectiveRecycleQty)}
            </span>
            <WikithuneIcon className="w-3 h-3 text-white" />
          </div>
        ) : (
          <div
            className="h-7 px-2 rounded-[3px] flex items-center gap-1 text-[11px] sm:text-[11.5px] font-bold shadow-xs bg-black/70 text-white border border-white/40 hover:bg-black/85 transition-colors"
          >
            <span className="w-3.5 h-3.5 rounded-[2px] border border-white/70" />
            <span>
              +{new Intl.NumberFormat('fr-FR').format(recycleValue)}
            </span>
            <WikithuneIcon className="w-3 h-3 text-white" />
          </div>
        )
      ) : (
        onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(card.id);
            }}
            aria-label="Ajouter aux favoris"
            className="w-7 h-7 rounded-full bg-black/35 hover:bg-black/60 backdrop-blur-xs flex items-center justify-center text-white transition-all cursor-pointer shadow-xs border border-white/20 active:scale-90"
          >
            <Star
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                isFavorite
                  ? 'fill-[#ffea5a] text-[#ffea5a]'
                  : 'text-white/90'
              }`}
            />
          </button>
        )
      )}
    </div>
  );
}
