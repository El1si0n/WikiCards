import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  BookOpen,
  Coins,
  Package,
  Crown,
  Sparkles,
  Flame,
  HelpCircle,
} from 'lucide-react';
import WikithuneIcon from './WikithuneIcon';
import { generateMetricTimeSeries } from '../utils/statsHistory';

const METRIC_DEFINITIONS = {
  collectionValue: {
    title: 'Valeur du classeur',
    unit: ' ₩',
    isCurrency: true,
    description: 'Estimation de la valeur marchande totale du classeur au cours du temps.',
    icon: Coins,
  },
  wikithunes: {
    title: 'Solde actuel',
    unit: ' ₩',
    isCurrency: true,
    description: 'Évolution des liquidités en Wikithunes en banque.',
    icon: Coins,
  },
  uniqueCardsCount: {
    title: 'Articles uniques',
    unit: ' articles',
    isCurrency: false,
    description: 'Progression de la diversité de pages Wikipédia découvertes.',
    icon: Layers,
  },
  totalCardsCount: {
    title: 'Total de cartes',
    unit: ' cartes',
    isCurrency: false,
    description: 'Volume total de cartes et doublons possédés.',
    icon: Layers,
  },
  boostersOpened: {
    title: 'Boosters ouverts',
    unit: ' boosters',
    isCurrency: false,
    description: 'Cumul des paquets de cartes ouverts depuis vos débuts.',
    icon: Package,
  },
  legendaryCount: {
    title: 'Légendaires (L)',
    unit: ' cartes',
    isCurrency: false,
    description: 'Nombre de cartes Légendaires possédées dans le classeur.',
    icon: Crown,
  },
  ultraRareCount: {
    title: 'Ultra Rares (UR)',
    unit: ' cartes',
    isCurrency: false,
    description: 'Nombre de cartes Ultra Rares possédées dans le classeur.',
    icon: Sparkles,
  },
  gifCount: {
    title: 'Cartes GIF (Métal)',
    unit: ' cartes',
    isCurrency: false,
    description: 'Nombre de cartes animées et holographiques dans la collection.',
    icon: Sparkles,
  },
  netCasinoBilan: {
    title: 'Bilan Casino (Net)',
    unit: ' ₩',
    isCurrency: true,
    description: 'Solde net cumulé du jeu Plus ou Moins (Gains nets empochés − Mises perdues).',
    icon: Coins,
  },
  netCardsBilan: {
    title: 'Bilan Cartes (Net)',
    unit: ' cartes',
    isCurrency: false,
    description: 'Bilan net des cartes au jeu (Cartes gagnées lors des upgrades et quitte ou double − Cartes perdues).',
    icon: Layers,
  },
  totalCardsDrawn: {
    title: 'Cartes tirées au total',
    unit: ' cartes',
    isCurrency: false,
    description: 'Cumul total de toutes les cartes piochées dans l’histoire du compte (Volume exploré).',
    icon: BookOpen,
  },
  recordStreak: {
    title: 'Série record',
    unit: ' victoires',
    isCurrency: false,
    description: 'Plus longue série ininterrompue de bonnes réponses au jeu Plus ou Moins.',
    icon: Flame,
  },
  lostMoneyCasino: {
    title: 'Argent perdu au jeu',
    unit: ' ₩',
    isCurrency: true,
    description: 'Cumul des mises perdues au Plus ou Moins et des % d’upgrades échouées.',
    icon: TrendingDown,
  },
  netCasinoGains: {
    title: 'Gains casino (Gain net)',
    unit: ' ₩',
    isCurrency: true,
    description: 'Bénéfices réels nets empochés lors des victoires au Plus ou Moins.',
    icon: Flame,
  },
  lostCards: {
    title: 'Cartes perdues',
    unit: ' cartes',
    isCurrency: false,
    description: 'Cartes détruites lors des échecs d’upgrades et de quitte ou double.',
    icon: TrendingDown,
  },
  wonCards: {
    title: 'Cartes gagnées',
    unit: ' cartes',
    isCurrency: false,
    description: 'Cartes remportées lors des upgrades et du quitte ou double.',
    icon: TrendingUp,
  },
};

const PERIODS = [
  { id: '1J', label: '1J' },
  { id: '1S', label: '1S' },
  { id: '1M', label: '1M' },
  { id: 'TOUT', label: 'TOUT' },
];

