/**
 * @file Rôle : Mini-jeu de casino Quitte ou Double (pari de duplication de cartes à 54% C, 51% PC, 48% R, 45% SR, 42% UR).
 * Dépendances : React, `lucide-react`, `./WikiCard`, `../config/casino`, `../hooks/useDoubleOrNothing`, `./casino/CasinoCardPicker`.
 * Effets de bord : Consommation de cartes, attribution de doublons, sons procéduraux et animations multi-roues.
 */

import React from 'react';
import WikiCard from './WikiCard';
import { DOUBLE_CHANCE_BY_RARITY, MAX_SELECTED_CARDS } from '../config/casino';
import useDoubleOrNothing from '../hooks/useDoubleOrNothing';
import CasinoCardPicker from './casino/CasinoCardPicker';
import {
  HelpCircle,
  ArrowRight,
  XCircle,
  Check,
  X,
} from 'lucide-react';

/**
 * Composant du jeu Quitte ou Double (pari unitaire ou multi-cartes).
 * @param {Object} props
 * @param {Array<Object>} props.collection - Collection de cartes du joueur
 * @param {Array<string>} [props.favorites=[]] - IDs des cartes favorites protégées
 * @param {function(Object.<string, number>): void} props.onConsumeCards - Retrait de cartes perdues
 * @param {function(Object): void} props.onCardWon - Ajout de la carte doublée
 * @param {function(string): void} [props.onToggleFavorite] - Bascule du favori
 * @param {function(Object): void} [props.onUpdateStats] - Mise à jour des statistiques
 */
