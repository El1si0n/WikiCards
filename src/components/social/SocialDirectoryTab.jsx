/**
 * @file Rôle : Onglet de l'annuaire communautaire affichant la liste ordonnée et le classement des joueurs.
 * Dépendances : React, `lucide-react`, `../WikithuneIcon`.
 * Effets de bord : Sélection d'un profil joueur pour inspection.
 */

import React from 'react';
import { Search, Crown } from 'lucide-react';
import WikithuneIcon from '../WikithuneIcon';

/**
 * Sous-composant affichant l'annuaire de tous les joueurs inscrits.
 * @param {Object} props
 * @param {Array<Object>} props.filteredUsers - Liste filtrée et ordonnée des joueurs
 * @param {string} props.userSearchQuery - Terme de recherche
 * @param {function(string): void} props.setUserSearchQuery - Callback de recherche
 * @param {string} props.userCode - Code du joueur local
 * @param {Object} props.userProfile - Profil du joueur local
 * @param {Array<Object>} props.collection - Collection du joueur local
 * @param {number} props.wikithunes - Solde de monnaie du joueur local
 * @param {string|null} props.topPlayerCode - Code du joueur classé 1er
 * @param {function(string): Promise<void>} props.handleInspectPeer - Callback d'ouverture de profil
 * @returns {JSX.Element} Vue d'annuaire communautaire
 */