export default function StatsHistoryModal({
  isOpen,
  onClose,
  metricId = 'collectionValue',
  collection = [],
  stats = {},
  wikithunes = 0,
  collectionValue = null,
  playerName = 'Mocobanks',
  isLocalUser = false,
  createdAt = null,
  snapshots = undefined,
}) {
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);

  const def = METRIC_DEFINITIONS[metricId] || METRIC_DEFINITIONS.collectionValue;
  const MetricIcon = def.icon;

  // Génération de la série temporelle Trade Republic
  const points = useMemo(() => {
    return generateMetricTimeSeries(metricId, {
      collection,
      stats,
      wikithunes,
      collectionValue,
      period: selectedPeriod,
      isLocalUser,
      createdAt,
      snapshots,
    });
  }, [
    metricId,
    collection,
    stats,
    wikithunes,
    collectionValue,
    selectedPeriod,
    isLocalUser,
    createdAt,
    snapshots,
  ]);

  // Valeurs remarquables (ATH, ATL, départ, fin)
  const statsOverview = useMemo(() => {
    if (!points || points.length === 0) {
      return { min: 0, max: 0, start: 0, current: 0, delta: 0, deltaPct: 0 };
    }
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const start = points[0].value;
    const current = points[points.length - 1].value;
    const delta = current - start;
    const deltaPct = start > 0 ? (delta / start) * 100 : current > 0 ? 100 : 0;

    return { min, max, start, current, delta, deltaPct };
  }, [points]);

  // Point actif (hover scrubbing ou dernier point)
  const activePoint = useMemo(() => {
    if (!points || points.length === 0) return { timestamp: Date.now(), value: 0 };
    if (hoverIndex !== null && points[hoverIndex]) {
      return points[hoverIndex];
    }
    return points[points.length - 1];
  }, [points, hoverIndex]);

  // Évolution par rapport au début de la période
  const activeDelta = useMemo(() => {
    if (!points || points.length === 0) return { val: 0, pct: 0 };
    const startVal = points[0].value;
    const diff = activePoint.value - startVal;
    const pct = startVal > 0 ? (diff / startVal) * 100 : activePoint.value > 0 ? 100 : 0;
    return { val: diff, pct };
  }, [points, activePoint]);

  // Calcul du tracé SVG (largeur 680, hauteur 240)
  const chartWidth = 680;
  const chartHeight = 240;
  const paddingX = 16;
  const paddingTop = 20;
  const paddingBottom = 26;

  const { pathD, areaD, plottedPoints, zeroY, hasNegative } = useMemo(() => {
    if (!points || points.length === 0) {
      return { pathD: '', areaD: '', plottedPoints: [], zeroY: null, hasNegative: false };
    }

    const values = points.map((p) => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const innerWidth = chartWidth - paddingX * 2;
    const innerHeight = chartHeight - paddingTop - paddingBottom;

    const coords = points.map((p, idx) => {
      const x = paddingX + (idx / (points.length - 1)) * innerWidth;
      const normalizedY = (p.value - minVal) / range;
      const y = paddingTop + (1 - normalizedY) * innerHeight;
      return { x, y, ...p };
    });

    const hasNegative = minVal < 0 && maxVal > 0;
    const normalizedZeroY = (0 - minVal) / range;
    const zeroY = paddingTop + (1 - normalizedZeroY) * innerHeight;

    if (coords.length === 1) {
      const p = coords[0];
      return {
        pathD: `M ${paddingX} ${p.y} L ${chartWidth - paddingX} ${p.y}`,
        areaD: '',
        plottedPoints: coords,
        zeroY,
        hasNegative,
      };
    }

    // Génération d'une courbe de Bézier cubique douce
    let d = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const current = coords[i];
      const next = coords[i + 1];
      const cpX1 = current.x + (next.x - current.x) * 0.45;
      const cpY1 = current.y;
      const cpX2 = next.x - (next.x - current.x) * 0.45;
      const cpY2 = next.y;
      d += ` C ${cpX1},${cpY1} ${cpX2},${cpY2} ${next.x},${next.y}`;
    }

    const baselineY = chartHeight - paddingBottom + 6;
    const lastX = coords[coords.length - 1].x;
    const firstX = coords[0].x;
    const area = `${d} L ${lastX},${baselineY} L ${firstX},${baselineY} Z`;

    return { pathD: d, areaD: area, plottedPoints: coords, zeroY, hasNegative };
  }, [points]);

  // Gestion du scrubbing interactif à la souris ou au doigt
  const handlePointerMove = (e) => {
    if (!svgRef.current || plottedPoints.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    if (clientX === undefined) return;

    const relativeX = clientX - rect.left;
    const scale = chartWidth / rect.width;
    const svgX = relativeX * scale;

    // Trouver le point le plus proche
    let closestIdx = 0;
    let minDistance = Infinity;
    plottedPoints.forEach((p, idx) => {
      const dist = Math.abs(p.x - svgX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    setHoverIndex(closestIdx);
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
  };

  // Fermeture sur Échap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeCoord =
    hoverIndex !== null && plottedPoints[hoverIndex]
      ? plottedPoints[hoverIndex]
      : plottedPoints[plottedPoints.length - 1] || null;

  const isPositive = activeDelta.val >= 0;
  const isZero = activeDelta.val === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Clic hors de la modal pour fermer */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Conteneur principal style Trade Republic */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-[700px] bg-white dark:bg-[#181d24] border border-[#c8ccd1] dark:border-[#363e4a] rounded-[2px] shadow-2xl overflow-hidden flex flex-col text-[#202122] dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bandeau supérieur de la modal */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#eaecf0] dark:border-[#30363d] bg-[#f8f9fa] dark:bg-[#12161c]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[2px] bg-[#eaf3ff] dark:bg-[#1f2937] border border-[#3366cc]/30 flex items-center justify-center text-[#3366cc] shrink-0">
              <MetricIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[14.5px] font-bold text-[#101418] dark:text-white m-0 truncate">
                {def.title}
              </h3>
              <span className="text-[11.5px] text-[#54595d] dark:text-[#8b949e] truncate block">
                Historique de {playerName}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-[2px] hover:bg-[#eaecf0] dark:hover:bg-[#21262d] text-[#54595d] hover:text-[#202122] dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Fermer la vue graphique"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Valeur Live & Performances (Trade Republic Scrubbing) */}
        <div className="px-5 sm:px-7 pt-5 pb-2">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="text-[36px] sm:text-[44px] font-black tracking-tight leading-none text-[#101418] dark:text-white">
              {new Intl.NumberFormat('fr-FR').format(activePoint.value)}
            </span>
            {def.isCurrency && (
              <WikithuneIcon className="w-7 h-7 sm:w-8 sm:h-8 text-[#3366cc] inline-block shrink-0 self-center" />
            )}
            {!def.isCurrency && (
              <span className="text-[17px] font-bold text-[#54595d] dark:text-[#8b949e]">
                {def.unit}
              </span>
            )}
          </div>

          {/* Badge de variation par rapport au début de période */}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[13px]">
            <span
              className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-[2px] ${
                isZero
                  ? 'bg-[#eaecf0] text-[#54595d] dark:bg-[#21262d] dark:text-[#8b949e]'
                  : isPositive
                  ? 'bg-[#dff2eb] text-[#137a54] dark:bg-[#0d3b2a] dark:text-[#38cb89]'
                  : 'bg-[#ffe9e5] text-[#b32424] dark:bg-[#401818] dark:text-[#ff7875]'
              }`}
            >
              {isPositive && !isZero ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : !isZero ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : null}
              <span>
                {isPositive && !isZero ? '+' : ''}
                {new Intl.NumberFormat('fr-FR').format(activeDelta.val)}
                {def.unit} ({isPositive && !isZero ? '+' : ''}
                {activeDelta.pct.toFixed(1)} %)
              </span>
            </span>

            <span className="text-[12px] text-[#72777d] dark:text-[#8b949e] font-medium">
              {hoverIndex !== null ? 'À la date du :' : 'Sur la période :'}
              <strong className="ml-1 text-[#202122] dark:text-white">
                {new Intl.DateTimeFormat('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(activePoint.timestamp))}
              </strong>
            </span>
          </div>
        </div>

        {/* Zone Graphique SVG Interactive (Trade Republic) */}
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
              {/* Dégradé sous la courbe style Trade Republic */}
              <linearGradient
                id="tradeRepublicGradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#3366cc" stopOpacity="0.32" />
                <stop offset="65%" stopColor="#3366cc" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#3366cc" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Lignes de repère horizontales */}
            {hasNegative ? (
              <>
                {/* Ligne Max (haut) : pointillés */}
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
                {/* Ligne 0 (seuil d'équilibre) : ligne d'abscisse pleine et continue */}
                <line
                  x1={paddingX}
                  y1={zeroY}
                  x2={chartWidth - paddingX}
                  y2={zeroY}
                  stroke="currentColor"
                  className="text-[#eaecf0] dark:text-[#282f3a]"
                  strokeWidth="1"
                />
                {/* Ligne Min (bas) : même ligne en pointillés que pour la valeur max */}
                <line
                  x1={paddingX}
                  y1={chartHeight - paddingBottom}
                  x2={chartWidth - paddingX}
                  y2={chartHeight - paddingBottom}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  className="text-[#eaecf0] dark:text-[#282f3a]"
                  strokeWidth="1"
                />
              </>
            ) : (
              <>
                {/* Ligne Max (haut) : pointillés */}
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
                {/* Ligne Milieu : pointillés */}
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
                {/* Ligne Abscisse (bas) : ligne pleine et continue */}
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

            {/* Zone remplie en dégradé */}
            {areaD && (
              <path
                d={areaD}
                fill="url(#tradeRepublicGradient)"
                className="transition-all duration-300"
              />
            )}

            {/* Ligne principale de la courbe */}
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

            {/* Ligne verticale de suivi (curseur Trade Republic) */}
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

                {/* Halo pulsant natif SVG strictement centré sur (cx, cy) sans bug de transform CSS */}
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

                {/* Point central net sur la courbe */}
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

          {/* Guide visuel de scrubbing sur mobile */}
          <div className="text-center text-[11px] text-[#72777d] dark:text-[#8b949e] py-0.5">
            Glissez votre curseur sur le graphique pour explorer l'historique
          </div>
        </div>

        {/* Sélecteur de période (Pills Trade Republic : 1J | 1S | 1M | TOUT) */}
        <div className="flex items-center justify-center gap-2 px-5 py-3 border-t border-[#eaecf0] dark:border-[#30363d] bg-[#f8f9fa] dark:bg-[#12161c]">
          {PERIODS.map((p) => {
            const isSelected = selectedPeriod === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedPeriod(p.id);
                  setHoverIndex(null);
                }}
                className={`min-w-[56px] h-[30px] rounded-[2px] font-bold text-[12.5px] cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#3366cc] text-white shadow-2xs'
                    : 'bg-white dark:bg-[#181d24] border border-[#c8ccd1] dark:border-[#363e4a] text-[#54595d] dark:text-[#8b949e] hover:border-[#3366cc] hover:text-[#3366cc]'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Tableau récapitulatif des indicateurs clés (Fintech metrics) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 border-t border-[#eaecf0] dark:border-[#30363d] text-[12px] bg-white dark:bg-[#181d24]">
          <div className="bg-[#f8f9fa] dark:bg-[#12161c] border border-[#eaecf0] dark:border-[#30363d] rounded-[2px] p-2.5">
            <span className="block text-[10.5px] uppercase font-bold text-[#72777d]">
              Plus haut (ATH)
            </span>
            <span className="text-[14px] font-extrabold text-[#202122] dark:text-white mt-0.5 block truncate">
              {new Intl.NumberFormat('fr-FR').format(statsOverview.max)}
              {def.unit}
            </span>
          </div>

          <div className="bg-[#f8f9fa] dark:bg-[#12161c] border border-[#eaecf0] dark:border-[#30363d] rounded-[2px] p-2.5">
            <span className="block text-[10.5px] uppercase font-bold text-[#72777d]">
              Plus bas (ATL)
            </span>
            <span className="text-[14px] font-extrabold text-[#202122] dark:text-white mt-0.5 block truncate">
              {new Intl.NumberFormat('fr-FR').format(statsOverview.min)}
              {def.unit}
            </span>
          </div>

          <div className="bg-[#f8f9fa] dark:bg-[#12161c] border border-[#eaecf0] dark:border-[#30363d] rounded-[2px] p-2.5">
            <span className="block text-[10.5px] uppercase font-bold text-[#72777d]">
              Valeur initiale
            </span>
            <span className="text-[14px] font-extrabold text-[#202122] dark:text-white mt-0.5 block truncate">
              {new Intl.NumberFormat('fr-FR').format(statsOverview.start)}
              {def.unit}
            </span>
          </div>

          <div className="bg-[#f8f9fa] dark:bg-[#12161c] border border-[#eaecf0] dark:border-[#30363d] rounded-[2px] p-2.5">
            <span className="block text-[10.5px] uppercase font-bold text-[#72777d]">
              Variation nette
            </span>
            <span
              className={`text-[14px] font-extrabold mt-0.5 block truncate ${
                statsOverview.delta >= 0 ? 'text-[#137a54]' : 'text-[#b32424]'
              }`}
            >
              {statsOverview.delta >= 0 ? '+' : ''}
              {new Intl.NumberFormat('fr-FR').format(statsOverview.delta)}
              {def.unit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