export default function DoubleOrNothingGame({
  collection = [],
  favorites = [],
  onConsumeCards,
  onCardWon,
  onToggleFavorite,
  onUpdateStats,
}) {
  const {
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
    selectedCountsMap,
    liveSelectedCards,
    displayedSelectedCards,
    activeTier,
    displayChance,
    getMaxSelectableCopies,
    handleToggleCard,
    handleRemoveSelectedInstanceAt,
    handleFinishRound,
    handleLaunchDouble,
  } = useDoubleOrNothing({
    collection,
    favorites,
    onConsumeCards,
    onCardWon,
    onUpdateStats,
  });

  const isMultiMode = displayedSelectedCards.length > 1;

  const gaugeRadius = 92;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeArcLength = (displayChance / 100) * gaugeCircumference;
  const winArcDegrees = (displayChance / 100) * 360;

  // Géométrie pour les mini-roues individuelles (2 à 8 cartes)
  const miniRadius = 33;
  const miniCircumference = 2 * Math.PI * miniRadius;
  const miniArcLength = (displayChance / 100) * miniCircumference;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* COLONNE GAUCHE (4 col) : Carte sélectionnée */}
        <div className="order-1 lg:order-1 lg:col-span-4 flex flex-col justify-between bg-white dark:bg-[#181d24] border border-[#c8ccd1] dark:border-[#363e4a] rounded-[2px] p-3 sm:p-4">
          <div className="flex items-center justify-between border-b border-[#eaecf0] dark:border-[#272d36] pb-2 mb-3">
            <span className="text-[12px] sm:text-[13px] font-bold text-[#202122] dark:text-[#eaecf0] uppercase tracking-wider">
              Cartes sélectionnées
            </span>
            <span className="text-[12px] text-[#54595d] dark:text-[#a2a9b1] font-medium">
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
                  /* Plusieurs cartes sélectionnées : éventail responsive */
                  <div className="relative flex items-center justify-center w-full max-w-[284px] aspect-[284/443] overflow-hidden">
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
                          className="absolute w-full max-w-[284px] aspect-[284/443] transition-transform duration-200 hover:!z-40 hover:-translate-y-1.5"
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
              <div className="w-full max-w-[284px] aspect-[284/443] rounded-[14px] border-2 border-dashed border-[#c8ccd1] dark:border-[#363e4a] bg-[#f8f9fa] dark:bg-[#12161c] flex flex-col items-center justify-center p-6 text-center">
                <p className="text-[12px] sm:text-[13px] text-[#54595d] dark:text-[#a2a9b1] m-0 leading-[1.5]">
                  Cliquez sur 1 à 8 cartes dans le classeur ci-dessous pour
                  tenter de les doubler en même temps.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* COLONNE CENTRALE (4 col) : Jauge 50/50 ou Roues individuelles */}
        <div className="order-2 lg:order-2 lg:col-span-4 flex flex-col items-center justify-between bg-white dark:bg-[#181d24] border border-[#c8ccd1] dark:border-[#363e4a] rounded-[2px] p-3 sm:p-4">
          <div className="w-full flex items-center justify-between border-b border-[#eaecf0] dark:border-[#272d36] pb-2 mb-2">
            <span className="text-[13px] font-bold text-[#202122] dark:text-[#eaecf0] uppercase tracking-wider">
              {isMultiMode ? 'Roues de probabilité' : 'Jauge de probabilité'}
            </span>
          </div>

          {isMultiMode ? (
            /* GRILLE DE MINI-ROUES (2 à 8 cartes) AVEC ANIMATION INDIVIDUELLE */
            <div className="w-full flex-1 flex flex-col justify-center my-auto py-2">
              <div className="grid grid-cols-2 gap-2.5 w-full max-h-[380px] overflow-y-auto pr-1 select-none">
                {cardWheels.map((wheel) => (
                  <div
                    key={wheel.key}
                    className={`p-2 rounded-[3px] border flex flex-col items-center justify-between transition-all ${
                      wheel.isFinished
                        ? wheel.isWin
                          ? 'bg-[#dff2eb]/70 dark:bg-[#113328]/80 border-[#099979]/50'
                          : 'bg-[#ffe9e5]/60 dark:bg-[#3b1815]/60 border-[#f54739]/40 opacity-85'
                        : 'bg-[#f8f9fa] dark:bg-[#151a21] border-[#c8ccd1] dark:border-[#363e4a]'
                    }`}
                  >
                    {/* Entête de la mini-roue : miniature + titre */}
                    <div className="w-full flex items-center gap-1.5 min-w-0 border-b border-[#eaecf0] dark:border-[#272d36] pb-1 mb-1">
                      {wheel.card.image ? (
                        <img
                          src={wheel.card.image}
                          alt={wheel.card.title}
                          className={`w-5 h-5 rounded-[2px] object-cover border shrink-0 ${
                            wheel.isFinished && !wheel.isWin
                              ? 'grayscale border-[#c8ccd1] dark:border-slate-600'
                              : 'border-[#a2a9b1] dark:border-[#4a5360]'
                          }`}
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-[2px] bg-[#eaecf0] dark:bg-slate-700 border border-[#c8ccd1] dark:border-slate-600 flex items-center justify-center shrink-0 p-0.5">
                          <img
                            src="https://fr.wikipedia.org/static/images/icons/wikipedia.png"
                            alt="Wikipédia"
                            className="w-3.5 h-3.5 object-contain opacity-80"
                          />
                        </div>
                      )}
                      <span
                        className="text-[11px] font-bold text-[#202122] dark:text-[#eaecf0] truncate flex-1"
                        title={wheel.card.title}
                      >
                        {wheel.card.title}
                      </span>
                    </div>

                    {/* SVG Mini-Roue */}
                    <div className="relative my-1 flex items-center justify-center">
                      <svg
                        width="84"
                        height="84"
                        viewBox="0 0 96 96"
                        className="select-none overflow-visible"
                      >
                        {/* Piste de fond */}
                        <circle
                          cx="48"
                          cy="48"
                          r={miniRadius}
                          fill="none"
                          stroke="var(--wiki-gauge-track, #eef1f6)"
                          strokeWidth="9"
                        />

                        {/* Arc de gain */}
                        {displayChance > 0 && (
                          <circle
                            cx="48"
                            cy="48"
                            r={miniRadius}
                            fill="none"
                            stroke={activeTier.borderColor || '#3366cc'}
                            strokeWidth="9"
                            strokeDasharray={`${miniArcLength} ${miniCircumference}`}
                            strokeDashoffset="0"
                            strokeLinecap="butt"
                            transform="rotate(-90 48 48)"
                          />
                        )}

                        {/* Repère départ (12h) */}
                        <line
                          x1="48"
                          y1={48 - miniRadius - 6}
                          x2="48"
                          y2={48 - miniRadius + 6}
                          stroke="var(--wiki-text, #202122)"
                          strokeWidth="1.5"
                        />

                        {/* Repère fin de zone gagnante */}
                        {displayChance > 0 && (
                          <g transform={`rotate(${winArcDegrees} 48 48)`}>
                            <line
                              x1="48"
                              y1={48 - miniRadius - 6}
                              x2="48"
                              y2={48 - miniRadius + 6}
                              stroke="var(--wiki-text, #202122)"
                              strokeWidth="1.5"
                            />
                          </g>
                        )}

                        {/* Disque central */}
                        <circle
                          cx="48"
                          cy="48"
                          r="23"
                          fill={
                            wheel.isFinished
                              ? wheel.isWin
                                ? 'var(--wiki-gauge-won-bg, #dff2eb)'
                                : 'var(--wiki-gauge-lost-bg, #ffe9e5)'
                              : 'var(--wiki-bg-subtle, #f8f9fa)'
                          }
                          stroke={
                            wheel.isFinished
                              ? wheel.isWin
                                ? '#099979'
                                : '#f54739'
                              : 'var(--wiki-border-subtle, #c8ccd1)'
                          }
                          strokeWidth="1.2"
                        />

                        {/* Aiguille animée propre à chaque carte */}
                        <g
                          style={{
                            transform: `rotate(${wheel.rotation || 0}deg)`,
                            transformOrigin: '48px 48px',
                            transition:
                              spinState === 'spinning' && !wheel.isFinished
                                ? `transform ${wheel.durationMs}ms cubic-bezier(0.12, 0.82, 0.16, 1)`
                                : 'none',
                          }}
                        >
                          <line
                            x1="48"
                            y1="9"
                            x2="48"
                            y2="23"
                            stroke="#ffffff"
                            strokeWidth="3.2"
                            strokeLinecap="round"
                          />
                          <line
                            x1="48"
                            y1="9"
                            x2="48"
                            y2="23"
                            stroke="#1e293b"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                          <path
                            d="M48 11 L44 5 L48 7 L52 5 Z"
                            fill="#1e293b"
                            stroke="#ffffff"
                            strokeWidth="1"
                            strokeLinejoin="round"
                          />
                        </g>
                      </svg>

                      {/* Icône de résultat ou pourcentage au centre */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                        {wheel.isFinished ? (
                          wheel.isWin ? (
                            <Check className="w-5 h-5 text-[#177860] dark:text-[#34d399] stroke-[3]" />
                          ) : (
                            <X className="w-5 h-5 text-[#bf3c2c] dark:text-[#f87171] stroke-[3]" />
                          )
                        ) : (
                          <span className="text-[11px] font-extrabold text-[#202122] dark:text-[#eaecf0]">
                            {displayChance}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* GRANDE ROUE CENTRALE (0 ou 1 carte) */
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
          )}

          <div className="w-full pt-3 border-t border-[#eaecf0] dark:border-[#272d36]">
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

        {/* COLONNE DROITE (4 col) : Carte cible / Résultats du tirage */}
        <div className="order-3 lg:order-3 lg:col-span-4 flex flex-col items-center justify-between bg-white dark:bg-[#181d24] border border-[#c8ccd1] dark:border-[#363e4a] rounded-[2px] p-3 sm:p-4">
          <div className="w-full flex items-center justify-between border-b border-[#eaecf0] dark:border-[#272d36] pb-2 mb-3">
            <span className="text-[12px] sm:text-[13px] font-bold text-[#202122] dark:text-[#eaecf0] uppercase tracking-wider">
              {spinSnapshot
                ? spinSnapshot.totalCount > 1
                  ? 'Résultats du tirage'
                  : isRoundFinished
                  ? 'Résultat du tirage'
                  : 'Carte cible'
                : liveSelectedCards.length > 1
                ? 'Cartes sélectionnées'
                : 'Carte cible'}
            </span>
            {spinSnapshot && spinSnapshot.totalCount > 1 && (
              <span className="text-[12px] font-bold text-[#54595d] dark:text-[#a2a9b1]">
                {isRoundFinished
                  ? `${spinSnapshot.wonCount}/${spinSnapshot.totalCount} gagné${spinSnapshot.wonCount > 1 ? 's' : ''}`
                  : `${spinSnapshot.results.filter((r) => r.isFinished).length}/${spinSnapshot.totalCount} terminé${spinSnapshot.results.filter((r) => r.isFinished).length > 1 ? 's' : ''}`}
              </span>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center py-2 w-full">
            {spinSnapshot ? (
              spinSnapshot.totalCount === 1 ? (
                /* Résultat pour 1 carte */
                isRoundFinished ? (
                  spinState === 'won' ? (
                    <div className="w-full max-w-[284px]">
                      <WikiCard
                        card={spinSnapshot.results[0].card}
                        compact={true}
                        duplicateCount={2}
                        isFavorite={favorites.includes(spinSnapshot.results[0].card.id)}
                        onToggleFavorite={onToggleFavorite}
                      />
                    </div>
                  ) : (
                    <div className="w-full max-w-[284px] aspect-[284/443] rounded-[14px] border-2 border-dashed border-[#f54739]/50 dark:border-[#b32424]/60 bg-[#fff5f5] dark:bg-[#201515] flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-[#ffe9e5] dark:bg-[#3b1815] border border-[#f54739] dark:border-[#b32424] text-[#bf3c2c] dark:text-[#f87171] flex items-center justify-center mb-3">
                        <XCircle className="w-6 h-6" />
                      </div>
                      <span className="text-[14px] font-bold text-[#bf3c2c] dark:text-[#f87171] mb-1">
                        Carte perdue
                      </span>
                      <p className="text-[12px] text-[#72777d] dark:text-[#a2a9b1] m-0">
                        « {spinSnapshot.results[0].card.title} » a été détruite.
                      </p>
                    </div>
                  )
                ) : (
                  /* Pendant le tirage 1 carte : carte mystère avec "Révélation en cours..." */
                  <div
                    className="relative w-full max-w-[284px] aspect-[284/443] rounded-[14px] overflow-hidden flex flex-col justify-between select-none transition-colors duration-300"
                    style={{
                      background: activeTier.cardBg,
                      border: `1px solid ${activeTier.borderColor}`,
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
                          <HelpCircle className="w-6 h-6 animate-pulse" />
                        </div>
                        <span
                          className="px-3 py-1 rounded-[5px] text-[12px] font-bold shadow-xs"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            color: '#202122',
                          }}
                        >
                          Révélation en cours...
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
                )
              ) : (
                /* Résultats progressifs pour plusieurs cartes (2 à 8) */
                <div className="w-full h-full max-h-[446px] overflow-y-auto pr-1 space-y-2">
                  {spinSnapshot.results.map((res) => (
                    <div
                      key={res.key}
                      className={`p-2.5 rounded-[4px] border flex items-center justify-between gap-2.5 transition-all ${
                        !res.isFinished
                          ? 'bg-[#f8f9fa] dark:bg-[#1a202c] border-[#eaecf0] dark:border-[#2d3748]'
                          : res.isWin
                          ? 'bg-[#dff2eb] dark:bg-[#113328] border-[#099979]/40 dark:border-[#099979]/60'
                          : 'bg-[#fff5f5] dark:bg-[#201515] border-[#f54739]/30 dark:border-[#b32424]/40 opacity-75'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {res.card.image ? (
                          <img
                            src={res.card.image}
                            alt={res.card.title}
                            className={`w-9 h-9 object-cover rounded-[3px] border shrink-0 ${
                              res.isFinished && !res.isWin
                                ? 'border-[#c8ccd1] dark:border-slate-600 grayscale'
                                : res.isFinished && res.isWin
                                ? 'border-[#099979]'
                                : 'border-[#a2a9b1] dark:border-[#4a5360]'
                            }`}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-[3px] bg-[#eaecf0] dark:bg-slate-700/60 border border-[#c8ccd1] dark:border-slate-600 flex items-center justify-center shrink-0 p-1">
                            <img
                              src="https://fr.wikipedia.org/static/images/icons/wikipedia.png"
                              alt="Wikipédia"
                              className="w-6 h-6 object-contain opacity-80"
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-[12px] font-bold truncate m-0 leading-tight ${
                              res.isFinished && res.isWin
                                ? 'text-[#0f5132] dark:text-[#34d399]'
                                : res.isFinished && !res.isWin
                                ? 'text-[#72777d] dark:text-[#a2a9b1]'
                                : 'text-[#202122] dark:text-[#eaecf0]'
                            }`}
                          >
                            {res.card.title}
                          </p>
                          <p className="text-[11px] text-[#54595d] dark:text-[#a2a9b1] truncate m-0 mt-0.5 leading-tight">
                            {res.card.description ||
                              res.card.extract ||
                              'Article Wikipédia...'}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {!res.isFinished ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3366cc] dark:text-[#60a5fa] bg-[#eef3fb] dark:bg-[#1e2a3a] border border-[#3366cc]/30 px-2 py-0.5 rounded-[2px] animate-pulse">
                            Tirage...
                          </span>
                        ) : res.isWin ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#177860] dark:text-[#34d399] bg-[#dff2eb] dark:bg-[#064e3b] border border-[#099979]/40 px-2 py-0.5 rounded-[2px]">
                            Doublé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#bf3c2c] dark:text-[#f87171] bg-[#ffe9e5] dark:bg-[#451a1a] border border-[#f54739]/40 px-2 py-0.5 rounded-[2px]">
                            Perdu
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : liveSelectedCards.length > 1 ? (
              /* En attente : résumé des 2 à 8 cartes sélectionnées */
              <div className="w-full h-full max-h-[446px] overflow-y-auto pr-1 space-y-2">
                {liveSelectedCards.map((card, idx) => (
                  <div
                    key={`${card.id}-${idx}`}
                    className="p-2.5 rounded-[4px] border border-[#eaecf0] dark:border-[#2d3748] bg-[#f8f9fa] dark:bg-[#1a202c] flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {card.image ? (
                        <img
                          src={card.image}
                          alt={card.title}
                          className="w-9 h-9 object-cover rounded-[3px] border border-[#a2a9b1] dark:border-[#4a5360] shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-[3px] bg-[#eaecf0] dark:bg-slate-700/60 border border-[#c8ccd1] dark:border-slate-600 flex items-center justify-center shrink-0 p-1">
                          <img
                            src="https://fr.wikipedia.org/static/images/icons/wikipedia.png"
                            alt="Wikipédia"
                            className="w-6 h-6 object-contain opacity-80"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-bold text-[#202122] dark:text-[#eaecf0] truncate m-0 leading-tight">
                          {card.title}
                        </p>
                        <p className="text-[11px] text-[#54595d] dark:text-[#a2a9b1] truncate m-0 mt-0.5 leading-tight">
                          {card.description || card.extract || 'Article Wikipédia...'}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#54595d] dark:text-[#a2a9b1] bg-[#eaecf0] dark:bg-slate-700 px-2 py-0.5 rounded-[2px]">
                        Prête
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Carte cible en attente (0 ou 1 carte) */
              <div
                className="relative w-full max-w-[284px] aspect-[284/443] rounded-[14px] overflow-hidden flex flex-col justify-between select-none transition-colors duration-300"
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
                <div className="relative z-20 p-2 sm:p-3 flex items-center justify-between">
                  <div
                    className="min-w-[32px] h-[24px] px-2 text-[12px] rounded-[6px] sm:rounded-[7px] flex items-center justify-center font-extrabold tracking-wide shadow-[0_2px_6px_rgba(0,0,0,0.22)]"
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
                      {liveSelectedCards.length === 1
                        ? `${liveSelectedCards[0].title} (×2)`
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
        onSelectCard={handleToggleCard}
        getMaxSelectableCopies={getMaxSelectableCopies}
        isCardLocked={(card) =>
          Boolean(
            spinState === 'spinning' &&
              spinSnapshot?.cards?.some((c) => String(c.id) === String(card.id))
          )
        }
        getCardBadgeText={(card, { isLockedInSpin, isFavProtected, isSelected, selectedQty, maxCopies }) => {
          const chance = DOUBLE_CHANCE_BY_RARITY[card.rarity] || 50;
          if (isLockedInSpin) return 'En jeu';
          if (isFavProtected) return '★ Protégée';
          if (isSelected) {
            return maxCopies > 1
              ? `${selectedQty}/${maxCopies} (${chance} %)`
              : `${chance} %`;
          }
          return `${chance} %`;
        }}
      />
    </div>
  );
}