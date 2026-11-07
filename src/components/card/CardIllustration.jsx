/**
 * @file Rôle : Zone supérieure d'illustration de la carte (image plein cadre, fallback globe Wikipédia et badges de rareté).
 * Dépendances : React, `lucide-react`, `./CardRarityGem`, `./RarityWavePattern`.
 * Effets de bord : Aucun (rendu visuel pur).
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import CardRarityGem from './CardRarityGem';
import RarityWavePattern from './RarityWavePattern';

/**
 * Zone d'illustration supérieure plein cadre d'une carte Wikipédia.
 * @param {Object} props
 * @param {Object} props.card - Données de la carte
 * @param {Object} props.tier - Palier de rareté
 * @param {boolean} props.isShiny - Indique si la carte est GIF Métal
 * @param {'small'|'medium'|'large'} props.sizeTier - Palier responsive
 * @param {boolean} props.imgError - Indique une erreur de chargement d'image
 * @param {function(): void} props.onImgError - Callback de déclenchement de l'erreur d'image
 */
export default function CardIllustration({
  card,
  tier,
  isShiny,
  sizeTier,
  imgError,
  onImgError,
}) {
  const hasValidImage = Boolean(card.image && !imgError);

  const shinyBadgeDimensions =
    sizeTier === 'small'
      ? 'h-[17px] px-1 text-[8.5px] rounded-[2px]'
      : sizeTier === 'medium'
      ? 'h-[19px] px-1.5 text-[9.5px] rounded-[3px]'
      : 'h-[22px] px-2 text-[10px] rounded-[3px]';

  const globeDimensions =
    sizeTier === 'small'
      ? 'w-12 h-12'
      : sizeTier === 'medium'
      ? 'w-14 h-14'
      : 'w-16 h-16';

  return (
    <div
      className="relative w-full h-[43.5%] shrink-0 overflow-hidden"
      style={{
        background:
          card.imageContain || !hasValidImage
            ? 'rgba(15, 23, 42, 0.12)'
            : '#18181b',
        borderBottom: `1px solid ${
          isShiny
            ? 'rgba(15, 23, 42, 0.18)'
            : tier.dividerColor || 'rgba(0, 0, 0, 0.14)'
        }`,
      }}
    >
      {/* Ondes subtiles derrière le logo Wikipédia quand pas d'image ou image détourée */}
      {(card.imageContain || !hasValidImage) && (
        <RarityWavePattern
          code={tier.code}
          waveColor1={isShiny ? 'rgba(255, 255, 255, 0.55)' : tier.waveColor1}
          waveColor2={isShiny ? 'rgba(30, 41, 59, 0.14)' : tier.waveColor2}
        />
      )}

      {/* 1. Affichage de l'image ou du fallback officiel Globe Wikipédia */}
      {hasValidImage ? (
        <img
          src={card.image}
          alt={card.title}
          onError={onImgError}
          loading="lazy"
          className={`w-full h-full relative z-10 ${
            card.imageContain
              ? 'object-contain p-3.5 drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]'
              : 'object-cover'
          }`}
        />
      ) : (
        /* Fallback officiel Globe Wikipédia centré */
        <div className="w-full h-full flex flex-col items-center justify-center p-3 relative z-10 select-none">
          <img
            src="https://fr.wikipedia.org/static/images/icons/wikipedia.png"
            alt="Wikipédia"
            className={`${globeDimensions} object-contain opacity-85 drop-shadow-sm`}
          />
        </div>
      )}

      {/* 2. Badges en haut à gauche : Rareté + Badge Métal GIF */}
      <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-20 flex items-center gap-1 sm:gap-1.5">
        <CardRarityGem tier={tier} sizeTier={sizeTier} />

        {isShiny && (
          <div
            className={`wiki-shiny-badge ${shinyBadgeDimensions} inline-flex items-center gap-1 font-extrabold tracking-wider uppercase shadow-[0_1px_4px_rgba(0,0,0,0.3)] border border-[#cbd5e1]`}
            title="Carte GIF Métal (.gif animé) — Valeur de recyclage ×3 !"
          >
            <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 shrink-0 text-[#e2e8f0]" />
            <span>GIF</span>
          </div>
        )}
      </div>
    </div>
  );
}
