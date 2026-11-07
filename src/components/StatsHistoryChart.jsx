/**
 * @file Rôle : Rendu SVG interactif de la courbe temporelle style Trade Republic avec repères d'abscisse, d'ordonnée et d'équilibre.
 * Dépendances : React, `../utils/statsHistory`.
 * Effets de bord : Événements de survol et touch (pointer move / leave).
 */

import React, { useRef, useMemo } from 'react';
import { computeChartPathAndBounds } from '../utils/statsHistory';

/**
 * Formate de façon compacte une valeur numérique pour les repères d'axe Y.
 * @param {number} val - Valeur à formater
 * @returns {string} Chaîne compacte
 */
function formatAxisValue(val) {
  if (typeof val !== 'number' || Number.isNaN(val)) return '0';
  const abs = Math.abs(val);
  if (abs >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(1).replace('.0', '')}M`;
  }
  if (abs >= 10_000) {
    return `${(val / 1_000).toFixed(1).replace('.0', '')}k`;
  }
  return new Intl.NumberFormat('fr-FR').format(Math.round(val));
}

/**
 * Formate un horodatage pour les repères d'axe X selon la période active.
 * @param {number} ts - Horodatage UNIX (ms)
 * @param {string} period - Période ('1J' | '1S' | '1M' | 'TOUT')
 * @returns {string} Date ou heure formatée
 */
function formatAxisTime(ts, period) {
  if (!ts) return '';
  const date = new Date(ts);
  if (period === '1J') {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

/**
 * Composant de tracé vectoriel SVG avec repère d'équilibre à 0, couleur dynamique et scrubbing interactif.
 * @param {Object} props
 * @param {Array<{value: number, timestamp: number}>} [props.points=[]] - Liste des points chronologiques
 * @param {boolean} [props.isNetMetric=false] - Indique si la métrique représente un bilan net
 * @param {'positive'|'negative'|'neutral'} [props.trendTone='neutral'] - Tonalité visuelle de la courbe
 * @param {string} [props.period='1M'] - Période sélectionnée pour le formatage de l'axe X
 * @param {number|null} [props.hoverIndex=null] - Index du point actuellement survolé
 * @param {function(number|null): void} props.onHoverIndexChange - Callback de changement d'index survolé
 * @param {number} [props.chartWidth=680] - Largeur du canevas SVG
 * @param {number} [props.chartHeight=240] - Hauteur du canevas SVG
 * @param {number} [props.paddingX=16] - Marge latérale interne
 * @param {number} [props.paddingTop=20] - Marge supérieure interne
 * @param {number} [props.paddingBottom=26] - Marge inférieure interne
 * @returns {JSX.Element} Rendu SVG interactif
 */
export default function StatsHistoryChart({
  points = [],
  isNetMetric = false,
  trendTone = 'neutral',
  period = '1M',
  hoverIndex = null,
  onHoverIndexChange,
  chartWidth = 680,
  chartHeight = 240,
  paddingX = 16,
  paddingTop = 20,
  paddingBottom = 26,
}) {
  const svgRef = useRef(null);

  const strokeColor =
    trendTone === 'positive'
      ? '#137a54'
      : trendTone === 'negative'
      ? '#b32424'
      : '#3366cc';

  const gradientId = `tradeRepublicGradient-${trendTone}`;

  const {
    pathD,
    areaD,
    plottedPoints,
    isNetOrNegative,
    zeroY,
    minY,
    maxY,
    dataMin,
    dataMax,
  } = useMemo(() => {
    return computeChartPathAndBounds(points, isNetMetric, {
      chartWidth,
      chartHeight,
      paddingX,
      paddingTop,
      paddingBottom,
    });
  }, [points, isNetMetric, chartWidth, chartHeight, paddingX, paddingTop, paddingBottom]);

  const handlePointerMove = (e) => {
    if (!svgRef.current || plottedPoints.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    if (clientX === undefined) return;

    const svgX = (clientX - rect.left) * (chartWidth / rect.width);
    let closestIdx = 0;
    let minDistance = Infinity;
    for (let idx = 0; idx < plottedPoints.length; idx++) {
      const dist = Math.abs(plottedPoints[idx].x - svgX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    }
    onHoverIndexChange?.(closestIdx);
  };

  const handlePointerLeave = () => {
    onHoverIndexChange?.(null);
  };

  const activeCoord =
    hoverIndex !== null && plottedPoints[hoverIndex]
      ? plottedPoints[hoverIndex]
      : plottedPoints[plottedPoints.length - 1] || null;

  const startPoint = points[0] || null;
  const midPoint = points.length > 2 ? points[Math.floor(points.length / 2)] : null;
  const endPoint = points.length > 1 ? points[points.length - 1] : null;

  return (
    <div
      className="relative px-3 sm:px-6 pt-2 pb-1 select-none"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-[215px] sm:h-[240px] overflow-visible cursor-crosshair touch-none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
            <stop offset="65%" stopColor={strokeColor} stopOpacity="0.07" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {isNetOrNegative ? (
          <>
            {/* Ligne 0 : Barre d'abscisse pleine et continue marquant l'équilibre */}
            <line
              x1={paddingX}
              y1={zeroY}
              x2={chartWidth - paddingX}
              y2={zeroY}
              stroke="currentColor"
              className="text-[#c8ccd1] dark:text-[#363e4a]"
              strokeWidth="1.2"
            />
            <text
              x={chartWidth - paddingX - 4}
              y={zeroY - 4}
              textAnchor="end"
              className="fill-[#72777d] dark:fill-[#8b949e] text-[10px] font-bold"
            >
              0
            </text>

            {/* Ligne Max (ATH) : Pointillés en haut */}
            {dataMax > 0 && Math.abs(maxY - zeroY) > 14 && (
              <>
                <line
                  x1={paddingX}
                  y1={maxY}
                  x2={chartWidth - paddingX}
                  y2={maxY}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  className="text-[#eaecf0] dark:text-[#282f3a]"
                  strokeWidth="1"
                />
                <text
                  x={chartWidth - paddingX - 4}
                  y={maxY - 4}
                  textAnchor="end"
                  className="fill-[#72777d] dark:fill-[#8b949e] text-[10px] font-semibold"
                >
                  +{formatAxisValue(dataMax)}
                </text>
              </>
            )}

            {/* Ligne Min (ATL) : Pointillés en bas */}
            {dataMin < 0 && Math.abs(minY - zeroY) > 14 && (
              <>
                <line
                  x1={paddingX}
                  y1={minY}
                  x2={chartWidth - paddingX}
                  y2={minY}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  className="text-[#eaecf0] dark:text-[#282f3a]"
                  strokeWidth="1"
                />
                <text
                  x={chartWidth - paddingX - 4}
                  y={minY + 11}
                  textAnchor="end"
                  className="fill-[#72777d] dark:fill-[#8b949e] text-[10px] font-semibold"
                >
                  {formatAxisValue(dataMin)}
                </text>
              </>
            )}
          </>
        ) : (
          <>
            <line
              x1={paddingX}
              y1={paddingTop}
              x2={chartWidth - paddingX}
              y2={paddingTop}
              stroke="currentColor"
              strokeDasharray="4 4"
              className="text-[#eaecf0] dark:text-[#282f3a]"
              strokeWidth="1"
            />
            <text
              x={chartWidth - paddingX - 4}
              y={paddingTop - 4}
              textAnchor="end"
              className="fill-[#72777d] dark:fill-[#8b949e] text-[10px] font-semibold"
            >
              {formatAxisValue(dataMax)}
            </text>

            <line
              x1={paddingX}
              y1={chartHeight / 2}
              x2={chartWidth - paddingX}
              y2={chartHeight / 2}
              stroke="currentColor"
              strokeDasharray="4 4"
              className="text-[#eaecf0] dark:text-[#282f3a]"
              strokeWidth="1"
            />

            <line
              x1={paddingX}
              y1={chartHeight - paddingBottom}
              x2={chartWidth - paddingX}
              y2={chartHeight - paddingBottom}
              stroke="currentColor"
              className="text-[#eaecf0] dark:text-[#282f3a]"
              strokeWidth="1"
            />
            {dataMin !== dataMax && (
              <text
                x={chartWidth - paddingX - 4}
                y={chartHeight - paddingBottom - 4}
                textAnchor="end"
                className="fill-[#72777d] dark:fill-[#8b949e] text-[10px] font-semibold"
              >
                {formatAxisValue(dataMin)}
              </text>
            )}
          </>
        )}

        {areaD && (
          <path
            d={areaD}
            fill={`url(#${gradientId})`}
            className="transition-all duration-300"
          />
        )}

        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {activeCoord && (
          <>
            <line
              x1={activeCoord.x}
              y1={paddingTop - 6}
              x2={activeCoord.x}
              y2={chartHeight - paddingBottom + 6}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeDasharray="3 3"
              className="opacity-75"
            />
            <circle
              cx={activeCoord.x}
              cy={activeCoord.y}
              r="5"
              fill={strokeColor}
              opacity="0.35"
              pointerEvents="none"
            >
              <animate
                attributeName="r"
                values="5;9.5;5"
                dur="1.8s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.4;0.06;0.4"
                dur="1.8s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx={activeCoord.x}
              cy={activeCoord.y}
              r="4.5"
              className="fill-white dark:fill-[#181d24]"
              stroke={strokeColor}
              strokeWidth="2.5"
              pointerEvents="none"
            />
          </>
        )}
      </svg>

      {/* Repères d'axe X (dates de début, milieu et fin de fenêtre) */}
      {startPoint && endPoint && (
        <div className="flex items-center justify-between px-1 text-[10.5px] font-medium text-[#72777d] dark:text-[#8b949e] -mt-1 mb-0.5">
          <span>{formatAxisTime(startPoint.timestamp, period)}</span>
          {midPoint && <span>{formatAxisTime(midPoint.timestamp, period)}</span>}
          <span>{formatAxisTime(endPoint.timestamp, period)}</span>
        </div>
      )}

      <div className="text-center text-[11px] text-[#72777d] dark:text-[#8b949e] py-0.5">
        Glissez votre curseur sur le graphique pour explorer l'historique
      </div>
    </div>
  );
}
