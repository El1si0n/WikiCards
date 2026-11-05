/**
 * @file Rôle : Custom hook gérant l'état métier, les animations de roue, les probabilités et les transactions de l'Upgrader.
 * Dépendances : React, `../services/wikipedia`, `../services/sound`, `../config/casino`, `../config/rarities`.
 * Effets de bord : Résolution sessionStorage en cas d'interruption (F5), audio procédural temps réel, consommation et gains de cartes.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { fetchWikiCardByRarity } from '../services/wikipedia';
import { soundManager } from '../services/sound';
import {
  UPGRADE_RULES,
  MAX_UPGRADE_CHANCE,
  MAX_SELECTED_CARDS,
} from '../config/casino';
import { getRarityByCode } from '../config/rarities';

/**
 * Hook personnalisé encapsulant la logique complète de l'Upgrader de cartes.
 * @param {Object} params
 * @param {Array<Object>} [params.collection=[]] - Collection du joueur
 * @param {Array<string>} [params.favorites=[]] - IDs des cartes favorites
 * @param {number} [params.wikithunes=0] - Solde de monnaie
 * @param {function(number): boolean} params.onSpendWikithunes - Dépense de monnaie
 * @param {function(Object.<string, number>): void} params.onConsumeCards - Retrait de cartes
 * @param {function(Object): void} params.onCardWon - Attribution de carte
 * @param {Array<string>} [params.existingCardIds=[]] - IDs des cartes possédées
 * @param {function(Object): void} [params.onUpdateStats] - Mise à jour des statistiques
 * @returns {Object} État réactif et gestionnaires d'actions de l'Upgrader
 */
