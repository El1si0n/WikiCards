/**
 * @file Rôle : Grille récapitulative des 12 statistiques du joueur avec accès aux courbes historiques Trade Republic.
 * Dépendances : React, `lucide-react`, `../WikithuneIcon`.
 * Effets de bord : Déclenche l'ouverture de la modale d'historique au clic sur une tuile.
 */

import React from 'react';
import { TrendingUp } from 'lucide-react';
import WikithuneIcon from '../WikithuneIcon';

/**
 * Composant de la grille des 12 statistiques du joueur.
 * @param {Object} props
 * @param {number} props.collectionLength - Nombre d'articles uniques possédés
 * @param {number} props.totalCopiesCount - Nombre total d'exemplaires dans le classeur
 * @param {number} props.wikithunes - Solde actuel de monnaie virtuelle (₩)
 * @param {number} props.collectionTotalValue - Valeur marchande totale estimée du classeur
 * @param {number} props.boostersOpened - Total de boosters ouverts
 * @param {number} props.legendaryCount - Nombre de cartes légendaires possédées
 * @param {number} props.ultraRareCount - Nombre de cartes ultra rares possédées
 * @param {number} props.gifCardsCount - Nombre de cartes holographiques GIF métal
 * @param {number} props.casinoBilan - Bilan financier net des jeux de casino
 * @param {number} props.recordStreak - Plus longue série de bonnes réponses au Plus ou Moins
 * @param {number} props.netCardsBilan - Bilan net des cartes (gagnées - perdues)
 * @param {number} props.totalCardsDrawn - Cumul total de cartes tirées depuis l'inscription
 * @param {function(string): void} props.onSelectMetric - Callback d'ouverture de l'historique Trade Republic
 */
