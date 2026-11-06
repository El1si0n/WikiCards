/**
 * @file Rôle : En-tête du profil utilisateur (avatar cliquable, formulaire d'identité pseudo/bio, code secret et actions de session).
 * Dépendances : React, `lucide-react`.
 * Effets de bord : Aucun (composant de présentation avec callbacks).
 */

import React from 'react';
import {
  Camera,
  ExternalLink,
  Pencil,
  KeyRound,
  LogOut,
  Trash2,
} from 'lucide-react';

/**
 * Composant d'en-tête du profil joueur.
 * @param {Object} props
 * @param {string} props.userCode - Identifiant unique du compte
 * @param {Object} props.profile - Données du profil (username, avatar, bio)
 * @param {number|null} [props.playerScore] - Score d'accomplissement calculé
 * @param {Object} props.myAvatarWiki - Métadonnées Wikipédia associées à l'avatar
 * @param {boolean} props.isEditingIdentity - Indique si le mode édition est ouvert
 * @param {string} props.draftUsername - Valeur du champ pseudonyme
 * @param {function(string): void} props.setDraftUsername - Mise à jour du brouillon de pseudo
 * @param {string} props.draftBio - Valeur du champ biographie
 * @param {function(string): void} props.setDraftBio - Mise à jour du brouillon de bio
 * @param {function(): void} props.onStartEditIdentity - Ouverture de l'édition d'identité
 * @param {function(): void} props.onCancelEditIdentity - Annulation de l'édition
 * @param {function(React.FormEvent): void} props.onSaveIdentity - Sauvegarde de l'identité
 * @param {function(): void} props.onToggleAvatarPicker - Ouverture/fermeture du choix d'avatar
 * @param {function(): void} [props.onLogout] - Déconnexion de la session
 * @param {function(): void} [props.onOpenDeleteConfirm] - Ouverture de la modale de suppression
 */
