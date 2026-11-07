/**
 * @file Rôle : Motif décoratif SVG d'ondes guilloché et topographiques d'arrière-plan selon l'échelon de rareté.
 * Dépendances : React.
 * Effets de bord : Aucun (rendu SVG pur).
 */

import React from 'react';

/**
 * Composant de motif d'ondes fines guilloché et organiques d'arrière-plan pour une carte.
 * @param {Object} props
 * @param {'C'|'PC'|'R'|'SR'|'UR'|'L'|string} props.code - Code de rareté de la carte
 * @param {string} props.waveColor1 - Couleur de la première nappe d'ondes
 * @param {string} props.waveColor2 - Couleur de la seconde nappe d'ondes
 */
export default function RarityWavePattern({ code, waveColor1, waveColor2 }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none select-none opacity-80"
      viewBox="0 0 400 400"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {code === 'L' ? (
        /* Légendaire : Motif guilloché complexe avec rayons stellaires et courbures impériales */
        <g>
          <path
            d="M-20,60 C80,30 160,110 240,70 C320,30 360,10 420,40 L420,420 L-20,420 Z"
            fill={waveColor2}
            opacity="0.3"
          />
          <path
            d="M-20,130 C90,80 180,160 280,120 C360,80 390,140 430,120 L430,420 L-20,420 Z"
            fill={waveColor1}
            opacity="0.25"
          />
          {/* Ondulations guilloché fines style titre boursier / sceau impérial */}
          <path
            d="M-10,180 C80,140 160,220 250,180 C340,140 370,220 420,190"
            stroke={waveColor1}
            strokeWidth="1.8"
            fill="none"
            opacity="0.55"
          />
          <path
            d="M-10,195 C80,155 160,235 250,195 C340,155 370,235 420,205"
            stroke={waveColor2}
            strokeWidth="1.2"
            fill="none"
            opacity="0.45"
          />
          <path
            d="M-10,210 C80,170 160,250 250,210 C340,170 370,250 420,220"
            stroke={waveColor1}
            strokeWidth="1.2"
            fill="none"
            opacity="0.38"
          />
          <path
            d="M-10,225 C80,185 160,265 250,225 C340,185 370,265 420,235"
            stroke={waveColor2}
            strokeWidth="1"
            fill="none"
            opacity="0.3"
          />
          {/* Arcs d'ondes stellaires rayonnantes */}
          <circle
            cx="360"
            cy="60"
            r="120"
            stroke={waveColor1}
            strokeWidth="1.4"
            fill="none"
            opacity="0.4"
            strokeDasharray="4 3"
          />
          <circle
            cx="360"
            cy="60"
            r="160"
            stroke={waveColor2}
            strokeWidth="1"
            fill="none"
            opacity="0.3"
          />
          <circle
            cx="360"
            cy="60"
            r="200"
            stroke={waveColor1}
            strokeWidth="0.8"
            fill="none"
            opacity="0.22"
          />
        </g>
      ) : code === 'UR' || code === 'SR' ? (
        /* Super / Ultra Rare : Ondes d'énergie concentriques et faisceaux fins */
        <g>
          <path
            d="M-30,70 Q120,0 250,90 T430,70 L430,420 L-30,420 Z"
            fill={waveColor1}
            opacity="0.32"
          />
          <path
            d="M-30,170 Q130,110 260,190 T430,170 L430,420 L-30,420 Z"
            fill={waveColor2}
            opacity="0.22"
          />
          {/* Lignes d'ondes fines harmoniques */}
          <path
            d="M-20,130 Q120,60 250,150 T430,130"
            stroke={waveColor1}
            strokeWidth="1.6"
            fill="none"
            opacity="0.5"
          />
          <path
            d="M-20,145 Q120,75 250,165 T430,145"
            stroke={waveColor2}
            strokeWidth="1.2"
            fill="none"
            opacity="0.4"
          />
          <path
            d="M-20,160 Q120,90 250,180 T430,160"
            stroke={waveColor1}
            strokeWidth="1"
            fill="none"
            opacity="0.3"
          />
          {/* Cercles de résonance concentriques */}
          <circle
            cx="330"
            cy="90"
            r="90"
            stroke={waveColor1}
            strokeWidth="1.5"
            fill="none"
            opacity="0.35"
          />
          <circle
            cx="330"
            cy="90"
            r="130"
            stroke={waveColor2}
            strokeWidth="1.1"
            fill="none"
            opacity="0.28"
          />
          <circle
            cx="330"
            cy="90"
            r="170"
            stroke={waveColor1}
            strokeWidth="0.8"
            fill="none"
            opacity="0.2"
            strokeDasharray="6 4"
          />
        </g>
      ) : (
        /* Commune / Peu Commune / Rare : Lignes de niveau topographiques élégantes */
        <g>
          <path
            d="M-30,100 C80,50 200,140 430,70 L430,420 L-30,420 Z"
            fill={waveColor1}
            opacity="0.28"
          />
          <path
            d="M-30,200 C110,160 250,250 430,190 L430,420 L-30,420 Z"
            fill={waveColor2}
            opacity="0.18"
          />
          {/* Lignes topographiques fines */}
          <path
            d="M-20,125 C90,75 210,165 430,95"
            stroke={waveColor1}
            strokeWidth="1.4"
            fill="none"
            opacity="0.45"
          />
          <path
            d="M-20,140 C90,90 210,180 430,110"
            stroke={waveColor2}
            strokeWidth="1.1"
            fill="none"
            opacity="0.35"
          />
          <path
            d="M-20,155 C90,105 210,195 430,125"
            stroke={waveColor1}
            strokeWidth="0.8"
            fill="none"
            opacity="0.25"
          />
          <path
            d="M-20,230 C120,190 260,280 430,220"
            stroke={waveColor2}
            strokeWidth="1"
            fill="none"
            opacity="0.22"
          />
        </g>
      )}
    </svg>
  );
}