export default function ProfileStatsGrid({
  collectionLength,
  totalCopiesCount,
  wikithunes,
  collectionTotalValue,
  boostersOpened,
  legendaryCount,
  ultraRareCount,
  gifCardsCount,
  casinoBilan,
  recordStreak,
  netCardsBilan,
  totalCardsDrawn,
  onSelectMetric,
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
      {/* 1. Articles uniques */}
      <button
        type="button"
        onClick={() => onSelectMetric('uniqueCardsCount')}
        className="bg-[#f8f9fa] hover:bg-[#eaf3ff] border border-[#eaecf0] hover:border-[#3366cc] rounded-[2px] p-3 text-left cursor-pointer transition-all group relative"
        title="Cliquer pour afficher le graphique d'évolution Trade Republic"
      >
        <div className="flex items-center justify-between">
          <span className="block text-[11.5px] text-[#54595d] group-hover:text-[#3366cc] uppercase font-bold transition-colors">
            Articles uniques
          </span>
          <TrendingUp className="w-3.5 h-3.5 text-[#a2a9b1] group-hover:text-[#3366cc] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[18px] font-extrabold text-[#202122] mt-1">
          {collectionLength}
        </div>
      </button>

      {/* 2. Total de cartes */}
      <button
        type="button"
        onClick={() => onSelectMetric('totalCardsCount')}
        className="bg-[#f8f9fa] hover:bg-[#eaf3ff] border border-[#eaecf0] hover:border-[#3366cc] rounded-[2px] p-3 text-left cursor-pointer transition-all group relative"
        title="Cliquer pour afficher le graphique d'évolution Trade Republic"
      >
        <div className="flex items-center justify-between">
          <span className="block text-[11.5px] text-[#54595d] group-hover:text-[#3366cc] uppercase font-bold transition-colors">
            Total de cartes
          </span>
          <TrendingUp className="w-3.5 h-3.5 text-[#a2a9b1] group-hover:text-[#3366cc] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[18px] font-extrabold text-[#202122] mt-1">
          {totalCopiesCount}
        </div>
      </button>

      {/* 3. Solde actuel */}
      <button
        type="button"
        onClick={() => onSelectMetric('wikithunes')}
        className="bg-[#f8f9fa] hover:bg-[#eaf3ff] border border-[#eaecf0] hover:border-[#3366cc] rounded-[2px] p-3 text-left cursor-pointer transition-all group relative"
        title="Cliquer pour afficher le graphique d'évolution Trade Republic"
      >
        <div className="flex items-center justify-between">
          <span className="block text-[11.5px] text-[#54595d] group-hover:text-[#3366cc] uppercase font-bold transition-colors">
            Solde actuel
          </span>
          <TrendingUp className="w-3.5 h-3.5 text-[#a2a9b1] group-hover:text-[#3366cc] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[18px] font-extrabold text-[#202122] mt-1 inline-flex items-center gap-1">
          <span>{new Intl.NumberFormat('fr-FR').format(wikithunes)}</span>
          <WikithuneIcon className="w-4 h-4 text-[#3366cc]" />
        </div>
      </button>

      {/* 4. Valeur du classeur */}
      <button
        type="button"
        onClick={() => onSelectMetric('collectionValue')}
        className="bg-[#f8f9fa] hover:bg-[#eaf3ff] border border-[#eaecf0] hover:border-[#3366cc] rounded-[2px] p-3 text-left cursor-pointer transition-all group relative"
        title="Cliquer pour afficher le graphique d'évolution Trade Republic"
      >
        <div className="flex items-center justify-between">
          <span className="block text-[11.5px] text-[#54595d] group-hover:text-[#3366cc] uppercase font-bold transition-colors">
            Valeur du classeur
          </span>
          <TrendingUp className="w-3.5 h-3.5 text-[#a2a9b1] group-hover:text-[#3366cc] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[18px] font-extrabold text-[#202122] mt-1 inline-flex items-center gap-1">
          <span>
            {new Intl.NumberFormat('fr-FR').format(collectionTotalValue)}
          </span>
          <WikithuneIcon className="w-4 h-4 text-[#3366cc]" />
        </div>
      </button>

      {/* 5. Boosters ouverts */}
      <button
        type="button"
        onClick={() => onSelectMetric('boostersOpened')}
        className="bg-[#f8f9fa] hover:bg-[#eaf3ff] border border-[#eaecf0] hover:border-[#3366cc] rounded-[2px] p-3 text-left cursor-pointer transition-all group relative"
        title="Cliquer pour afficher le graphique d'évolution Trade Republic"
      >
        <div className="flex items-center justify-between">
          <span className="block text-[11.5px] text-[#54595d] group-hover:text-[#3366cc] uppercase font-bold transition-colors">
            Boosters ouverts
          </span>
          <TrendingUp className="w-3.5 h-3.5 text-[#a2a9b1] group-hover:text-[#3366cc] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[18px] font-extrabold text-[#202122] mt-1">
          {boostersOpened}
        </div>
      </button>

      {/* 6. Légendaires */}
      <button
        type="button"
        onClick={() => onSelectMetric('legendaryCount')}
        className="bg-[#f8f9fa] hover:bg-[#eaf3ff] border border-[#eaecf0] hover:border-[#3366cc] rounded-[2px] p-3 text-left cursor-pointer transition-all group relative"
        title="Cliquer pour afficher le graphique d'évolution Trade Republic"
      >
        <div className="flex items-center justify-between">
          <span className="block text-[11.5px] text-[#54595d] group-hover:text-[#3366cc] uppercase font-bold transition-colors">
            Légendaires (L)
          </span>
          <TrendingUp className="w-3.5 h-3.5 text-[#a2a9b1] group-hover:text-[#3366cc] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[18px] font-extrabold text-[#202122] mt-1">
          {legendaryCount}
        </div>
      </button>

      {/* 7. Ultra Rares */}
      <button
        type="button"
        onClick={() => onSelectMetric('ultraRareCount')}
        className="bg-[#f8f9fa] hover:bg-[#eaf3ff] border border-[#eaecf0] hover:border-[#3366cc] rounded-[2px] p-3 text-left cursor-pointer transition-all group relative"
        title="Cliquer pour afficher le graphique d'évolution Trade Republic"
      >
        <div className="flex items-center justify-between">
          <span className="block text-[11.5px] text-[#54595d] group-hover:text-[#3366cc] uppercase font-bold transition-colors">
            Ultra Rares (UR)
          </span>
          <TrendingUp className="w-3.5 h-3.5 text-[#a2a9b1] group-hover:text-[#3366cc] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[18px] font-extrabold text-[#202122] mt-1">
          {ultraRareCount}
        </div>
      </button>

      {/* 8. Cartes GIF Métal */}
      <button
        type="button"
        onClick={() => onSelectMetric('gifCount')}
        className="bg-[#f8f9fa] hover:bg-[#eaf3ff] border border-[#eaecf0] hover:border-[#3366cc] rounded-[2px] p-3 text-left cursor-pointer transition-all group relative"
        title="Cliquer pour afficher le graphique d'évolution Trade Republic"
      >
        <div className="flex items-center justify-between">
          <span className="block text-[11.5px] text-[#54595d] group-hover:text-[#3366cc] uppercase font-bold transition-colors">
            Cartes GIF (Métal)
          </span>
          <TrendingUp className="w-3.5 h-3.5 text-[#a2a9b1] group-hover:text-[#3366cc] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[18px] font-extrabold text-[#202122] mt-1">
          {gifCardsCount}
        </div>
      </button>

      {/* 9. Bilan Casino Net */}
      <button
        type="button"
        onClick={() => onSelectMetric('netCasinoBilan')}
        className="bg-[#f8f9fa] hover:bg-[#eaf3ff] border border-[#eaecf0] hover:border-[#3366cc] rounded-[2px] p-3 text-left cursor-pointer transition-all group relative"
        title="Cliquer pour afficher la courbe P&L d'évolution Trade Republic (Gains − Pertes)"
      >
        <div className="flex items-center justify-between">
          <span
            className="block text-[11.5px] text-[#54595d] group-hover:text-[#3366cc] uppercase font-bold truncate transition-colors"
            title="Bilan financier net au jeu Plus ou Moins (Bénéfices nets empochés − Mises perdues)"
          >
            Bilan Casino (Net)
          </span>
          <TrendingUp className="w-3.5 h-3.5 text-[#a2a9b1] group-hover:text-[#3366cc] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[18px] font-extrabold text-[#202122] mt-1 inline-flex items-center gap-1">
          <span>
            {new Intl.NumberFormat('fr-FR').format(casinoBilan)}
          </span>
          <WikithuneIcon className="w-4 h-4 text-[#3366cc]" />
        </div>
      </button>

      {/* 10. Série record */}
      <button
        type="button"
        onClick={() => onSelectMetric('recordStreak')}
        className="bg-[#f8f9fa] hover:bg-[#eaf3ff] border border-[#eaecf0] hover:border-[#3366cc] rounded-[2px] p-3 text-left cursor-pointer transition-all group relative"
        title="Cliquer pour afficher le graphique d'évolution Trade Republic"
      >
        <div className="flex items-center justify-between">
          <span
            className="block text-[11.5px] text-[#54595d] group-hover:text-[#3366cc] uppercase font-bold truncate transition-colors"
            title="Plus longue série ininterrompue de bonnes réponses au jeu Plus ou Moins"
          >
            Série record
          </span>
          <TrendingUp className="w-3.5 h-3.5 text-[#a2a9b1] group-hover:text-[#3366cc] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[18px] font-extrabold text-[#202122] mt-1">
          {new Intl.NumberFormat('fr-FR').format(recordStreak)}
        </div>
      </button>

      {/* 11. Bilan Cartes Net */}
      <button
        type="button"
        onClick={() => onSelectMetric('netCardsBilan')}
        className="bg-[#f8f9fa] hover:bg-[#eaf3ff] border border-[#eaecf0] hover:border-[#3366cc] rounded-[2px] p-3 text-left cursor-pointer transition-all group relative"
        title="Cliquer pour afficher la courbe d'évolution Trade Republic (Cartes gagnées − Cartes perdues)"
      >
        <div className="flex items-center justify-between">
          <span
            className="block text-[11.5px] text-[#54595d] group-hover:text-[#3366cc] uppercase font-bold truncate transition-colors"
            title="Bilan net des cartes au jeu (Cartes gagnées lors des upgrades et quitte ou double − Cartes perdues)"
          >
            Bilan Cartes (Net)
          </span>
          <TrendingUp className="w-3.5 h-3.5 text-[#a2a9b1] group-hover:text-[#3366cc] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[18px] font-extrabold text-[#202122] mt-1">
          {new Intl.NumberFormat('fr-FR').format(netCardsBilan)}
        </div>
      </button>

      {/* 12. Cartes tirées au total */}
      <button
        type="button"
        onClick={() => onSelectMetric('totalCardsDrawn')}
        className="bg-[#f8f9fa] hover:bg-[#eaf3ff] border border-[#eaecf0] hover:border-[#3366cc] rounded-[2px] p-3 text-left cursor-pointer transition-all group relative"
        title="Cliquer pour afficher le graphique d'évolution Trade Republic"
      >
        <div className="flex items-center justify-between">
          <span
            className="block text-[11.5px] text-[#54595d] group-hover:text-[#3366cc] uppercase font-bold truncate transition-colors"
            title="Cumul total de toutes les cartes piochées dans l'histoire de votre compte (Volume exploré)"
          >
            Cartes tirées au total
          </span>
          <TrendingUp className="w-3.5 h-3.5 text-[#a2a9b1] group-hover:text-[#3366cc] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[18px] font-extrabold text-[#202122] mt-1">
          {new Intl.NumberFormat('fr-FR').format(totalCardsDrawn)}
        </div>
      </button>
    </div>
  );
}
