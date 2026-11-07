/**
 * @file Rôle : Rendu visuel normalisé d'une carte encyclopédique (284 × 443 px) avec badge, inclinaison 3D, textures et effet holographique.
 * Dépendances : React, `lucide-react`, `../config/rarities`, `../utils/cardText`, `./WikithuneIcon`, `./card/RarityWavePattern`.
 * Effets de bord : Aucun (composant de présentation visuelle pur).
 */

import React, { useState, useRef, useEffect } from 'react';
import { Eye, ExternalLink, Star, Check, Sparkles } from 'lucide-react';
import {
  getRarityByCode,
  getRarityByViews,
  getCardRecycleValue,
} from '../config/rarities';
import { fitSummaryToCard, cleanCardTitle } from '../utils/cardText';
import WikithuneIcon from './WikithuneIcon';
import RarityWavePattern from './card/RarityWavePattern';

/**
 * Composant de présentation normalisé pour une carte Wikipédia.
 * @param {Object} props
 * @param {Object} props.card - Données de la carte
 * @param {function(string): void} [props.onToggleFavorite] - Callback de mise en favori
 * @param {boolean} [props.isFavorite=false] - Indique si la carte est en favori
 * @param {number} [props.duplicateCount=1] - Nombre d'exemplaires possédés
 * @param {boolean} [props.compact=false] - Mode compact (ex: classeur 4 cartes/ligne)
 * @param {boolean} [props.mini=false] - Mode miniature (ex: Upgrader 6 cartes/ligne)
 * @param {boolean} [props.trade=false] - Mode proposition d'échanges
 * @param {boolean} [props.isRecycleMode=false] - Mode recyclage actif
 * @param {boolean} [props.isSelectedForRecycle=false] - Carte sélectionnée pour recyclage
 * @param {number} [props.selectedRecycleCount=0] - Exemplaires cochés pour recyclage
 * @param {function(Object): void} [props.onSelectForRecycle] - Sélection pour recyclage
 * @param {function(Object): void} [props.onSelectCard] - Sélection standard de la carte
 * @param {boolean} [props.isSelected=false] - Carte sélectionnée
 * @param {boolean} [props.isDisabledSelection=false] - Sélection désactivée
 * @param {string|null} [props.selectionBadgeText=null] - Texte personnalisé du badge de sélection
 * @param {boolean} [props.hideViewsAndRarity=false] - Masquage pour cartes mystères (ex: Plus ou Moins)
 */
