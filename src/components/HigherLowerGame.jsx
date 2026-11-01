import React, { useState } from 'react';
import WikiCard from './WikiCard';
import WikithuneIcon from './WikithuneIcon';
import { fetchRandomDuelCard } from '../services/wikipedia';
import { soundManager } from '../services/sound';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  HelpCircle,
  Loader2,
} from 'lucide-react';

// Multiplicateurs progressifs selon la longueur de la série gagnante
// Réévalués à la hausse pour récompenser les séries avec la difficulté accrue
const STREAK_MULTIPLIERS = [
  1.0, // 0
  1.5, // 1 bonne réponse (+50% de gain net)
  2.1, // 2 bonnes réponses (mise plus que doublée)
  2.9, // 3 bonnes réponses (~triplée)
  4.0, // 4 bonnes réponses (x4.0)
  5.5, // 5 bonnes réponses (x5.5)
  7.5, // 6 bonnes réponses (x7.5)
  10.2, // 7 bonnes réponses (x10.2)
  14.0, // 8+ bonnes réponses (x14.0)
];

function getMultiplierForStreak(streak) {
  if (streak <= 0) return 1.0;
  if (streak < STREAK_MULTIPLIERS.length) {
    return STREAK_MULTIPLIERS[streak];
  }
  const extra = streak - (STREAK_MULTIPLIERS.length - 1);
  return Number(
    (
      STREAK_MULTIPLIERS[STREAK_MULTIPLIERS.length - 1] * Math.pow(1.36, extra)
    ).toFixed(2)
  );
}