export default function SocialDirectoryTab({
  filteredUsers,
  userSearchQuery,
  setUserSearchQuery,
  userCode,
  userProfile,
  collection,
  wikithunes,
  topPlayerCode,
  handleInspectPeer,
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#eaecf0]">
        <div className="relative flex-1 max-w-[420px]">
          <Search className="w-4 h-4 text-[#72777d] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            placeholder="Rechercher un joueur par nom ou code WIKI-..."
            className="w-full h-[34px] pl-9 pr-3 text-[13px] bg-white border border-[#a2a9b1] rounded-[2px] focus:border-[#3366cc] focus:outline-none"
          />
        </div>
      </div>

      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((u) => {
            const isMe = u.code === userCode;
            const displayUsername = isMe ? userProfile?.username || u.username : u.username;
            const displayAvatar = isMe ? userProfile?.avatar || u.avatar : u.avatar;
            const displayBio = isMe ? userProfile?.bio || u.bio : u.bio;
            const displayUniqueCount = isMe ? collection.length : u.uniqueCardsCount || 0;
            const displayTotalCount = isMe
              ? collection.reduce((s, c) => s + (c.count || 1), 0)
              : u.totalCardsCount || 0;
            const displayLegendaryCount = isMe
              ? collection.filter((c) => c.rarity === 'L').length
              : u.legendaryCount || 0;
            const displayUltraRareCount = isMe
              ? collection.filter((c) => c.rarity === 'UR').length
              : u.ultraRareCount || 0;
            const displayGifCount = isMe
              ? collection.filter(
                  (c) =>
                    Boolean(c.isShiny || c.isGif || /\.gif(\?|$|\/)/i.test(c.image || ''))
                ).length
              : u.gifCount || 0;
            const displayWikifeet = isMe ? wikithunes : u.wikithunes || 0;

            const isTopPlayer = Boolean(topPlayerCode && u.code === topPlayerCode);

            return (
              <div
                key={u.code}
                onClick={() => handleInspectPeer(u.code)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleInspectPeer(u.code);
                  }
                }}
                className={`rounded-[2px] p-4 flex flex-col justify-between gap-3.5 transition-all cursor-pointer group select-none hover:shadow-md ${
                  isTopPlayer
                    ? 'bg-gradient-to-b from-[#fffef5] to-[#fff8d6] dark:from-[#2e2610] dark:to-[#1c1808] border-2 border-[#d4a11d] dark:border-[#deb226] shadow-[0_2px_12px_rgba(212,161,29,0.25)]'
                    : 'bg-[#f8f9fa] dark:bg-[#161a20] border border-[#c8ccd1] dark:border-[#2d3542] hover:border-[#3366cc] dark:hover:border-[#6699ff]'
                }`}
                title={
                  isTopPlayer
                    ? `👑 Meilleur joueur : ${displayUsername}`
                    : isMe
                    ? 'Voir mon profil public'
                    : `Voir le profil de ${displayUsername}`
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`w-14 h-14 rounded-[2px] border p-0.5 shrink-0 overflow-hidden ${
                        isTopPlayer
                          ? 'border-[#d4a11d] bg-[#fff9db] dark:bg-[#3d3210] shadow-[0_0_8px_rgba(212,161,29,0.4)]'
                          : 'border-[#a2a9b1] dark:border-[#3a4454] bg-white dark:bg-[#1a202c]'
                      }`}
                    >
                      <img
                        src={
                          displayAvatar ||
                          'https://fr.wikipedia.org/static/images/icons/wikipedia.png'
                        }
                        alt={displayUsername}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[15px] text-[#202122] dark:text-white group-hover:text-[#3366cc] dark:group-hover:text-[#6699ff] transition-colors truncate">
                          {displayUsername}
                        </span>
                        {isMe && (
                          <span className="px-1.5 py-0.2 text-[10.5px] font-bold bg-[#eaf3ff] dark:bg-[#1a2a40] text-[#3366cc] dark:text-[#6699ff] border border-[#3366cc] rounded-[2px]">
                            Vous
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#54595d] dark:text-[#a2a9b1] m-0 mt-1 line-clamp-2">
                        {displayBio || 'Contributeur et collectionneur sur Wikipédia FR.'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    {isTopPlayer ? (
                      <span
                        className="inline-flex items-center gap-1 text-[12px] font-bold text-[#b8860b] dark:text-[#ffea79]"
                        title="1er au classement des joueurs"
                      >
                        <Crown className="w-3.5 h-3.5 text-[#d4a11d] fill-[#deb226]" />
                        <span>1er</span>
                      </span>
                    ) : u.rank ? (
                      <span
                        className="inline-flex items-center text-[12px] font-semibold text-[#72777d] dark:text-[#8b949e]"
                        title={`Rang #${u.rank} au classement`}
                      >
                        #{u.rank}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#eaecf0] dark:border-[#2b3340] text-center text-[12px]">
                  <div className="bg-white dark:bg-[#1a202c] border border-[#eaecf0] dark:border-[#2b3340] rounded-[2px] py-1.5 px-2">
                    <span className="block text-[10.5px] text-[#54595d] dark:text-[#a2a9b1] uppercase font-bold truncate">
                      Uniques
                    </span>
                    <strong className="text-[13.5px] font-extrabold text-[#202122] dark:text-[#eaecf0] block mt-0.5">
                      {new Intl.NumberFormat('fr-FR').format(displayUniqueCount)}
                    </strong>
                  </div>
                  <div className="bg-white dark:bg-[#1a202c] border border-[#eaecf0] dark:border-[#2b3340] rounded-[2px] py-1.5 px-2">
                    <span className="block text-[10.5px] text-[#54595d] dark:text-[#a2a9b1] uppercase font-bold truncate">
                      Cartes
                    </span>
                    <strong className="text-[13.5px] font-extrabold text-[#202122] dark:text-[#eaecf0] block mt-0.5">
                      {new Intl.NumberFormat('fr-FR').format(displayTotalCount)}
                    </strong>
                  </div>
                  <div className="bg-white dark:bg-[#1a202c] border border-[#eaecf0] dark:border-[#2b3340] rounded-[2px] py-1.5 px-2">
                    <span className="block text-[10.5px] text-[#54595d] dark:text-[#a2a9b1] uppercase font-bold truncate">
                      Légendaires
                    </span>
                    <strong className="text-[13.5px] font-extrabold text-[#202122] dark:text-[#eaecf0] block mt-0.5">
                      {new Intl.NumberFormat('fr-FR').format(displayLegendaryCount)}
                    </strong>
                  </div>
                  <div className="bg-white dark:bg-[#1a202c] border border-[#eaecf0] dark:border-[#2b3340] rounded-[2px] py-1.5 px-2">
                    <span className="block text-[10.5px] text-[#54595d] dark:text-[#a2a9b1] uppercase font-bold truncate">
                      Ultra Rares
                    </span>
                    <strong className="text-[13.5px] font-extrabold text-[#202122] dark:text-[#eaecf0] block mt-0.5">
                      {new Intl.NumberFormat('fr-FR').format(displayUltraRareCount)}
                    </strong>
                  </div>
                  <div className="bg-white dark:bg-[#1a202c] border border-[#eaecf0] dark:border-[#2b3340] rounded-[2px] py-1.5 px-2">
                    <span className="block text-[10.5px] text-[#54595d] dark:text-[#a2a9b1] uppercase font-bold truncate">
                      Cartes GIF
                    </span>
                    <strong className="text-[13.5px] font-extrabold text-[#202122] dark:text-[#eaecf0] block mt-0.5">
                      {new Intl.NumberFormat('fr-FR').format(displayGifCount)}
                    </strong>
                  </div>
                  <div className="bg-white dark:bg-[#1a202c] border border-[#eaecf0] dark:border-[#2b3340] rounded-[2px] py-1.5 px-2">
                    <span className="block text-[10.5px] text-[#54595d] dark:text-[#a2a9b1] uppercase font-bold truncate">
                      Wikifeet
                    </span>
                    <strong className="text-[13.5px] font-extrabold text-[#202122] dark:text-[#eaecf0] inline-flex items-center justify-center gap-1 mt-0.5">
                      <span>{new Intl.NumberFormat('fr-FR').format(displayWikifeet)}</span>
                      <WikithuneIcon className="w-3.5 h-3.5 text-[#3366cc]" />
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px]">
          <p className="text-[14px] text-[#54595d] m-0">
            Aucun joueur trouvé dans l'annuaire.
          </p>
        </div>
      )}
    </div>
  );
}
