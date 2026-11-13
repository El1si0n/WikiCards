/**
 * @file Rôle : Mini-jeu de l'Upgrader de cartes (arène en 3 colonnes et classeur de sélection).
 * Dépendances : React, `lucide-react`, `../WikiCard`, `../WikithuneIcon`, `../../config/casino`, `../../hooks/useUpgraderGame`, `CasinoCardPicker`.
 * Effets de bord : Consommation de cartes et monnaie, attribution de cartes supérieures.
 */

import React from 'react';
import { HelpCircle, ArrowRight, Check, X } from 'lucide-react';
import WikiCard from '../WikiCard';
import WikithuneIcon from '../WikithuneIcon';
import { UPGRADE_RULES, MAX_SELECTED_CARDS } from '../../config/casino';
import useUpgraderGame from '../../hooks/useUpgraderGame';
import CasinoCardPicker from './CasinoCardPicker';

/**
 * Composant de l'Upgrader de rareté de cartes encyclopédiques.
 * @param {Object} props
 * @param {Array<Object>} props.collection - Collection de cartes du joueur
 * @param {Array<string>} [props.favorites=[]] - IDs des cartes favorites
 * @param {number} [props.wikithunes=0] - Solde de monnaie
 * @param {function(number): boolean} props.onSpendWikithunes - Callback de dépense de Wikithunes
 * @param {function(Object.<string, number>): void} props.onConsumeCards - Callback de retrait des cartes
 * @param {function(Object): void} props.onCardWon - Callback d'ajout de la carte gagnée
 * @param {Array<string>} [props.existingCardIds=[]] - IDs des cartes déjà obtenues
 * @param {function(string): void} [props.onToggleFavorite] - Bascule de carte favorite
 * @param {function(Object): void} [props.onUpdateStats] - Mise à jour des statistiques
 */
