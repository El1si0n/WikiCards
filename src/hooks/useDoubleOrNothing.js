/**
 * @file Rôle : Custom hook encapsulant la logique d'état, de simulation multi-roues et de transactions du Quitte ou Double.
 * Dépendances : React, `../services/sound`, `../config/casino`, `../config/rarities`.
 * Effets de bord : Résolution sessionStorage en cas d'interruption (F5), audio procédural, consommation et gains de cartes.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { soundManager } from '../services/sound';
import {
  DOUBLE_CHANCE_BY_RARITY,
  MAX_SELECTED_CARDS,
} from '../config/casino';
import { getRarityByCode, RARITY_TIERS } from '../config/rarities';

/**
 * Hook personnalisé gérant les paris de duplication de cartes.
 * @param {Object} params
 * @param {Array<Object>} [params.collection=[]] - Collection du joueur
 * @param {Array<string>} [params.favorites=[]] - IDs des cartes favorites protégées
 * @param {function(Object.<string, number>): void} params.onConsumeCards - Retrait des cartes perdues
 * @param {function(Object): void} params.onCardWon - Ajout d'exemplaires doublés
 * @param {function(Object): void} [params.onUpdateStats] - Mise à jour des stats
 * @returns {Object} État réactif et gestionnaires d'actions du Quitte ou Double
 */
