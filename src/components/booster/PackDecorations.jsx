/**
 * @file Rôle : Ornements visuels thématiques des sachets de booster (rayons de soleil, ruban, flocons, lauriers, pétales).
 * Dépendances : React, `framer-motion`.
 * Effets de bord : Aucun (rendu SVG purement décoratif, non interactif).
 */

import React from 'react';
import { motion } from 'framer-motion';

/** Taille (px) de la zone d'ornement centrée sur le médaillon du globe. */
const MEDALLION_DECOR_SIZE = 260;
const CENTER = MEDALLION_DECOR_SIZE / 2;

/**
 * Construit les polygones des rayons de soleil autour du médaillon (alternance longs / courts).
 * @param {number} count - Nombre total de rayons
 * @returns {Array<{points: string, isLong: boolean}>} Liste des rayons SVG
 */
const buildSunRays = (count) =>
  Array.from({ length: count }, (_, i) => {
    const isLong = i % 2 === 0;
    const angle = (i / count) * Math.PI * 2;
    const halfWidth = (isLong ? 6.5 : 4.5) * (Math.PI / 180);
    const innerR = 76;
    const outerR = isLong ? 124 : 104;
    const p = (r, a) =>
      `${(CENTER + r * Math.cos(a)).toFixed(1)},${(CENTER + r * Math.sin(a)).toFixed(1)}`;
    return {
      points: `${p(innerR, angle - halfWidth)} ${p(outerR, angle)} ${p(innerR, angle + halfWidth)}`,
      isLong,
    };
  });

/**
 * Construit les feuilles d'une branche de laurier épousant le bord gauche du médaillon.
 * @returns {{stem: string, leaves: Array<{x: number, y: number, angle: number, length: number}>}} Tige et feuilles
 */
const buildLaurelBranch = () => {
  const radius = 92;
  const startDeg = 102;
  const endDeg = 238;
  const toPoint = (deg) => {
    const a = (deg * Math.PI) / 180;
    return { x: CENTER + radius * Math.cos(a), y: CENTER + radius * Math.sin(a) };
  };
  const start = toPoint(startDeg);
  const end = toPoint(endDeg);
  const stem = `M${start.x.toFixed(1)},${start.y.toFixed(1)} A${radius},${radius} 0 0 1 ${end.x.toFixed(1)},${end.y.toFixed(1)}`;

  const leaves = [];
  const steps = 7;
  const spread = 38 * (Math.PI / 180);
  for (let i = 0; i <= steps; i += 1) {
    const deg = startDeg + ((endDeg - startDeg) * i) / steps;
    const a = (deg * Math.PI) / 180;
    const { x, y } = toPoint(deg);
    // Tangente dans le sens de pousse (du bas vers le haut) et normale extérieure
    const tx = -Math.sin(a);
    const ty = Math.cos(a);
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    const length = 24 - i * 1.4;
    [1, -1].forEach((side) => {
      const dx = tx * Math.cos(spread) + side * nx * Math.sin(spread);
      const dy = ty * Math.cos(spread) + side * ny * Math.sin(spread);
      leaves.push({ x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI, length });
    });
  }
  // Feuille terminale dans l'axe de la tige
  const endA = (endDeg * Math.PI) / 180;
  leaves.push({
    x: end.x,
    y: end.y,
    angle: (Math.atan2(Math.cos(endA), -Math.sin(endA)) * 180) / Math.PI,
    length: 18,
  });
  return { stem, leaves };
};

const SUN_RAYS = buildSunRays(20);
const LAUREL_BRANCH = buildLaurelBranch();

/**
 * Chemin SVG d'une feuille effilée orientée selon l'axe +X.
 * @param {number} length - Longueur de la feuille
 * @returns {string} Attribut `d` du chemin
 */
const leafPath = (length) => {
  const w = length * 0.3;
  return `M0,0 C${length * 0.3},${-w} ${length * 0.75},${-w} ${length},0 C${length * 0.75},${w} ${length * 0.3},${w} 0,0 Z`;
};

/**
 * Flocon de neige vectoriel à 6 branches.
 * @param {Object} props
 * @param {number} props.size - Taille en pixels
 * @param {string} [props.color='#bae6fd'] - Couleur du trait
 */
function Snowflake({ size, color = '#bae6fd' }) {
  return (
    <svg width={size} height={size} viewBox="-20 -20 40 40" aria-hidden="true">
      <g
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {[0, 60, 120].map((deg) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <line x1="0" y1="-18" x2="0" y2="18" />
            {[-1, 1].map((dir) => (
              <g key={dir} transform={`scale(1, ${dir})`}>
                <polyline points="-5,-15 0,-10 5,-15" />
                <polyline points="-4,-7 0,-3.5 4,-7" />
              </g>
            ))}
          </g>
        ))}
      </g>
    </svg>
  );
}

