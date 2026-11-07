/**
 * @file Rôle : Fenêtre d'illustration physique TCG pour la carte (biseau, ombre interne, médaillon fallback et badges de rareté).
 * Dépendances : React, `lucide-react`, `./CardRarityGem`, `./CardPlaceholderGraphic`.
 * Effets de bord : Aucun (rendu visuel pur).
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import CardRarityGem from './CardRarityGem';
import CardPlaceholderGraphic from './CardPlaceholderGraphic';

/**
 * Fenêtre d'illustration biseautée style carte TCG physique.
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
      ? 'h-[19px] px-1 text-[8.5px] rounded-[5px]'
      : sizeTier === 'medium'
      ? 'h-[22px] px-1.5 text-[9.5px] rounded-[6px]'
      : 'h-[25px] px-2 text-[10.5px] rounded-[7px]';

  return (
    <div
      className="relative w-full h-[45%] shrink-0 overflow-hidden rounded-t-[8px] sm:rounded-t-[10px]"
      style={{
        boxShadow: 'inset 0 0 12px rgba(0, 0, 0, 0.45)',
        borderBottom: `1.5px solid ${
          isShiny
            ? 'rgba(255, 255, 255, 0.65)'
            : tier.illustrationBorder || tier.borderColor || 'rgba(255,255,255,0.4)'
        }`,
      }}
    >
      {/* 1. Affichage de l'image ou du placeholder procédural TCG */}
      {hasValidImage ? (
        <div className="relative w-full h-full">
          <img
            src={card.image}
            alt={card.title}
            onError={onImgError}
            loading="lazy"
            className={`w-full h-full transition-transform duration-300 ${
              card.imageContain
                ? 'object-contain p-3 drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]'
                : 'object-cover'
            }`}
          />
          {/* Ombre interne prononcée pour donner de la profondeur d'encadrement */}
          <div
            className="absolute inset-0 pointer-events-none shadow-[inset_0_2px_8px_rgba(0,0,0,0.45),inset_0_-2px_6px_rgba(0,0,0,0.35)]"
          />
        </div>
      ) : (
        <CardPlaceholderGraphic
          tier={tier}
          isShiny={isShiny}
          sizeTier={sizeTier}
        />
      )}

      {/* 2. Éclat lumineux subtil sur le bord supérieur du cadre de l'image */}
      <div
        className="absolute inset-x-0 top-0 h-[1.5px] pointer-events-none z-10"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.75) 50%, transparent 100%)',
        }}
      />

      {/* 3. Badges en haut à gauche : Écusson / Gemme de Rareté + Badge Métal GIF */}
      <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-20 flex items-center gap-1 sm:gap-1.5">
        <CardRarityGem tier={tier} sizeTier={sizeTier} />

        {isShiny && (
          <div
            className={`wiki-shiny-badge ${shinyBadgeDimensions} inline-flex items-center gap-1 font-extrabold tracking-wider uppercase shadow-[0_2px_8px_rgba(0,0,0,0.45)] border border-[#cbd5e1]`}
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #475569 50%, #0f172a 100%)',
              color: '#f8fafc',
            }}
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
