import React, { useState, useRef } from 'react';
import { Eye, ExternalLink, Star, Check, Sparkles } from 'lucide-react';
import {
  getRarityByCode,
  getRarityByViews,
  getCardRecycleValue,
} from '../config/rarities';
import WikithuneIcon from './WikithuneIcon';

/**
 * Formate l'extrait Wikipédia pour garantir uniquement des phrases complètes
 * (jamais de texte coupé au milieu d'un mot ou d'une phrase avec "...")
 * tout en tenant intégralement dans la carte sans scroll.
 */
function formatCompleteExtract(rawText = '', maxLength = 410) {
  const cleaned = rawText.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return "Article encyclopédique référencé sur l'édition francophone de Wikipédia.";
  }
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Découpage en phrases complètes
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length === 0) {
    return cleaned.slice(0, maxLength);
  }

  let result = '';
  for (const sentence of sentences) {
    if ((result + sentence).trim().length <= maxLength) {
      result += sentence;
    } else {
      break;
    }
  }

  // Si la toute première phrase dépasse déjà maxLength, on coupe proprement à une virgule ou un espace
  if (!result) {
    const sub = cleaned.slice(0, maxLength - 1);
    const lastComma = sub.lastIndexOf(',');
    const lastSpace = sub.lastIndexOf(' ');
    const cutIndex = lastComma > maxLength * 0.65 ? lastComma : lastSpace;
    return `${sub.slice(0, cutIndex).trim()}.`;
  }

  return result.trim();
}

/**
 * Motif d'ondes organiques / topographiques en arrière-plan selon la rareté
 */
function RarityWavePattern({ code, waveColor1, waveColor2 }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none select-none opacity-85"
      viewBox="0 0 400 400"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {code === 'L' ? (
        <g>
          <path
            d="M-40,40 C60,10 120,110 220,80 C320,50 350,-10 440,30 L440,420 L-40,420 Z"
            fill={waveColor2}
          />
          <path
            d="M260,-20 C210,70 310,150 250,250 C190,350 290,390 240,440 L440,440 L440,-20 Z"
            fill={waveColor2}
          />
          <path
            d="M-30,140 C70,90 150,190 260,140 C370,90 390,180 450,150 L450,420 L-30,420 Z"
            fill={waveColor1}
            opacity="0.45"
          />
          <path
            d="M60,-20 C120,80 30,190 110,290 C190,390 90,420 140,450"
            stroke={waveColor1}
            strokeWidth="26"
            fill="none"
            opacity="0.45"
          />
          <path
            d="M310,-20 C260,90 350,200 280,310 C210,420 310,440 270,460"
            stroke={waveColor2}
            strokeWidth="22"
            fill="none"
            opacity="0.55"
          />
        </g>
      ) : code === 'UR' || code === 'SR' ? (
        <g>
          <path
            d="M-50,60 Q110,-20 240,90 T460,70 L460,420 L-50,420 Z"
            fill={waveColor1}
            opacity="0.5"
          />
          <path
            d="M-50,180 Q130,100 260,210 T460,180 L460,420 L-50,420 Z"
            fill={waveColor2}
          />
          <path
            d="M-40,290 Q140,220 280,310 T460,290 L460,420 L-40,420 Z"
            fill={waveColor1}
            opacity="0.4"
          />
          <circle
            cx="340"
            cy="80"
            r="150"
            stroke={waveColor1}
            strokeWidth="20"
            fill="none"
            opacity="0.35"
          />
        </g>
      ) : (
        <g>
          <path
            d="M-40,90 C90,30 220,150 440,70 L440,420 L-40,420 Z"
            fill={waveColor1}
            opacity="0.48"
          />
          <path
            d="M-40,210 C120,150 260,270 440,190 L440,420 L-40,420 Z"
            fill={waveColor2}
          />
          <path
            d="M-40,320 C140,270 280,360 440,300 L440,420 L-40,420 Z"
            fill={waveColor1}
            opacity="0.35"
          />
        </g>
      )}
    </svg>
  );
}

