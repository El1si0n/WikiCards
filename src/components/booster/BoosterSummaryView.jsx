/**
 * @file Rôle : Vue récapitulative des 6 cartes tirées avec boutons pour réouvrir, aller au classeur ou terminer.
 * Dépendances : React, `framer-motion`, `lucide-react`, `../WikiCard`.
 * Effets de bord : Déclenche une réouverture ou redirection vers le classeur.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { RotateCw, BookOpen } from 'lucide-react';
import WikiCard from '../WikiCard';

/**
 * Grille récapitulative finale d'ouverture de booster.
 * @param {Object} props
 * @param {Array<Object>} props.packCards - Les 6 cartes tirées du sachet
 * @param {Array<string>} [props.favorites=[]] - IDs des cartes favorites
 * @param {function(string): void} [props.onToggleFavorite] - Bascule favori
 * @param {function(): void} props.handleReopenBooster - Callback de réouverture immédiate
 * @param {boolean} props.isFetching - Indicateur de tirage réseau en cours
 * @param {function(): void} [props.onGoToClasseur] - Callback pour naviguer vers le classeur
 * @param {function(): void} props.handleResetToNewPack - Callback pour clore et revenir au sachet
 */
export default function BoosterSummaryView({
  packCards,
  favorites = [],
  onToggleFavorite,
  handleReopenBooster,
  isFetching,
  onGoToClasseur,
  handleResetToNewPack,
}) {
  return (
    <motion.div
      key="booster-summary"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col"
    >
      {/* Grille récapitulative des 6 cartes obtenues */}
      <div className="flex flex-wrap justify-center gap-3.5 sm:gap-6 py-2 max-w-[940px] mx-auto">
        {packCards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.05 }}
            className="w-[calc(50%-7px)] sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] max-w-[284px] flex justify-center"
          >
            <WikiCard
              card={card}
              isFavorite={favorites.includes(card.id)}
              onToggleFavorite={onToggleFavorite}
            />
          </motion.div>
        ))}
      </div>

      {/* Barre d'actions sous le résumé */}
      <div className="mt-6 pt-4 border-t border-[#eaecf0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-[13px] text-[#54595d] text-center sm:text-left">
          Ces 6 cartes ont été ajoutées à votre classeur.
        </span>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleReopenBooster}
            disabled={isFetching}
            className="order-1 sm:order-2 inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 bg-[#006b24] hover:bg-[#00802b] active:bg-[#00571d] disabled:bg-[#c8ccd1] text-white font-bold text-[13px] rounded-[2px] cursor-pointer transition-colors shadow-2xs w-full sm:w-auto"
            title="Ouvrir immédiatement un nouveau booster"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`}
            />
            <span>Réouvrir un booster</span>
          </button>

          <div className="order-2 sm:order-1 grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onGoToClasseur}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-[#f8f9fa] hover:bg-white text-[#202122] font-bold text-[13px] border border-[#a2a9b1] rounded-[2px] cursor-pointer transition-colors"
            >
              <BookOpen className="w-4 h-4 text-[#3366cc] shrink-0" />
              <span className="truncate">Classeur</span>
            </button>

            <button
              type="button"
              onClick={handleResetToNewPack}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 bg-[#3366cc] hover:bg-[#447ff5] text-white font-bold text-[13px] rounded-[2px] cursor-pointer transition-colors"
            >
              <span>Terminer</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
