/**
 * @file Rôle : Écusson / gemme biseauté TCG pour le badge de rareté avec dégradé métallique et gravure en relief.
 * Dépendances : React.
 * Effets de bord : Aucun (rendu visuel pur).
 */

import React from 'react';

/**
 * Écusson / gemme de rareté style TCG physique avec relief biseauté.
 * @param {Object} props
 * @param {Object} props.tier - Palier de rareté de la carte
 * @param {'small'|'medium'|'large'} props.sizeTier - Palier de dimension responsive de la carte
 */
export default function CardRarityGem({ tier, sizeTier }) {
  const gemDimensions =
    sizeTier === 'small'
      ? 'min-w-[22px] h-[19px] px-1 text-[10px] rounded-[5px]'
      : sizeTier === 'medium'
      ? 'min-w-[26px] h-[22px] px-1.5 text-[11px] rounded-[6px]'
      : 'min-w-[30px] h-[25px] px-2 text-[12px] rounded-[7px]';

  const isPrestige = tier.code === 'UR' || tier.code === 'L';

  return (
    <div
      className={`relative inline-flex items-center justify-center font-black tracking-wider uppercase select-none transition-transform duration-200 ${gemDimensions}`}
      style={{
        background:
          tier.gemBg ||
          'linear-gradient(135deg, #64748b 0%, #334155 50%, #0f172a 100%)',
        color: tier.gemText || '#ffffff',
        border: `1.2px solid ${tier.gemBorder || 'rgba(255,255,255,0.7)'}`,
        boxShadow: `
          inset 0 1px 1px rgba(255, 255, 255, 0.75),
          inset 0 -1.5px 2px rgba(0, 0, 0, 0.45),
          0 2px 6px rgba(0, 0, 0, 0.35),
          0 0 ${isPrestige ? '8px' : '4px'} ${tier.shadowColor || 'rgba(0,0,0,0.2)'}
        `,
        textShadow:
          tier.gemText === '#ffffff'
            ? '0 1px 2px rgba(0, 0, 0, 0.7), 0 0 2px rgba(0, 0, 0, 0.4)'
            : '0 1px 0 rgba(255, 255, 255, 0.6)',
      }}
      title={`${tier.name} (${tier.thresholdLabel})`}
    >
      {/* Reflet biseauté triangulaire supérieur */}
      <span
        className="absolute inset-x-0 top-0 h-[45%] pointer-events-none rounded-t-[inherit]"
        style={{
          background:
            'linear-gradient(180deg, rgba(255, 255, 255, 0.48) 0%, rgba(255, 255, 255, 0.05) 100%)',
        }}
      />
      <span className="relative z-10 leading-none">{tier.code}</span>
    </div>
  );
}
