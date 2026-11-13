/**
 * @file Rôle : Vue détaillée du profil d'un joueur ami (avatar, statistiques, vitrine de cartes).
 * Dépendances : React, `lucide-react`, `../WikiCard`, `../WikithuneIcon`, `./ProfileStatsGrid`.
 * Effets de bord : Ouvre le modal d'historique boursier (Trade Republic) via `onOpenHistoryMetric`.
 */

import React from 'react';
import { ExternalLink, Crown, TrendingUp, BookMarked } from 'lucide-react';
import WikiCard from '../WikiCard';
import ProfileStatsGrid from '../profile/ProfileStatsGrid';

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
 * @param {Array<Object|null>} props.peerShowcaseCards - Cartes de l'ancienne vitrine du pair (fallback)
 * @param {Array<Object>} [props.peerShelves] - Étagères de collection du pair (max 4 × 5 cartes)
 * @param {function(string): void} props.onOpenHistoryMetric - Callback d'ouverture de l'historique Trade Republic
 * @returns {JSX.Element} Vue complète du profil pair
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
  peerShelves,
  onOpenHistoryMetric,
}) {
  const resolvedShelves =
    Array.isArray(peerShelves) && peerShelves.length > 0
      ? peerShelves
      : [
          {
            id: 'shelf-1',
            name: 'Vitrine du collectionneur',
            cards: [0, 1, 2, 3, 4].map((i) => peerShowcaseCards?.[i] || null),
          },
        ];
  const resolvedUniqueCount =
    peerCollection.length > 0
      ? peerCollection.length
      : selectedPeer?.uniqueCardsCount || 0;

  return (
    <div className="space-y-6">
      {/* Identité & statistiques du joueur visité */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-[#eaecf0] dark:border-[#2d3542]">
          <a
            href={peerAvatarWiki.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative w-[80px] h-[80px] rounded-[2px] border border-[#a2a9b1] dark:border-[#3a4454] hover:border-[#3366cc] bg-[#f8f9fa] dark:bg-[#1a202c] p-1 shrink-0 flex items-center justify-center overflow-hidden cursor-pointer transition-all shadow-xs"
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
              <h3 className="wiki-serif text-[22px] font-normal text-[#101418] dark:text-white m-0 leading-tight">
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
                <button
                  type="button"
                  onClick={() => onOpenHistoryMetric('playerScore')}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[13px] font-medium text-[#72777d] dark:text-[#8b949e] hover:bg-[#eaf3ff] dark:hover:bg-[#1f2937] hover:text-[#3366cc] dark:hover:text-[#6699ff] cursor-pointer transition-colors"
                  title="Cliquer pour afficher le graphique d'évolution du score d'accomplissement"
                >
                  <span>
                    {new Intl.NumberFormat('fr-FR').format(selectedPeerScore)} pts
                  </span>
                  <TrendingUp className="w-3 h-3 opacity-70" />
                </button>
              )}
            </div>
            <p className="text-[13.5px] text-[#54595d] dark:text-[#a2a9b1] mt-1 mb-0 leading-[1.5]">
              {activePeerProfile?.bio ||
                'Contributeur et collectionneur d’articles sur Wikipédia FR.'}
            </p>
          </div>
        </div>

        <ProfileStatsGrid
          collectionLength={resolvedUniqueCount}
          totalCopiesCount={peerStats.totalCopies}
          wikithunes={peerStats.wikithunes}
          collectionTotalValue={peerStats.totalVal}
          boostersOpened={peerStats.boostersOpened}
          legendaryCount={peerStats.legendaries}
          ultraRareCount={peerStats.ultraRares}
          gifCardsCount={peerStats.gifs}
          casinoBilan={peerStats.casinoBilan || 0}
          recordStreak={peerStats.recordStreak || 0}
          netCardsBilan={peerStats.netCardsBilan || 0}
          totalCardsDrawn={peerStats.totalCardsDrawn || 0}
          onSelectMetric={onOpenHistoryMetric}
        />
      </div>

      {/* Étagères de collections du joueur visité */}
      <div className="pt-2 border-t border-[#eaecf0] dark:border-[#2d3542] space-y-4">
        <h3 className="wiki-smallcaps mb-1">Étagères de collections</h3>
        <div className="space-y-5">
          {resolvedShelves.map((shelf) => {
            return (
              <div
                key={shelf.id}
                className="bg-[#f8f9fa] dark:bg-[#14181f] border border-[#c8ccd1] dark:border-[#363e4a] rounded-[3px] p-3 sm:p-4"
              >
                <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-[#eaecf0] dark:border-[#272d36]">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookMarked className="w-4 h-4 text-[#3366cc] shrink-0" />
                    <span className="wiki-serif text-[16px] text-[#101418] dark:text-[#eaecf0] truncate">
                      {shelf.name}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 justify-items-center pb-2">
                  {[0, 1, 2, 3, 4].map((idx) => {
                    const card = shelf.cards?.[idx] || null;
                    return (
                      <div
                        key={idx}
                        className="w-full max-w-[230px] flex flex-col items-center"
                      >
                        {card ? (
                          <WikiCard card={card} compact={true} />
                        ) : (
                          <div className="w-full aspect-[284/443] rounded-[14px] border-2 border-dashed border-[#c8ccd1] dark:border-[#363e4a] bg-white/60 dark:bg-[#12161c] flex items-center justify-center p-3 text-center text-[12px] text-[#72777d] dark:text-[#8b949e]">
                            Emplacement vide
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