export default function UpgraderGame({
  collection = [],
  favorites = [],
  wikithunes = 0,
  onSpendWikithunes,
  onConsumeCards,
  onCardWon,
  existingCardIds = [],
  onToggleFavorite,
  onUpdateStats,
}) {
  const {
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
    selectedCountsMap,
    displayedSelectedCards,
    targetTier,
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
    handleLaunchUpgrade,
  } = useUpgraderGame({
    collection,
    favorites,
    wikithunes,
    onSpendWikithunes,
    onConsumeCards,
    onCardWon,
    existingCardIds,
    onUpdateStats,
  });

  const gaugeRadius = 88;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeArcLength = (smoothChance / 100) * gaugeCircumference;

  return (
    <div className="space-y-5">
      {/* =====================================================================
         ARÈNE DE JEU DE L'UPGRADER (3 COLONNES)
      ===================================================================== */}
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

          <div className="flex-1 flex items-center justify-center py-2">
            {displayedSelectedCards.length > 0 ? (
              <div className="relative w-full flex items-center justify-center">
                {displayedSelectedCards.length === 1 ? (
                  <div
                    className="w-full max-w-[284px]"
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
                  <div className="relative flex items-center justify-center w-full h-[390px] sm:h-[430px]">
                    {displayedSelectedCards.map((card, idx) => {
                      const total = displayedSelectedCards.length;
                      const offsetStep = Math.min(
                        30,
                        Math.floor(84 / Math.max(1, total - 1))
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
                          className="absolute w-[236px] sm:w-[258px] aspect-[284/443] transition-transform duration-200 hover:!z-40 hover:-translate-y-1.5"
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
              <div className="w-full max-w-[284px] aspect-[284/443] rounded-[14px] border-2 border-dashed border-[#c8ccd1] bg-[#f8f9fa] flex flex-col items-center justify-center p-6 text-center">
                <p className="text-[12px] sm:text-[13px] text-[#54595d] m-0 leading-[1.5]">
                  Cliquez sur une ou plusieurs cartes dans le classeur
                  ci-dessous pour les placer dans l'Upgrader.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* COLONNE CENTRALE (4 col) : Jauge circulaire SVG + Boost en Wikithunes + Bouton Lancer */}
        <div className="lg:col-span-4 flex flex-col items-center justify-between bg-white border border-[#c8ccd1] rounded-[2px] p-4">
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
                  id="upgrader-arc-glow"
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
                  id="upgrader-pointer-shadow"
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

              <line
                x1="134"
                y1={134 - gaugeRadius - 13}
                x2="134"
                y2={134 - gaugeRadius + 13}
                stroke="var(--wiki-text, #202122)"
                strokeWidth="2"
              />

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
                filter="url(#upgrader-pointer-shadow)"
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
                <div className="flex items-center justify-center">
                  <Check className="w-11 h-11 text-[#177860] dark:text-[#34d399] stroke-[2.75]" />
                </div>
              ) : spinState === 'lost' ? (
                <div className="flex items-center justify-center">
                  <X className="w-11 h-11 text-[#bf3c2c] dark:text-[#f87171] stroke-[2.75]" />
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
                    displayedSelectedCards.length === 0 ||
                    maxPossibleBonusPercent <= 0
                  }
                  value={bonusPercent}
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
                <span>{spinState === 'won' ? 'Suivant' : 'Terminer'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  spinState === 'spinning' ||
                  displayedSelectedCards.length === 0 ||
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
                    ? 'Pas assez de Wikithunes'
                    : "Lancer l'Upgrade"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* COLONNE DROITE (4 col) : Carte cible convoitée */}
        <div className="lg:col-span-4 flex flex-col items-center justify-between bg-white border border-[#c8ccd1] rounded-[2px] p-4">
          <div className="w-full flex items-center justify-between border-b border-[#eaecf0] pb-2 mb-3">
            <span className="text-[13px] font-bold text-[#202122] uppercase tracking-wider">
              Carte cible
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center py-2 w-full">
            {spinState === 'won' && wonCard ? (
              <div className="w-full max-w-[284px]">
                <WikiCard
                  card={wonCard}
                  isFavorite={favorites.includes(wonCard.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              </div>
            ) : (
              <div
                className="relative w-full max-w-[284px] aspect-[284/443] rounded-[14px] overflow-hidden flex flex-col justify-between select-none transition-colors duration-300"
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
                <div className="relative z-20 p-2 sm:p-3 flex items-center justify-between">
                  <div
                    className="min-w-[32px] h-[24px] px-2 text-[12px] rounded-[6px] sm:rounded-[7px] flex items-center justify-center font-extrabold tracking-wide shadow-[0_2px_6px_rgba(0,0,0,0.22)]"
                    style={{
                      backgroundColor: targetTier.badgeBg,
                      color: targetTier.badgeText,
                    }}
                  >
                    {targetTier.code}
                  </div>
                </div>

                <div className="relative flex-1 px-3.5 flex flex-col justify-center">
                  <div className="filter blur-[8px] opacity-75 pointer-events-none space-y-3">
                    <div
                      className="w-full h-[168px] rounded-[8px]"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(15,23,42,0.25) 50%, rgba(255,255,255,0.6) 100%)',
                      }}
                    />
                    <div className="space-y-2 pt-2">
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

      {/* CLASSEUR DE SÉLECTION DE CARTES EN BAS */}
      <CasinoCardPicker
        collection={collection}
        favorites={favorites}
        selectedRarityFilter={selectedRarityFilter}
        setSelectedRarityFilter={setSelectedRarityFilter}
        selectedThemeFilter={selectedThemeFilter}
        setSelectedThemeFilter={setSelectedThemeFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        selectedCountsMap={selectedCountsMap}
        onSelectCard={handleClasseurCardClick}
        getMaxSelectableCopies={getMaxSelectableCopies}
        isCardLocked={(card) =>
          Boolean(
            spinState === 'spinning' &&
              spinSnapshot?.cards?.some((c) => String(c.id) === String(card.id))
          )
        }
        getCardBadgeText={(card, { isLockedInSpin, isFavProtected, isSelected, selectedQty, maxCopies }) => {
          const rule = UPGRADE_RULES[card.rarity];
          if (isLockedInSpin) return 'En jeu';
          if (isFavProtected) return '★ Protégée';
          if (!rule) return 'Améliorer';
          if (isSelected) {
            return maxCopies > 1
              ? `${selectedQty}/${maxCopies} (+ ${selectedQty * rule.chancePerCard} %)`
              : `+ ${rule.chancePerCard} %`;
          }
          return `+ ${rule.chancePerCard} %`;
        }}
      />
    </div>
  );
}