export default function useDoubleOrNothing({
  collection = [],
  favorites = [],
  onConsumeCards,
  onCardWon,
  onUpdateStats,
}) {
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [spinState, setSpinState] = useState('idle'); // 'idle' | 'spinning' | 'won' | 'lost'
  const isRoundFinished = spinState === 'won' || spinState === 'lost';
  const [needleRotation, setNeedleRotation] = useState(0);
  const [spinSnapshot, setSpinSnapshot] = useState(null);
  const [cardWheels, setCardWheels] = useState([]);

  const [selectedRarityFilter, setSelectedRarityFilter] = useState('C');
  const [selectedThemeFilter, setSelectedThemeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('rarity_desc');

  const tickTimersRef = useRef([]);

  useEffect(() => {
    return () => {
      tickTimersRef.current.forEach((t) => clearTimeout(t));
      tickTimersRef.current = [];
    };
  }, []);

  // Résolution automatique en cas d'interruption par rechargement (F5)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('wikicards_pending_double');
      if (!raw) return;
      sessionStorage.removeItem('wikicards_pending_double');
      const pending = JSON.parse(raw);
      if (!pending || !Array.isArray(pending.initialResults)) return;

      const wonResults = pending.initialResults.filter((r) => r.isWin);
      const lostResults = pending.initialResults.filter((r) => !r.isWin);

      wonResults.forEach((r) => {
        onCardWon(r.card);
      });

      if (lostResults.length > 0) {
        const lostMap = {};
        lostResults.forEach((r) => {
          lostMap[r.card.id] = (lostMap[r.card.id] || 0) + 1;
        });
        onConsumeCards(lostMap);
      }

      if (wonResults.length > 0) {
        onUpdateStats?.({ wonCards: wonResults.length });
      }
      if (lostResults.length > 0) {
        onUpdateStats?.({ lostCards: lostResults.length });
      }
    } catch {
      // ignore
    }
  }, []);

  const eligibleCollection = useMemo(
    () => collection.filter((c) => c.rarity !== 'L'),
    [collection]
  );

  const eligibleRarityTiers = useMemo(
    () => [...RARITY_TIERS].filter((t) => t.code !== 'L').reverse(),
    []
  );

  const selectedCountsMap = useMemo(() => {
    const map = {};
    selectedCardIds.forEach((id) => {
      map[id] = (map[id] || 0) + 1;
    });
    return map;
  }, [selectedCardIds]);

  const liveSelectedCards = useMemo(() => {
    return selectedCardIds
      .map((id) =>
        eligibleCollection.find((c) => String(c.id) === String(id))
      )
      .filter(Boolean);
  }, [selectedCardIds, eligibleCollection]);

  const displayedSelectedCards = spinSnapshot
    ? spinSnapshot.cards
    : liveSelectedCards;

  const activeRarityCode = useMemo(() => {
    if (spinSnapshot?.rarity) return spinSnapshot.rarity;
    if (liveSelectedCards.length > 0) return liveSelectedCards[0].rarity;
    if (selectedRarityFilter && selectedRarityFilter !== 'ALL') {
      return selectedRarityFilter;
    }
    return 'C';
  }, [spinSnapshot, liveSelectedCards, selectedRarityFilter]);

  const activeTier = useMemo(
    () => getRarityByCode(activeRarityCode),
    [activeRarityCode]
  );

  const displayChance = DOUBLE_CHANCE_BY_RARITY[activeRarityCode] || 50;

  const getMaxSelectableCopies = (card) => {
    if (!card || card.rarity === 'L') return 0;
    const isFav = favorites.includes(card.id);
    const count = card.count || 1;
    return isFav ? Math.max(0, count - 1) : count;
  };

  useEffect(() => {
    if (spinState === 'idle') {
      setCardWheels(
        liveSelectedCards.map((card, idx) => ({
          key: `${card.id}-${idx}`,
          card,
          isWin: false,
          rotation: 0,
          durationMs: 0,
          isFinished: false,
        }))
      );
    }
  }, [liveSelectedCards, spinState]);

  const handleToggleCard = (card) => {
    if (spinState === 'spinning') return;

    if (spinSnapshot) {
      setSpinSnapshot(null);
      setSpinState('idle');
      setCardWheels([]);
    }

    const maxCopies = getMaxSelectableCopies(card);
    if (maxCopies <= 0) return;

    if (
      liveSelectedCards.length > 0 &&
      liveSelectedCards[0].rarity !== card.rarity
    ) {
      setSelectedCardIds([card.id]);
      soundManager.playCardSlide();
      return;
    }

    const currentSelectedQty = selectedCountsMap[card.id] || 0;

    if (
      currentSelectedQty < maxCopies &&
      selectedCardIds.length < MAX_SELECTED_CARDS
    ) {
      setSelectedCardIds((prev) => [...prev, card.id]);
      soundManager.playCardSlide();
      return;
    }

    if (currentSelectedQty > 0) {
      const nextIds = selectedCardIds.filter((id) => id !== card.id);
      setSelectedCardIds(nextIds);
      soundManager.playCardSlide();
    }
  };

  const handleRemoveSelectedInstanceAt = (indexToRemove) => {
    if (spinState === 'spinning' || spinSnapshot) return;
    const nextIds = selectedCardIds.filter((_, idx) => idx !== indexToRemove);
    setSelectedCardIds(nextIds);
    soundManager.playCardSlide();
  };

  const handleClearSelection = () => {
    if (spinState === 'spinning' || spinSnapshot) return;
    setSelectedCardIds([]);
    setCardWheels([]);
    soundManager.playCardSlide();
  };

  const handleFinishRound = () => {
    if (spinState === 'spinning') return;
    setSpinSnapshot(null);
    setSpinState('idle');
    setSelectedCardIds([]);
    setCardWheels([]);
  };

  const handleLaunchDouble = async () => {
    if (spinState === 'spinning' || liveSelectedCards.length === 0) return;

    const lockedCards = [...liveSelectedCards];
    const rarity = activeRarityCode;
    const winPercent = DOUBLE_CHANCE_BY_RARITY[rarity] || 50;
    const winArc = (winPercent / 100) * 360;

    const consumedMap = {};
    lockedCards.forEach((c) => {
      consumedMap[c.id] = (consumedMap[c.id] || 0) + 1;
    });

    const initialResults = lockedCards.map((card, idx) => {
      const isWin = Math.random() < winPercent / 100;
      let landingAngle;
      if (isWin) {
        landingAngle = 6 + Math.random() * Math.max(8, winArc - 12);
      } else {
        landingAngle =
          winArc + 6 + Math.random() * Math.max(8, 360 - winArc - 12);
      }
      const baseTurns = 360 * (5 + (idx % 2));
      const targetRotation = baseTurns + landingAngle;
      const durationMs =
        lockedCards.length === 1 ? 3550 : 2200 + idx * 300;

      return {
        key: `${card.id}-${idx}`,
        card,
        isWin,
        landingAngle,
        targetRotation,
        durationMs,
        isFinished: false,
      };
    });

    try {
      sessionStorage.setItem(
        'wikicards_pending_double',
        JSON.stringify({
          lockedCards,
          initialResults: initialResults.map((r) => ({
            key: r.key,
            card: r.card,
            isWin: r.isWin,
          })),
          consumedMap,
          rarity,
          timestamp: Date.now(),
        })
      );
    } catch {
      // ignore
    }

    const wonCount = initialResults.filter((r) => r.isWin).length;
    const totalCount = lockedCards.length;
    const hasWonAny = wonCount > 0;

    setSpinSnapshot({
      cards: lockedCards,
      results: initialResults,
      wonCount,
      totalCount,
      rarity,
    });
    setSelectedCardIds([]);
    setSpinState('spinning');

    if (lockedCards.length === 1) {
      const currentBaseTurns =
        Math.ceil(needleRotation / 360) * 360 + 360 * 6;
      const nextRotation = currentBaseTurns + initialResults[0].landingAngle;
      setNeedleRotation(nextRotation);

      tickTimersRef.current.forEach((t) => clearTimeout(t));
      tickTimersRef.current = [];
      const totalTicks = 26;
      for (let i = 0; i < totalTicks; i++) {
        const progress = i / totalTicks;
        const delayMs = Math.round(Math.pow(progress, 2.15) * 3350);
        const timerId = setTimeout(() => {
          soundManager.playWheelTick(1 + (1 - progress) * 0.25);
        }, delayMs);
        tickTimersRef.current.push(timerId);
      }

      await new Promise((resolve) => setTimeout(resolve, 3600));

      try {
        sessionStorage.removeItem('wikicards_pending_double');
      } catch {
        // ignore
      }

      if (initialResults[0].isWin) {
        onCardWon(lockedCards[0]);
        onUpdateStats?.({ wonCards: 1 });
        setSpinState('won');
        soundManager.playUpgradeWin(rarity);
      } else {
        onConsumeCards(consumedMap);
        onUpdateStats?.({ lostCards: 1 });
        setSpinState('lost');
        soundManager.playUpgradeLoss();
      }
      return;
    }

    setCardWheels(
      initialResults.map((r) => ({
        key: r.key,
        card: r.card,
        isWin: r.isWin,
        rotation: r.targetRotation,
        durationMs: r.durationMs,
        isFinished: false,
      }))
    );

    tickTimersRef.current.forEach((t) => clearTimeout(t));
    tickTimersRef.current = [];

    const maxDuration = Math.max(...initialResults.map((r) => r.durationMs));

    const totalTicks = 16 + lockedCards.length * 2;
    for (let i = 0; i < totalTicks; i++) {
      const progress = i / totalTicks;
      const delayMs = Math.round(Math.pow(progress, 1.85) * (maxDuration - 250));
      const timerId = setTimeout(() => {
        soundManager.playWheelTick(1 + (1 - progress) * 0.3);
      }, delayMs);
      tickTimersRef.current.push(timerId);
    }

    initialResults.forEach((res, idx) => {
      const stopTimer = setTimeout(() => {
        soundManager.playWheelTick(res.isWin ? 1.35 : 0.75);

        setCardWheels((prev) =>
          prev.map((w, wIdx) =>
            wIdx === idx ? { ...w, isFinished: true } : w
          )
        );

        setSpinSnapshot((prev) => {
          if (!prev) return prev;
          const nextResults = prev.results.map((r, rIdx) =>
            rIdx === idx ? { ...r, isFinished: true } : r
          );
          return {
            ...prev,
            results: nextResults,
          };
        });
      }, res.durationMs);

      tickTimersRef.current.push(stopTimer);
    });

    const endTimer = setTimeout(() => {
      try {
        sessionStorage.removeItem('wikicards_pending_double');
      } catch {
        // ignore
      }

      const wonResults = initialResults.filter((r) => r.isWin);
      const lostResults = initialResults.filter((r) => !r.isWin);

      wonResults.forEach((r) => {
        onCardWon(r.card);
      });

      if (lostResults.length > 0) {
        const lostMap = {};
        lostResults.forEach((r) => {
          lostMap[r.card.id] = (lostMap[r.card.id] || 0) + 1;
        });
        onConsumeCards(lostMap);
      }

      if (wonResults.length > 0) {
        onUpdateStats?.({ wonCards: wonResults.length });
      }
      if (lostResults.length > 0) {
        onUpdateStats?.({ lostCards: lostResults.length });
      }

      if (hasWonAny) {
        setSpinState('won');
        soundManager.playUpgradeWin(rarity);
      } else {
        setSpinState('lost');
        soundManager.playUpgradeLoss();
      }
    }, maxDuration + 250);

    tickTimersRef.current.push(endTimer);
  };

  return {
    selectedCardIds,
    spinState,
    isRoundFinished,
    needleRotation,
    spinSnapshot,
    cardWheels,
    selectedRarityFilter,
    setSelectedRarityFilter,
    selectedThemeFilter,
    setSelectedThemeFilter,
    sortBy,
    setSortBy,
    eligibleCollection,
    eligibleRarityTiers,
    selectedCountsMap,
    liveSelectedCards,
    displayedSelectedCards,
    activeRarityCode,
    activeTier,
    displayChance,
    getMaxSelectableCopies,
    handleToggleCard,
    handleRemoveSelectedInstanceAt,
    handleClearSelection,
    handleFinishRound,
    handleLaunchDouble,
  };
}
