/**
 * @file Rôle : Illustration procédurale prestigieuse pour les cartes Wikipédia sans image d'illustration.
 * Dépendances : React.
 * Effets de bord : Aucun (rendu SVG et visuel pur).
 */

import React from 'react';

/**
 * Palettes radiales profondes d'illustration pour cartes sans photo par rareté.
 */
const PLACEHOLDER_BACKGROUNDS = {
  C: 'radial-gradient(circle at 50% 45%, #0f513d 0%, #093729 60%, #04241a 100%)',
  PC: 'radial-gradient(circle at 50% 45%, #1d4ed8 0%, #1e3a8a 60%, #0f172a 100%)',
  R: 'radial-gradient(circle at 50% 45%, #6b21a8 0%, #4c1d95 60%, #1e1035 100%)',
  SR: 'radial-gradient(circle at 50% 45%, #9d174d 0%, #701a3c 60%, #31071c 100%)',
  UR: 'radial-gradient(circle at 50% 45%, #b45309 0%, #78350f 60%, #3a1503 100%)',
  L: 'radial-gradient(circle at 50% 45%, #92400e 0%, #611818 55%, #300606 100%)',
};

const MEDALLION_BORDERS = {
  C: 'linear-gradient(135deg, #6ee7b7 0%, #10b981 50%, #047857 100%)',
  PC: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%)',
  R: 'linear-gradient(135deg, #d8b4fe 0%, #a855f7 50%, #6b21a8 100%)',
  SR: 'linear-gradient(135deg, #fbcfe8 0%, #ec4899 50%, #9d174d 100%)',
  UR: 'linear-gradient(135deg, #fef08a 0%, #f59e0b 50%, #b45309 100%)',
  L: 'linear-gradient(135deg, #fef08a 0%, #ef4444 40%, #b91c1c 80%, #7f1d1d 100%)',
};

/**
 * Illustration procédurale style TCG pour articles sans illustration principale.
 * @param {Object} props
 * @param {Object} props.tier - Palier de rareté de la carte
 * @param {boolean} [props.isShiny=false] - Indique si la carte possède la finition Métal GIF
 * @param {'small'|'medium'|'large'} props.sizeTier - Palier responsive
 */
export default function CardPlaceholderGraphic({ tier, isShiny = false, sizeTier }) {
  const code = tier.code || 'C';
  const bgStyle = isShiny
    ? 'radial-gradient(circle at 50% 45%, #475569 0%, #334155 60%, #0f172a 100%)'
    : PLACEHOLDER_BACKGROUNDS[code] || PLACEHOLDER_BACKGROUNDS.C;

  const medallionBorder = isShiny
    ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 50%, #475569 100%)'
    : MEDALLION_BORDERS[code] || MEDALLION_BORDERS.C;

  const medallionSize =
    sizeTier === 'small' ? 'w-14 h-14' : sizeTier === 'medium' ? 'w-18 h-18' : 'w-22 h-22';
  const logoSize =
    sizeTier === 'small' ? 'w-8 h-8' : sizeTier === 'medium' ? 'w-10 h-10' : 'w-12 h-12';

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: bgStyle }}
    >
      {/* Rosace géométrique et cercles guilloché en arrière-plan */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
        viewBox="0 0 300 240"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <circle cx="150" cy="120" r="110" stroke="#ffffff" strokeWidth="1" fill="none" opacity="0.3" strokeDasharray="3 3" />
        <circle cx="150" cy="120" r="88" stroke="#ffffff" strokeWidth="1.2" fill="none" opacity="0.45" />
        <circle cx="150" cy="120" r="66" stroke="#ffffff" strokeWidth="0.8" fill="none" opacity="0.35" strokeDasharray="6 3" />
        <circle cx="150" cy="120" r="44" stroke="#ffffff" strokeWidth="1" fill="none" opacity="0.4" />
        {/* Rayons de la boussole encyclopédique */}
        <line x1="150" y1="10" x2="150" y2="230" stroke="#ffffff" strokeWidth="0.8" opacity="0.35" />
        <line x1="40" y1="120" x2="260" y2="120" stroke="#ffffff" strokeWidth="0.8" opacity="0.35" />
        <line x1="72" y1="42" x2="228" y2="198" stroke="#ffffff" strokeWidth="0.6" opacity="0.25" strokeDasharray="4 4" />
        <line x1="72" y1="198" x2="228" y2="42" stroke="#ffffff" strokeWidth="0.6" opacity="0.25" strokeDasharray="4 4" />
      </svg>

      {/* Médaillon central biseauté TCG */}
      <div
        className={`relative z-10 ${medallionSize} rounded-full p-[2.5px] flex items-center justify-center shadow-[0_6px_20px_rgba(0,0,0,0.55)] transition-transform duration-300`}
        style={{ background: medallionBorder }}
      >
        <div className="w-full h-full rounded-full bg-black/55 backdrop-blur-xs flex flex-col items-center justify-center relative overflow-hidden border border-black/40 shadow-inner">
          {/* Reflet lumineux supérieur sur le verre du médaillon */}
          <span
            className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-full"
            style={{
              background:
                'linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 100%)',
            }}
          />
          <img
            src="https://fr.wikipedia.org/static/images/icons/wikipedia.png"
            alt="Logo Wikipédia"
            className={`${logoSize} object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)] relative z-10 transition-transform duration-200`}
          />
        </div>
      </div>

      {/* Titre discret de prestige au bas du placeholder */}
      {sizeTier !== 'small' && (
        <span
          className="relative z-10 mt-2 text-[9px] font-extrabold uppercase tracking-[0.2em] text-white/60 drop-shadow-sm font-sans"
        >
          Wikipédia • Archive
        </span>
      )}
    </div>
  );
}
