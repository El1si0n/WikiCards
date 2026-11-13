/**
 * @file Rôle : Custom hook encapsulant la logique d'état, de simulation multi-roues, d'anti-farm et de transactions du Quitte ou Double.
 * Dépendances : React, `../services/sound`, `../config/casino`, `../config/rarities`.
 * Effets de bord : Résolution sessionStorage en cas d'interruption (F5), persistance localStorage de la fatigue anti-farm, audio procédural, consommation et gains de cartes.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { soundManager } from '../services/sound';
import {
  DOUBLE_CHANCE_BY_RARITY,
  MAX_SELECTED_CARDS,
  getDoubleFatiguePenalty,
  getEffectiveDoubleChance,
  resolveDoubleFatigueState,
} from '../config/casino';
import { getRarityByCode, RARITY_TIERS } from '../config/rarities';

const DOUBLE_FATIGUE_STORAGE_KEY = 'wikicards_double_fatigue_v2';

function resolveFatigueMap(rawMap, now = Date.now()) {
  const next = {};
  if (!rawMap || typeof rawMap !== 'object') return next;
  Object.entries(rawMap).forEach(([rarity, entry]) => {
    if (!entry || typeof entry !== 'object') return;
    const resolved = resolveDoubleFatigueState(
      entry.count,
      entry.lastTimestamp,
      now
    );
    if (resolved.count > 0) {
      next[rarity] = {
        count: resolved.count,
        lastTimestamp: resolved.lastTimestamp,
        nextRecoveryRemainingMs: resolved.nextRecoveryRemainingMs,
      };
    }
  });
  return next;
}

function loadInitialFatigueByRarity() {
  try {
    const raw = localStorage.getItem(DOUBLE_FATIGUE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const resolved = resolveFatigueMap(parsed, Date.now());
    const clean = {};
    Object.entries(resolved).forEach(([rarity, entry]) => {
      clean[rarity] = { count: entry.count, lastTimestamp: entry.lastTimestamp };
    });
    return clean;
  } catch {
    return {};
  }
}

function saveFatigueByRarity(map) {
  try {
    const clean = {};
    if (map && typeof map === 'object') {
      Object.entries(map).forEach(([rarity, entry]) => {
        if (entry && entry.count > 0) {
          clean[rarity] = {
            count: entry.count,
            lastTimestamp: entry.lastTimestamp,
          };
        }
      });
    }
    if (Object.keys(clean).length === 0) {
      localStorage.removeItem(DOUBLE_FATIGUE_STORAGE_KEY);
    } else {
      localStorage.setItem(DOUBLE_FATIGUE_STORAGE_KEY, JSON.stringify(clean));
    }
  } catch {
    // ignore
  }
}

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

  const [fatigueByRarity, setFatigueByRarity] = useState(() =>
    loadInitialFatigueByRarity()
  );
  const [now, setNow] = useState(() => Date.now());

  const tickTimersRef = useRef([]);

  const hasActiveFatigue = Object.values(fatigueByRarity).some(
    (entry) => entry && entry.count > 0
  );

  useEffect(() => {
    if (!hasActiveFatigue) return undefined;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 5000);
    return () => clearInterval(interval);
  }, [hasActiveFatigue]);

  const resolvedFatigueByRarity = useMemo(
    () => resolveFatigueMap(fatigueByRarity, now),
    [fatigueByRarity, now]
  );

  useEffect(() => {
    const keysA = Object.keys(fatigueByRarity);
    const keysB = Object.keys(resolvedFatigueByRarity);
    const changed =
      keysA.length !== keysB.length ||
      keysB.some(
        (k) => fatigueByRarity[k]?.count !== resolvedFatigueByRarity[k]?.count
      );
    if (changed) {
      const nextClean = {};
      keysB.forEach((k) => {
        nextClean[k] = {
          count: resolvedFatigueByRarity[k].count,
          lastTimestamp: resolvedFatigueByRarity[k].lastTimestamp,
        };
      });
      setFatigueByRarity(nextClean);
      saveFatigueByRarity(nextClean);
    }
  }, [fatigueByRarity, resolvedFatigueByRarity]);

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

  const activeFatigue = resolvedFatigueByRarity[activeRarityCode] || {
    count: 0,
    lastTimestamp: now,
    nextRecoveryRemainingMs: 0,
  };
  const consecutivePlays = activeFatigue.count;
  const fatiguePenalty = getDoubleFatiguePenalty(consecutivePlays);
  const recoveryRemainingSeconds = Math.ceil(
    (activeFatigue.nextRecoveryRemainingMs || 0) / 1000
  );
  const baseChance = DOUBLE_CHANCE_BY_RARITY[activeRarityCode] || 50;
  const displayChance =
    spinSnapshot?.winPercent ??
    getEffectiveDoubleChance(activeRarityCode, consecutivePlays);
  const getChanceForRarity = (rarityCode) =>
    getEffectiveDoubleChance(
      rarityCode,
      resolvedFatigueByRarity[rarityCode]?.count || 0
    );

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

    const launchNow = Date.now();
    const lockedCards = [...liveSelectedCards];
    const rarity = activeRarityCode;
    const resolvedMap = resolveFatigueMap(fatigueByRarity, launchNow);
    const currentRarityFatigue = resolvedMap[rarity] || {
      count: 0,
      lastTimestamp: launchNow,
    };
    const winPercent = getEffectiveDoubleChance(rarity, currentRarityFatigue.count);
    const winArc = (winPercent / 100) * 360;

    const nextFatigueMap = {};
    Object.entries(resolvedMap).forEach(([k, entry]) => {
      nextFatigueMap[k] = {
        count: entry.count,
        lastTimestamp: entry.lastTimestamp,
      };
    });
    nextFatigueMap[rarity] = {
      count: currentRarityFatigue.count + 1,
      lastTimestamp: launchNow,
    };
    setFatigueByRarity(nextFatigueMap);
    setNow(launchNow);
    saveFatigueByRarity(nextFatigueMap);

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
      winPercent,
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
    baseChance,
    fatiguePenalty,
    consecutivePlays,
    recoveryRemainingSeconds,
    displayChance,
    getChanceForRarity,
    getMaxSelectableCopies,
    handleToggleCard,
    handleRemoveSelectedInstanceAt,
    handleClearSelection,
    handleFinishRound,
    handleLaunchDouble,
  };
}
