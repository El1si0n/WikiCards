import React, { useState, useMemo, useEffect, useRef } from 'react';
import WikiCard from './WikiCard';
import { RARITY_TIERS, getRarityByCode } from '../config/rarities';
import { WIKI_THEMES, detectCardTheme } from '../config/themes';
import { soundManager } from '../services/sound';
import {
  HelpCircle,
  BookOpen,
  ArrowUpDown,
  ArrowRight,
  XCircle,
} from 'lucide-react';

const RARITY_ORDER = {
  L: 6,
  UR: 5,
  SR: 4,
  R: 3,
  PC: 2,
  C: 1,
};

const MAX_SELECTED_CARDS = 8;

// Configuration des probabilités de réussite au Quitte ou Double selon la rareté :
// 55% pour C; 52% pour PC; 49% pour Rare; 46% pour SR et 43% pour UR
export const DOUBLE_CHANCE_BY_RARITY = {
  C: 55,
  PC: 52,
  R: 49,
  SR: 46,
  UR: 43,
};

export default function DoubleOrNothingGame({
  collection,
  favorites,
  onConsumeCards,
  onCardWon,
  onToggleFavorite,
}) {
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [spinState, setSpinState] = useState('idle'); // 'idle' | 'spinning' | 'won' | 'lost'
  const [needleRotation, setNeedleRotation] = useState(0);
  const [spinSnapshot, setSpinSnapshot] = useState(null);

  // Filtres et tri du Classeur en bas (une seule rareté affichée à la fois)
  const [selectedRarityFilter, setSelectedRarityFilter] = useState('C');
  const [selectedThemeFilter, setSelectedThemeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('rarity_desc');

  const tickTimersRef = useRef([]);

  useEffect(() => {
    return () => {
      tickTimersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Cartes éligibles au Quitte ou Double : toutes sauf les Légendaires (L)
  const eligibleCollection = useMemo(
    () => collection.filter((c) => c.rarity !== 'L'),
    [collection]
  );

  const eligibleRarityTiers = useMemo(
    () => [...RARITY_TIERS].filter((t) => t.code !== 'L').reverse(),
    []
  );

  // Compteur du nombre d'exemplaires sélectionnés par ID de carte : { [cardId]: qty }
  const selectedCountsMap = useMemo(() => {
    const map = {};
    selectedCardIds.forEach((id) => {
      map[id] = (map[id] || 0) + 1;
    });
    return map;
  }, [selectedCardIds]);

  // Liste ordonnée des objets cartes sélectionnées (avec autant d'entrées que d'exemplaires)
  const liveSelectedCards = useMemo(() => {
    return selectedCardIds
      .map((id) =>
        eligibleCollection.find((c) => String(c.id) === String(id))
      )
      .filter(Boolean);
  }, [selectedCardIds, eligibleCollection]);

  // Cartes affichées à gauche : les cartes sélectionnées ou celles du snapshot pendant/après tirage
  const displayedSelectedCards = spinSnapshot
    ? spinSnapshot.cards
    : liveSelectedCards;

  // Rareté active de la cible (dérivée des cartes sélectionnées, du snapshot ou du filtre actif)
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

  // Nombre maximum d'exemplaires sélectionnables pour une carte (protège les favoris)
  const getMaxSelectableCopies = (card) => {
    if (!card || card.rarity === 'L') return 0;
    const isFav = favorites.includes(card.id);
    const count = card.count || 1;
    return isFav ? Math.max(0, count - 1) : count;
  };

  const handleToggleCard = (card) => {
    if (spinState === 'spinning') return;

    if (spinSnapshot) {
      setSpinSnapshot(null);
      setSpinState('idle');
    }

    const maxCopies = getMaxSelectableCopies(card);
    if (maxCopies <= 0) return;

    // Si une autre rareté était sélectionnée, on remplace par 1 exemplaire de cette nouvelle carte
    if (
      liveSelectedCards.length > 0 &&
      liveSelectedCards[0].rarity !== card.rarity
    ) {
      setSelectedCardIds([card.id]);
      soundManager.playCardSlide();
      return;
    }

    const currentSelectedQty = selectedCountsMap[card.id] || 0;

    // Si on peut encore ajouter un exemplaire de cette carte sans dépasser 8 cartes au total
    if (
      currentSelectedQty < maxCopies &&
      selectedCardIds.length < MAX_SELECTED_CARDS
    ) {
      setSelectedCardIds((prev) => [...prev, card.id]);
      soundManager.playCardSlide();
      return;
    }

    // Sinon (tous les exemplaires disponibles déjà sélectionnés ou limite de 8 cartes atteinte), on retire cette carte
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

  const handleFinishRound = () => {
    if (spinState === 'spinning') return;
    setSpinSnapshot(null);
    setSpinState('idle');
    setSelectedCardIds([]);
  };

  const handleLaunchDouble = async () => {
    if (spinState === 'spinning' || liveSelectedCards.length === 0) return;

    const lockedCards = [...liveSelectedCards];
    const rarity = activeRarityCode;
    const winPercent = DOUBLE_CHANCE_BY_RARITY[rarity] || 50;

    // Retrait des exemplaires misés de la collection
    const consumedMap = {};
    lockedCards.forEach((c) => {
      consumedMap[c.id] = (consumedMap[c.id] || 0) + 1;
    });
    onConsumeCards(consumedMap);

    // Tirage indépendant par carte
    const results = lockedCards.map((card, idx) => {
      const isWin = Math.random() < winPercent / 100;
      return {
        key: `${card.id}-${idx}`,
        card,
        isWin,
      };
    });

    const wonCount = results.filter((r) => r.isWin).length;
    const totalCount = lockedCards.length;
    const hasWonAny = wonCount > 0;

    setSpinSnapshot({
      cards: lockedCards,
      results,
      wonCount,
      totalCount,
      rarity,
    });
    setSelectedCardIds([]);
    setSpinState('spinning');

    const winArc = (winPercent / 100) * 360;
    let landingAngle;
    if (hasWonAny) {
      // Atterrissage net dans la zone gagnante [5°, winArc - 5°]
      landingAngle = 5 + Math.random() * Math.max(10, winArc - 10);
    } else {
      // Atterrissage net dans la zone perdante [winArc + 5°, 355°]
      landingAngle =
        winArc + 5 + Math.random() * Math.max(10, 360 - winArc - 10);
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

    await new Promise((resolve) => setTimeout(resolve, 3600));

    // Attribution des cartes doublées : 2 exemplaires (original + double) pour chaque carte gagnante
    results
      .filter((r) => r.isWin)
      .forEach((r) => {
        onCardWon(r.card);
        onCardWon(r.card);
      });

    if (hasWonAny) {
      setSpinState('won');
      soundManager.playUpgradeWin(rarity);
    } else {
      setSpinState('lost');
      soundManager.playUpgradeLoss();
    }
  };

  const themeCounts = useMemo(() => {
    const counts = {};
    WIKI_THEMES.forEach((t) => {
      counts[t.id] = 0;
    });
    eligibleCollection.forEach((card) => {
      const tId = card.theme || detectCardTheme(card);
      counts[tId] = (counts[tId] || 0) + 1;
    });
    return counts;
  }, [eligibleCollection]);

  const filteredAndSortedCollection = useMemo(() => {
    const filtered = eligibleCollection.filter((card) => {
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
    eligibleCollection,
    selectedRarityFilter,
    selectedThemeFilter,
    favorites,
    sortBy,
  ]);

  const gaugeRadius = 92;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeArcLength = (displayChance / 100) * gaugeCircumference;
  const winArcDegrees = (displayChance / 100) * 360;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* COLONNE GAUCHE (4 col) : Carte sélectionnée */}
        <div className="order-1 lg:order-1 lg:col-span-4 flex flex-col justify-between bg-white border border-[#c8ccd1] rounded-[2px] p-3 sm:p-4">
          <div className="flex items-center justify-between border-b border-[#eaecf0] pb-2 mb-3">
            <span className="text-[12px] sm:text-[13px] font-bold text-[#202122] uppercase tracking-wider">
              Cartes sélectionnées
            </span>
            <span className="text-[12px] text-[#54595d] font-medium">
              {displayedSelectedCards.length}/{MAX_SELECTED_CARDS}
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[320px] sm:min-h-[452px]">
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
                  <div className="relative flex items-center justify-center w-full h-[320px] sm:h-[452px] overflow-hidden">
                    {displayedSelectedCards.map((card, idx) => {
                      const total = displayedSelectedCards.length;
                      const offsetStep = Math.min(
                        38,
                        Math.floor(110 / Math.max(1, total - 1))
                      );
                      const startOffset = -((total - 1) * offsetStep) / 2;
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
              <div className="w-full max-w-[272px] h-[320px] sm:h-[446px] rounded-[14px] border-2 border-dashed border-[#c8ccd1] bg-[#f8f9fa] flex flex-col items-center justify-center p-6 text-center">
                <p className="text-[13px] text-[#54595d] m-0 leading-[1.5]">
                  Cliquez sur 1 à 8 cartes dans le classeur ci-dessous pour
                  tenter de les doubler en même temps.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* COLONNE CENTRALE (4 col) : Jauge 50/50 */}
        <div className="order-3 lg:order-2 lg:col-span-4 flex flex-col items-center justify-between bg-white border border-[#c8ccd1] rounded-[2px] p-3 sm:p-4">
          <div className="w-full flex items-center justify-between border-b border-[#eaecf0] pb-2 mb-2">
            <span className="text-[13px] font-bold text-[#202122] uppercase tracking-wider">
              Jauge de probabilité
            </span>
          </div>

          <div className="relative my-auto py-2 flex items-center justify-center">
            <svg
              width="264"
              height="264"
              viewBox="0 0 268 268"
              className="select-none overflow-visible"
            >
              <defs>
                <filter
                  id="double-pointer-shadow"
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

              <g transform="translate(134, 134)">
                {Array.from({ length: 40 }).map((_, idx) => {
                  const deg = idx * 9;
                  const isMajor = idx % 5 === 0;
                  const isInWinZone = displayChance > 0 && deg <= winArcDegrees;
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
                          ? activeTier.borderColor || '#3366cc'
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

              <circle
                cx="134"
                cy="134"
                r={gaugeRadius}
                fill="none"
                stroke="var(--wiki-gauge-track, #eef1f6)"
                strokeWidth="26"
              />

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

              {displayChance > 0 && (
                <circle
                  cx="134"
                  cy="134"
                  r={gaugeRadius}
                  fill="none"
                  stroke={activeTier.borderColor || '#3366cc'}
                  strokeWidth="24"
                  strokeDasharray={`${gaugeArcLength} ${gaugeCircumference}`}
                  strokeDashoffset="0"
                  strokeLinecap="butt"
                  transform="rotate(-90 134 134)"
                />
              )}

              <line
                x1="134"
                y1={134 - gaugeRadius - 13}
                x2="134"
                y2={134 - gaugeRadius + 13}
                stroke="var(--wiki-text, #202122)"
                strokeWidth="2"
              />

              {displayChance > 0 && (
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

              <g
                style={{
                  transform: `rotate(${needleRotation}deg)`,
                  transformOrigin: '134px 134px',
                  transition:
                    spinState === 'spinning'
                      ? 'transform 3.55s cubic-bezier(0.12, 0.82, 0.16, 1)'
                      : 'none',
                }}
                filter="url(#double-pointer-shadow)"
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

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              {spinState === 'won' ? (
                <div className="flex flex-col items-center">
                  <span className="text-[20px] sm:text-[22px] font-extrabold text-[#177860] leading-tight">
                    {spinSnapshot?.totalCount > 1
                      ? `${spinSnapshot.wonCount}/${spinSnapshot.totalCount} Réussi${spinSnapshot.wonCount > 1 ? 's' : ''}`
                      : 'Réussi !'}
                  </span>
                  {spinSnapshot?.totalCount > 1 && (
                    <span className="text-[11px] font-bold text-[#177860]/80 mt-0.5">
                      +{spinSnapshot.wonCount * 2} cartes
                    </span>
                  )}
                </div>
              ) : spinState === 'lost' ? (
                <div className="flex flex-col items-center">
                  <span className="text-[20px] sm:text-[22px] font-extrabold text-[#bf3c2c] leading-tight">
                    {spinSnapshot?.totalCount > 1
                      ? `0/${spinSnapshot.totalCount} Réussi`
                      : 'Perdu'}
                  </span>
                  {spinSnapshot?.totalCount > 1 && (
                    <span className="text-[11px] font-bold text-[#bf3c2c]/80 mt-0.5">
                      Cartes perdues
                    </span>
                  )}
                </div>
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

          <div className="w-full pt-3 border-t border-[#eaecf0]">
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
                <span>{spinState === 'won' ? 'Suivant' : 'Terminer'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={spinState === 'spinning' || liveSelectedCards.length === 0}
                onClick={handleLaunchDouble}
                className="wiki-casino-btn wiki-casino-btn--primary w-full"
              >
                <span>
                  {spinState === 'spinning'
                    ? 'Tirage en cours...'
                    : liveSelectedCards.length > 1
                    ? `Lancer (${liveSelectedCards.length} cartes)`
                    : 'Lancer le Quitte ou Double'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* COLONNE DROITE (4 col) : Carte cible / Résultat */}
        <div className="order-2 lg:order-3 lg:col-span-4 flex flex-col items-center justify-between bg-white border border-[#c8ccd1] rounded-[2px] p-3 sm:p-4">
          <div className="w-full flex items-center justify-between border-b border-[#eaecf0] pb-2 mb-3">
            <span className="text-[12px] sm:text-[13px] font-bold text-[#202122] uppercase tracking-wider">
              {spinSnapshot ? 'Résultats du tirage' : 'Carte cible'}
            </span>
            {spinSnapshot && (
              <span className="text-[12px] font-bold text-[#54595d]">
                {spinSnapshot.wonCount}/{spinSnapshot.totalCount} gagné{spinSnapshot.wonCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[320px] sm:min-h-[452px] w-full">
            {spinSnapshot ? (
              spinSnapshot.totalCount === 1 ? (
                spinState === 'won' ? (
                  <div className="w-full max-w-[272px]">
                    <WikiCard
                      card={spinSnapshot.results[0].card}
                      compact={true}
                      duplicateCount={2}
                      isFavorite={favorites.includes(spinSnapshot.results[0].card.id)}
                      onToggleFavorite={onToggleFavorite}
                    />
                  </div>
                ) : (
                  <div className="w-full max-w-[272px] h-[320px] sm:h-[446px] rounded-[14px] border-2 border-dashed border-[#f54739]/50 bg-[#fff5f5] flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#ffe9e5] border border-[#f54739] text-[#bf3c2c] flex items-center justify-center mb-3">
                      <XCircle className="w-6 h-6" />
                    </div>
                    <span className="text-[14px] font-bold text-[#bf3c2c] mb-1">
                      Carte perdue
                    </span>
                    <p className="text-[12px] text-[#72777d] m-0">
                      « {spinSnapshot.results[0].card.title} » a été détruite.
                    </p>
                  </div>
                )
              ) : (
                /* Résultats pour plusieurs cartes (2 à 8) */
                <div className="w-full h-full max-h-[446px] flex flex-col justify-between">
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[380px]">
                    {spinSnapshot.results.map((res) => (
                      <div
                        key={res.key}
                        className={`p-2 rounded-[4px] border flex items-center justify-between gap-2.5 transition-all ${
                          res.isWin
                            ? 'bg-[#f0f9f5] border-[#099979]/40'
                            : 'bg-[#fafafa] border-[#e2e2e2] opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {res.card.image ? (
                            <img
                              src={res.card.image}
                              alt={res.card.title}
                              className={`w-9 h-9 object-cover rounded-[3px] border shrink-0 ${
                                res.isWin
                                  ? 'border-[#099979]'
                                  : 'border-[#c8ccd1] grayscale'
                              }`}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-[3px] bg-[#eaecf0] flex items-center justify-center shrink-0 text-[10px] font-bold text-[#54595d]">
                              {res.card.rarity}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold text-[#202122] truncate m-0 leading-tight">
                              {res.card.title}
                            </p>
                            <span className="text-[10.5px] text-[#54595d]">
                              {res.card.rarity}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {res.isWin ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#177860] bg-[#dff2eb] border border-[#099979]/30 px-2 py-0.5 rounded-[2px]">
                              Doublé (×2)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#bf3c2c] bg-[#ffe9e5] border border-[#f54739]/30 px-2 py-0.5 rounded-[2px]">
                              Perdu (-1)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-[#eaecf0] flex items-center justify-between text-[11.5px] font-semibold text-[#54595d]">
                    <span>
                      Gain net :{' '}
                      {spinSnapshot.wonCount > 0
                        ? `+${spinSnapshot.wonCount} carte${spinSnapshot.wonCount > 1 ? 's' : ''}`
                        : '0 carte'}
                    </span>
                    <span
                      className={
                        spinSnapshot.wonCount > 0
                          ? 'text-[#177860]'
                          : 'text-[#bf3c2c]'
                      }
                    >
                      {spinSnapshot.wonCount > 0
                        ? `${spinSnapshot.wonCount * 2} exemplaires reçus`
                        : '0 exemplaire reçu'}
                    </span>
                  </div>
                </div>
              )
            ) : (
              /* Carte cible en attente */
              <div
                className="relative w-full max-w-[272px] h-[320px] sm:h-[446px] rounded-[14px] overflow-hidden flex flex-col justify-between select-none transition-colors duration-300"
                style={{
                  background: activeTier.cardBg,
                  border:
                    activeTier.code === 'L'
                      ? '2px solid #f5d442'
                      : activeTier.code === 'UR'
                      ? '1.5px solid #f5a642'
                      : `1px solid ${activeTier.borderColor}`,
                  boxShadow: `0 8px 20px -6px ${activeTier.shadowColor}, 0 2px 6px rgba(0,0,0,0.06)`,
                  color: activeTier.textColor,
                }}
              >
                <div className="relative z-20 p-3 flex items-center justify-between">
                  <div
                    className="min-w-[32px] h-[24px] px-2 text-[12px] rounded-[7px] flex items-center justify-center font-extrabold tracking-wide shadow-[0_2px_6px_rgba(0,0,0,0.22)]"
                    style={{
                      backgroundColor: activeTier.badgeBg,
                      color: activeTier.badgeText,
                    }}
                  >
                    {activeTier.code}
                  </div>
                  <span className="px-2 py-0.5 rounded-[2px] bg-black/65 text-white text-[11px] font-bold">
                    ×2
                  </span>
                </div>

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

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-sm mb-2"
                      style={{
                        backgroundColor: activeTier.badgeBg,
                        borderColor: activeTier.borderColor,
                        color: activeTier.badgeText,
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
                        : liveSelectedCards.length === 1
                        ? `${liveSelectedCards[0].title} (×2)`
                        : liveSelectedCards.length > 1
                        ? `Double exemplaire (${liveSelectedCards.length} cartes)`
                        : `Double exemplaire (${activeTier.name})`}
                    </span>
                  </div>
                </div>

                <div
                  className="relative z-10 px-3.5 py-2.5 border-t flex items-center justify-between text-[12px] font-bold"
                  style={{ borderColor: activeTier.dividerColor }}
                >
                  <span>{activeTier.thresholdLabel}</span>
                  <span>Wikipédia FR</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CLASSEUR POUR CHOISIR LA CARTE DU QUITTE OU DOUBLE (6 CARTES PAR LIGNE) */}
      <div className="pt-4 border-t border-[#eaecf0]">
        <div className="wiki-cadre-header flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="wiki-smallcaps m-0">
            Classeur de cartes Wikipédia
          </h2>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#eaecf0]">
          <div className="flex flex-wrap items-center gap-1.5">
            {eligibleRarityTiers.map((tier) => {
              const count = eligibleCollection.filter(
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
                htmlFor="double-classeur-theme"
                className="inline-flex items-center gap-1 text-[#54595d] font-medium"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Thème :</span>
              </label>
              <select
                id="double-classeur-theme"
                value={selectedThemeFilter}
                onChange={(e) => setSelectedThemeFilter(e.target.value)}
                className="bg-[#f8f9fa] hover:bg-white border border-[#a2a9b1] rounded-[2px] px-2.5 py-1 text-[12.5px] text-[#202122] focus:outline-none focus:border-[#3366cc] cursor-pointer"
              >
                <option value="ALL">
                  Tous les thèmes ({eligibleCollection.length})
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
                htmlFor="double-classeur-sort"
                className="inline-flex items-center gap-1 text-[#54595d] font-medium"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Trier par :</span>
              </label>
              <select
                id="double-classeur-sort"
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

        {filteredAndSortedCollection.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 justify-items-center">
            {filteredAndSortedCollection.map((card) => {
              const currentQty = selectedCountsMap[card.id] || 0;
              const maxCopies = getMaxSelectableCopies(card);
              const isFavProtected = maxCopies <= 0;
              const isSelected = currentQty > 0;

              const cardChance = DOUBLE_CHANCE_BY_RARITY[card.rarity] || 50;
              const badgeText = isFavProtected
                ? '★ Protégée'
                : isSelected
                ? maxCopies > 1
                  ? `${currentQty}/${maxCopies} sel. (${cardChance} %)`
                  : `Sélectionnée (${cardChance} %)`
                : `${cardChance} %`;

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
                  onSelectCard={() => handleToggleCard(card)}
                />
              );
            })}
          </div>
        ) : (
          <div className="py-14 text-center bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px]">
            <p className="text-[14px] text-[#54595d] m-0">
              {eligibleCollection.length === 0
                ? 'Aucune carte éligible dans votre classeur. Ouvrez un booster pour obtenir des cartes !'
                : 'Aucune carte ne correspond à votre filtre actuel.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