export default function HigherLowerGame({
  wikithunes,
  onSpendWikithunes,
  onAddWikithunes,
}) {
  // 'idle' | 'loading' | 'playing' | 'won_round' | 'lost_round'
  const [gameState, setGameState] = useState('idle');
  const [betAmount, setBetAmount] = useState(100);
  const [activeBet, setActiveBet] = useState(0);
  const [streak, setStreak] = useState(0);

  const [leftCard, setLeftCard] = useState(null);
  const [rightCard, setRightCard] = useState(null);
  const [seenCards, setSeenCards] = useState([]);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  // Historique glissant des 100 dernières cartes vues dans la session
  // Empêche les cartes de se répéter entre plusieurs parties successives
  const [sessionSeenTitles, setSessionSeenTitles] = useState([]);

  const currentPot =
    streak > 0
      ? Math.round(activeBet * getMultiplierForStreak(streak))
      : activeBet;

  // Démarre une nouvelle série en déduisant la mise de départ
  const handleStartGame = async () => {
    const validBet = Math.min(wikithunes, Math.max(10, betAmount));
    if (validBet <= 0 || wikithunes < validBet || gameState === 'loading') {
      soundManager.playErrorSound();
      return;
    }

    onSpendWikithunes(validBet);
    setActiveBet(validBet);
    setStreak(0);
    setSeenCards([]);
    setGameState('loading');

    const firstCard = await fetchRandomDuelCard(sessionSeenTitles, null, null, validBet);
    const secondExcluded = [
      ...sessionSeenTitles,
      firstCard?.title,
      firstCard?.id,
    ].filter(Boolean);
    const secondCard = await fetchRandomDuelCard(
      secondExcluded,
      firstCard?.views ?? null,
      firstCard?.rarity ?? null,
      validBet
    );

    if (firstCard && secondCard) {
      setLeftCard(firstCard);
      setRightCard(secondCard);
      setSeenCards([firstCard, secondCard]);
      setSessionSeenTitles((prev) => {
        const next = [
          ...prev,
          firstCard.title,
          firstCard.id,
          secondCard.title,
          secondCard.id,
        ].filter(Boolean);
        return Array.from(new Set(next)).slice(-100);
      });
      setGameState('playing');
      soundManager.playCardSlide();
    } else {
      onAddWikithunes(validBet);
      setGameState('idle');
    }
  };

  // Le joueur choisit 'higher' (Plus de vues) ou 'lower' (Moins de vues)
  const handleGuess = (choice) => {
    if (gameState !== 'playing' || !leftCard || !rightCard) return;

    const leftViews = leftCard.views || 0;
    const rightViews = rightCard.views || 0;

    const isCorrect =
      choice === 'higher' ? rightViews >= leftViews : rightViews <= leftViews;

    if (isCorrect) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setGameState('won_round');
      soundManager.playUpgradeWin(rightCard.rarity || 'R');
    } else {
      setGameState('lost_round');
      soundManager.playUpgradeLoss();
    }
  };

  // Continuer la série : la carte de droite passe à gauche et on tire une nouvelle page à droite
  const handleNextRound = async () => {
    if (gameState !== 'won_round' || isLoadingNext || !rightCard) return;

    setIsLoadingNext(true);
    const newRefCard = rightCard;
    const allExcluded = [
      ...sessionSeenTitles,
      ...seenCards.map((c) => c?.title),
      ...seenCards.map((c) => c?.id),
      newRefCard.title,
      newRefCard.id,
    ].filter(Boolean);

    const newRightCard = await fetchRandomDuelCard(
      allExcluded,
      newRefCard.views,
      newRefCard.rarity,
      activeBet
    );

    setIsLoadingNext(false);
    if (newRightCard) {
      setLeftCard(newRefCard);
      setRightCard(newRightCard);
      setSeenCards((prev) => [...prev, newRightCard]);
      setSessionSeenTitles((prev) => {
        const next = [...prev, newRightCard.title, newRightCard.id].filter(Boolean);
        return Array.from(new Set(next)).slice(-100);
      });
      setGameState('playing');
      soundManager.playCardSlide();
    }
  };

  // Encaisser les gains et terminer la série
  const handleCashOut = () => {
    if (streak <= 0) return;
    const payout = Math.round(activeBet * getMultiplierForStreak(streak));
    onAddWikithunes(payout);
    soundManager.playCoinSound();
    setGameState('idle');
    setLeftCard(null);
    setRightCard(null);
    setSeenCards([]);
    setStreak(0);
    setActiveBet(0);
  };

  // Terminer après une défaite
  const handleFinishLost = () => {
    setGameState('idle');
    setLeftCard(null);
    setRightCard(null);
    setSeenCards([]);
    setStreak(0);
    setActiveBet(0);
  };

  const rightRevealed =
    gameState === 'won_round' || gameState === 'lost_round';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* COLONNE GAUCHE (4 col) : Carte de référence */}
      <div className="order-1 lg:order-1 lg:col-span-4 flex flex-col justify-between bg-white border border-[#c8ccd1] rounded-[2px] p-3 sm:p-4">
        <div className="flex items-center justify-between border-b border-[#eaecf0] pb-2 mb-3">
          <span className="text-[12px] sm:text-[13px] font-bold text-[#202122] uppercase tracking-wider">
            Carte de référence
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center min-h-[320px] sm:min-h-[452px]">
          {leftCard ? (
            <div className="w-full max-w-[272px]">
              <WikiCard card={leftCard} compact={true} />
            </div>
          ) : (
            <div className="w-full max-w-[272px] h-[320px] sm:h-[446px] rounded-[14px] border-2 border-dashed border-[#c8ccd1] bg-[#f8f9fa] flex flex-col items-center justify-center p-6 text-center">
              <p className="text-[13px] text-[#54595d] m-0 leading-[1.5]">
                Choisissez votre mise au centre et lancez une série pour
                afficher la première page Wikipédia.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* COLONNE CENTRALE (4 col) : Tableau de bord simple et lisible */}
      <div className="order-3 lg:order-2 lg:col-span-4 flex flex-col items-center justify-between bg-white border border-[#c8ccd1] rounded-[2px] p-3 sm:p-4">
        <div className="w-full flex items-center justify-between border-b border-[#eaecf0] pb-2 mb-2">
          <span className="text-[13px] font-bold text-[#202122] uppercase tracking-wider">
            Plus ou Moins de vues
          </span>
          {gameState !== 'idle' && (
            <span className="text-[12px] font-bold text-[#54595d]">
              Série : <strong className="text-[#202122]">{streak}</strong>
            </span>
          )}
        </div>

        {/* Zone centrale épurée et lisible (sans rectangle englobant) */}
        <div className="my-auto py-6 w-full flex flex-col items-center justify-center text-center">
          {gameState === 'loading' ? (
            <>
              <Loader2 className="w-7 h-7 text-[#3366cc] animate-spin mb-2" />
              <span className="text-[14px] font-bold text-[#202122]">
                Tirage sur Wikipédia...
              </span>
            </>
          ) : gameState === 'won_round' ? (
            <>
              <span className="text-[13px] font-bold uppercase tracking-wider text-[#177860]">
                Bonne réponse (×{getMultiplierForStreak(streak)})
              </span>
              <div className="text-[40px] font-extrabold text-[#177860] mt-1.5 inline-flex items-center gap-2 leading-none">
                <span>
                  +{new Intl.NumberFormat('fr-FR').format(currentPot)}
                </span>
                <WikithuneIcon className="w-7 h-7 text-[#177860]" />
              </div>
            </>
          ) : gameState === 'lost_round' ? (
            <span className="text-[32px] font-extrabold text-[#bf3c2c] leading-tight">
              Perdu
            </span>
          ) : gameState === 'playing' ? (
            <>
              <span className="text-[13px] font-bold uppercase tracking-wider text-[#54595d]">
                Gain actuel (×{getMultiplierForStreak(streak)})
              </span>
              <div className="text-[40px] font-extrabold text-[#202122] mt-1.5 inline-flex items-center gap-2 leading-none">
                <span>
                  {new Intl.NumberFormat('fr-FR').format(currentPot)}
                </span>
                <WikithuneIcon className="w-7 h-7 text-[#3366cc]" />
              </div>
            </>
          ) : (
            <>
              <span className="text-[13px] font-bold uppercase tracking-wider text-[#54595d]">
                Mise de départ
              </span>
              <div className="text-[40px] font-extrabold text-[#202122] mt-1.5 inline-flex items-center gap-2 leading-none">
                <span>
                  {new Intl.NumberFormat('fr-FR').format(betAmount)}
                </span>
                <WikithuneIcon className="w-7 h-7 text-[#3366cc]" />
              </div>
            </>
          )}
        </div>

        {/* Contrôles en bas de la colonne centrale */}
        <div className="w-full pt-3 border-t border-[#eaecf0] flex flex-col gap-2.5">
          {gameState === 'idle' || gameState === 'loading' ? (
            <>
              <div>
                <div className="flex items-center justify-between mb-2 text-[12.5px]">
                  <span className="font-bold text-[#202122]">
                    Choisir la mise
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { amount: 50, label: 'Facile' },
                    { amount: 100, label: 'Modéré' },
                    { amount: 250, label: 'Standard' },
                    { amount: 500, label: 'Défi' },
                  ].map(({ amount, label }) => (
                    <button
                      key={amount}
                      type="button"
                      disabled={gameState === 'loading' || wikithunes < amount}
                      onClick={() => setBetAmount(amount)}
                      className={`wiki-casino-btn flex-col !h-auto !py-1.5 !px-1 text-center ${
                        betAmount === amount
                          ? 'wiki-casino-btn--subtle'
                          : 'wiki-casino-btn--neutral'
                      }`}
                      title={`Mise de ${amount} ₩ • Difficulté : ${label}`}
                    >
                      <span className="font-bold text-[12.5px] leading-tight">{amount} ₩</span>
                      <span className="text-[10px] text-[#54595d] font-normal leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={gameState === 'loading' || wikithunes < 10}
                onClick={handleStartGame}
                className="wiki-casino-btn wiki-casino-btn--primary w-full"
              >
                <span>
                  {gameState === 'loading'
                    ? 'Chargement des pages...'
                    : `Lancer la série (${betAmount} ₩)`}
                </span>
              </button>
            </>
          ) : gameState === 'playing' ? (
            <div className="flex flex-col gap-2.5">
              {streak > 0 && (
                <button
                  type="button"
                  onClick={handleCashOut}
                  className="wiki-casino-btn wiki-casino-btn--success w-full"
                >
                  <span>Encaisser</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleGuess('higher')}
                  className="wiki-casino-btn wiki-casino-btn--subtle w-full !px-2.5 !text-[13.5px] whitespace-nowrap"
                >
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  <span>Plus de vues</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGuess('lower')}
                  className="wiki-casino-btn wiki-casino-btn--neutral w-full !px-2.5 !text-[13.5px] whitespace-nowrap"
                >
                  <TrendingDown className="w-4 h-4 shrink-0" />
                  <span>Moins de vues</span>
                </button>
              </div>
            </div>
          ) : gameState === 'won_round' ? (
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                disabled={isLoadingNext}
                onClick={handleCashOut}
                className="wiki-casino-btn wiki-casino-btn--success w-full"
              >
                <span>Terminer et encaisser</span>
              </button>

              <button
                type="button"
                disabled={isLoadingNext}
                onClick={handleNextRound}
                className="wiki-casino-btn wiki-casino-btn--primary w-full"
              >
                <span>{isLoadingNext ? 'Tirage...' : 'Suivant'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* État lost_round */
            <button
              type="button"
              onClick={handleFinishLost}
              className="wiki-casino-btn wiki-casino-btn--neutral w-full"
            >
              <span>Terminer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* COLONNE DROITE (4 col) : Page à deviner */}
      <div className="order-2 lg:order-3 lg:col-span-4 flex flex-col justify-between bg-white border border-[#c8ccd1] rounded-[2px] p-3 sm:p-4">
        <div className="flex items-center justify-between border-b border-[#eaecf0] pb-2 mb-3">
          <span className="text-[12px] sm:text-[13px] font-bold text-[#202122] uppercase tracking-wider">
            Page à deviner
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center min-h-[320px] sm:min-h-[452px]">
          {rightCard ? (
            <div className="w-full max-w-[272px]">
              <WikiCard
                card={rightCard}
                compact={true}
                hideViewsAndRarity={!rightRevealed}
              />
            </div>
          ) : (
            <div className="w-full max-w-[272px] h-[446px] rounded-[14px] border-2 border-dashed border-[#c8ccd1] bg-[#f8f9fa] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-white border border-[#c8ccd1] flex items-center justify-center text-[#72777d] mb-2">
                <HelpCircle className="w-6 h-6" />
              </div>
              <p className="text-[13px] text-[#54595d] m-0 leading-[1.5]">
                La page adverse s'affichera ici avec son nombre de vues masqué.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
