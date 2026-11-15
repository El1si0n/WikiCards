/**
 * @file Rôle : Ornements visuels statiques des sachets de booster (rayons de soleil, flocons, lauriers, pétales).
 * Dépendances : React.
 * Effets de bord : Aucun (rendu SVG purement décoratif, non interactif).
 */

import React from 'react';

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
 * Ornement statique centré sur le médaillon du globe Wikipédia (peint sous le médaillon).
 * @param {Object} props
 * @param {string} props.visualKey - Thème visuel du sachet (`summer`, `iconic`, `spring`...)
 */
export function PackMedallionDecoration({ visualKey }) {
  const boxStyle = {
    width: MEDALLION_DECOR_SIZE,
    height: MEDALLION_DECOR_SIZE,
    left: '50%',
    top: '50%',
    marginLeft: -CENTER,
    marginTop: -CENTER,
  };
  const viewBox = `0 0 ${MEDALLION_DECOR_SIZE} ${MEDALLION_DECOR_SIZE}`;

  if (visualKey === 'summer') {
    return (
      <svg
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={boxStyle}
        viewBox={viewBox}
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
      </svg>
    );
  }

  if (visualKey === 'iconic') {
    const laurelGreen = '#3f9a4f';
    const branch = (
      <g>
        <path
          d={LAUREL_BRANCH.stem}
          fill="none"
          stroke={laurelGreen}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {LAUREL_BRANCH.leaves.map((leaf, idx) => (
          <path
            key={idx}
            d={leafPath(leaf.length)}
            transform={`translate(${leaf.x.toFixed(1)} ${leaf.y.toFixed(1)}) rotate(${leaf.angle.toFixed(1)})`}
            fill={laurelGreen}
          />
        ))}
      </g>
    );
    return (
      <svg
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={boxStyle}
        viewBox={viewBox}
      >
        {branch}
        <g transform={`translate(${MEDALLION_DECOR_SIZE} 0) scale(-1 1)`}>{branch}</g>
      </svg>
    );
  }

  if (visualKey === 'spring') {
    // Corolle fine : 12 pétales effilés + 12 pétales plus courts intercalés, teintes pastel unies
    const mainPetals = Array.from({ length: 12 }, (_, i) => i * 30);
    const innerPetals = mainPetals.map((deg) => deg + 15);
    const petal = (baseR, tipR, halfWidth) =>
      `M${CENTER},${CENTER - baseR} C${CENTER - halfWidth},${CENTER - baseR - 9} ${CENTER - halfWidth * 0.8},${CENTER - tipR + 7} ${CENTER},${CENTER - tipR} C${CENTER + halfWidth * 0.8},${CENTER - tipR + 7} ${CENTER + halfWidth},${CENTER - baseR - 9} ${CENTER},${CENTER - baseR} Z`;
    return (
      <svg
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={boxStyle}
        viewBox={viewBox}
      >
        {innerPetals.map((deg) => (
          <path
            key={`in-${deg}`}
            d={petal(70, 92, 8)}
            fill="#fbcfe8"
            opacity="0.85"
            transform={`rotate(${deg} ${CENTER} ${CENTER})`}
          />
        ))}
        {mainPetals.map((deg) => (
          <path
            key={`main-${deg}`}
            d={petal(70, 104, 10)}
            fill="#f9a8d4"
            opacity="0.9"
            transform={`rotate(${deg} ${CENTER} ${CENTER})`}
          />
        ))}
      </svg>
    );
  }

  return null;
}

/**
 * Motifs statiques répartis sur le corps du sachet (flocons de Noël, étoiles mystiques d'Halloween).
 * @param {Object} props
 * @param {string} props.visualKey - Thème visuel du sachet
 */
export function PackBodyDecoration({ visualKey }) {
  if (visualKey === 'christmas') {
    const flakes = [
      { top: '17%', right: '5%', size: 42 },
      { top: '60%', left: '4%', size: 46 },
      { top: '14%', left: '13%', size: 16 },
      { top: '42%', left: '9%', size: 20 },
      { top: '48%', right: '10%', size: 18 },
      { top: '70%', right: '13%', size: 22 },
      { top: '33%', right: '22%', size: 12 },
    ];
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {flakes.map((flake, idx) => (
          <div
            key={idx}
            className="absolute"
            style={{
              top: flake.top,
              left: flake.left,
              right: flake.right,
              opacity: 0.85,
              filter: 'drop-shadow(0 0 5px rgba(224, 242, 254, 0.8))',
            }}
          >
            <Snowflake size={flake.size} color="#e0f2fe" />
          </div>
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

  return null;
}
