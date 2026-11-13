/**
 * @file Rôle : Fenêtre modale d'affichage détaillé de l'historique d'une métrique style Trade Republic.
 * Dépendances : React, `lucide-react`, `./WikithuneIcon`, `./StatsHistoryChart`, `../utils/statsHistory`, `../config/statsMetrics`.
 * Effets de bord : Écouteur global clavier (Échap pour fermer, flèches gauche/droite pour naviguer).
 */

import React, { useState, useMemo, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import WikithuneIcon from './WikithuneIcon';
import StatsHistoryChart from './StatsHistoryChart';
import { generateMetricTimeSeries, calculateEvolutionPct } from '../utils/statsHistory';
import {
  METRIC_DEFINITIONS,
  PERIODS,
  METRIC_NAV_ORDER,
  formatMetricUnit,
} from '../config/statsMetrics';

const CASINO_MONEY_SUBTABS = [
  { id: 'netCasinoBilan', label: 'Bilan Net' },
  { id: 'netCasinoGains', label: 'Gains bruts' },
  { id: 'lostMoneyCasino', label: 'Mises perdues' },
];

const CARDS_BILAN_SUBTABS = [
  { id: 'netCardsBilan', label: 'Bilan Net' },
  { id: 'wonCards', label: 'Cartes gagnées' },
  { id: 'lostCards', label: 'Cartes perdues' },
];

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
  playerName: _playerName = 'Mocobanks',
  isLocalUser = false,
  createdAt = null,
  snapshots = undefined,
  userCode = null,
}) {
  const [metricOverride, setMetricOverride] = useState({
    forProp: metricId,
    id: null,
  });
  const [subMetricOverride, setSubMetricOverride] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [hoverIndex, setHoverIndex] = useState(null);

  const currentBaseMetricId =
    metricOverride.forProp === metricId && metricOverride.id
      ? metricOverride.id
      : metricId;

  const subTabs = useMemo(() => {
    if (
      ['netCasinoBilan', 'netCasinoGains', 'lostMoneyCasino'].includes(
        currentBaseMetricId
      )
    ) {
      return CASINO_MONEY_SUBTABS;
    }
    if (
      ['netCardsBilan', 'wonCards', 'lostCards'].includes(currentBaseMetricId)
    ) {
      return CARDS_BILAN_SUBTABS;
    }
    return null;
  }, [currentBaseMetricId]);

  const activeMetricId = useMemo(() => {
    if (
      subTabs &&
      subMetricOverride &&
      subTabs.some((t) => t.id === subMetricOverride)
    ) {
      return subMetricOverride;
    }
    return currentBaseMetricId;
  }, [currentBaseMetricId, subTabs, subMetricOverride]);

  const def =
    METRIC_DEFINITIONS[activeMetricId] || METRIC_DEFINITIONS.collectionValue;
  const isNetMetric =
    activeMetricId === 'netCasinoBilan' || activeMetricId === 'netCardsBilan';

  const currentNavIndex = METRIC_NAV_ORDER.indexOf(currentBaseMetricId);
  const handleStepMetric = (direction) => {
    const idx = currentNavIndex === -1 ? 0 : currentNavIndex;
    const nextIdx =
      (idx + direction + METRIC_NAV_ORDER.length) % METRIC_NAV_ORDER.length;
    setMetricOverride({ forProp: metricId, id: METRIC_NAV_ORDER[nextIdx] });
    setSubMetricOverride(null);
    setHoverIndex(null);
  };

  const points = useMemo(() => {
    return generateMetricTimeSeries(activeMetricId, {
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
    activeMetricId,
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

  const isLossMetric = activeMetricId === 'lostMoneyCasino' || activeMetricId === 'lostCards';
  const isPositive = isLossMetric ? activeDelta.val <= 0 : activeDelta.val >= 0;
  const isZero = activeDelta.val === 0;
  const startValue = points[0]?.value ?? 0;
  const showDeltaPct =
    Math.abs(startValue) >= 10 && Math.abs(activeDelta.pct) <= 999;

  const trendTone = isNetMetric
    ? activePoint.value > 0
      ? 'positive'
      : activePoint.value < 0
      ? 'negative'
      : 'neutral'
    : isZero
    ? 'neutral'
    : isPositive
    ? 'positive'
    : 'negative';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-[700px] bg-white dark:bg-[#181d24] border border-[#c8ccd1] dark:border-[#363e4a] rounded-[2px] shadow-2xl overflow-hidden flex flex-col text-[#202122] dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[#eaecf0] dark:border-[#30363d] bg-[#f8f9fa] dark:bg-[#12161c]">
          <h3 className="text-[18px] sm:text-[20px] font-bold text-[#101418] dark:text-white m-0 truncate">
            {def.title}
          </h3>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleStepMetric(-1)}
              className="w-8 h-8 rounded-[2px] hover:bg-[#eaecf0] dark:hover:bg-[#21262d] text-[#54595d] hover:text-[#202122] dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              title="Métrique précédente"
              aria-label="Métrique précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleStepMetric(1)}
              className="w-8 h-8 rounded-[2px] hover:bg-[#eaecf0] dark:hover:bg-[#21262d] text-[#54595d] hover:text-[#202122] dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              title="Métrique suivante"
              aria-label="Métrique suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
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
        </div>

        {/* Sous-onglets rapides pour explorer les composantes détaillées des bilans (Gains vs Pertes) */}
        {subTabs && (
          <div className="flex items-center gap-1.5 px-5 py-2 border-b border-[#eaecf0] dark:border-[#30363d] bg-[#fcfcfd] dark:bg-[#151a21] overflow-x-auto">
            {subTabs.map((tab) => {
              const isSelected = activeMetricId === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSubMetricOverride(tab.id);
                    setHoverIndex(null);
                  }}
                  className={`px-2.5 py-1 rounded-[2px] text-[12px] font-bold cursor-pointer transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#eaf3ff] dark:bg-[#1f2937] text-[#3366cc] dark:text-[#6699ff] border border-[#3366cc]/40'
                      : 'text-[#54595d] dark:text-[#8b949e] hover:bg-[#eaecf0]/60 dark:hover:bg-[#21262d]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="px-5 sm:px-7 pt-4 pb-2">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="text-[36px] sm:text-[44px] font-black tracking-tight leading-none text-[#101418] dark:text-white">
              {new Intl.NumberFormat('fr-FR').format(activePoint.value)}
            </span>
            {def.isCurrency ? (
              <WikithuneIcon className="w-7 h-7 sm:w-8 sm:h-8 text-[#3366cc] inline-block shrink-0 self-center" />
            ) : (
              <span className="text-[17px] font-bold text-[#54595d] dark:text-[#8b949e]">
                {formatMetricUnit(def.unit, activePoint.value)}
              </span>
            )}
          </div>

          <p className="text-[12px] text-[#72777d] dark:text-[#8b949e] m-0 mt-1">
            {def.description}
          </p>

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
              {activeDelta.val > 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : activeDelta.val < 0 ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : null}
              <span>
                {activeDelta.val > 0 ? '+' : ''}
                {new Intl.NumberFormat('fr-FR').format(activeDelta.val)}
                {formatMetricUnit(def.unit, activeDelta.val)}
                {showDeltaPct
                  ? ` (${activeDelta.val > 0 ? '+' : ''}${activeDelta.pct.toFixed(1)} %)`
                  : ''}
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
          trendTone={trendTone}
          period={selectedPeriod}
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
      </div>
    </div>
  );
}