export default function WikiCard({
  card,
  onToggleFavorite,
  isFavorite = false,
  duplicateCount = 1,
  compact = false, // true dans le classeur (4 cartes par ligne)
  mini = false, // true dans le classeur de l'Upgrader (6 cartes par ligne)
  _trade = false, // true dans les propositions d'échanges
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

  // Détecte si la carte est Shiny (soit flag isShiny, soit l'image est un .gif)
  const isShiny = Boolean(
    card.isShiny || card.isGif || /\.gif(\?|$|\/)/i.test(card.image || '')
  );
  const recycleValue = getCardRecycleValue({ ...card, isShiny });
  const isProtectedInRecycleMode =
    isRecycleMode && isFavorite && duplicateCount <= 1;

  // Détection dynamique du palier de taille proportionnel : 'small' (<185px), 'medium' (185-260px), 'large' (>260px)
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

  // Configuration typographique et textuelle proportionnelle à la largeur réelle de la carte
  const maxCharsBudget =
    sizeTier === 'small' ? 105 : sizeTier === 'medium' ? 195 : 285;
  const fullText = fitSummaryToCard(card.extract, maxCharsBudget);
  const displayTitle = cleanCardTitle(card.title);

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

  const badgeDimensions =
    sizeTier === 'small'
      ? 'min-w-[20px] h-[17px] text-[9.5px]'
      : sizeTier === 'medium'
      ? 'min-w-[24px] h-[19px] text-[10.5px]'
      : 'min-w-[28px] h-[22px] text-[11.5px]';

  const shinyBadgeDimensions =
    sizeTier === 'small'
      ? 'h-[17px] px-1 text-[8.5px]'
      : sizeTier === 'medium'
      ? 'h-[19px] px-1.5 text-[9.5px]'
      : 'h-[22px] px-2 text-[10px]';

  const footerTextSize =
    sizeTier === 'small'
      ? 'text-[9.5px]'
      : sizeTier === 'medium'
      ? 'text-[10.5px]'
      : 'text-[11.5px]';

  const footerIconSize =
    sizeTier === 'small' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  const wikiBtnSize =
    sizeTier === 'small'
      ? 'px-1.5 py-0.5 text-[9px]'
      : sizeTier === 'medium'
      ? 'px-2 py-0.5 text-[10px]'
      : 'px-2 py-0.5 text-[10.5px]';

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
  const isHighTier =
    tier.code === 'L' || tier.code === 'UR' || tier.code === 'SR';
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
        perspective: '1100px',
        containerType: 'inline-size',
        containerName: 'wikicard',
      }}
    >
      {/* Enveloppe externe : Cadre métal brossé si la carte est GIF (.gif) */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative w-full transition-transform duration-200 ease-out rounded-[14px] ${
          isShiny ? 'wiki-shiny-frame p-[3px]' : ''
        }`}
        style={{
          boxShadow: isShiny
            ? tilt.isHovered
              ? `0 18px 38px -6px rgba(30, 41, 59, 0.45), 0 0 18px rgba(148, 163, 184, 0.45)`
              : `0 10px 26px -6px rgba(30, 41, 59, 0.32), 0 2px 8px rgba(0,0,0,0.12)`
            : tilt.isHovered
            ? `0 18px 34px -8px ${tier.shadowColor}, 0 4px 12px rgba(0,0,0,0.10)`
            : `0 8px 20px -6px ${tier.shadowColor}, 0 2px 6px rgba(0,0,0,0.06)`,
          transform: tilt.isHovered
            ? `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateY(-4px)`
            : 'none',
        }}
      >
        <article
          className={`wiki-card-item relative w-full aspect-[284/443] rounded-[14px] overflow-hidden flex flex-col ${
            isShiny && !showSelectedDim ? 'wiki-metal-surface' : ''
          }`}
          style={{
            background: isShiny ? undefined : tier.cardBg,
            border: isShiny
              ? '1.5px solid rgba(255, 255, 255, 0.85)'
              : tier.code === 'L'
              ? '2px solid #f5d442'
              : tier.code === 'UR'
              ? '1.5px solid #f5a642'
              : `1px solid ${tier.borderColor}`,
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
          <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5">
            {duplicateCount > 1 && (
              <span
                className={`px-2 py-0.5 rounded-[2px] bg-black/65 backdrop-blur-xs text-white text-[11px] font-bold ${
                  showSelectedDim ? 'grayscale opacity-65' : ''
                }`}
              >
                ×{duplicateCount}
              </span>
            )}

            {selectionBadgeText ? (
              <div
                className={`h-7 px-2 rounded-[2px] flex items-center gap-1 text-[11.5px] font-bold shadow-xs transition-colors ${
                  isSelected
                    ? 'bg-[#3366cc] text-white border border-[#2a4b8d]'
                    : 'bg-black/65 text-white border border-white/40'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                <span>{selectionBadgeText}</span>
              </div>
            ) : isRecycleMode ? (
              isProtectedInRecycleMode ? (
                <span
                  className="px-2 py-0.5 rounded-[2px] bg-black/65 text-[#ffea5a] text-[10.5px] font-bold"
                  title="Retirez cette carte de vos favoris si vous souhaitez la recycler"
                >
                  ★ Protégée
                </span>
              ) : effectiveRecycleQty > 0 ? (
                <div
                  className="h-7 px-2 rounded-[2px] flex items-center gap-1.5 text-[11.5px] font-bold shadow-xs bg-[#006b24] text-white border border-[#00571d]"
                  title={`${effectiveRecycleQty} exemplaire${effectiveRecycleQty > 1 ? 's' : ''} sélectionné${effectiveRecycleQty > 1 ? 's' : ''} (${effectiveRecycleQty}/${duplicateCount})`}
                >
                  <span className="w-3.5 h-3.5 rounded-[2px] flex items-center justify-center bg-white text-[#006b24] border border-white">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                  {duplicateCount > 1 && (
                    <span className="font-mono text-[11px] bg-black/25 px-1 py-0.2 rounded-[2px]">
                      ×{effectiveRecycleQty}
                    </span>
                  )}
                  <span>
                    +{new Intl.NumberFormat('fr-FR').format(
                      recycleValue * effectiveRecycleQty
                    )}
                  </span>
                  <WikithuneIcon className="w-3 h-3 text-white" />
                </div>
              ) : (
                <div
                  className="h-7 px-2 rounded-[2px] flex items-center gap-1 text-[11.5px] font-bold shadow-xs bg-black/65 text-white border border-white/40 hover:bg-black/80 transition-colors"
                >
                  <span className="w-3.5 h-3.5 rounded-[2px] border border-white/70" />
                  <span>
                    +{new Intl.NumberFormat('fr-FR').format(recycleValue)}
                  </span>
                  <WikithuneIcon className="w-3 h-3 text-white" />
                </div>
              )
            ) : (
              onToggleFavorite && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(card.id);
                  }}
                  aria-label="Ajouter aux favoris"
                  className="w-7 h-7 rounded-full bg-black/25 hover:bg-black/45 backdrop-blur-xs flex items-center justify-center text-white transition-colors cursor-pointer"
                >
                  <Star
                    className={`w-4 h-4 ${
                      isFavorite
                        ? 'fill-[#ffea5a] text-[#ffea5a]'
                        : 'text-white/90'
                    }`}
                  />
                </button>
              )
            )}
          </div>

          {/* Contenu visuel de la carte (effet de grisage stylé et élégant lors de la sélection) */}
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
            <div
              className="relative w-full h-[43.5%] shrink-0 overflow-hidden"
              style={{
                background:
                  card.imageContain || !card.image || imgError
                    ? tier.code === 'L'
                      ? 'radial-gradient(circle at 50% 45%, #8f6b10 0%, #4d3803 100%)'
                      : 'rgba(15, 23, 42, 0.14)'
                    : '#18181b',
              }}
            >
              {/* Ondes subtiles derrière le logo Wikipédia quand pas d'image ou image détourée */}
              {(card.imageContain || !card.image || imgError) && (
                <RarityWavePattern
                  code={tier.code}
                  waveColor1={
                    isShiny ? 'rgba(255, 255, 255, 0.55)' : tier.waveColor1
                  }
                  waveColor2={
                    isShiny ? 'rgba(30, 41, 59, 0.16)' : tier.waveColor2
                  }
                />
              )}

              {card.image && !imgError ? (
                <img
                  src={card.image}
                  alt={card.title}
                  onError={() => setImgError(true)}
                  loading="lazy"
                  className={`w-full h-full ${
                    card.imageContain
                      ? 'object-contain p-3.5 drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]'
                      : 'object-cover'
                  }`}
                />
              ) : (
                /* Fallback officiel Globe Wikipédia conservé pour les pages sans image */
                <div className="w-full h-full flex flex-col items-center justify-center p-3 relative z-10">
                  <img
                    src="https://fr.wikipedia.org/static/images/icons/wikipedia.png"
                    alt="Wikipédia"
                    className="w-12 h-12 sm:w-16 sm:h-16 object-contain opacity-85 drop-shadow-md"
                  />
                </div>
              )}

              {/* Badges en haut à gauche : Rareté + Badge Métal GIF (si .gif) */}
              <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-20 flex items-center gap-1 sm:gap-1.5">
                <div
                  className={`${badgeDimensions} px-1.5 sm:px-2 rounded-[4px] sm:rounded-[6px] flex items-center justify-center font-extrabold tracking-wide shadow-[0_2px_6px_rgba(0,0,0,0.22)]`}
                  style={{
                    backgroundColor: tier.badgeBg,
                    color: tier.badgeText,
                  }}
                  title={`${tier.name} (${tier.thresholdLabel})`}
                >
                  {tier.code}
                </div>

                {isShiny && (
                  <div
                    className={`wiki-shiny-badge ${shinyBadgeDimensions} rounded-[4px] sm:rounded-[6px] inline-flex items-center gap-1 font-extrabold tracking-wider uppercase shadow-[0_2px_8px_rgba(0,0,0,0.35)] border border-[#cbd5e1]`}
                    title="Carte GIF Métal (.gif animé) — Valeur de recyclage ×3 !"
                  >
                    <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 shrink-0 text-[#e2e8f0]" />
                    <span>GIF</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. PARTIE INFÉRIEURE : FOND TEXTURÉ (MÉTAL BROSSÉ SI GIF) + TITRE + DESCRIPTION + PIED */}
            <div
              className={`relative flex-1 min-h-0 flex flex-col justify-between ${
                sizeTier === 'small'
                  ? 'px-2 pt-1.5 pb-1.5'
                  : sizeTier === 'medium'
                  ? 'px-3 pt-2 pb-2'
                  : 'px-3.5 pt-2.5 pb-2.5'
              } overflow-hidden`}
            >
              {/* Texture d'ondes organiques (argentée/titane si carte GIF métal) */}
              <RarityWavePattern
                code={tier.code}
                waveColor1={
                  isShiny ? 'rgba(255, 255, 255, 0.55)' : tier.waveColor1
                }
                waveColor2={
                  isShiny ? 'rgba(15, 23, 42, 0.12)' : tier.waveColor2
                }
              />

              {/* Reflet Métal Brossé (style Carte Bancaire Métal / Titane) pour les cartes GIF (.gif) */}
              {isShiny && (
                <>
                  {/* Liseré d'usinage métallique interne */}
                  <div
                    className="absolute inset-x-2 inset-y-1.5 rounded-[10px] pointer-events-none border border-white/45"
                    style={{
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
                    }}
                  />
                  {/* Faisceau spéculaire métallique réagissant à l'inclinaison */}
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

              {/* Reflet Holographique / Foil interactif pour les raretés SR, UR, L classiques */}
              {isHighTier && !isShiny && (
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                  style={{
                    opacity: tilt.isHovered
                      ? 0.85
                      : tier.code === 'L'
                      ? 0.35
                      : 0.15,
                    background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.55) 0%, transparent 60%), ${tier.foilGradient}`,
                    mixBlendMode: 'soft-light',
                  }}
                />
              )}

              {/* Contenu textuel */}
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

              {/* 3. PIED DE CARTE : VUES WIKIPÉDIA + LIEN DIRECT */}
              <div
                className="wiki-card-footer relative z-10 shrink-0 pt-1 mt-0.5 flex items-center justify-between gap-1 border-t"
                style={{
                  borderColor: isShiny
                    ? 'rgba(15, 23, 42, 0.22)'
                    : tier.dividerColor,
                }}
              >
                <div
                  className={`flex items-center gap-1 font-bold shrink-0 ${footerTextSize}`}
                  style={{ color: isShiny ? '#0f172a' : tier.textColor }}
                  title={`Fréquentation de la page : ${formattedViews} vues (${tier.name})`}
                >
                  <Eye className={`${footerIconSize} opacity-80 shrink-0`} />
                  <span>{formattedViews} vues</span>
                </div>

                <a
                  href={
                    card.url ||
                    `https://fr.wikipedia.org/wiki/${encodeURIComponent(
                      card.title
                    )}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`inline-flex items-center gap-1 shrink-0 ${wikiBtnSize} rounded-[4px] sm:rounded-[5px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]`}
                  style={{
                    backgroundColor: isShiny
                      ? 'rgba(255, 255, 255, 0.68)'
                      : 'rgba(255, 255, 255, 0.54)',
                    color: isShiny ? '#0f172a' : tier.textColor,
                    border: `1px solid ${
                      isShiny ? 'rgba(15, 23, 42, 0.24)' : tier.dividerColor
                    }`,
                  }}
                  title="Consulter l'article officiel sur Wikipédia (nouvel onglet)"
                >
                  <span className={sizeTier === 'small' ? 'hidden' : 'inline'}>
                    Wikipédia
                  </span>
                  <span className={sizeTier === 'small' ? 'inline' : 'hidden'}>
                    Wiki
                  </span>
                  <ExternalLink className={`${footerIconSize} shrink-0`} />
                </a>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
