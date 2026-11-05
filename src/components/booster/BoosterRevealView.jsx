/**
 * @file Rôle : Vue de découverte séquentielle des cartes du booster une par une (1/6 à 6/6) avec effet de pile 3D.
 * Dépendances : React, `framer-motion`, `lucide-react`, `../WikiCard`, `../../config/rarities`.
 * Effets de bord : Déclenche le passage à la carte suivante ou au récapitulatif.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import WikiCard from '../WikiCard';
import { getRarityByCode } from '../../config/rarities';

/**
 * Composant de révélation carte par carte d'un booster.
 * @param {Object} props
 * @param {Object} props.currentCard - Carte actuellement au premier plan
 * @param {Object|null} props.nextCard - Carte suivante visible en filigrane sous la pile
 * @param {number} props.currentCardIdx - Index de la carte courante (0 à 5)
 * @param {Array<Object>} props.packCards - Les 6 cartes du booster
 * @param {Array<string>} [props.favorites=[]] - IDs des cartes favorites
 * @param {function(string): void} [props.onToggleFavorite] - Bascule du statut favori
 * @param {function(): void} props.handleNextCard - Callback pour passer à la carte suivante
 * @param {function(): void} props.handleSkipToSummary - Callback pour afficher tout le résumé
 */
export default function BoosterRevealView({
  currentCard,
  nextCard,
  currentCardIdx,
  packCards,
  favorites = [],
  onToggleFavorite,
  handleNextCard,
  handleSkipToSummary,
}) {
  const currentCardTier = currentCard
    ? getRarityByCode(currentCard.rarity)
    : getRarityByCode('C');

  return (
    <motion.div
      key="booster-card-by-card"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] py-8 px-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[600px]"
    >
      {/* Halo subtil aux couleurs de la rareté de la carte affichée */}
      <div
        className="absolute w-80 h-80 rounded-full pointer-events-none blur-3xl opacity-25 transition-colors duration-500"
        style={{ backgroundColor: currentCardTier.borderColor }}
      />

      {/* Indicateur d'étape minimaliste en haut */}
      <div className="relative z-10 flex items-center gap-3 mb-5">
        <span className="text-[13px] font-bold text-[#202122]">
          Carte {currentCardIdx + 1} sur {packCards.length}
        </span>
        <div className="flex items-center gap-1.5">
          {packCards.map((c, idx) => (
            <span
              key={c.id}
              className={`h-2 rounded-full transition-all ${
                idx === currentCardIdx
                  ? 'w-6 bg-[#3366cc]'
                  : idx < currentCardIdx
                  ? 'w-2 bg-[#72777d]'
                  : 'w-2 bg-[#c8ccd1]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Pile de cartes */}
      <div className="relative z-10 flex items-center justify-center w-full max-w-[284px] aspect-[284/443] px-2">
        {nextCard && (
          <motion.div
            key={`next-${nextCard.id}`}
            initial={{
              scale: 0.88,
              y: 24,
              x: 14,
              rotate: 2.5,
              opacity: 0,
            }}
            animate={{
              scale: 0.93,
              y: 14,
              x: 16,
              rotate: 2.5,
              opacity: 0.65,
            }}
            transition={{ duration: 0.3 }}
            className="absolute inset-x-0 mx-auto pointer-events-none select-none z-10 brightness-95"
          >
            <WikiCard card={nextCard} />
          </motion.div>
        )}

        {/* La carte actuelle au premier plan */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentCard.id}
            onClick={handleNextCard}
            title="Cliquez sur la carte pour passer à la suivante"
            initial={{
              opacity: 0,
              scale: 0.93,
              y: 14,
              x: 16,
              rotate: 2.5,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              x: 0,
              rotate: 0,
            }}
            exit={{
              opacity: 0,
              x: -140,
              y: -10,
              rotate: -8,
              scale: 0.92,
            }}
            transition={{
              type: 'spring',
              stiffness: 240,
              damping: 24,
            }}
            className="relative z-20 w-full cursor-pointer"
          >
            <WikiCard
              card={currentCard}
              isFavorite={favorites.includes(currentCard.id)}
              onToggleFavorite={onToggleFavorite}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bouton pour passer à la carte suivante ou au résumé final */}
      <div className="relative z-10 mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleNextCard}
          className={`inline-flex items-center justify-center bg-[#3366cc] hover:bg-[#447ff5] active:bg-[#2a4b8d] text-white font-bold rounded-[2px] cursor-pointer transition-colors shadow-xs ${
            currentCardIdx < packCards.length - 1
              ? 'w-[42px] h-[42px]'
              : 'gap-2 px-5 py-2.5 text-[14px]'
          }`}
          title={
            currentCardIdx < packCards.length - 1
              ? 'Carte suivante'
              : 'Voir le résumé'
          }
          aria-label={
            currentCardIdx < packCards.length - 1
              ? 'Carte suivante'
              : 'Voir le résumé'
          }
        >
          {currentCardIdx >= packCards.length - 1 && (
            <span>Voir le résumé</span>
          )}
          <ArrowRight
            className={
              currentCardIdx < packCards.length - 1
                ? 'w-5 h-5'
                : 'w-4 h-4'
            }
          />
        </button>

        {currentCardIdx < packCards.length - 1 && (
          <button
            type="button"
            onClick={handleSkipToSummary}
            className="wiki-link text-[12.5px]"
          >
            Tout afficher
          </button>
        )}
      </div>
    </motion.div>
  );
}
