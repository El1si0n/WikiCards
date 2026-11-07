/**
 * @file Rôle : Badge de rareté sobre et angulaire style Édition / Wikipédia en haut à gauche de la carte.
 * Dépendances : React.
 * Effets de bord : Aucun (rendu visuel pur).
 */

import React from 'react';

/**
 * Badge de rareté plat et angulaire fidèle à l'esthétique Wikipédia.
 * @param {Object} props
 * @param {Object} props.tier - Palier de rareté de la carte
 * @param {'small'|'medium'|'large'} props.sizeTier - Palier de dimension responsive de la carte
 */
export default function CardRarityGem({ tier, sizeTier }) {
  const badgeDimensions =
    sizeTier === 'small'
      ? 'min-w-[20px] h-[17px] px-1.5 text-[9.5px] rounded-[2px]'
      : sizeTier === 'medium'
      ? 'min-w-[24px] h-[19px] px-1.5 text-[10.5px] rounded-[3px]'
      : 'min-w-[28px] h-[22px] px-2 text-[11.5px] rounded-[3px]';

  return (
    <div
      className={`inline-flex items-center justify-center font-extrabold tracking-wide select-none shadow-[0_1px_4px_rgba(0,0,0,0.22)] ${badgeDimensions}`}
      style={{
        backgroundColor: tier.badgeBg,
        color: tier.badgeText,
        border: `1px solid ${tier.borderColor || 'rgba(0, 0, 0, 0.18)'}`,
      }}
      title={`${tier.name} (${tier.thresholdLabel})`}
    >
      <span className="leading-none">{tier.code}</span>
    </div>
  );
}
