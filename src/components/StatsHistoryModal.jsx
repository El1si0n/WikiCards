/**
 * @file Rôle : Fenêtre modale d'affichage détaillé de l'historique d'une métrique style Trade Republic.
 * Dépendances : React, `lucide-react`, `./WikithuneIcon`, `./StatsHistoryChart`, `./StatsHistoryOverview`, `../utils/statsHistory`, `../config/statsMetrics`.
 * Effets de bord : Écouteur global clavier (touche Échap).
 */

import React, { useState, useMemo, useEffect } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import WikithuneIcon from './WikithuneIcon';
import StatsHistoryChart from './StatsHistoryChart';
import StatsHistoryOverview from './StatsHistoryOverview';
import { generateMetricTimeSeries, calculateEvolutionPct } from '../utils/statsHistory';
import { METRIC_DEFINITIONS, PERIODS } from '../config/statsMetrics';

/**
 * Modale de consultation historique d'une métrique de jeu.
 * @param {Object} props
 * @param {boolean} props.isOpen - Visibilité de la modal
 * @param {function(): void} props.onClose - Callback de fermeture
 * @param {string} [props.metricId='collectionValue'] - Identifiant de la métrique analysée
 * @param {Array<Object>} [props.collection=[]] - Collection du joueur
 * @param {Object} [props.stats={}] - Statistiques cumulatives
 * @param {number} [props.wikithunes=0] - Solde de monnaie
 * @param {number|null} [props.collectionValue=null] - Valeur calculée de la collection
 * @param {string} [props.playerName='Mocobanks'] - Nom affiché du joueur
 * @param {boolean} [props.isLocalUser=false] - Indique s'il s'agit du compte local
 * @param {number|null} [props.createdAt=null] - Date de création du compte
 * @param {Array<Object>} [props.snapshots=undefined] - Instantanés explicites
 * @param {string|null} [props.userCode=null] - Code utilisateur WIKI-XXXX
 * @returns {JSX.Element|null} Modale rendue ou null si fermée
 */
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
  userCode = null,
}) {
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [hoverIndex, setHoverIndex] = useState(null);

  const def = METRIC_DEFINITIONS[metricId] || METRIC_DEFINITIONS.collectionValue;
  const MetricIcon = def.icon;
  const isNetMetric = metricId === 'netCasinoBilan' || metricId === 'netCardsBilan';

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
      userCode,
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
    userCode,
  ]);

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
    const deltaPct = calculateEvolutionPct(current, start, points, def.isCurrency);
    return { min, max, start, current, delta, deltaPct };
  }, [points, def.isCurrency]);

  const activePoint = useMemo(() => {
    if (!points || points.length === 0) return { timestamp: 0, value: 0 };
    if (hoverIndex !== null && points[hoverIndex]) {
      return points[hoverIndex];
    }
    return points[points.length - 1];
  }, [points, hoverIndex]);

  const activeDelta = useMemo(() => {
    if (!points || points.length === 0) return { val: 0, pct: 0 };
    const startVal = points[0].value;
    const diff = activePoint.value - startVal;
    const pct = calculateEvolutionPct(activePoint.value, startVal, points, def.isCurrency);
    return { val: diff, pct };
  }, [points, activePoint, def.isCurrency]);

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

  const isPositive = activeDelta.val >= 0;
  const isZero = activeDelta.val === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-[700px] bg-white dark:bg-[#181d24] border border-[#c8ccd1] dark:border-[#363e4a] rounded-[2px] shadow-2xl overflow-hidden flex flex-col text-[#202122] dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
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

        <div className="px-5 sm:px-7 pt-5 pb-2">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="text-[36px] sm:text-[44px] font-black tracking-tight leading-none text-[#101418] dark:text-white">
              {new Intl.NumberFormat('fr-FR').format(activePoint.value)}
            </span>
            {def.isCurrency ? (
              <WikithuneIcon className="w-7 h-7 sm:w-8 sm:h-8 text-[#3366cc] inline-block shrink-0 self-center" />
            ) : (
              <span className="text-[17px] font-bold text-[#54595d] dark:text-[#8b949e]">
                {def.unit}
              </span>
            )}
          </div>

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

        <StatsHistoryChart
          points={points}
          isNetMetric={isNetMetric}
          hoverIndex={hoverIndex}
          onHoverIndexChange={setHoverIndex}
        />

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

        <StatsHistoryOverview overview={statsOverview} unit={def.unit} />
      </div>
    </div>
  );
}
