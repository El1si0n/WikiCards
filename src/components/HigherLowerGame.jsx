/**
 * @file Rôle : Mini-jeu Plus ou Moins (deviner si l'article suivant a plus ou moins de visiteurs Wikipédia).
 * Dépendances : React, `lucide-react`, `../services/wikipedia`, `../services/sound`, `../config/casino`.
 * Effets de bord : Débit/crédit de Wikithunes et mise à jour des statistiques de jeu.
 */

import React, { useState, useEffect, useRef } from 'react';
import WikiCard from './WikiCard';
import WikithuneIcon from './WikithuneIcon';
import { fetchRandomDuelCard } from '../services/wikipedia';
import { soundManager } from '../services/sound';
import { getMultiplierForStreak } from '../config/casino';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  HelpCircle,
  Loader2,
  Check,
  X,
} from 'lucide-react';

const HIGHER_LOWER_SESSION_KEY = 'wikicards_higher_lower_session_v1';

function loadSavedHigherLowerSession() {
  try {
    const raw = sessionStorage.getItem(HIGHER_LOWER_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        (parsed.gameState === 'playing' || parsed.gameState === 'won_round') &&
        parsed.leftCard &&
        parsed.rightCard &&
        Number(parsed.activeBet) > 0
      ) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function clearSavedHigherLowerSession() {
  try {
    sessionStorage.removeItem(HIGHER_LOWER_SESSION_KEY);
  } catch {
    // ignore
  }
}

/**
 * Jeu de pari sur les visiteurs Wikipédia avec série gagnante et multiplicateurs croissants.
 * @param {Object} props
 * @param {number} props.wikithunes - Solde de monnaie
 * @param {function(number): boolean} props.onSpendWikithunes - Callback de débit de mise
 * @param {function(number): void} props.onAddWikithunes - Callback de crédit des gains
 * @param {Object} [props.stats] - Statistiques du joueur
 * @param {function(Object): void} [props.onUpdateStats] - Callback de mise à jour des stats
 */
export default function HigherLowerGame({
  wikithunes,
  onSpendWikithunes,
  onAddWikithunes,
  stats: _stats,
  onUpdateStats,
}) {
  const initialSession = loadSavedHigherLowerSession();

  // 'idle' | 'loading' | 'playing' | 'won_round' | 'lost_round'
  const [gameState, setGameState] = useState(
    () => initialSession?.gameState || 'idle'
  );
  const [betAmount, setBetAmount] = useState(
    () => Number(initialSession?.betAmount) || 100
  );
  const [activeBet, setActiveBet] = useState(
    () => Number(initialSession?.activeBet) || 0
  );
  const [streak, setStreak] = useState(
    () => Number(initialSession?.streak) || 0
  );

  const [leftCard, setLeftCard] = useState(
    () => initialSession?.leftCard || null
  );
  const [rightCard, setRightCard] = useState(
    () => initialSession?.rightCard || null
  );
  const [seenCards, setSeenCards] = useState(
    () =>
      Array.isArray(initialSession?.seenCards)
        ? initialSession.seenCards
        : []
  );
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  // Historique glissant des 100 dernières cartes vues dans la session
  // Empêche les cartes de se répéter entre plusieurs parties successives
  const [sessionSeenTitles, setSessionSeenTitles] = useState(() =>
    Array.isArray(initialSession?.sessionSeenTitles)
      ? initialSession.sessionSeenTitles
      : []
  );

  const preloadedNextCardPromiseRef = useRef(null);

  // Sauvegarde automatique de la série en cours dans sessionStorage (anti-perte F5 ou changement d'onglet)
  useEffect(() => {
    if (
      (gameState === 'playing' || gameState === 'won_round') &&
      leftCard &&
      rightCard &&
      activeBet > 0
    ) {
      try {
        sessionStorage.setItem(
          HIGHER_LOWER_SESSION_KEY,
          JSON.stringify({
            gameState,
            betAmount,
            activeBet,
            streak,
            leftCard,
            rightCard,
            seenCards: seenCards.slice(-30),
            sessionSeenTitles: sessionSeenTitles.slice(-100),
          })
        );
      } catch {
        // ignore
      }
    } else if (gameState === 'idle' || gameState === 'lost_round') {
      clearSavedHigherLowerSession();
    }
  }, [
    gameState,
    betAmount,
    activeBet,
    streak,
    leftCard,
    rightCard,
    seenCards,
    sessionSeenTitles,
  ]);

  const currentPot =
    streak > 0
      ? Math.round(activeBet * getMultiplierForStreak(streak))
      : activeBet;

  // Démarre une nouvelle série en déduisant la mise de départ
  const handleStartGame = async () => {
    if (wikithunes < betAmount || betAmount < 10 || gameState === 'loading') {
      soundManager.playErrorSound();
      return;
    }

    onSpendWikithunes(betAmount);
    setActiveBet(betAmount);
    setStreak(0);
    setSeenCards([]);
    setGameState('loading');
    preloadedNextCardPromiseRef.current = null;

    // Le gain potentiel du tour 1 (mise * multiplicateur pour streak = 1)
    const round1PotentialGain = Math.round(betAmount * getMultiplierForStreak(1));

    // Tirage en parallèle de la 1re carte et d'une candidate pour la 2e carte afin de diviser le temps par 2
    const [firstCard, parallelCandidate] = await Promise.all([
      fetchRandomDuelCard(sessionSeenTitles, null, null, round1PotentialGain),
      fetchRandomDuelCard(sessionSeenTitles, null, null, round1PotentialGain),
    ]);

    let secondCard = parallelCandidate;
    if (
      !secondCard ||
      (firstCard &&
        (secondCard.id === firstCard.id ||
          secondCard.title === firstCard.title ||
          secondCard.views === firstCard.views))
    ) {
      const secondExcluded = [
        ...sessionSeenTitles,
        firstCard?.title,
        firstCard?.id,
      ].filter(Boolean);
      secondCard = await fetchRandomDuelCard(
        secondExcluded,
        firstCard?.views ?? null,
        firstCard?.rarity ?? null,
        round1PotentialGain
      );
    }

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
      onAddWikithunes(betAmount);
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
      onUpdateStats?.({
        recordStreak: nextStreak,
      });

      // Précharge immédiatement en tâche de fond la carte du prochain tour pour que le clic sur "Suivant" soit instantané
      const allExcluded = [
        ...sessionSeenTitles,
        ...seenCards.map((c) => c?.title),
        ...seenCards.map((c) => c?.id),
        rightCard.title,
        rightCard.id,
      ].filter(Boolean);
      const nextPotentialGain = Math.round(
        activeBet * getMultiplierForStreak(nextStreak + 1)
      );
      preloadedNextCardPromiseRef.current = fetchRandomDuelCard(
        allExcluded,
        rightCard.views,
        rightCard.rarity,
        nextPotentialGain
      ).catch(() => null);
    } else {
      clearSavedHigherLowerSession();
      preloadedNextCardPromiseRef.current = null;
      setGameState('lost_round');
      soundManager.playUpgradeLoss();
      onUpdateStats?.({
        lostMoneyCasino: activeBet,
      });
    }
  };

  // Continuer la série : la carte de droite passe à gauche et on tire une nouvelle page à droite
  const handleNextRound = async () => {
    if (gameState !== 'won_round' || isLoadingNext || !rightCard) return;

    setIsLoadingNext(true);
    const newRefCard = rightCard;
    let newRightCard = null;

    if (preloadedNextCardPromiseRef.current) {
      const preloaded = await preloadedNextCardPromiseRef.current;
      preloadedNextCardPromiseRef.current = null;
      if (
        preloaded &&
        preloaded.id !== newRefCard.id &&
        preloaded.title !== newRefCard.title
      ) {
        newRightCard = preloaded;
      }
    }

    if (!newRightCard) {
      const allExcluded = [
        ...sessionSeenTitles,
        ...seenCards.map((c) => c?.title),
        ...seenCards.map((c) => c?.id),
        newRefCard.title,
        newRefCard.id,
      ].filter(Boolean);

      const nextPotentialGain = Math.round(
        activeBet * getMultiplierForStreak(streak + 1)
      );

      newRightCard = await fetchRandomDuelCard(
        allExcluded,
        newRefCard.views,
        newRefCard.rarity,
        nextPotentialGain
      );
    }

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
    clearSavedHigherLowerSession();
    preloadedNextCardPromiseRef.current = null;
    const payout = Math.round(activeBet * getMultiplierForStreak(streak));
    const netProfit = payout - activeBet;
    onAddWikithunes(payout);
    soundManager.playCoinSound();
    if (netProfit > 0) {
      onUpdateStats?.({
        netCasinoGains: netProfit,
      });
    }
    setGameState('idle');
    setLeftCard(null);
    setRightCard(null);
    setSeenCards([]);
    setStreak(0);
    setActiveBet(0);
  };

  // Terminer après une défaite
  const handleFinishLost = () => {
    clearSavedHigherLowerSession();
    preloadedNextCardPromiseRef.current = null;
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
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* COLONNE GAUCHE (4 col) : Carte de référence */}
      <div
        className={`${
          gameState === 'idle' ? 'order-2' : 'order-1'
        } lg:order-1 lg:col-span-4 flex flex-col justify-between bg-white border border-[#c8ccd1] rounded-[2px] p-3 sm:p-4`}
      >
        <div className="flex items-center justify-between border-b border-[#eaecf0] pb-2 mb-3">
          <span className="text-[12px] sm:text-[13px] font-bold text-[#202122] uppercase tracking-wider">
            Carte de référence
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center py-2">
          {leftCard ? (
            <div className="w-full max-w-[284px]">
              <WikiCard card={leftCard} />
            </div>
          ) : (
            <div className="w-full max-w-[284px] aspect-[284/443] rounded-[14px] border-2 border-dashed border-[#c8ccd1] bg-[#f8f9fa] flex flex-col items-center justify-center p-6 text-center">
              <p className="text-[12px] sm:text-[13px] text-[#54595d] m-0 leading-[1.5]">
                Choisissez votre mise au centre et lancez une série pour
                afficher la première page Wikipédia.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* COLONNE CENTRALE (4 col) : Tableau de bord (en haut sur mobile au repos, au milieu en jeu) */}
      <div
        className={`${
          gameState === 'idle' ? 'order-1' : 'order-2'
        } lg:order-2 lg:col-span-4 flex flex-col items-center justify-between bg-white border border-[#c8ccd1] rounded-[2px] p-3 sm:p-4`}
      >
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
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center justify-center mb-1">
                <Check className="w-11 h-11 text-[#177860] dark:text-[#34d399] stroke-[2.75]" />
              </div>
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#177860] dark:text-[#34d399] mb-1">
                Gain net réel
              </span>
              <div className="text-[34px] sm:text-[40px] font-extrabold text-[#177860] dark:text-[#34d399] mt-0.5 inline-flex items-center gap-2 leading-none">
                <span>
                  +{new Intl.NumberFormat('fr-FR').format(Math.max(0, currentPot - activeBet))}
                </span>
                <WikithuneIcon className="w-7 h-7 text-[#177860] dark:text-[#34d399]" />
              </div>
              <span className="text-[11.5px] text-[#54595d] mt-2">
                Gain total à encaisser : {new Intl.NumberFormat('fr-FR').format(currentPot)} ₩
              </span>
            </div>
          ) : gameState === 'lost_round' ? (
            <div className="flex items-center justify-center">
              <X className="w-11 h-11 text-[#bf3c2c] dark:text-[#f87171] stroke-[2.75]" />
            </div>
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
                  {[50, 100, 250, 500].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      disabled={gameState === 'loading' || wikithunes < amount}
                      onClick={() => setBetAmount(amount)}
                      className={`wiki-casino-btn !min-h-[32px] !h-[32px] !py-0 !px-1 text-center font-bold text-[12.5px] ${
                        betAmount === amount
                          ? 'wiki-casino-btn--subtle'
                          : 'wiki-casino-btn--neutral'
                      }`}
                      title={`Mise de ${amount} ₩`}
                    >
                      {amount} ₩
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={
                  gameState === 'loading' ||
                  wikithunes < betAmount ||
                  wikithunes < 10
                }
                onClick={handleStartGame}
                className="wiki-casino-btn wiki-casino-btn--primary w-full"
              >
                <span>
                  {gameState === 'loading'
                    ? 'Chargement des pages...'
                    : wikithunes < betAmount
                      ? `Solde insuffisant (${betAmount} ₩ requis)`
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
      <div className="order-3 lg:order-3 lg:col-span-4 flex flex-col justify-between bg-white border border-[#c8ccd1] rounded-[2px] p-3 sm:p-4">
        <div className="flex items-center justify-between border-b border-[#eaecf0] pb-2 mb-3">
          <span className="text-[12px] sm:text-[13px] font-bold text-[#202122] uppercase tracking-wider">
            Page à deviner
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center py-2">
          {rightCard ? (
            <div className="w-full max-w-[284px]">
              <WikiCard
                card={rightCard}
                hideViewsAndRarity={!rightRevealed}
              />
            </div>
          ) : (
            <div className="w-full max-w-[284px] aspect-[284/443] rounded-[14px] border-2 border-dashed border-[#c8ccd1] bg-[#f8f9fa] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-white border border-[#c8ccd1] flex items-center justify-center text-[#72777d] mb-2">
                <HelpCircle className="w-6 h-6" />
              </div>
              <p className="text-[12px] sm:text-[13px] text-[#54595d] m-0 leading-[1.5]">
                La page adverse s'affichera ici avec son nombre de vues masqué.
              </p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
