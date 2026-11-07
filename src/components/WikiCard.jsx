/**
 * @file Rôle : Rendu visuel normalisé d'une carte encyclopédique Wikipédia (284 × 443 px) minimaliste, propre et fidèle à l'encyclopédie.
 * Dépendances : React, `lucide-react`, `../config/rarities`, `../utils/cardText`, `./card/RarityWavePattern`, `./card/CardTopActions`.
 * Effets de bord : Aucun (composant de présentation visuelle pur).
 */

import React, { useState, useRef, useEffect } from 'react';
import { Eye, ExternalLink, Sparkles } from 'lucide-react';
import {
  getRarityByCode,
  getRarityByViews,
  getCardRecycleValue,
} from '../config/rarities';
import { fitSummaryToCard, cleanCardTitle } from '../utils/cardText';
import RarityWavePattern from './card/RarityWavePattern';
import CardTopActions from './card/CardTopActions';

// Configuration des paliers de taille proportionnels
const SIZE_CONFIGS = {
  small: {
    budget: 105,
    titleCls: 'font-bold text-[11.5px] leading-[1.22] line-clamp-2 pb-[1px] tracking-tight',
    descCls: 'text-[10px] leading-[1.3] line-clamp-4 font-normal m-0',
    badgeDim: 'min-w-[20px] h-[17px] text-[9.5px]',
    shinyDim: 'h-[17px] px-1 text-[8.5px]',
    footerTextCls: 'text-[9.5px]',
    footerIconCls: 'w-2.5 h-2.5',
    btnCls: 'px-1.5 py-0.5 text-[9px]',
    padding: '8px 10px',
  },
  medium: {
    budget: 195,
    titleCls: 'font-extrabold text-[13.5px] leading-[1.22] line-clamp-2 pb-[2px] tracking-tight',
    descCls: 'text-[11px] leading-[1.35] line-clamp-6 font-normal m-0',
    badgeDim: 'min-w-[24px] h-[19px] text-[10.5px]',
    shinyDim: 'h-[19px] px-1.5 text-[9.5px]',
    footerTextCls: 'text-[10.5px]',
    footerIconCls: 'w-3 h-3',
    btnCls: 'px-2 py-0.5 text-[10px]',
    padding: '10px 12px',
  },
  large: {
    budget: 285,
    titleCls: 'font-extrabold text-[15.5px] leading-[1.2] line-clamp-2 pb-[2px] tracking-[-0.01em]',
    descCls: 'text-[12px] leading-[1.38] line-clamp-8 font-normal m-0',
    badgeDim: 'min-w-[28px] h-[22px] text-[11.5px]',
    shinyDim: 'h-[22px] px-2 text-[10px]',
    footerTextCls: 'text-[11.5px]',
    footerIconCls: 'w-3 h-3',
    btnCls: 'px-2 py-0.5 text-[10.5px]',
    padding: '12px 14px',
  },
};