export default function useUpgraderGame({
  collection = [],
  favorites = [],
  wikithunes = 0,
  onSpendWikithunes,
  onConsumeCards,
  onCardWon,
  existingCardIds = [],
  onUpdateStats,
}) {
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [bonusPercent, setBonusPercent] = useState(0);
  const [spinState, setSpinState] = useState('idle');
  const [needleRotation, setNeedleRotation] = useState(0);
  const [wonCard, setWonCard] = useState(null);
  const [spinSnapshot, setSpinSnapshot] = useState(null);

  const [selectedRarityFilter, setSelectedRarityFilter] = useState('C');
  const [selectedThemeFilter, setSelectedThemeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('rarity_desc');

  const tickTimersRef = useRef([]);

  // Nettoyage impératif des timers audio lors du démontage
  useEffect(() => {
    return () => {
      tickTimersRef.current.forEach((t) => clearTimeout(t));
      tickTimersRef.current = [];
    };
  }, []);

  // Résolution automatique en cas d'interruption par actualisation (F5)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('wikicards_pending_upgrade');
      if (!raw) return;
      sessionStorage.removeItem('wikicards_pending_upgrade');
      const pending = JSON.parse(raw);
      if (!pending || !pending.consumedMap) return;

      if (pending.isWin) {
        fetchWikiCardByRarity(pending.targetCode, existingCardIds).then(
          (drawnCard) => {
            if (drawnCard) {
              onConsumeCards(pending.consumedMap);
              onCardWon(drawnCard);
              const netVolumeLoss = (pending.lockedCards?.length || 1) - 1;
              if (netVolumeLoss > 0) {
                onUpdateStats?.({ lostCards: netVolumeLoss });
              }
            }
          }
        );
      } else {
        onConsumeCards(pending.consumedMap);
        onUpdateStats?.({
          lostCards: pending.lockedCards?.length || 1,
          lostMoneyCasino: pending.spentMoney || 0,
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const upgradeableCollection = useMemo(
    () => collection.filter((c) => c.rarity !== 'L' && UPGRADE_RULES[c.rarity]),
    [collection]
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
        upgradeableCollection.find((c) => String(c.id) === String(id))
      )
      .filter(Boolean);
  }, [selectedCardIds, upgradeableCollection]);

  const activeSourceRarity = useMemo(() => {
    if (spinSnapshot) return spinSnapshot.sourceRarity;
    if (liveSelectedCards.length > 0) return liveSelectedCards[0].rarity;
    if (selectedRarityFilter !== 'ALL' && UPGRADE_RULES[selectedRarityFilter]) {
      return selectedRarityFilter;
    }
    return null;
  }, [spinSnapshot, liveSelectedCards, selectedRarityFilter]);

  const currentRule = activeSourceRarity
    ? UPGRADE_RULES[activeSourceRarity]
    : null;

  const targetTier = useMemo(() => {
    if (spinSnapshot?.targetTier) return spinSnapshot.targetTier;
    if (currentRule) return getRarityByCode(currentRule.targetCode);
    return getRarityByCode('PC');
  }, [spinSnapshot, currentRule]);

  const currentMaxChance = currentRule?.maxChance || 90;

  const liveBaseCardChance = useMemo(() => {
    if (!currentRule || liveSelectedCards.length === 0) return 0;
    const tierMax = currentRule.maxChance || 90;
    return Math.min(
      tierMax,
      liveSelectedCards.length * currentRule.chancePerCard
    );
  }, [currentRule, liveSelectedCards.length]);

  const maxPossibleBonusPercent = useMemo(() => {
    if (!currentRule || liveSelectedCards.length === 0) return 0;
    const tierMax = currentRule.maxChance || 90;
    const roomToCap = Math.max(0, tierMax - liveBaseCardChance);
    const affordablePercent = Math.floor(
      wikithunes / currentRule.costPerPercent
    );
    return Math.min(roomToCap, affordablePercent);
  }, [currentRule, liveSelectedCards.length, liveBaseCardChance, wikithunes]);

  const rawBonusPercent = spinSnapshot
    ? spinSnapshot.bonusPercent
    : Math.min(bonusPercent, maxPossibleBonusPercent);

  const effectiveBonusPercent = Math.round(rawBonusPercent);

  const moneyCost = spinSnapshot
    ? spinSnapshot.moneyCost
    : currentRule
    ? effectiveBonusPercent * currentRule.costPerPercent
    : 0;

  const displayChance = spinSnapshot
    ? spinSnapshot.totalChance
    : Math.min(currentMaxChance, liveBaseCardChance + effectiveBonusPercent);

  const smoothChance = spinSnapshot
    ? spinSnapshot.totalChance
    : Math.min(currentMaxChance, liveBaseCardChance + rawBonusPercent);

  const displayedSelectedCards = spinSnapshot
    ? spinSnapshot.cards
    : liveSelectedCards;

  const getMaxSelectableCopies = (card) => {
    if (!card || card.rarity === 'L' || !UPGRADE_RULES[card.rarity]) return 0;
    const count = card.count || 1;
    const isFav = favorites.includes(card.id);
    return isFav ? Math.max(0, count - 1) : count;
  };

  const handleFinishRound = () => {
    if (spinState === 'spinning') return;
    setSpinSnapshot(null);
    setWonCard(null);
    setSpinState('idle');
    setSelectedCardIds([]);
    setBonusPercent(0);
  };

  const handleClasseurCardClick = (card) => {
    if (spinState === 'spinning') return;

    if (spinSnapshot) {
      setSpinSnapshot(null);
      setSpinState('idle');
      setWonCard(null);
    }

    const maxCopies = getMaxSelectableCopies(card);
    if (maxCopies <= 0) return;

    if (
      liveSelectedCards.length > 0 &&
      liveSelectedCards[0].rarity !== card.rarity
    ) {
      setSelectedCardIds([card.id]);
      setBonusPercent(0);
      soundManager.playCardSlide();
      return;
    }

    const currentSelectedQty = selectedCountsMap[card.id] || 0;
    const cardTierMax = UPGRADE_RULES[card.rarity]?.maxChance || 90;

    if (
      currentSelectedQty < maxCopies &&
      liveSelectedCards.length < MAX_SELECTED_CARDS &&
      liveBaseCardChance < cardTierMax
    ) {
      setSelectedCardIds((prev) => [...prev, card.id]);
      soundManager.playCardSlide();
      return;
    }

    if (currentSelectedQty > 0) {
      const nextIds = selectedCardIds.filter((id) => id !== card.id);
      setSelectedCardIds(nextIds);
      if (nextIds.length === 0) {
        setBonusPercent(0);
      }
      soundManager.playCardSlide();
    }
  };

  const handleRemoveSelectedInstanceAt = (indexToRemove) => {
    if (spinState === 'spinning' || spinSnapshot) return;
    const nextIds = selectedCardIds.filter((_, idx) => idx !== indexToRemove);
    setSelectedCardIds(nextIds);
    if (nextIds.length === 0) {
      setBonusPercent(0);
    }
    soundManager.playCardSlide();
  };

  const handleClearSelection = () => {
    if (spinState === 'spinning' || spinSnapshot) return;
    setSelectedCardIds([]);
    setBonusPercent(0);
    soundManager.playCardSlide();
  };

  const handleLaunchUpgrade = async () => {
    if (
      spinState === 'spinning' ||
      liveSelectedCards.length === 0 ||
      !currentRule ||
      displayChance <= 0 ||
      (moneyCost > 0 && wikithunes < moneyCost)
    ) {
      return;
    }

    const finalChance = displayChance;
    const targetCode = currentRule.targetCode;
    const lockedTargetTier = getRarityByCode(targetCode);
    const lockedCards = [...liveSelectedCards];
    const spentMoney = moneyCost;
    const consumedMap = { ...selectedCountsMap };

    const winZoneDegrees = (finalChance / 100) * 360;
    const isWin = Math.random() * 100 < finalChance;

    setSpinSnapshot({
      cards: lockedCards,
      sourceRarity: activeSourceRarity,
      targetTier: lockedTargetTier,
      totalChance: finalChance,
      bonusPercent: effectiveBonusPercent,
      moneyCost: spentMoney,
    });

    if (spentMoney > 0) {
      onSpendWikithunes(spentMoney);
    }

    try {
      sessionStorage.setItem(
        'wikicards_pending_upgrade',
        JSON.stringify({
          consumedMap,
          spentMoney,
          lockedCards,
          targetCode,
          isWin,
          timestamp: Date.now(),
        })
      );
    } catch {
      // ignore
    }

    setSelectedCardIds([]);
    setBonusPercent(0);
    setSpinState('spinning');
    setWonCard(null);

    let landingAngle;
    if (isWin) {
      const margin = Math.min(3.5, winZoneDegrees * 0.2);
      landingAngle =
        margin + Math.random() * Math.max(0.5, winZoneDegrees - margin * 2);
    } else {
      const loseZoneSize = 360 - winZoneDegrees;
      const margin = Math.min(3.5, loseZoneSize * 0.2);
      landingAngle =
        winZoneDegrees +
        margin +
        Math.random() * Math.max(0.5, loseZoneSize - margin * 2);
    }

    const currentBaseTurns =
      Math.ceil(needleRotation / 360) * 360 + 360 * 6;
    const nextRotation = currentBaseTurns + landingAngle;
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

    const cardPromise = isWin
      ? fetchWikiCardByRarity(targetCode, existingCardIds)
      : Promise.resolve(null);

    const [drawnCard] = await Promise.all([
      cardPromise,
      new Promise((resolve) => setTimeout(resolve, 3600)),
    ]);

    try {
      sessionStorage.removeItem('wikicards_pending_upgrade');
    } catch {
      // ignore
    }

    if (isWin && drawnCard) {
      setWonCard(drawnCard);
      setSpinState('won');
      onConsumeCards(consumedMap);
      onCardWon(drawnCard);
      soundManager.playUpgradeWin(targetCode);

      const netVolumeLoss = lockedCards.length - 1;
      if (netVolumeLoss > 0) {
        onUpdateStats?.({ lostCards: netVolumeLoss });
      }
    } else {
      setSpinState('lost');
      soundManager.playUpgradeLoss();
      onConsumeCards(consumedMap);
      onUpdateStats?.({
        lostCards: lockedCards.length,
        lostMoneyCasino: spentMoney || 0,
      });
    }
  };

  const winArcDegrees = (smoothChance / 100) * 360;
  const sliderFillPercent =
    maxPossibleBonusPercent > 0
      ? Math.min(100, (rawBonusPercent / maxPossibleBonusPercent) * 100)
      : 0;

  return {
    selectedCardIds,
    bonusPercent,
    setBonusPercent,
    spinState,
    needleRotation,
    wonCard,
    spinSnapshot,
    selectedRarityFilter,
    setSelectedRarityFilter,
    selectedThemeFilter,
    setSelectedThemeFilter,
    sortBy,
    setSortBy,
    upgradeableCollection,
    selectedCountsMap,
    liveSelectedCards,
    displayedSelectedCards,
    activeSourceRarity,
    currentRule,
    targetTier,
    currentMaxChance,
    maxPossibleBonusPercent,
    effectiveBonusPercent,
    moneyCost,
    displayChance,
    smoothChance,
    winArcDegrees,
    sliderFillPercent,
    getMaxSelectableCopies,
    handleFinishRound,
    handleClasseurCardClick,
    handleRemoveSelectedInstanceAt,
    handleClearSelection,
    handleLaunchUpgrade,
  };
}
