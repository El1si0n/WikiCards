/**
 * @file Rôle : Rendu visuel normalisé d'une carte encyclopédique (284 × 443 px) avec inclinaison 3D, liseré lumineux animé et reflet holographique.
 * Dépendances : React, `../config/rarities`, `../utils/cardText`, sous-composants sous `src/components/card/`.
 * Effets de bord : Aucun (composant de présentation visuelle pur).
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  getRarityByCode,
  getRarityByViews,
  getCardRecycleValue,
} from '../config/rarities';
import { fitSummaryToCard, cleanCardTitle } from '../utils/cardText';
import RarityWavePattern from './card/RarityWavePattern';
import CardIllustration from './card/CardIllustration';
import CardTopActions from './card/CardTopActions';
import CardFooter from './card/CardFooter';

/**
 * Composant de présentation normalisé pour une carte Wikipédia.
 * @param {Object} props
 * @param {Object} props.card - Données de la carte encyclopédique
 * @param {function(string): void} [props.onToggleFavorite] - Callback de mise en favori
 * @param {boolean} [props.isFavorite=false] - Indique si la carte est en favori
 * @param {number} [props.duplicateCount=1] - Nombre d'exemplaires possédés
 * @param {boolean} [props.compact=false] - Mode compact (ex: classeur 4 cartes/ligne)
 * @param {boolean} [props.mini=false] - Mode miniature (ex: Upgrader 6 cartes/ligne)
 * @param {boolean} [props._trade=false] - Mode proposition d'échanges
 * @param {boolean} [props.isRecycleMode=false] - Mode recyclage actif
 * @param {boolean} [props.isSelectedForRecycle=false] - Carte sélectionnée pour recyclage
 * @param {number} [props.selectedRecycleCount=0] - Exemplaires cochés pour recyclage
 * @param {function(Object): void} [props.onSelectForRecycle] - Sélection pour recyclage
 * @param {function(Object): void} [props.onSelectCard] - Sélection standard de la carte
 * @param {boolean} [props.isSelected=false] - Carte sélectionnée
 * @param {boolean} [props.isDisabledSelection=false] - Sélection désactivée
 * @param {string|null} [props.selectionBadgeText=null] - Texte personnalisé du badge de sélection
 * @param {boolean} [props.hideViewsAndRarity=false] - Masquage pour cartes mystères
 */