export default function WikiCard({
  card,
  onToggleFavorite,
  isFavorite = false,
  duplicateCount = 1,
  compact = false, // true dans le classeur (4 cartes par ligne)
  mini = false, // true dans le classeur de l'Upgrader (6 cartes par ligne)
  trade = false, // true dans les propositions d'échanges
  isRecycleMode = false,
  isSelectedForRecycle = false,
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

  // Taille de police 100 % uniforme sur toutes les cartes
  const maxChars = trade ? 70 : mini ? 130 : compact ? 315 : 365;
  const fullText = formatCompleteExtract(card.extract, maxChars);
  const descriptionTypography = trade
    ? 'text-[9.5px] leading-[1.25] line-clamp-2'
    : mini
    ? 'text-[10.8px] leading-[1.3]'
    : compact
    ? 'text-[12.5px] leading-[1.38]'
    : 'text-[13.5px] leading-[1.42]';

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
  const showSelectedDim = isSelectedForRecycle || isSelected;

  return (
    <div
      onClick={handleCardClick}
      className={`relative select-none w-full mx-auto ${
        trade
          ? 'max-w-[155px]'
          : mini
          ? 'max-w-[215px]'
          : compact
          ? 'max-w-[272px]'
          : 'max-w-[330px]'
      } ${
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
      style={{ perspective: '1100px' }}
    >
      {/* Enveloppe externe : Cadre métal brossé si la carte est GIF (.gif) */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative w-full transition-transform duration-200 ease-out ${
          trade
            ? 'rounded-[10px]'
            : mini
            ? 'rounded-[13px]'
            : compact
            ? 'rounded-[16px]'
            : 'rounded-[19px]'
        } ${isShiny ? 'wiki-shiny-frame p-[3px]' : ''}`}
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
          className={`wiki-card-item relative w-full ${
            trade
              ? 'h-[220px] rounded-[9px]'
              : mini
              ? 'h-[316px] rounded-[11px]'
              : compact
              ? 'h-[446px] rounded-[14px]'
              : 'h-[500px] rounded-[17px]'
          } overflow-hidden flex flex-col ${
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
                className={`h-7 px-2 rounded-[2px] flex items-center gap-1 text-[11.5px] font-bold transition-colors ${
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
              ) : (
                <div
                  className={`h-7 px-2 rounded-[2px] flex items-center gap-1 text-[11.5px] font-bold transition-colors ${
                    isSelectedForRecycle
                      ? 'bg-[#177860] text-white border border-[#099979]'
                      : 'bg-black/65 text-white border border-white/40 hover:bg-black/80'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-[2px] flex items-center justify-center border ${
                      isSelectedForRecycle
                        ? 'bg-white text-[#177860] border-white'
                        : 'border-white/70'
                    }`}
                  >
                    {isSelectedForRecycle && (
                      <Check className="w-3 h-3 stroke-[3]" />
                    )}
                  </span>
                  <span>+{recycleValue}</span>
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
              className={`relative w-full ${
                trade
                  ? 'h-[85px]'
                  : mini
                  ? 'h-[112px]'
                  : compact
                  ? 'h-[168px]'
                  : 'h-[192px]'
              } shrink-0 overflow-hidden`}
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
                    className={`${
                      trade
                        ? 'w-9 h-9'
                        : mini
                        ? 'w-12 h-12'
                        : compact
                        ? 'w-16 h-16'
                        : 'w-20 h-20'
                    } object-contain opacity-85 drop-shadow-md`}
                  />
                </div>
              )}

              {/* Badges en haut à gauche : Rareté + Badge Métal GIF (si .gif) */}
              <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5">
                <div
                  className={`${
                    trade
                      ? 'min-w-[20px] h-[17px] px-1 text-[9.5px]'
                      : mini
                      ? 'min-w-[26px] h-[20px] px-1.5 text-[10.5px]'
                      : compact
                      ? 'min-w-[32px] h-[24px] px-2 text-[12px]'
                      : 'min-w-[36px] h-[27px] px-2.5 text-[13px]'
                  } rounded-[2px] flex items-center justify-center font-extrabold tracking-wide`}
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
                    className={`wiki-shiny-badge ${
                      mini
                        ? 'h-[20px] px-1.5 text-[9.5px]'
                        : compact
                        ? 'h-[24px] px-2 text-[10.5px]'
                        : 'h-[27px] px-2.5 text-[11.5px]'
                    } rounded-[2px] inline-flex items-center gap-1 font-extrabold tracking-wider uppercase border border-[#cbd5e1]`}
                    title="Carte GIF Métal (.gif animé) — Valeur de recyclage ×3 !"
                  >
                    <Sparkles className="w-2.5 h-2.5 shrink-0 text-[#e2e8f0]" />
                    <span>GIF</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. PARTIE INFÉRIEURE : FOND TEXTURÉ (MÉTAL BROSSÉ SI GIF) + TITRE + DESCRIPTION + PIED */}
            <div
              className={`relative flex-1 flex flex-col justify-between ${
                mini
                  ? 'px-2.5 pt-2 pb-2'
                  : compact
                  ? 'px-3.5 pt-3 pb-2.5'
                  : 'px-4 pt-3.5 pb-3'
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
              <div className="relative z-10 flex-1 flex flex-col min-h-0">
                <h3
                  className={`font-extrabold ${
                    trade
                      ? 'text-[11.5px] mb-0.5'
                      : mini
                      ? 'text-[13.5px] mb-1'
                      : compact
                      ? 'text-[17.5px] mb-1.5'
                      : 'text-[19.5px] mb-1.5'
                  } leading-[1.18] tracking-[-0.01em] line-clamp-2`}
                  style={{
                    color: isShiny ? '#0f172a' : tier.textColor,
                    textShadow: isShiny
                      ? '0 1px 0 rgba(255,255,255,0.65)'
                      : undefined,
                  }}
                >
                  {card.title}
                </h3>

                <p
                  className={`${descriptionTypography} font-normal m-0`}
                  style={{ color: isShiny ? '#1e293b' : tier.subTextColor }}
                >
                  {fullText}
                </p>
              </div>

              {/* 3. PIED DE CARTE : VUES WIKIPÉDIA + LIEN DIRECT */}
              <div
                className={`relative z-10 ${
                  trade ? 'pt-1 mt-0.5' : mini ? 'pt-1.5 mt-1' : 'pt-2 mt-1.5'
                } flex items-center justify-between gap-1 border-t`}
                style={{
                  borderColor: isShiny
                    ? 'rgba(15, 23, 42, 0.22)'
                    : tier.dividerColor,
                }}
              >
                <div
                  className={`flex items-center gap-1 font-bold ${
                    trade
                      ? 'text-[9px]'
                      : mini
                      ? 'text-[10.5px]'
                      : compact
                      ? 'text-[12px]'
                      : 'text-[13px]'
                  }`}
                  style={{ color: isShiny ? '#0f172a' : tier.textColor }}
                  title={`Fréquentation de la page : ${formattedViews} vues (${tier.name})`}
                >
                  <Eye className="w-3 h-3 opacity-80 shrink-0" />
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
                  className={`inline-flex items-center gap-1 ${
                    trade
                      ? 'px-1 py-0.2 text-[8.5px]'
                      : mini
                      ? 'px-1.5 py-0.5 text-[9.5px]'
                      : compact
                      ? 'px-2 py-0.5 text-[11px]'
                      : 'px-2.5 py-1 text-[12px]'
                  } rounded-[2px] font-semibold transition-colors`}
                  style={{
                    backgroundColor: isShiny
                      ? 'rgba(255, 255, 255, 0.68)'
                      : 'rgba(255, 255, 255, 0.54)',
                    color: isShiny ? '#0f172a' : tier.textColor,
                    border: `1px solid ${
                      isShiny ? 'rgba(15, 23, 42, 0.24)' : tier.dividerColor
                    }`,
                  }}
                >
                  <span>{trade || mini ? 'Wikipédia' : 'Lire sur Wikipédia'}</span>
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                </a>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
