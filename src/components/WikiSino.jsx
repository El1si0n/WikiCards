import React, { useState, useMemo, useEffect, useRef } from 'react';
import WikiCard from './WikiCard';
import WikithuneIcon from './WikithuneIcon';
import HigherLowerGame from './HigherLowerGame';
import DoubleOrNothingGame from './DoubleOrNothingGame';
import { RARITY_TIERS, getRarityByCode } from '../config/rarities';
import { WIKI_THEMES, detectCardTheme } from '../config/themes';
import { fetchWikiCardByRarity } from '../services/wikipedia';
import { soundManager } from '../services/sound';
import {
  HelpCircle,
  BookOpen,
  ArrowUpDown,
  ArrowRight,
} from 'lucide-react';

// Configuration des paliers d'Upgrade (N -> N+1)
// Limite maximale de succès indexée sur la rareté source :
// 95% pour C; 90% pour PC; 85% pour Rare; 80% pour SR; 75% pour UR
export const UPGRADE_RULES = {
  C: {
    sourceCode: 'C',
    targetCode: 'PC',
    chancePerCard: 25,
    costPerPercent: 3,
    maxChance: 95,
  },
  PC: {
    sourceCode: 'PC',
    targetCode: 'R',
    chancePerCard: 20,
    costPerPercent: 8,
    maxChance: 90,
  },
  R: {
    sourceCode: 'R',
    targetCode: 'SR',
    chancePerCard: 15,
    costPerPercent: 16,
    maxChance: 85,
  },
  SR: {
    sourceCode: 'SR',
    targetCode: 'UR',
    chancePerCard: 11,
    costPerPercent: 35,
    maxChance: 80,
  },
  UR: {
    sourceCode: 'UR',
    targetCode: 'L',
    chancePerCard: 7,
    costPerPercent: 75,
    maxChance: 75,
  },
};

export const MAX_UPGRADE_CHANCE = 95; // Valeur plafond max (accessible sur les Communes)
export const MAX_SELECTED_CARDS = 8; // Limite stricte de 8 cartes sélectionnées maximum

const RARITY_ORDER = {
  UR: 5,
  SR: 4,
  R: 3,
  PC: 2,
  C: 1,
};