export default function ProfileHeader({
  userCode,
  profile,
  playerScore,
  myAvatarWiki,
  isEditingIdentity,
  draftUsername,
  setDraftUsername,
  draftBio,
  setDraftBio,
  onStartEditIdentity,
  onCancelEditIdentity,
  onSaveIdentity,
  onToggleAvatarPicker,
  onLogout,
  onOpenDeleteConfirm,
}) {
  return (
    <div className="flex flex-col md:flex-row items-start justify-between gap-4 pb-4 border-b border-[#eaecf0]">
      {/* Côté Gauche : Photo de profil cliquable + Pseudo & Bio éditables */}
      <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
        {/* Photo de profil cliquable (change l'avatar) + bouton externe pour visiter l'article Wikipédia */}
        <div className="relative group/avatar shrink-0">
          <button
            type="button"
            onClick={onToggleAvatarPicker}
            className="group relative w-[76px] h-[76px] sm:w-[82px] sm:h-[82px] rounded-[2px] border border-[#a2a9b1] hover:border-[#3366cc] bg-[#f8f9fa] p-1 flex items-center justify-center overflow-hidden cursor-pointer transition-colors"
            title="Cliquez pour choisir une image parmi vos cartes"
          >
            <img
              src={
                profile.avatar ||
                'https://fr.wikipedia.org/static/images/icons/wikipedia.png'
              }
              alt={profile.username}
              className="w-full h-full object-cover rounded-[1px]"
            />
            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Camera className="w-5 h-5" />
            </div>
          </button>

          {myAvatarWiki.url && myAvatarWiki.title !== 'Wikipédia' && (
            <a
              href={myAvatarWiki.url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-[#181d24] border border-[#a2a9b1] hover:border-[#3366cc] flex items-center justify-center text-[#3366cc] hover:scale-110 shadow-xs transition-all z-10"
              title={`Ouvrir l'article Wikipédia « ${myAvatarWiki.title} » dans un nouvel onglet`}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {!isEditingIdentity ? (
            <div
              onClick={onStartEditIdentity}
              className="group cursor-pointer rounded-[2px] -mx-1.5 px-1.5 py-1 hover:bg-[#f8f9fa] transition-colors"
              title="Cliquez pour modifier votre nom ou votre description"
            >
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="wiki-serif text-[22px] font-normal text-[#101418] m-0 leading-tight">
                  {profile.username}
                </h3>
                {typeof playerScore === 'number' && (
                  <span
                    className="text-[13px] font-medium text-[#72777d] dark:text-[#8b949e]"
                    title="Votre score d'accomplissement"
                  >
                    {new Intl.NumberFormat('fr-FR').format(playerScore)} pts
                  </span>
                )}
                <Pencil className="w-3.5 h-3.5 text-[#72777d] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[13.5px] text-[#54595d] mt-1 mb-0 leading-[1.5] max-w-[480px] sm:max-w-[520px] break-words">
                {profile.bio ||
                  'Contributeur et collectionneur d’articles sur Wikipédia FR.'}
              </p>
            </div>
          ) : (
            <form
              onSubmit={onSaveIdentity}
              className="flex flex-col sm:flex-row sm:items-stretch gap-2.5 bg-[#f8f9fa] dark:bg-[#181d24] border border-[#c8ccd1] dark:border-[#363e4a] rounded-[2px] p-2.5 max-w-[620px]"
            >
              <div className="flex-1 space-y-2 min-w-0 w-full">
                <input
                  type="text"
                  value={draftUsername}
                  onChange={(e) => setDraftUsername(e.target.value)}
                  maxLength={36}
                  placeholder="Nom d'utilisateur"
                  autoFocus
                  className="w-full h-[30px] px-2.5 text-[13.5px] font-bold bg-white dark:bg-[#12161c] text-[#202122] dark:text-white border border-[#a2a9b1] dark:border-[#4a5360] rounded-[2px] focus:border-[#3366cc] focus:outline-none"
                />
                <input
                  type="text"
                  value={draftBio}
                  onChange={(e) => setDraftBio(e.target.value)}
                  maxLength={160}
                  placeholder="Présentation courte..."
                  className="w-full h-[30px] px-2.5 text-[12.5px] bg-white dark:bg-[#12161c] text-[#202122] dark:text-white border border-[#a2a9b1] dark:border-[#4a5360] rounded-[2px] focus:border-[#3366cc] focus:outline-none"
                />
              </div>
              <div className="flex flex-row sm:flex-col gap-2 shrink-0 sm:w-[105px]">
                <button
                  type="submit"
                  className="wiki-casino-btn wiki-casino-btn--primary !min-h-0 !h-[30px] !py-0 !px-3 !text-[12.5px] w-full font-bold flex items-center justify-center"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={onCancelEditIdentity}
                  className="wiki-casino-btn wiki-casino-btn--neutral !min-h-0 !h-[30px] !py-0 !px-3 !text-[12.5px] w-full flex items-center justify-center"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Côté Droit : Code Unique statique (sans bordure) + Déconnexion + Suppression */}
      <div className="flex items-center gap-2 shrink-0 self-start">
        <div
          className="h-[32px] px-2.5 bg-[#f8f9fa] rounded-[2px] inline-flex items-center gap-2 font-mono text-[13px] font-bold text-[#101418] select-all"
          title="Code Unique d'identification"
        >
          <KeyRound className="w-3.5 h-3.5 text-[#3366cc] shrink-0" />
          <span>{userCode}</span>
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="w-[32px] h-[32px] rounded-[2px] border border-[#a2a9b1] bg-[#f8f9fa] hover:bg-[#eaecf0] text-[#202122] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            title="Se déconnecter et retourner à la page d'identification"
            aria-label="Se déconnecter"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}

        {onOpenDeleteConfirm && (
          <button
            type="button"
            onClick={onOpenDeleteConfirm}
            className="w-[32px] h-[32px] rounded-[2px] bg-[#bf3c2c] hover:bg-[#9f3123] active:bg-[#85271c] border border-[#9f3123] text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-xs"
            title="Supprimer définitivement mon compte"
            aria-label="Supprimer mon compte"
          >
            <Trash2 className="w-3.5 h-3.5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
