/**
 * @file Rôle : Rendu visuel normalisé d'une carte à collectionner TCG (284 × 443 px) avec châssis physique, biseau, cartouche et lueur de rareté.
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
 * Composant de présentation normalisé pour une carte TCG Wikipédia physique.
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
        frameBorder: '#94a3b8',
        cartoucheBg: 'linear-gradient(170deg, rgba(255,255,255,0.75) 0%, rgba(241,245,249,0.7) 100%)',
        illustrationBorder: '#cbd5e1',
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
  const isMetallicFoil = tier.code === 'R' || tier.code === 'SR';

  const titleTypography =
    sizeTier === 'small'
      ? `${isPrestige ? 'font-black' : 'font-bold'} text-[11.5px] leading-[1.22] line-clamp-2 pb-[1px] tracking-tight`
      : sizeTier === 'medium'
      ? `${isPrestige ? 'font-black' : 'font-extrabold'} text-[13.5px] leading-[1.22] line-clamp-2 pb-[2px] tracking-tight`
      : `${isPrestige ? 'font-black' : 'font-extrabold'} text-[15.5px] leading-[1.2] line-clamp-2 pb-[2px] tracking-[-0.01em]`;

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
    const rotateY = (x - 0.5) * 11;
    const rotateX = (0.5 - y) * 11;
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
        perspective: '1200px',
        containerType: 'inline-size',
        containerName: 'wikicard',
      }}
    >
      {/* 1. CHÂSSIS PHYSIQUE TCG & EFFET DE RELIEF BISEAUTÉ */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`wiki-tcg-chassis relative w-full transition-transform duration-200 ease-out rounded-[14px] sm:rounded-[16px] ${
          isShiny ? 'wiki-shiny-frame' : ''
        }`}
        style={{
          background: isShiny
            ? undefined
            : isPrestige
            ? `linear-gradient(135deg, #fff7ed 0%, ${tier.frameBorder} 25%, #78350f 50%, ${tier.frameBorder} 75%, #fff7ed 100%)`
            : isMetallicFoil
            ? `linear-gradient(135deg, #ffffff 0%, ${tier.frameBorder} 30%, ${tier.borderColor} 70%, #ffffff 100%)`
            : `linear-gradient(145deg, #ffffff 0%, ${tier.frameBorder || tier.borderColor} 45%, #94a3b8 100%)`,
          boxShadow: isShiny
            ? tilt.isHovered
              ? '0 20px 40px -6px rgba(30, 41, 59, 0.5), 0 0 20px rgba(148, 163, 184, 0.5)'
              : '0 10px 28px -6px rgba(30, 41, 59, 0.35), 0 2px 8px rgba(0,0,0,0.12)'
            : isPrestige
            ? tilt.isHovered
              ? `0 22px 42px -8px ${tier.shadowColor}, 0 0 22px ${tier.shadowColor}`
              : `0 10px 26px -6px ${tier.shadowColor}, 0 0 14px ${tier.shadowColor}`
            : tilt.isHovered
            ? `0 18px 34px -8px ${tier.shadowColor}, 0 4px 12px rgba(0,0,0,0.12)`
            : `0 8px 20px -6px ${tier.shadowColor}, 0 2px 6px rgba(0,0,0,0.08)`,
          transform: tilt.isHovered
            ? `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateY(-4px)`
            : 'none',
        }}
      >
        {/* Éclat continu subtil pour les cartes Prestige Collector (UR & L) */}
        {isPrestige && !isShiny && (
          <div className="absolute inset-0 rounded-[inherit] pointer-events-none wiki-tcg-foil-shimmer opacity-45" />
        )}

        {/* 2. CORPS INTÉRIEUR DE LA CARTE TCG */}
        <article
          className={`wiki-card-item relative w-full aspect-[284/443] rounded-[10px] sm:rounded-[12px] overflow-hidden flex flex-col p-[3px] sm:p-[4px] ${
            isShiny && !showSelectedDim ? 'wiki-metal-surface' : ''
          }`}
          style={{
            background: isShiny ? undefined : tier.cardBg,
            border: isShiny
              ? '1.5px solid rgba(255, 255, 255, 0.9)'
              : isPrestige
              ? `1.5px solid ${tier.borderColor}`
              : `1px solid ${tier.borderColor}`,
          }}
        >
          {/* Voile sombre stylisé lors de la sélection */}
          {showSelectedDim && (
            <div
              className="absolute inset-0 pointer-events-none z-20 rounded-[inherit] transition-opacity duration-200"
              style={{
                background: isSelected
                  ? 'linear-gradient(180deg, rgba(51, 102, 204, 0.12) 0%, rgba(15, 23, 42, 0.28) 100%)'
                  : 'linear-gradient(180deg, rgba(0, 107, 36, 0.10) 0%, rgba(15, 23, 42, 0.28) 100%)',
              }}
            />
          )}

          {/* Badges d'action en haut à droite (doublons, statut sélection/recyclage, favori) */}
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

          {/* Contenu visuel structuré */}
          <div
            className={`w-full flex-1 flex flex-col min-h-0 transition-all duration-200 ${
              showSelectedDim ? 'grayscale-[85%] opacity-55 contrast-95' : ''
            }`}
          >
            {/* FENÊTRE D'ILLUSTRATION AVEC BISEAU & BADGES DE RARETÉ */}
            <CardIllustration
              card={card}
              tier={tier}
              isShiny={isShiny}
              sizeTier={sizeTier}
              imgError={imgError}
              onImgError={() => setImgError(true)}
            />

            {/* CARTOUCHE DE TEXTE TCG ÉLÉGANT & TEXTURÉ */}
            <div
              className="wiki-tcg-cartouche relative flex-1 min-h-0 flex flex-col justify-between mt-1 sm:mt-1.5 rounded-[8px] sm:rounded-[10px] border overflow-hidden p-2 sm:p-2.5"
              style={{
                background: isShiny
                  ? 'linear-gradient(170deg, rgba(255, 255, 255, 0.85) 0%, rgba(226, 232, 240, 0.75) 100%)'
                  : tier.cartoucheBg || 'rgba(255, 255, 255, 0.8)',
                borderColor: isShiny
                  ? 'rgba(255, 255, 255, 0.65)'
                  : tier.dividerColor || 'rgba(0, 0, 0, 0.14)',
              }}
            >
              {/* Motif d'ondes guilloché fin */}
              <RarityWavePattern
                code={tier.code}
                waveColor1={isShiny ? 'rgba(255, 255, 255, 0.65)' : tier.waveColor1}
                waveColor2={isShiny ? 'rgba(15, 23, 42, 0.12)' : tier.waveColor2}
              />

              {/* Reflet Holographique Spéculaire interactif au survol (Metallic Foil & Prestige) */}
              {(isMetallicFoil || isPrestige) && !isShiny && (
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                  style={{
                    opacity: tilt.isHovered
                      ? 0.85
                      : tier.code === 'L'
                      ? 0.35
                      : tier.code === 'UR'
                      ? 0.25
                      : 0.1,
                    background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.6) 0%, transparent 60%), ${tier.foilGradient}`,
                    mixBlendMode: 'soft-light',
                  }}
                />
              )}

              {/* Titre et description de l'article encyclopédique */}
              <div className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden justify-start">
                <h3
                  className={`wiki-card-title shrink-0 ${titleTypography}`}
                  style={{
                    color: isShiny ? '#0f172a' : tier.textColor,
                    textShadow:
                      isShiny
                        ? '0 1px 0 rgba(255,255,255,0.65)'
                        : isPrestige
                        ? '0 1px 1px rgba(255,255,255,0.8)'
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

              {/* PIED DE CARTE TCG : PILULE DE FRÉQUENTATION & LIEN DÉPOLI */}
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