export default function WikiSino({
  collection,
  favorites,
  wikithunes,
  onSpendWikithunes,
  onAddWikithunes,
  onConsumeCards,
  onCardWon,
  existingCardIds,
  onToggleFavorite,
}) {
  // Jeu actif dans le WikiSino : 'upgrader' (Étape 9.1) | 'higher_lower' (Étape 9.2)
  const [activeGame, setActiveGame] = useState('upgrader');

  // Liste des IDs sélectionnés (un même ID peut apparaître plusieurs fois si la carte est en ×2, ×3, etc.)
  const [selectedCardIds, setSelectedCardIds] = useState([]);

  // Pourcentage de chance bonus ajouté avec la jauge de Wikithunes (₩)
  const [bonusPercent, setBonusPercent] = useState(0);

  // État du tirage : 'idle' | 'spinning' | 'won' | 'lost'
  const [spinState, setSpinState] = useState('idle');
  const [needleRotation, setNeedleRotation] = useState(0);
  const [wonCard, setWonCard] = useState(null);

  // Snapshot figé pendant le spin et jusqu'au clic sur "Suivant / Terminer"
  const [spinSnapshot, setSpinSnapshot] = useState(null);

  // Filtres et tri du Classeur d'upgrade en bas (une seule rareté à la fois pour éviter tout lag)
  const [selectedRarityFilter, setSelectedRarityFilter] = useState('C');
  const [selectedThemeFilter, setSelectedThemeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('rarity_desc');

  const tickTimersRef = useRef([]);

  useEffect(() => {
    return () => {
      tickTimersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Collection éligible à l'upgrade (toutes les cartes sauf Légendaire 'L')
  const upgradeableCollection = useMemo(
    () => collection.filter((c) => c.rarity !== 'L' && UPGRADE_RULES[c.rarity]),
    [collection]
  );

  // Compteur du nombre d'exemplaires sélectionnés par ID de carte : { [cardId]: qty }
  const selectedCountsMap = useMemo(() => {
    const map = {};
    selectedCardIds.forEach((id) => {
      map[id] = (map[id] || 0) + 1;
    });
    return map;
  }, [selectedCardIds]);

  // Liste ordonnée des objets cartes sélectionnés (chaque exemplaire sélectionné correspond à une carte affichée)
  const liveSelectedCards = useMemo(() => {
    return selectedCardIds
      .map((id) =>
        upgradeableCollection.find((c) => String(c.id) === String(id))
      )
      .filter(Boolean);
  }, [selectedCardIds, upgradeableCollection]);

  // Rareté source actuelle
  const activeSourceRarity = useMemo(() => {
    if (spinSnapshot) {
      return spinSnapshot.sourceRarity;
    }
    if (liveSelectedCards.length > 0) {
      return liveSelectedCards[0].rarity;
    }
    if (
      selectedRarityFilter !== 'ALL' &&
      UPGRADE_RULES[selectedRarityFilter]
    ) {
      return selectedRarityFilter;
    }
    return null;
  }, [spinSnapshot, liveSelectedCards, selectedRarityFilter]);

  const currentRule = activeSourceRarity
    ? UPGRADE_RULES[activeSourceRarity]
    : null;

  // Rareté de la carte cible à droite
  const targetTier = useMemo(() => {
    if (spinSnapshot?.targetTier) {
      return spinSnapshot.targetTier;
    }
    if (currentRule) {
      return getRarityByCode(currentRule.targetCode);
    }
    return getRarityByCode('PC');
  }, [spinSnapshot, currentRule]);

  // Plafond de chance maximal propre au palier d'amélioration actuel
  const currentMaxChance = currentRule?.maxChance || 90;

  // Chance de base apportée par les cartes sélectionnées (plafonnée selon la rareté)
  const liveBaseCardChance = useMemo(() => {
    if (!currentRule || liveSelectedCards.length === 0) return 0;
    const tierMax = currentRule.maxChance || 90;
    return Math.min(
      tierMax,
      liveSelectedCards.length * currentRule.chancePerCard
    );
  }, [currentRule, liveSelectedCards.length]);

  // % maximum que l'on peut ajouter avec les Wikithunes (plafond propre à la rareté et limité par le solde)
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

  // Valeur continue pour que l'arc de la jauge glisse à 60fps sans saccade
  const smoothChance = spinSnapshot
    ? spinSnapshot.totalChance
    : Math.min(currentMaxChance, liveBaseCardChance + rawBonusPercent);

  const displayedSelectedCards = spinSnapshot
    ? spinSnapshot.cards
    : liveSelectedCards;

  // Nombre maximum d'exemplaires utilisables pour une carte (protège 1 exemplaire si la carte est en favori)
  const getMaxSelectableCopies = (card) => {
    if (!card || card.rarity === 'L' || !UPGRADE_RULES[card.rarity]) return 0;
    const count = card.count || 1;
    const isFav = favorites.includes(card.id);
    return isFav ? Math.max(0, count - 1) : count;
  };

  // Bouton "Suivant / Terminer" après un tirage gagné ou perdu : vide tout et permet de recommencer
  const handleFinishRound = () => {
    if (spinState === 'spinning') return;
    setSpinSnapshot(null);
    setWonCard(null);
    setSpinState('idle');
    setSelectedCardIds([]);
    setBonusPercent(0);
  };

  // Clic sur une carte dans le Classeur en bas :
  // - Limite de 8 cartes maximum dans Cartes sélectionnées
  // - Si la carte a plusieurs exemplaires (ex: ×2) et qu'on n'a pas encore tout sélectionné, ajoute 1 exemplaire supplémentaire !
  // - Si tous les exemplaires disponibles de cette carte sont déjà sélectionnés, la retire !
  const handleClasseurCardClick = (card) => {
    if (spinState === 'spinning') return;

    // Si on clique sur une carte alors qu'un résultat ("Réussi" / "Perdu") était affiché, on nettoie et on sélectionne directement
    if (spinSnapshot) {
      setSpinSnapshot(null);
      setSpinState('idle');
      setWonCard(null);
    }

    const maxCopies = getMaxSelectableCopies(card);
    if (maxCopies <= 0) return;

    // Si une autre rareté était sélectionnée, on remplace par 1 exemplaire de cette nouvelle carte
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

    // Si on peut encore ajouter un exemplaire de cette carte sans dépasser 8 cartes ni la limite de la rareté
    if (
      currentSelectedQty < maxCopies &&
      liveSelectedCards.length < MAX_SELECTED_CARDS &&
      liveBaseCardChance < cardTierMax
    ) {
      setSelectedCardIds((prev) => [...prev, card.id]);
      soundManager.playCardSlide();
      return;
    }

    // Sinon (tous les exemplaires de la carte étaient sélectionnés ou limite de 8 cartes / 85 % atteinte), on retire cette carte
    if (currentSelectedQty > 0) {
      const nextIds = selectedCardIds.filter((id) => id !== card.id);
      setSelectedCardIds(nextIds);
      if (nextIds.length === 0) {
        setBonusPercent(0);
      }
      soundManager.playCardSlide();
    }
  };

  // Clic sur une carte directement dans "Cartes sélectionnées" (en haut à gauche) : retire cet exemplaire précis
  const handleRemoveSelectedInstanceAt = (indexToRemove) => {
    if (spinState === 'spinning' || spinSnapshot) return;
    const nextIds = selectedCardIds.filter((_, idx) => idx !== indexToRemove);
    setSelectedCardIds(nextIds);
    if (nextIds.length === 0) {
      setBonusPercent(0);
    }
    soundManager.playCardSlide();
  };

  // Lancer l'Upgrade !
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

    // 1. On fige le snapshot visuel pendant la rotation
    setSpinSnapshot({
      cards: lockedCards,
      sourceRarity: activeSourceRarity,
      targetTier: lockedTargetTier,
      totalChance: finalChance,
      bonusPercent: effectiveBonusPercent,
      moneyCost: spentMoney,
    });

    // 2. On consomme les cartes sacrifiées (y compris les doublons ×2, ×3 engagés) et l'argent investi
    onConsumeCards(consumedMap);
    if (spentMoney > 0) {
      onSpendWikithunes(spentMoney);
    }

    setSelectedCardIds([]);
    setBonusPercent(0);
    setSpinState('spinning');
    setWonCard(null);

    // 3. Calcul du tirage et de l'angle d'atterrissage (0° à 360°)
    const winZoneDegrees = (finalChance / 100) * 360;
    const isWin = Math.random() * 100 < finalChance;

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

    // 4. Sons de clics de la roue qui ralentit
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

    // 5. Tirage en direct sur Wikipédia FR de la carte de rareté supérieure si gagné
    const cardPromise = isWin
      ? fetchWikiCardByRarity(targetCode, existingCardIds)
      : Promise.resolve(null);

    const [drawnCard] = await Promise.all([
      cardPromise,
      new Promise((resolve) => setTimeout(resolve, 3600)),
    ]);

    if (isWin && drawnCard) {
      setWonCard(drawnCard);
      setSpinState('won');
      onCardWon(drawnCard);
      soundManager.playUpgradeWin(targetCode);
    } else {
      setSpinState('lost');
      soundManager.playUpgradeLoss();
    }
  };

  // Comptage des cartes éligibles par thème
  const themeCounts = useMemo(() => {
    const counts = {};
    WIKI_THEMES.forEach((t) => {
      counts[t.id] = 0;
    });
    upgradeableCollection.forEach((card) => {
      const tId = card.theme || detectCardTheme(card);
      counts[tId] = (counts[tId] || 0) + 1;
    });
    return counts;
  }, [upgradeableCollection]);

  // Raretés affichées dans les filtres du Classeur d'upgrade (sans Légendaire 'L')
  const upgradeableRarityTiers = useMemo(
    () => [...RARITY_TIERS].filter((t) => t.code !== 'L').reverse(),
    []
  );

  // Filtrage et tri du Classeur en bas (une seule rareté affichée à la fois)
  const filteredAndSortedCollection = useMemo(() => {
    const filtered = upgradeableCollection.filter((card) => {
      const matchesRarity = card.rarity === selectedRarityFilter;

      const cardTheme = card.theme || detectCardTheme(card);
      const matchesTheme =
        selectedThemeFilter === 'ALL'
          ? true
          : cardTheme === selectedThemeFilter;

      return matchesRarity && matchesTheme;
    });

    const favSet = new Set(favorites);

    return [...filtered].sort((a, b) => {
      const aFav = favSet.has(a.id) ? 1 : 0;
      const bFav = favSet.has(b.id) ? 1 : 0;
      if (bFav !== aFav) return bFav - aFav;

      switch (sortBy) {
        case 'rarity_desc': {
          const diff =
            (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
          if (diff !== 0) return diff;
          return (b.views || 0) - (a.views || 0);
        }
        case 'gif_first': {
          const aGif = Boolean(
            a.isShiny || a.isGif || /\.gif(\?|$|\/)/i.test(a.image || '')
          )
            ? 1
            : 0;
          const bGif = Boolean(
            b.isShiny || b.isGif || /\.gif(\?|$|\/)/i.test(b.image || '')
          )
            ? 1
            : 0;
          if (bGif !== aGif) return bGif - aGif;
          const diff =
            (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
          if (diff !== 0) return diff;
          return (b.views || 0) - (a.views || 0);
        }
        case 'views_desc':
          return (b.views || 0) - (a.views || 0);
        case 'views_asc':
          return (a.views || 0) - (b.views || 0);
        case 'alpha_asc':
          return a.title.localeCompare(b.title, 'fr');
        case 'recent':
          return (b.obtainedAt || 0) - (a.obtainedAt || 0);
        case 'count_desc': {
          const diff = (b.count || 1) - (a.count || 1);
          if (diff !== 0) return diff;
          return (b.views || 0) - (a.views || 0);
        }
        default:
          return 0;
      }
    });
  }, [
    upgradeableCollection,
    selectedRarityFilter,
    selectedThemeFilter,
    favorites,
    sortBy,
  ]);

  // Géométrie de la jauge circulaire (fluide avec smoothChance)
  const gaugeRadius = 92;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeArcLength = (smoothChance / 100) * gaugeCircumference;
  const winArcDegrees = (smoothChance / 100) * 360;
  const sliderFillPercent =
    maxPossibleBonusPercent > 0
      ? Math.min(100, (rawBonusPercent / maxPossibleBonusPercent) * 100)
      : 0;

  return (
    <div className="space-y-5">
      <section className="accueil_2017_cadre">
        {/* En-tête avec navigation style onglets Wikipédia Vector 2022 */}
        <div className="wiki-cadre-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="wiki-smallcaps m-0 text-[18px] sm:text-[20px]">
            {activeGame === 'upgrader'
              ? 'Upgrader de cartes'
              : activeGame === 'higher_lower'
              ? 'Plus ou Moins de vues'
              : 'Quitte ou Double'}
          </h2>

          <div className="flex items-center gap-2.5 sm:gap-5 text-[13px] sm:text-[14px] overflow-x-auto whitespace-nowrap scrollbar-none pb-1 sm:pb-0 max-w-full">
            <button
              type="button"
              onClick={() => setActiveGame('upgrader')}
              className={`vector-tab-link ${
                activeGame === 'upgrader' ? 'selected' : ''
              }`}
            >
              Upgrader
            </button>
            <button
              type="button"
              onClick={() => setActiveGame('higher_lower')}
              className={`vector-tab-link ${
                activeGame === 'higher_lower' ? 'selected' : ''
              }`}
            >
              Plus ou Moins
            </button>
            <button
              type="button"
              onClick={() => setActiveGame('double_or_nothing')}
              className={`vector-tab-link ${
                activeGame === 'double_or_nothing' ? 'selected' : ''
              }`}
            >
              Quitte ou Double
            </button>
          </div>
        </div>

        {activeGame === 'higher_lower' ? (
          <HigherLowerGame
            wikithunes={wikithunes}
            onSpendWikithunes={onSpendWikithunes}
            onAddWikithunes={onAddWikithunes}
          />
        ) : activeGame === 'double_or_nothing' ? (
          <DoubleOrNothingGame
            collection={collection}
            favorites={favorites}
            onConsumeCards={onConsumeCards}
            onCardWon={onCardWon}
            onToggleFavorite={onToggleFavorite}
          />
        ) : (
          /* =====================================================================
             JEU 1 : UPGRADER DE CARTES (3 COLONNES)
          ===================================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* COLONNE GAUCHE (4 col) : Cartes sélectionnées (limite de 8 cartes) */}
            <div className="lg:col-span-4 flex flex-col justify-between bg-white border border-[#c8ccd1] rounded-[2px] p-4">
              <div className="flex items-center justify-between border-b border-[#eaecf0] pb-2 mb-3">
                <span className="text-[13px] font-bold text-[#202122] uppercase tracking-wider">
                  Cartes sélectionnées
                </span>
                <span className="text-[12px] text-[#54595d] font-medium">
                  {displayedSelectedCards.length}/{MAX_SELECTED_CARDS}
                </span>
              </div>

              <div className="flex-1 flex items-center justify-center min-h-[452px]">
                {displayedSelectedCards.length > 0 ? (
                  <div className="relative w-full flex items-center justify-center">
                    {displayedSelectedCards.length === 1 ? (
                      <div
                        className="w-full max-w-[272px]"
                        title="Cliquez sur la carte pour la retirer"
                      >
                        <WikiCard
                          card={displayedSelectedCards[0]}
                          compact={true}
                          onSelectCard={
                            spinState === 'spinning' || spinSnapshot
                              ? undefined
                              : () => handleRemoveSelectedInstanceAt(0)
                          }
                        />
                      </div>
                    ) : (
                      /* Plusieurs cartes sélectionnées : éventail à la taille native 272x446 */
                      <div className="relative flex items-center justify-center w-full h-[452px] overflow-hidden">
                        {displayedSelectedCards.map((card, idx) => {
                          const total = displayedSelectedCards.length;
                          const offsetStep = Math.min(
                            38,
                            Math.floor(110 / Math.max(1, total - 1))
                          );
                          const startOffset =
                            -((total - 1) * offsetStep) / 2;
                          const translateX = startOffset + idx * offsetStep;
                          return (
                            <div
                              key={`${card.id}-${idx}`}
                              style={{
                                transform: `translateX(${translateX}px)`,
                                zIndex: 10 + idx,
                              }}
                              className="absolute w-full max-w-[272px] transition-transform duration-200 hover:!z-40 hover:-translate-y-1.5"
                              title="Cliquez sur cette carte pour la retirer"
                            >
                              <WikiCard
                                card={card}
                                compact={true}
                                onSelectCard={
                                  spinState === 'spinning' || spinSnapshot
                                    ? undefined
                                    : () => handleRemoveSelectedInstanceAt(idx)
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full max-w-[272px] h-[446px] rounded-[14px] border-2 border-dashed border-[#c8ccd1] bg-[#f8f9fa] flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-[13px] text-[#54595d] m-0 leading-[1.5]">
                      Cliquez sur une ou plusieurs cartes dans le classeur
                      ci-dessous pour les placer dans l'Upgrader.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* COLONNE CENTRALE (4 col) : Jauge de probabilité + Boost en Wikithunes + Bouton Lancer / Suivant */}
            <div className="lg:col-span-4 flex flex-col items-center justify-between bg-white border border-[#c8ccd1] rounded-[2px] p-4">
              <div className="w-full flex items-center justify-between border-b border-[#eaecf0] pb-2 mb-2">
                <span className="text-[13px] font-bold text-[#202122] uppercase tracking-wider">
                  Jauge de probabilité
                </span>
              </div>

              {/* Roue SVG circulaire avec flèche de précision */}
              <div className="relative my-auto py-2 flex items-center justify-center">
                <svg
                  width="264"
                  height="264"
                  viewBox="0 0 268 268"
                  className="select-none overflow-visible"
                >
                  <defs>
                    <filter
                      id="wikisino-arc-glow"
                      x="-20%"
                      y="-20%"
                      width="140%"
                      height="140%"
                    >
                      <feDropShadow
                        dx="0"
                        dy="2"
                        stdDeviation="3"
                        floodColor={targetTier.borderColor || '#3366cc'}
                        floodOpacity="0.35"
                      />
                    </filter>
                    <filter
                      id="wikisino-pointer-shadow"
                      x="-30%"
                      y="-30%"
                      width="160%"
                      height="160%"
                    >
                      <feDropShadow
                        dx="0"
                        dy="1.5"
                        stdDeviation="1.8"
                        floodColor="#000000"
                        floodOpacity="0.38"
                      />
                    </filter>
                  </defs>

                  {/* Couronne extérieure de graduations (40 repères autour du cadran) */}
                  <g transform="translate(134, 134)">
                    {Array.from({ length: 40 }).map((_, idx) => {
                      const deg = idx * 9;
                      const isMajor = idx % 5 === 0;
                      const isInWinZone =
                        displayChance > 0 && deg <= winArcDegrees;
                      return (
                        <line
                          key={idx}
                          x1="0"
                          y1={isMajor ? -119 : -116}
                          x2="0"
                          y2="-110"
                          transform={`rotate(${deg})`}
                          stroke={
                            isInWinZone
                              ? targetTier.borderColor || '#3366cc'
                              : isMajor
                              ? '#a2a9b1'
                              : '#d8dce2'
                          }
                          strokeWidth={isMajor ? '2' : '1.2'}
                          strokeLinecap="round"
                        />
                      );
                    })}
                  </g>

                  {/* Rail circulaire principal */}
                  <circle
                    cx="134"
                    cy="134"
                    r={gaugeRadius}
                    fill="none"
                    stroke="var(--wiki-gauge-track, #eef1f6)"
                    strokeWidth="26"
                  />

                  {/* Bordures fines intérieure et extérieure du rail */}
                  <circle
                    cx="134"
                    cy="134"
                    r={gaugeRadius + 13}
                    fill="none"
                    stroke="var(--wiki-border-subtle, #c8ccd1)"
                    strokeWidth="1.2"
                  />
                  <circle
                    cx="134"
                    cy="134"
                    r={gaugeRadius - 13}
                    fill="none"
                    stroke="var(--wiki-border-subtle, #c8ccd1)"
                    strokeWidth="1.2"
                  />

                  {/* Zone colorée de victoire */}
                  {smoothChance > 0 && (
                    <circle
                      cx="134"
                      cy="134"
                      r={gaugeRadius}
                      fill="none"
                      stroke={targetTier.borderColor || '#3366cc'}
                      strokeWidth="24"
                      strokeDasharray={`${gaugeArcLength} ${gaugeCircumference}`}
                      strokeDashoffset="0"
                      strokeLinecap="butt"
                      transform="rotate(-90 134 134)"
                    />
                  )}

                  {/* Repère de départ à 0° (12h) */}
                  <line
                    x1="134"
                    y1={134 - gaugeRadius - 13}
                    x2="134"
                    y2={134 - gaugeRadius + 13}
                    stroke="var(--wiki-text, #202122)"
                    strokeWidth="2"
                  />

                  {/* Repère de fin de la zone gagnante */}
                  {smoothChance > 0 && (
                    <g transform={`rotate(${winArcDegrees} 134 134)`}>
                      <line
                        x1="134"
                        y1={134 - gaugeRadius - 13}
                        x2="134"
                        y2={134 - gaugeRadius + 13}
                        stroke="var(--wiki-text, #202122)"
                        strokeWidth="2"
                      />
                    </g>
                  )}

                  {/* Disque central fixe (un seul cercle épuré) */}
                  <circle
                    cx="134"
                    cy="134"
                    r="64"
                    fill={
                      spinState === 'won'
                        ? 'var(--wiki-gauge-won-bg, #dff2eb)'
                        : spinState === 'lost'
                        ? 'var(--wiki-gauge-lost-bg, #ffe9e5)'
                        : 'var(--wiki-bg-subtle, #f8f9fa)'
                    }
                    stroke={
                      spinState === 'won'
                        ? '#099979'
                        : spinState === 'lost'
                        ? '#f54739'
                        : 'var(--wiki-border-subtle, #c8ccd1)'
                    }
                    strokeWidth="1.5"
                  />

                  {/* Curseur / Flèche de précision qui tourne autour de la jauge */}
                  <g
                    style={{
                      transform: `rotate(${needleRotation}deg)`,
                      transformOrigin: '134px 134px',
                      transition:
                        spinState === 'spinning'
                          ? 'transform 3.55s cubic-bezier(0.12, 0.82, 0.16, 1)'
                          : 'none',
                    }}
                    filter="url(#wikisino-pointer-shadow)"
                  >
                    <line
                      x1="134"
                      y1="26"
                      x2="134"
                      y2="58"
                      stroke="#ffffff"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <line
                      x1="134"
                      y1="26"
                      x2="134"
                      y2="58"
                      stroke="#1e293b"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M134 31 L125 14 L134 18 L143 14 Z"
                      fill="#1e293b"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <polygon
                      points="134,53 129,63 139,63"
                      fill="#1e293b"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                    />
                  </g>
                </svg>

                {/* Affichage central simple et lisible (uniquement le texte principal) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6">
                  {spinState === 'won' ? (
                    <span className="text-[22px] font-extrabold text-[#177860] leading-tight">
                      Réussi !
                    </span>
                  ) : spinState === 'lost' ? (
                    <span className="text-[22px] font-extrabold text-[#bf3c2c] leading-tight">
                      Perdu
                    </span>
                  ) : (
                    <span
                      className="text-[30px] font-extrabold leading-none tracking-tight"
                      style={{
                        color:
                          displayChance > 0
                            ? 'var(--wiki-text-emphasized, #101418)'
                            : '#72777d',
                      }}
                    >
                      {displayChance}&nbsp;%
                    </span>
                  )}
                </div>
              </div>

              {/* Boost en Wikithunes + Bouton Lancer ou Bouton Suivant / Terminer */}
              <div className="w-full pt-3 border-t border-[#eaecf0] space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12.5px] font-bold text-[#202122]">
                      Boost en Wikithunes
                    </span>
                    <span className="text-[12.5px] font-bold text-[#3366cc] inline-flex items-center gap-1">
                      <span>+{effectiveBonusPercent}&nbsp;%</span>
                      <span className="text-[#54595d] font-normal">
                        ({new Intl.NumberFormat('fr-FR').format(moneyCost)}
                      </span>
                      <WikithuneIcon className="w-3.5 h-3.5 text-[#3366cc]" />
                      <span className="text-[#54595d] font-normal">)</span>
                    </span>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={maxPossibleBonusPercent}
                      step="any"
                      disabled={
                        spinState === 'spinning' ||
                        Boolean(spinSnapshot) ||
                        liveSelectedCards.length === 0 ||
                        maxPossibleBonusPercent <= 0
                      }
                      value={rawBonusPercent}
                      onChange={(e) => setBonusPercent(Number(e.target.value))}
                      style={{
                        background: `linear-gradient(to right, #3366cc 0%, #3366cc ${sliderFillPercent}%, #eaecf0 ${sliderFillPercent}%, #eaecf0 100%)`,
                      }}
                      className="wiki-range-slider w-full cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {spinState === 'won' || spinState === 'lost' ? (
                  <button
                    type="button"
                    onClick={handleFinishRound}
                    className={`wiki-casino-btn w-full ${
                      spinState === 'won'
                        ? 'wiki-casino-btn--success'
                        : 'wiki-casino-btn--neutral'
                    }`}
                  >
                    <span>
                      {spinState === 'won' ? 'Suivant' : 'Terminer'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={
                      spinState === 'spinning' ||
                      liveSelectedCards.length === 0 ||
                      displayChance <= 0 ||
                      (moneyCost > 0 && wikithunes < moneyCost)
                    }
                    onClick={handleLaunchUpgrade}
                    className="wiki-casino-btn wiki-casino-btn--primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>
                      {spinState === 'spinning'
                        ? 'Tirage en cours...'
                        : moneyCost > 0 && wikithunes < moneyCost
                        ? `Solde insuffisant (${new Intl.NumberFormat('fr-FR').format(wikithunes)} / ${new Intl.NumberFormat('fr-FR').format(moneyCost)} ₩)`
                        : "Lancer l'Upgrade"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* COLONNE DROITE (4 col) : Carte cible (dimensions exactes 272x446 et netteté 100 % native) */}
            <div className="lg:col-span-4 flex flex-col items-center justify-between bg-white border border-[#c8ccd1] rounded-[2px] p-4">
              <div className="w-full flex items-center justify-between border-b border-[#eaecf0] pb-2 mb-3">
                <span className="text-[13px] font-bold text-[#202122] uppercase tracking-wider">
                  Carte cible
                </span>
              </div>

              <div className="flex-1 flex items-center justify-center min-h-[452px] w-full">
                {spinState === 'won' && wonCard ? (
                  <div className="w-full max-w-[272px]">
                    <WikiCard
                      card={wonCard}
                      compact={true}
                      isFavorite={favorites.includes(wonCard.id)}
                      onToggleFavorite={onToggleFavorite}
                    />
                  </div>
                ) : (
                  <div
                    className="relative w-full max-w-[272px] h-[446px] rounded-[14px] overflow-hidden flex flex-col justify-between select-none transition-colors duration-300"
                    style={{
                      background: targetTier.cardBg,
                      border:
                        targetTier.code === 'L'
                          ? '2px solid #f5d442'
                          : targetTier.code === 'UR'
                          ? '1.5px solid #f5a642'
                          : `1px solid ${targetTier.borderColor}`,
                      boxShadow: `0 8px 20px -6px ${targetTier.shadowColor}, 0 2px 6px rgba(0,0,0,0.06)`,
                      color: targetTier.textColor,
                    }}
                  >
                    {/* Badge de rareté en haut à gauche */}
                    <div className="relative z-20 p-3 flex items-center justify-between">
                      <div
                        className="min-w-[32px] h-[24px] px-2 text-[12px] rounded-[7px] flex items-center justify-center font-extrabold tracking-wide shadow-[0_2px_6px_rgba(0,0,0,0.22)]"
                        style={{
                          backgroundColor: targetTier.badgeBg,
                          color: targetTier.badgeText,
                        }}
                      >
                        {targetTier.code}
                      </div>
                    </div>

                    {/* Centre flouté de la carte */}
                    <div className="relative flex-1 px-3.5 flex flex-col justify-center">
                      <div className="filter blur-[8px] opacity-75 pointer-events-none space-y-3.5">
                        <div
                          className="w-full h-[168px] rounded-[8px]"
                          style={{
                            background:
                              'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(15,23,42,0.25) 50%, rgba(255,255,255,0.6) 100%)',
                          }}
                        />
                        <div className="space-y-2.5 pt-2">
                          <div className="h-4 w-3/4 rounded bg-black/25" />
                          <div className="h-3 w-full rounded bg-black/20" />
                          <div className="h-3 w-11/12 rounded bg-black/20" />
                          <div className="h-3 w-4/5 rounded bg-black/20" />
                        </div>
                      </div>

                      {/* Médaillon central */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-sm mb-2"
                          style={{
                            backgroundColor: targetTier.badgeBg,
                            borderColor: targetTier.borderColor,
                            color: targetTier.badgeText,
                          }}
                        >
                          <HelpCircle className="w-6 h-6" />
                        </div>
                        <span
                          className="px-3 py-1 rounded-[5px] text-[12px] font-bold shadow-xs"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            color: '#202122',
                          }}
                        >
                          {spinState === 'spinning'
                            ? 'Révélation en cours...'
                            : `Carte ${targetTier.name}`}
                        </span>
                      </div>
                    </div>

                    {/* Pied de la carte cible */}
                    <div
                      className="relative z-10 px-3.5 py-2.5 border-t flex items-center justify-between text-[12px] font-bold"
                      style={{ borderColor: targetTier.dividerColor }}
                    >
                      <span>{targetTier.thresholdLabel}</span>
                      <span>Wikipédia FR</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* =====================================================================
          CLASSEUR POUR L'UPGRADE (6 CARTES PAR LIGNE, SANS LES LÉGENDAIRES)
          Affiché uniquement quand on est sur l'Upgrader de cartes
      ===================================================================== */}
      {activeGame === 'upgrader' && (
        <section className="accueil_2017_cadre">
          <div className="wiki-cadre-header flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="wiki-smallcaps m-0">
              Classeur de cartes Wikipédia
            </h2>
          </div>

          {/* Barre de filtres par rareté (1 seule rareté à la fois, sans Légendaire L) + Filtre par Thème + Sélecteur de tri */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#eaecf0]">
            <div className="flex flex-wrap items-center gap-1.5">
              {upgradeableRarityTiers.map((tier) => {
                const count = upgradeableCollection.filter(
                  (c) => c.rarity === tier.code
                ).length;
                return (
                  <button
                    key={tier.code}
                    type="button"
                    onClick={() => setSelectedRarityFilter(tier.code)}
                    className={`px-2.5 py-1 text-[12px] rounded-[2px] border cursor-pointer transition-all flex items-center gap-1.5 ${
                      selectedRarityFilter === tier.code
                        ? 'ring-2 ring-[#3366cc] font-bold bg-white border-[#3366cc]'
                        : 'bg-[#f8f9fa] hover:bg-white border-[#c8ccd1]'
                    }`}
                  >
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: tier.borderColor }}
                    />
                    <span>
                      {tier.code} ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[12.5px] shrink-0">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="wikisino-classeur-theme"
                  className="inline-flex items-center gap-1 text-[#54595d] font-medium"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Thème :</span>
                </label>
                <select
                  id="wikisino-classeur-theme"
                  value={selectedThemeFilter}
                  onChange={(e) => setSelectedThemeFilter(e.target.value)}
                  className="bg-[#f8f9fa] hover:bg-white border border-[#a2a9b1] rounded-[2px] px-2.5 py-1 text-[12.5px] text-[#202122] focus:outline-none focus:border-[#3366cc] cursor-pointer"
                >
                  <option value="ALL">
                    Tous les thèmes ({upgradeableCollection.length})
                  </option>
                  {WIKI_THEMES.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.label} ({themeCounts[theme.id] || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="wikisino-classeur-sort"
                  className="inline-flex items-center gap-1 text-[#54595d] font-medium"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>Trier par :</span>
                </label>
                <select
                  id="wikisino-classeur-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[#f8f9fa] hover:bg-white border border-[#a2a9b1] rounded-[2px] px-2.5 py-1 text-[12.5px] text-[#202122] focus:outline-none focus:border-[#3366cc] cursor-pointer"
                >
                  <option value="rarity_desc">
                    Rareté (plus rare d'abord)
                  </option>
                  <option value="gif_first">Cartes GIF (Métal) d'abord</option>
                  <option value="views_desc">Vues (plus vues d'abord)</option>
                  <option value="views_asc">Vues (moins vues d'abord)</option>
                  <option value="recent">Obtenues récemment</option>
                  <option value="alpha_asc">
                    Ordre alphabétique (A → Z)
                  </option>
                  <option value="count_desc">Doublons (exemplaires)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Grille 6 colonnes (lg:grid-cols-6) avec cartes au format mini */}
          {filteredAndSortedCollection.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 justify-items-center">
              {filteredAndSortedCollection.map((card) => {
                const selectedQty = selectedCountsMap[card.id] || 0;
                const maxCopies = getMaxSelectableCopies(card);
                const isSelected = selectedQty > 0;
                const rule = UPGRADE_RULES[card.rarity];
                const isFavProtected =
                  favorites.includes(card.id) && (card.count || 1) <= 1;

                const badgeText = isFavProtected
                  ? '★ Protégée'
                  : isSelected
                  ? maxCopies > 1
                    ? `${selectedQty}/${maxCopies} (+${selectedQty * rule.chancePerCard} %)`
                    : `+${rule.chancePerCard} %`
                  : `+${rule.chancePerCard} %`;

                return (
                  <WikiCard
                    key={card.id}
                    card={card}
                    mini={true}
                    isFavorite={favorites.includes(card.id)}
                    duplicateCount={card.count || 1}
                    isSelected={isSelected}
                    isDisabledSelection={isFavProtected}
                    selectionBadgeText={badgeText}
                    onSelectCard={() => handleClasseurCardClick(card)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="py-14 text-center bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px]">
              <p className="text-[14px] text-[#54595d] m-0">
                {upgradeableCollection.length === 0
                  ? 'Aucune carte améliorable dans votre classeur. Ouvrez un booster pour obtenir des cartes !'
                  : 'Aucune carte ne correspond à votre filtre actuel.'}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
