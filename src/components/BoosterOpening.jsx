/**
 * @file Rôle : Composant d'ouverture de booster interactif (3D foil, déchirure, reveal 1-6 et récapitulatif).
 * Dépendances : React, `framer-motion`, `../hooks/useBoosterOpening`, sous-composants sous `src/components/booster/`.
 * Effets de bord : Débit de monnaie ou booster gratuit, ajout de 6 cartes à la collection, confettis et audio.
 */

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import useBoosterOpening from '../hooks/useBoosterOpening';
import BoosterPackView from './booster/BoosterPackView';
import BoosterRevealView from './booster/BoosterRevealView';
import BoosterSummaryView from './booster/BoosterSummaryView';
import { BOOSTER_PRICE, ICONIC_BOOSTER_PRICE } from '../config/rarities';

/**
 * Composant principal d'ouverture de booster de cartes Wikipédia.
 * @param {Object} props
 * @param {function(Array<Object>): void} props.onCardsOpened - Callback appelé à l'ouverture des 6 cartes
 * @param {Array<string>} [props.existingCardIds=[]] - IDs des cartes possédées
 * @param {Array<string>} [props.favorites=[]] - IDs des cartes favorites
 * @param {function(string): void} [props.onToggleFavorite] - Callback de bascule favori
 * @param {function(): void} [props.onGoToClasseur] - Callback pour ouvrir l'onglet classeur
 * @param {number} [props.wikithunes=0] - Solde de monnaie
 * @param {number} [props.boosterPrice=BOOSTER_PRICE] - Prix du booster standard
 * @param {number} [props.iconicBoosterPrice=ICONIC_BOOSTER_PRICE] - Prix du booster iconique
 * @param {function(number): boolean} props.onSpendWikithunes - Callback de débit de monnaie
 * @param {number} [props.freeBoostersCount=0] - Nombre de boosters gratuits
 * @param {string} [props.timeRemainingFreeBoosters=""] - Temps restant avant recharge
 * @param {function(): void} [props.onUseFreeBooster] - Callback d'utilisation d'un booster gratuit
 */
export default function BoosterOpening({
  onCardsOpened,
  existingCardIds = [],
  favorites = [],
  onToggleFavorite,
  onGoToClasseur,
  wikithunes = 0,
  boosterPrice = BOOSTER_PRICE,
  iconicBoosterPrice = ICONIC_BOOSTER_PRICE,
  onSpendWikithunes,
  freeBoostersCount = 0,
  timeRemainingFreeBoosters = '',
  onUseFreeBooster,
}) {
  const {
    stage,
    packCards,
    currentCardIdx,
    isFetching,
    isOpening,
    errorMsg,
    isIconicPack,
    activePrice,
    packRef,
    glare,
    handlePackMouseMove,
    handlePackMouseLeave,
    handleOpenPack,
    handleReopenBooster,
    handleNextCard,
    handleSkipToSummary,
    handleResetToNewPack,
    handleSkipIconicToStandard,
    currentCard,
    nextCard,
  } = useBoosterOpening({
    onCardsOpened,
    existingCardIds,
    wikithunes,
    boosterPrice,
    iconicBoosterPrice,
    freeBoostersCount,
    onSpendWikithunes,
    onUseFreeBooster,
  });

  return (
    <div className="relative w-full max-w-[940px] mx-auto select-none">
      <AnimatePresence mode="wait">
        {stage === 'pack' || stage === 'tearing' ? (
          <BoosterPackView
            stage={stage}
            packCards={packCards}
            isIconicPack={isIconicPack}
            activePrice={activePrice}
            freeBoostersCount={freeBoostersCount}
            boosterPrice={boosterPrice}
            packRef={packRef}
            glare={glare}
            handlePackMouseMove={handlePackMouseMove}
            handlePackMouseLeave={handlePackMouseLeave}
            handleOpenPack={handleOpenPack}
            handleSkipIconicToStandard={handleSkipIconicToStandard}
            isFetching={isFetching}
            isOpening={isOpening}
            errorMsg={errorMsg}
          />
        ) : stage === 'card_by_card' && currentCard ? (
          <BoosterRevealView
            currentCard={currentCard}
            nextCard={nextCard}
            currentCardIdx={currentCardIdx}
            packCards={packCards}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            handleNextCard={handleNextCard}
            handleSkipToSummary={handleSkipToSummary}
          />
        ) : stage === 'summary' ? (
          <BoosterSummaryView
            packCards={packCards}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            handleReopenBooster={handleReopenBooster}
            isFetching={isFetching}
            isOpening={isOpening}
            onGoToClasseur={onGoToClasseur}
            handleResetToNewPack={handleResetToNewPack}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
