/**
 * @file Rôle : Motif décoratif SVG d'ondes organiques et topographiques d'arrière-plan selon l'échelon de rareté.
 * Dépendances : React.
 * Effets de bord : Aucun (rendu SVG pur).
 */

import React from 'react';

/**
 * Composant de motif d'ondes organiques d'arrière-plan pour une carte.
 * @param {Object} props
 * @param {'C'|'PC'|'R'|'SR'|'UR'|'L'|string} props.code - Code de rareté de la carte
 * @param {string} props.waveColor1 - Couleur de la première nappe d'ondes
 * @param {string} props.waveColor2 - Couleur de la seconde nappe d'ondes
 */
export default function RarityWavePattern({ code, waveColor1, waveColor2 }) {
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
