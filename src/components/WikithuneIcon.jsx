import React from 'react';

/**
 * Icône officielle de la monnaie "Wikifeet" :
 * Un "W" dans l'esprit typographique de Wikipédia traversé par deux barres monétaires (façon € / ₩ / $).
 */
export default function WikithuneIcon({ className = 'w-4 h-4', style }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 select-none ${className}`}
      style={style}
      aria-label="Wikifeet"
    >
      {/* Empattements supérieurs du W (style Linux Libertine / Wikipédia) */}
      <path
        d="M2.2 4.5H6.2M9.8 4.5H14.2M17.8 4.5H21.8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      {/* Corps du W */}
      <path
        d="M3.8 4.5L7.6 19.5L12 8.2L16.4 19.5L20.2 4.5"
        stroke="currentColor"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Deux barres monétaires horizontales (façon € / ₩) */}
      <path
        d="M1.8 10.2H22.2M1.8 14.2H22.2"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
    </svg>
  );
}