/**
 * Ornement centré sur le médaillon du globe Wikipédia.
 * La couche `back` est peinte sous le médaillon, la couche `front` par-dessus.
 * @param {Object} props
 * @param {string} props.visualKey - Thème visuel du sachet (`summer`, `christmas`, `iconic`, `spring`...)
 * @param {'back'|'front'} props.layer - Couche de rendu par rapport au médaillon
 */
export function PackMedallionDecoration({ visualKey, layer }) {
  const boxStyle = {
    width: MEDALLION_DECOR_SIZE,
    height: MEDALLION_DECOR_SIZE,
    left: '50%',
    top: '50%',
    marginLeft: -CENTER,
    marginTop: -CENTER,
  };

  if (layer === 'back' && visualKey === 'summer') {
    return (
      <motion.svg
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={boxStyle}
        viewBox={`0 0 ${MEDALLION_DECOR_SIZE} ${MEDALLION_DECOR_SIZE}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, ease: 'linear', repeat: Infinity }}
      >
        <defs>
          <radialGradient id="pack-sun-ray" cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
        </defs>
        <circle cx={CENTER} cy={CENTER} r="84" fill="rgba(253, 224, 71, 0.35)" />
        {SUN_RAYS.map((ray, idx) => (
          <polygon
            key={idx}
            points={ray.points}
            fill="url(#pack-sun-ray)"
            opacity={ray.isLong ? 0.95 : 0.75}
            style={{ filter: 'drop-shadow(0 0 3px rgba(245, 158, 11, 0.45))' }}
          />
        ))}
      </motion.svg>
    );
  }

  if (layer === 'back' && visualKey === 'iconic') {
    const branch = (
      <g>
        <path
          d={LAUREL_BRANCH.stem}
          fill="none"
          stroke="#9a6b05"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {LAUREL_BRANCH.leaves.map((leaf, idx) => (
          <path
            key={idx}
            d={leafPath(leaf.length)}
            transform={`translate(${leaf.x.toFixed(1)} ${leaf.y.toFixed(1)}) rotate(${leaf.angle.toFixed(1)})`}
            fill="url(#pack-laurel-leaf)"
            stroke="#14532d"
            strokeWidth="0.7"
          />
        ))}
      </g>
    );
    return (
      <svg
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{ ...boxStyle, filter: 'drop-shadow(0 2px 3px rgba(110, 79, 0, 0.25))' }}
        viewBox={`0 0 ${MEDALLION_DECOR_SIZE} ${MEDALLION_DECOR_SIZE}`}
      >
        <defs>
          <linearGradient id="pack-laurel-leaf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="55%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>
        </defs>
        {branch}
        <g transform={`translate(${MEDALLION_DECOR_SIZE} 0) scale(-1 1)`}>{branch}</g>
      </svg>
    );
  }

  if (layer === 'back' && visualKey === 'spring') {
    const outerPetals = Array.from({ length: 8 }, (_, i) => i * 45);
    const innerPetals = outerPetals.map((deg) => deg + 22.5);
    return (
      <svg
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{ ...boxStyle, filter: 'drop-shadow(0 3px 5px rgba(219, 39, 119, 0.22))' }}
        viewBox={`0 0 ${MEDALLION_DECOR_SIZE} ${MEDALLION_DECOR_SIZE}`}
      >
        <defs>
          <radialGradient id="pack-petal-outer" cx="50%" cy="80%" r="75%">
            <stop offset="0%" stopColor="#fdf2f8" />
            <stop offset="60%" stopColor="#f9a8d4" />
            <stop offset="100%" stopColor="#ec4899" />
          </radialGradient>
          <radialGradient id="pack-petal-inner" cx="50%" cy="80%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#fbcfe8" />
          </radialGradient>
        </defs>
        {innerPetals.map((deg) => (
          <ellipse
            key={`in-${deg}`}
            cx={CENTER}
            cy={CENTER - 84}
            rx="17"
            ry="24"
            fill="url(#pack-petal-inner)"
            stroke="#f9a8d4"
            strokeWidth="0.8"
            transform={`rotate(${deg} ${CENTER} ${CENTER})`}
          />
        ))}
        {outerPetals.map((deg) => (
          <ellipse
            key={`out-${deg}`}
            cx={CENTER}
            cy={CENTER - 90}
            rx="24"
            ry="30"
            fill="url(#pack-petal-outer)"
            stroke="#db2777"
            strokeOpacity="0.45"
            strokeWidth="0.9"
            transform={`rotate(${deg} ${CENTER} ${CENTER})`}
          />
        ))}
      </svg>
    );
  }

  if (layer === 'front' && visualKey === 'christmas') {
    return (
      <svg
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          width: 124,
          height: 94,
          left: '50%',
          top: -30,
          marginLeft: -62,
          filter: 'drop-shadow(0 4px 6px rgba(20, 83, 45, 0.45))',
        }}
        viewBox="0 0 120 92"
      >
        <defs>
          <linearGradient id="pack-ribbon" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>
        </defs>
        {/* Rubans pendants */}
        <path d="M56,44 L36,86 L45,82 L49,91 L62,47 Z" fill="url(#pack-ribbon)" stroke="#fde047" strokeWidth="1" />
        <path d="M64,44 L84,86 L75,82 L71,91 L58,47 Z" fill="url(#pack-ribbon)" stroke="#fde047" strokeWidth="1" />
        {/* Boucles du nœud */}
        <path d="M60,40 C42,6 6,8 10,32 C13,52 42,52 60,40 Z" fill="url(#pack-ribbon)" stroke="#fde047" strokeWidth="1.2" />
        <path d="M60,40 C78,6 114,8 110,32 C107,52 78,52 60,40 Z" fill="url(#pack-ribbon)" stroke="#fde047" strokeWidth="1.2" />
        <path d="M54,38 C42,20 22,18 20,30" fill="none" stroke="#86efac" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
        <path d="M66,38 C78,20 98,18 100,30" fill="none" stroke="#86efac" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
        {/* Nœud central */}
        <ellipse cx="60" cy="41" rx="10" ry="9" fill="#15803d" stroke="#fde047" strokeWidth="1.2" />
        <ellipse cx="57" cy="38" rx="3.5" ry="2.5" fill="#bbf7d0" opacity="0.7" />
      </svg>
    );
  }

  return null;
}

/**
 * Motifs répartis sur tout le corps du sachet (flocons, étoiles mystiques, fleurs et feuilles).
 * @param {Object} props
 * @param {string} props.visualKey - Thème visuel du sachet
 */
export function PackBodyDecoration({ visualKey }) {
  if (visualKey === 'christmas') {
    const flakes = [
      { top: '17%', right: '5%', size: 42, spin: 1 },
      { top: '60%', left: '4%', size: 46, spin: -1 },
      { top: '14%', left: '13%', size: 16 },
      { top: '42%', left: '9%', size: 20 },
      { top: '48%', right: '10%', size: 18 },
      { top: '70%', right: '13%', size: 22 },
      { top: '33%', right: '22%', size: 12 },
    ];
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {flakes.map((flake, idx) => (
          <motion.div
            key={idx}
            className="absolute"
            style={{
              top: flake.top,
              left: flake.left,
              right: flake.right,
              opacity: flake.spin ? 0.95 : 0.75,
              filter: 'drop-shadow(0 0 5px rgba(186, 230, 253, 0.85))',
            }}
            animate={flake.spin ? { rotate: 360 * flake.spin } : undefined}
            transition={
              flake.spin ? { duration: 24, ease: 'linear', repeat: Infinity } : undefined
            }
          >
            <Snowflake size={flake.size} color={flake.spin ? '#7dd3fc' : '#e0f2fe'} />
          </motion.div>
        ))}
      </div>
    );
  }

  if (visualKey === 'halloween') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-75">
        {[
          { top: '16%', left: '15%', size: '12px', color: '#fb923c' },
          { top: '24%', right: '14%', size: '14px', color: '#c084fc' },
          { top: '54%', left: '13%', size: '13px', color: '#c084fc' },
          { top: '60%', right: '14%', size: '12px', color: '#fb923c' },
          { top: '75%', left: '18%', size: '11px', color: '#fb923c' },
          { top: '73%', right: '18%', size: '13px', color: '#c084fc' },
        ].map((spark, idx) => (
          <span
            key={idx}
            className="absolute select-none"
            style={{
              top: spark.top,
              left: spark.left,
              right: spark.right,
              fontSize: spark.size,
              color: spark.color,
              textShadow: `0 0 8px ${spark.color}`,
            }}
          >
            ✦
          </span>
        ))}
      </div>
    );
  }

  if (visualKey === 'spring') {
    const leaves = [
      { top: '15%', right: '9%', rotate: -60 },
      { top: '72%', left: '8%', rotate: 130 },
    ];
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { top: '14%', left: '13%', size: '13px', color: '#f472b6' },
          { top: '66%', right: '11%', size: '13px', color: '#f472b6' },
        ].map((petal, idx) => (
          <span
            key={idx}
            className="absolute select-none opacity-70"
            style={{
              top: petal.top,
              left: petal.left,
              right: petal.right,
              fontSize: petal.size,
              color: petal.color,
            }}
          >
            ❀
          </span>
        ))}
        {leaves.map((leaf, idx) => (
          <svg
            key={`leaf-${idx}`}
            className="absolute"
            width="34"
            height="34"
            viewBox="-17 -17 34 34"
            style={{
              top: leaf.top,
              left: leaf.left,
              right: leaf.right,
              transform: `rotate(${leaf.rotate}deg)`,
              filter: 'drop-shadow(0 2px 2px rgba(5, 150, 105, 0.25))',
            }}
            aria-hidden="true"
          >
            <path
              d="M-14,0 C-8,-10 8,-10 14,0 C8,10 -8,10 -14,0 Z"
              fill="#6ee7b7"
              stroke="#059669"
              strokeWidth="1.2"
            />
            <path d="M-12,0 L12,0" stroke="#059669" strokeWidth="1" strokeLinecap="round" />
          </svg>
        ))}
      </div>
    );
  }

  return null;
}