export default function WikiCard({
  card,
  onToggleFavorite,
  isFavorite = false,
  duplicateCount = 1,
  compact = false,
  mini = false,
  _trade = false,
  isRecycleMode = false,
  isSelectedForRecycle = false,
  selectedRecycleCount = 0,
  onSelectForRecycle,
  onSelectCard,
  isSelected = false,
  isDisabledSelection = false,
  selectionBadgeText = null,
  hideViewsAndRarity = false,
}) {
  const cardRef = useRef(null);
  const [imgError, setImgError] = useState(false);
  const [tilt, setTilt] = useState({
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    glareY: 50,
    isHovered: false,
  });

  const baseTier = card.rarity
    ? getRarityByCode(card.rarity)
    : getRarityByViews(card.views || 0);

  const tier = hideViewsAndRarity
    ? {
        code: '?',
        name: 'Mystère',
        thresholdLabel: 'Fréquentation cachée',
        badgeBg: '#e2e8f0',
        badgeText: '#1e293b',
        cardBg:
          'linear-gradient(155deg, #e2e8f0 0%, #cbd5e1 52%, #94a3b8 100%)',
        waveColor1: 'rgba(255, 255, 255, 0.45)',
        waveColor2: 'rgba(15, 23, 42, 0.10)',
        borderColor: '#94a3b8',
        shadowColor: 'rgba(71, 85, 105, 0.24)',
        foilGradient:
          'linear-gradient(115deg, transparent 25%, rgba(255,255,255,0.4) 50%, transparent 75%)',
        textColor: '#0f172a',
        subTextColor: '#1e293b',
        dividerColor: 'rgba(15, 23, 42, 0.16)',
      }
    : baseTier;

  const isShiny = Boolean(
    card.isShiny || card.isGif || /\.gif(\?|$|\/)/i.test(card.image || '')
  );
  const recycleValue = getCardRecycleValue({ ...card, isShiny });
  const isProtectedInRecycleMode =
    isRecycleMode && isFavorite && duplicateCount <= 1;

  // Détection responsive dynamique du gabarit de carte
  const [sizeTier, setSizeTier] = useState(() => {
    if (mini) return 'small';
    if (compact) return 'medium';
    return 'large';
  });

  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width <= 0) continue;
        const nextTier =
          width < 185 ? 'small' : width > 260 ? 'large' : 'medium';
        setSizeTier((prev) => (prev !== nextTier ? nextTier : prev));
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Budget textuel et typographie Vector 2022 préservée
  const maxCharsBudget =
    sizeTier === 'small' ? 105 : sizeTier === 'medium' ? 195 : 285;
  const fullText = fitSummaryToCard(card.extract, maxCharsBudget);
  const displayTitle = cleanCardTitle(card.title);

  const isPrestige = tier.code === 'L' || tier.code === 'UR';
  const isHighTier =
    tier.code === 'L' || tier.code === 'UR' || tier.code === 'SR';

  const titleTypography =
    sizeTier === 'small'
      ? 'font-bold text-[11.5px] leading-[1.22] line-clamp-2 pb-[1px] tracking-tight'
      : sizeTier === 'medium'
      ? 'font-extrabold text-[13.5px] leading-[1.22] line-clamp-2 pb-[2px] tracking-tight'
      : 'font-extrabold text-[15.5px] leading-[1.2] line-clamp-2 pb-[2px] tracking-[-0.01em]';

  const descriptionTypography =
    sizeTier === 'small'
      ? 'text-[10px] leading-[1.3] line-clamp-4 font-normal m-0'
      : sizeTier === 'medium'
      ? 'text-[11px] leading-[1.35] line-clamp-6 font-normal m-0'
      : 'text-[12px] leading-[1.38] line-clamp-8 font-normal m-0';

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 10;
    const rotateX = (0.5 - y) * 10;
    setTilt({
      rotateX,
      rotateY,
      glareX: Math.round(x * 100),
      glareY: Math.round(y * 100),
      isHovered: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt({
      rotateX: 0,
      rotateY: 0,
      glareX: 50,
      glareY: 50,
      isHovered: false,
    });
  };

  const handleCardClick = () => {
    if (isRecycleMode && onSelectForRecycle && !isProtectedInRecycleMode) {
      onSelectForRecycle(card);
      return;
    }
    if (onSelectCard && !isDisabledSelection) {
      onSelectCard(card);
    }
  };

  const formattedViews = hideViewsAndRarity
    ? '?'
    : new Intl.NumberFormat('fr-FR').format(card.views ?? 0);
  const effectiveRecycleQty =
    selectedRecycleCount > 0 ? selectedRecycleCount : isSelectedForRecycle ? 1 : 0;
  const showSelectedDim = effectiveRecycleQty > 0 || isSelected;

  // Fin liseré extérieur où la lumière bouge (2px pour UR/L, 2.5px métal pour GIF)
  const outerFrameClass = isShiny
    ? 'wiki-shiny-frame p-[2.5px]'
    : tier.code === 'L'
    ? 'wiki-prestige-border--l p-[2px]'
    : tier.code === 'UR'
    ? 'wiki-prestige-border--ur p-[2px]'
    : '';

  return (
    <div
      onClick={handleCardClick}
      className={`wiki-card-root relative select-none w-full mx-auto max-w-[284px] ${
        isRecycleMode
          ? isProtectedInRecycleMode
            ? 'opacity-55 cursor-not-allowed'
            : 'cursor-pointer'
          : onSelectCard
          ? isDisabledSelection
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer'
          : ''
      }`}
      style={{
        perspective: '1100px',
        containerType: 'inline-size',
        containerName: 'wikicard',
      }}
    >
      {/* Enveloppe externe : Fin liseré lumineux animé si GIF, UR ou L */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative w-full transition-transform duration-200 ease-out rounded-[12px] ${outerFrameClass}`}
        style={{
          boxShadow: isShiny
            ? tilt.isHovered
              ? '0 18px 38px -6px rgba(30, 41, 59, 0.45), 0 0 18px rgba(148, 163, 184, 0.45)'
              : '0 10px 26px -6px rgba(30, 41, 59, 0.32), 0 2px 8px rgba(0,0,0,0.12)'
            : tilt.isHovered
            ? `0 18px 34px -8px ${tier.shadowColor}, 0 4px 12px rgba(0,0,0,0.10)`
            : `0 8px 20px -6px ${tier.shadowColor}, 0 2px 6px rgba(0,0,0,0.06)`,
          transform: tilt.isHovered
            ? `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateY(-4px)`
            : 'none',
        }}
      >
        <article
          className={`wiki-card-item relative w-full aspect-[284/443] rounded-[11px] overflow-hidden flex flex-col ${
            isShiny && !showSelectedDim ? 'wiki-metal-surface' : ''
          }`}
          style={{
            background: isShiny ? undefined : tier.cardBg,
            border: isShiny
              ? '1px solid rgba(255, 255, 255, 0.85)'
              : isPrestige
              ? 'none'
              : `1.5px solid ${tier.borderColor}`,
          }}
        >
          {/* Voile sombre lors de la sélection */}
          {showSelectedDim && (
            <div
              className="absolute inset-0 pointer-events-none z-20 rounded-[inherit] transition-opacity duration-200"
              style={{
                background: isSelected
                  ? 'linear-gradient(180deg, rgba(51, 102, 204, 0.10) 0%, rgba(15, 23, 42, 0.25) 100%)'
                  : 'linear-gradient(180deg, rgba(0, 107, 36, 0.08) 0%, rgba(15, 23, 42, 0.25) 100%)',
              }}
            />
          )}

          {/* Actions en haut à droite placées EN DEHORS du filtre grayscale */}
          <CardTopActions
            card={card}
            duplicateCount={duplicateCount}
            showSelectedDim={showSelectedDim}
            selectionBadgeText={selectionBadgeText}
            isSelected={isSelected}
            isRecycleMode={isRecycleMode}
            isProtectedInRecycleMode={isProtectedInRecycleMode}
            effectiveRecycleQty={effectiveRecycleQty}
            recycleValue={recycleValue}
            onToggleFavorite={onToggleFavorite}
            isFavorite={isFavorite}
          />

          {/* Contenu visuel Full-Bleed de la carte */}
          <div
            className={`w-full flex-1 flex flex-col min-h-0 transition-all duration-200 ${
              showSelectedDim
                ? 'grayscale-[85%] opacity-55 contrast-95'
                : ''
            }`}
            style={{
              background: isShiny ? undefined : tier.cardBg,
            }}
          >
            {/* 1. PARTIE SUPÉRIEURE : IMAGE DE LA PAGE WIKIPÉDIA */}
            <CardIllustration
              card={card}
              tier={tier}
              isShiny={isShiny}
              sizeTier={sizeTier}
              imgError={imgError}
              onImgError={() => setImgError(true)}
            />

            {/* 2. PARTIE INFÉRIEURE FULL-BLEED : SUR LE DÉGRADÉ DE RARETÉ (SANS BOÎTE BLANCHE) */}
            <div
              className={`relative flex-1 min-h-0 flex flex-col justify-between ${
                sizeTier === 'small'
                  ? 'px-2 pt-1.5 pb-1.5'
                  : sizeTier === 'medium'
                  ? 'px-3 pt-2 pb-2'
                  : 'px-3.5 pt-2.5 pb-2.5'
              } overflow-hidden`}
            >
              {/* Texture d'ondes organiques */}
              <RarityWavePattern
                code={tier.code}
                waveColor1={
                  isShiny ? 'rgba(255, 255, 255, 0.55)' : tier.waveColor1
                }
                waveColor2={
                  isShiny ? 'rgba(15, 23, 42, 0.12)' : tier.waveColor2
                }
              />

              {/* Lumière animée en mouvement sur la carte (continue sur UR/L, au survol sur R/SR) */}
              {!isShiny && (isPrestige || (tilt.isHovered && tier.code !== '?')) && (
                <div
                  className="absolute inset-0 pointer-events-none wiki-tcg-foil-shimmer transition-opacity duration-300"
                  style={{
                    opacity: tilt.isHovered ? 0.55 : 0.35,
                    mixBlendMode: 'soft-light',
                  }}
                />
              )}

              {/* Reflet Métal Brossé (style Carte Titane) pour les cartes GIF (.gif) */}
              {isShiny && (
                <>
                  <div
                    className="absolute inset-x-2 inset-y-1.5 rounded-[8px] pointer-events-none border border-white/45"
                    style={{
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
                    }}
                  />
                  <div
                    className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                    style={{
                      opacity: tilt.isHovered ? 0.9 : 0.65,
                      background: `
                        radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.25) 38%, transparent 65%),
                        linear-gradient(118deg, transparent 18%, rgba(255, 255, 255, 0.55) 44%, rgba(255, 255, 255, 0.88) 50%, rgba(148, 163, 184, 0.35) 56%, transparent 80%)
                      `,
                      mixBlendMode: 'soft-light',
                    }}
                  />
                </>
              )}

              {/* Reflet Holographique / Foil interactif réagissant à la souris */}
              {isHighTier && !isShiny && (
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                  style={{
                    opacity: tilt.isHovered
                      ? 0.85
                      : tier.code === 'L'
                      ? 0.35
                      : 0.18,
                    background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.55) 0%, transparent 60%), ${tier.foilGradient}`,
                    mixBlendMode: 'soft-light',
                  }}
                />
              )}

              {/* Contenu textuel directement sur le fond de rareté */}
              <div className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden justify-start">
                <h3
                  className={`wiki-card-title shrink-0 ${titleTypography}`}
                  style={{
                    color: isShiny ? '#0f172a' : tier.textColor,
                    textShadow: isShiny
                      ? '0 1px 0 rgba(255,255,255,0.65)'
                      : undefined,
                  }}
                >
                  {displayTitle}
                </h3>

                <p
                  className={`wiki-card-description ${descriptionTypography}`}
                  style={{ color: isShiny ? '#1e293b' : tier.subTextColor }}
                >
                  {fullText}
                </p>
              </div>

              {/* 3. PIED DE CARTE STYLE WIKIPÉDIA VECTOR */}
              <CardFooter
                card={card}
                tier={tier}
                isShiny={isShiny}
                sizeTier={sizeTier}
                formattedViews={formattedViews}
              />
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
