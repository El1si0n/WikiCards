/**
 * @file Rôle : Vue détaillée du profil d'un joueur ami (avatar, statistiques, vitrine de cartes).
 * Dépendances : React, `lucide-react`, `../WikiCard`, `../WikithuneIcon`.
 * Effets de bord : Ouvre le modal d'historique boursier (Trade Republic) via `onOpenHistoryMetric`.
 */

import React from 'react';
import { ExternalLink, Crown, TrendingUp } from 'lucide-react';
import WikiCard from '../WikiCard';
import WikithuneIcon from '../WikithuneIcon';

/**
 * Vue d'inspection du profil et des statistiques d'un joueur.
 * @param {Object} props
 * @param {Object} props.activePeerProfile - Profil public du joueur inspecté
 * @param {Object} props.selectedPeer - Données brutes du pair sélectionné
 * @param {number} props.selectedPeerScore - Score calculé du pair
 * @param {string|null} props.topPlayerCode - Code du joueur classé n°1
 * @param {Object} props.peerAvatarWiki - Métadonnées Wikipédia de l'avatar du pair
 * @param {Object} props.peerStats - Agrégats statistiques du pair
 * @param {Array<Object>} props.peerCollection - Collection de cartes du pair
 * @param {Array<Object|null>} props.peerShowcaseCards - 4 cartes en vitrine du pair
 * @param {function(string): void} props.onOpenHistoryMetric - Callback d'ouverture de l'historique Trade Republic
 */
export default function PeerProfileView({
  activePeerProfile,
  selectedPeer,
  selectedPeerScore,
  topPlayerCode,
  peerAvatarWiki,
  peerStats,
  peerCollection,
  peerShowcaseCards,
  onOpenHistoryMetric,
}) {
  return (
    <div className="space-y-6">
      {/* Identité & statistiques du joueur visité */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-[#eaecf0]">
          <a
            href={peerAvatarWiki.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative w-[80px] h-[80px] rounded-[2px] border border-[#a2a9b1] hover:border-[#3366cc] bg-[#f8f9fa] p-1 shrink-0 flex items-center justify-center overflow-hidden cursor-pointer transition-all shadow-xs"
            title={`Ouvrir l'article Wikipédia « ${peerAvatarWiki.title} » dans un nouvel onglet`}
          >
            <img
              src={
                activePeerProfile?.avatar ||
                'https://fr.wikipedia.org/static/images/icons/wikipedia.png'
              }
              alt={peerAvatarWiki.title}
              className="w-full h-full object-cover rounded-[1px] transition-transform duration-200 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-1 text-center">
              <ExternalLink className="w-4 h-4 mb-0.5 text-white" />
              <span className="text-[10px] font-bold leading-tight line-clamp-1 max-w-[70px] text-white">
                Wikipédia
              </span>
            </div>
          </a>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="wiki-serif text-[22px] font-normal text-[#101418] m-0 leading-tight">
                {activePeerProfile?.username || selectedPeer?.code}
              </h3>
              {selectedPeer?.code === topPlayerCode && (
                <span
                  className="inline-flex items-center gap-1 text-[13px] font-bold text-[#b8860b] dark:text-[#ffea79]"
                  title="1er au classement des joueurs"
                >
                  <Crown className="w-4 h-4 text-[#d4a11d] fill-[#deb226]" />
                  <span>1er</span>
                </span>
              )}

              {typeof selectedPeerScore === 'number' && (
                <span
                  className="text-[13px] font-medium text-[#72777d] dark:text-[#8b949e]"
                  title="Score d'accomplissement"
                >
                  {new Intl.NumberFormat('fr-FR').format(selectedPeerScore)} pts
                </span>
              )}
            </div>
            <p className="text-[13.5px] text-[#54595d] mt-1 mb-0 leading-[1.5]">
              {activePeerProfile?.bio ||
                'Contributeur et collectionneur d’articles sur Wikipédia FR.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onOpenHistoryMetric('uniqueCardsCount')}
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
              {peerCollection.length > 0
                ? peerCollection.length
                : selectedPeer?.uniqueCardsCount || 0}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenHistoryMetric('totalCardsCount')}
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
              {peerStats.totalCopies}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenHistoryMetric('wikithunes')}
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
              <span>
                {new Intl.NumberFormat('fr-FR').format(peerStats.wikithunes)}
              </span>
              <WikithuneIcon className="w-4 h-4 text-[#3366cc]" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenHistoryMetric('collectionValue')}
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
                {new Intl.NumberFormat('fr-FR').format(peerStats.totalVal)}
              </span>
              <WikithuneIcon className="w-4 h-4 text-[#3366cc]" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenHistoryMetric('boostersOpened')}
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
              {peerStats.boostersOpened}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenHistoryMetric('legendaryCount')}
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
              {peerStats.legendaries}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenHistoryMetric('ultraRareCount')}
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
              {peerStats.ultraRares}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenHistoryMetric('gifCount')}
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
              {peerStats.gifs}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenHistoryMetric('netCasinoBilan')}
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
                {new Intl.NumberFormat('fr-FR').format(
                  peerStats.casinoBilan || 0
                )}
              </span>
              <WikithuneIcon className="w-4 h-4 text-[#3366cc]" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenHistoryMetric('recordStreak')}
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
              {new Intl.NumberFormat('fr-FR').format(
                peerStats.recordStreak || 0
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenHistoryMetric('netCardsBilan')}
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
              {new Intl.NumberFormat('fr-FR').format(
                peerStats.netCardsBilan || 0
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenHistoryMetric('totalCardsDrawn')}
            className="bg-[#f8f9fa] hover:bg-[#eaf3ff] border border-[#eaecf0] hover:border-[#3366cc] rounded-[2px] p-3 text-left cursor-pointer transition-all group relative"
            title="Cliquer pour afficher le graphique d'évolution Trade Republic"
          >
            <div className="flex items-center justify-between">
              <span
                className="block text-[11.5px] text-[#54595d] group-hover:text-[#3366cc] uppercase font-bold truncate transition-colors"
                title="Cumul total de toutes les cartes piochées dans l'histoire du compte (Volume exploré)"
              >
                Cartes tirées au total
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-[#a2a9b1] group-hover:text-[#3366cc] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-[18px] font-extrabold text-[#202122] mt-1">
              {new Intl.NumberFormat('fr-FR').format(
                peerStats.totalCardsDrawn || 0
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Vitrine du joueur visité */}
      <div className="pt-2 border-t border-[#eaecf0]">
        <h3 className="wiki-smallcaps mb-3">Vitrine du collectionneur</h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 justify-items-center">
          {peerShowcaseCards.map((card, idx) => (
            <div
              key={idx}
              className="w-full max-w-[284px] flex flex-col items-center"
            >
              {card ? (
                <WikiCard card={card} compact={true} />
              ) : (
                <div className="w-full aspect-[284/443] rounded-[14px] border-2 border-dashed border-[#c8ccd1] bg-[#f8f9fa] flex items-center justify-center p-3 sm:p-6 text-center text-[12px] sm:text-[13px] text-[#72777d]">
                  Emplacement vide
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
