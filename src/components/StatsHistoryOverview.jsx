/**
 * @file Rôle : Affichage de la grille des 4 indicateurs fintech clés (ATH, ATL, départ, variation).
 * Dépendances : React.
 * Effets de bord : Aucun (composant de présentation pur).
 */

import React from 'react';

/**
 * @typedef {Object} StatsOverviewData
 * @property {number} min - Plus bas historique (ATL)
 * @property {number} max - Plus haut historique (ATH)
 * @property {number} start - Valeur initiale
 * @property {number} delta - Variation nette sur la période
 */

/**
 * Grille d'indicateurs de performance financière pour la vue historique.
 * @param {Object} props
 * @param {StatsOverviewData} props.overview - Données chiffrées calculées
 * @param {string} [props.unit=''] - Suffixe d'unité (€, ₩, cartes, etc.)
 * @returns {JSX.Element} Grille 4 colonnes réactive
 */
export default function StatsHistoryOverview({ overview, unit = '' }) {
  const isPositiveDelta = overview.delta >= 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 border-t border-[#eaecf0] dark:border-[#30363d] text-[12px] bg-white dark:bg-[#181d24]">
      <div className="bg-[#f8f9fa] dark:bg-[#12161c] border border-[#eaecf0] dark:border-[#30363d] rounded-[2px] p-2.5">
        <span className="block text-[10.5px] uppercase font-bold text-[#72777d]">
          Plus haut (ATH)
        </span>
        <span className="text-[14px] font-extrabold text-[#202122] dark:text-white mt-0.5 block truncate">
          {new Intl.NumberFormat('fr-FR').format(overview.max)}
          {unit}
        </span>
      </div>

      <div className="bg-[#f8f9fa] dark:bg-[#12161c] border border-[#eaecf0] dark:border-[#30363d] rounded-[2px] p-2.5">
        <span className="block text-[10.5px] uppercase font-bold text-[#72777d]">
          Plus bas (ATL)
        </span>
        <span className="text-[14px] font-extrabold text-[#202122] dark:text-white mt-0.5 block truncate">
          {new Intl.NumberFormat('fr-FR').format(overview.min)}
          {unit}
        </span>
      </div>

      <div className="bg-[#f8f9fa] dark:bg-[#12161c] border border-[#eaecf0] dark:border-[#30363d] rounded-[2px] p-2.5">
        <span className="block text-[10.5px] uppercase font-bold text-[#72777d]">
          Valeur initiale
        </span>
        <span className="text-[14px] font-extrabold text-[#202122] dark:text-white mt-0.5 block truncate">
          {new Intl.NumberFormat('fr-FR').format(overview.start)}
          {unit}
        </span>
      </div>

      <div className="bg-[#f8f9fa] dark:bg-[#12161c] border border-[#eaecf0] dark:border-[#30363d] rounded-[2px] p-2.5">
        <span className="block text-[10.5px] uppercase font-bold text-[#72777d]">
          Variation nette
        </span>
        <span
          className={`text-[14px] font-extrabold mt-0.5 block truncate ${
            isPositiveDelta ? 'text-[#137a54]' : 'text-[#b32424]'
          }`}
        >
          {isPositiveDelta ? '+' : ''}
          {new Intl.NumberFormat('fr-FR').format(overview.delta)}
          {unit}
        </span>
      </div>
    </div>
  );
}
