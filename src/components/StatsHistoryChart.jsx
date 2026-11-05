/**
 * @file Rôle : Rendu SVG interactif de la courbe temporelle style Trade Republic avec repères d'abscisse et d'équilibre.
 * Dépendances : React, `../utils/statsHistory`.
 * Effets de bord : Événements de survol et touch (pointer move / leave).
 */

import React, { useRef, useMemo } from 'react';
import { computeChartPathAndBounds } from '../utils/statsHistory';

/**
 * Composant de tracé vectoriel SVG avec repère d'équilibre à 0 ₩ et scrubbing interactif.
 * @param {Object} props
 * @param {Array<{value: number, timestamp: number}>} [props.points=[]] - Liste des points chronologiques
 * @param {boolean} [props.isNetMetric=false] - Indique si la métrique représente un bilan net
 * @param {number|null} [props.hoverIndex=null] - Index du point actuellement survolé
 * @param {function(number|null): void} props.onHoverIndexChange - Callback de changement d'index survolé
 * @returns {JSX.Element} Rendu SVG interactif
 */
export default function StatsHistoryChart({
  points = [],
  isNetMetric = false,
  hoverIndex = null,
  onHoverIndexChange,
  chartWidth = 680,
  chartHeight = 240,
  paddingX = 16,
  paddingTop = 20,
  paddingBottom = 26,
}) {
  const svgRef = useRef(null);

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

  return (
    <div
      className="relative px-3 sm:px-6 pt-2 pb-1 select-none"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-[220px] sm:h-[250px] overflow-visible cursor-crosshair touch-none"
      >
        <defs>
          <linearGradient id="tradeRepublicGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3366cc" stopOpacity="0.32" />
            <stop offset="65%" stopColor="#3366cc" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#3366cc" stopOpacity="0.00" />
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
              className="text-[#eaecf0] dark:text-[#282f3a]"
              strokeWidth="1"
            />
            {/* Ligne Max (ATH) : Pointillés en haut */}
            {dataMax > 0 && (
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
            )}
            {/* Ligne Min (ATL) : Pointillés en bas */}
            {dataMin < 0 && (
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
          </>
        )}

        {areaD && (
          <path
            d={areaD}
            fill="url(#tradeRepublicGradient)"
            className="transition-all duration-300"
          />
        )}

        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#3366cc"
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
              stroke="#3366cc"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              className="opacity-75"
            />
            <circle
              cx={activeCoord.x}
              cy={activeCoord.y}
              r="5"
              fill="#3366cc"
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
              className="fill-white dark:fill-[#181d24] stroke-[#3366cc]"
              strokeWidth="2.5"
              pointerEvents="none"
            />
          </>
        )}
      </svg>

      <div className="text-center text-[11px] text-[#72777d] dark:text-[#8b949e] py-0.5">
        Glissez votre curseur sur le graphique pour explorer l'historique
      </div>
    </div>
  );
}