/**
 * Composant de présentation normalisé pour une carte Wikipédia au style épuré.
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

  // Détection responsive proportionnelle à la largeur de carte
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

  // Formatage du texte et style responsive
  const cfg = SIZE_CONFIGS[sizeTier] || SIZE_CONFIGS.large;
  const fullText = fitSummaryToCard(card.extract, cfg.budget);
  const displayTitle = cleanCardTitle(card.title);

  const isHighTier =
    tier.code === 'L' || tier.code === 'UR' || tier.code === 'SR';

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
      {/* Enveloppe avec inclinaison 3D fluide */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative w-full transition-transform duration-200 ease-out rounded-[12px] sm:rounded-[14px] ${
          isShiny ? 'wiki-shiny-frame p-[2.5px]' : ''
        }`}
        style={{
          boxShadow: isShiny
            ? tilt.isHovered
              ? '0 18px 36px -6px rgba(30, 41, 59, 0.45), 0 0 16px rgba(148, 163, 184, 0.45)'
              : '0 8px 22px -6px rgba(30, 41, 59, 0.3), 0 2px 6px rgba(0,0,0,0.1)'
            : tier.code === 'L' || tier.code === 'UR'
            ? tilt.isHovered
              ? `0 18px 36px -8px ${tier.shadowColor}, 0 0 16px ${tier.shadowColor}`
              : `0 8px 22px -6px ${tier.shadowColor}, 0 2px 6px rgba(0,0,0,0.06)`
            : tilt.isHovered
            ? `0 16px 32px -8px ${tier.shadowColor}, 0 4px 10px rgba(0,0,0,0.1)`
            : `0 6px 18px -6px ${tier.shadowColor}, 0 2px 5px rgba(0,0,0,0.05)`,
          transform: tilt.isHovered
            ? `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateY(-4px)`
            : 'none',
        }}
      >
        {/* Carte Wikipédia au layout plein et épuré avec bordure unique */}
        <article
          className={`wiki-card-item relative w-full aspect-[284/443] rounded-[12px] sm:rounded-[14px] overflow-hidden flex flex-col ${
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

          {/* 1. ZONE SUPÉRIEURE : ILLUSTRATION BORD-À-BORD (PLEINE LARGEUR) */}
          <div
            className={`relative w-full h-[43.5%] shrink-0 overflow-hidden border-b transition-all duration-200 ${
              showSelectedDim ? 'grayscale-[85%] opacity-55 contrast-95' : ''
            }`}
            style={{
              borderColor: isShiny
                ? 'rgba(15, 23, 42, 0.16)'
                : tier.dividerColor,
              background:
                card.imageContain || !card.image || imgError
                  ? 'rgba(255, 255, 255, 0.35)'
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
                  isShiny ? 'rgba(30, 41, 59, 0.12)' : tier.waveColor2
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
              /* Fallback officiel Globe Wikipédia sobre et épuré */
              <div className="w-full h-full flex flex-col items-center justify-center p-3 relative z-10">
                <img
                  src="https://fr.wikipedia.org/static/images/icons/wikipedia.png"
                  alt="Wikipédia"
                  className="w-12 h-12 sm:w-16 sm:h-16 object-contain opacity-85 drop-shadow-xs"
                />
              </div>
            )}

            {/* Badges en haut à gauche : Rareté sobre rectangulaire + Badge Métal GIF */}
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5">
              <div
                className={`${cfg.badgeDim} px-1.5 sm:px-2 rounded-[4px] sm:rounded-[6px] flex items-center justify-center font-bold tracking-wide shadow-xs`}
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
                  className={`wiki-shiny-badge ${cfg.shinyDim} rounded-[4px] sm:rounded-[6px] inline-flex items-center gap-1 font-bold tracking-wider uppercase shadow-xs border border-[#cbd5e1]`}
                  title="Carte GIF Métal (.gif animé) — Valeur de recyclage ×3 !"
                >
                  <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 shrink-0 text-[#e2e8f0]" />
                  <span>GIF</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. ZONE INFÉRIEURE : TEXTE & PIED SOBRE STYLE WIKIPÉDIA */}
          <div
            className={`relative flex-1 min-h-0 flex flex-col justify-between overflow-hidden transition-all duration-200 ${
              showSelectedDim ? 'grayscale-[85%] opacity-55 contrast-95' : ''
            }`}
            style={{
              padding: cfg.padding,
            }}
          >
            {/* Texture d'ondes fines harmoniques */}
            <RarityWavePattern
              code={tier.code}
              waveColor1={
                isShiny ? 'rgba(255, 255, 255, 0.55)' : tier.waveColor1
              }
              waveColor2={
                isShiny ? 'rgba(15, 23, 42, 0.10)' : tier.waveColor2
              }
            />

            {/* Reflet Holographique fluide au survol pour SR, UR, L */}
            {isHighTier && !isShiny && (
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                style={{
                  opacity: tilt.isHovered
                    ? 0.75
                    : tier.code === 'L'
                    ? 0.25
                    : tier.code === 'UR'
                    ? 0.15
                    : 0,
                  background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.5) 0%, transparent 60%), ${tier.foilGradient}`,
                  mixBlendMode: 'soft-light',
                }}
              />
            )}

            {/* Titre, séparateur fin encyclopédique et extrait textuel */}
            <div className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden justify-start">
              <h3
                className={`wiki-card-title shrink-0 ${cfg.titleCls}`}
                style={{
                  color: isShiny ? '#0f172a' : tier.textColor,
                }}
              >
                {displayTitle}
              </h3>

              {/* Fin filet de séparation sous le titre style article Wikipédia */}
              <div
                className="w-full h-px my-1 sm:my-1.5 shrink-0 opacity-70"
                style={{
                  backgroundColor: isShiny
                    ? 'rgba(15, 23, 42, 0.18)'
                    : tier.dividerColor,
                }}
              />

              <p
                className={`wiki-card-description ${cfg.descCls}`}
                style={{ color: isShiny ? '#1e293b' : tier.subTextColor }}
              >
                {fullText}
              </p>
            </div>

            {/* 3. PIED DE CARTE SOBRE WIKIPÉDIA : VUES SANS PILULE & LIEN ÉPURÉ */}
            <div
              className="wiki-card-footer relative z-10 shrink-0 pt-1.5 mt-auto flex items-center justify-between gap-1.5 border-t"
              style={{
                borderColor: isShiny
                  ? 'rgba(15, 23, 42, 0.18)'
                  : tier.dividerColor,
              }}
            >
              {/* Compteur de vues direct sans pilule encadrée */}
              <div
                className={`flex items-center gap-1 font-bold shrink-0 ${cfg.footerTextCls}`}
                style={{ color: isShiny ? '#0f172a' : tier.textColor }}
                title={`Fréquentation de la page : ${formattedViews} vues (${tier.name})`}
              >
                <Eye className={`${cfg.footerIconCls} opacity-75 shrink-0`} />
                <span>{formattedViews} vues</span>
              </div>

              {/* Bouton Wikipédia sobre et fidèle */}
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
                className={`inline-flex items-center gap-1 shrink-0 ${cfg.btnCls} rounded-[4px] font-medium transition-all hover:opacity-80 active:scale-95`}
                style={{
                  backgroundColor: isShiny
                    ? 'rgba(255, 255, 255, 0.72)'
                    : 'rgba(255, 255, 255, 0.58)',
                  color: isShiny ? '#0f172a' : tier.textColor,
                  border: `1px solid ${
                    isShiny
                      ? 'rgba(15, 23, 42, 0.2)'
                      : tier.dividerColor
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
                <ExternalLink className={`${cfg.footerIconCls} opacity-80 shrink-0`} />
              </a>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
