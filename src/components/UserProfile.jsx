/**
 * @file Rôle : Page de profil utilisateur coordonnant l'identité, les statistiques, la vitrine et les paramètres de compte.
 * Dépendances : React, `../hooks/useUserProfile`, sous-composants dans `./profile/`, `StatsHistoryModal`.
 * Effets de bord : Synchronisation du profil, suppression de compte, audio procédural.
 */

import React from 'react';
import useUserProfile from '../hooks/useUserProfile';
import ProfileHeader from './profile/ProfileHeader';
import ProfileAvatarPicker from './profile/ProfileAvatarPicker';
import ProfileStatsGrid from './profile/ProfileStatsGrid';
import ProfileShowcase from './profile/ProfileShowcase';
import ProfileShowcasePicker from './profile/ProfileShowcasePicker';
import ProfileDeleteModal from './profile/ProfileDeleteModal';
import StatsHistoryModal from './StatsHistoryModal';

/**
 * Vue principale du profil du joueur connecté.
 * @param {Object} props
 * @param {string} props.userCode - Identifiant unique du compte (WIKI-XXXX-XXXX)
 * @param {Object} props.profile - Données de profil utilisateur
 * @param {function(Object): void} props.onUpdateProfile - Callback de mise à jour du profil
 * @param {function(): void} [props.onLogout] - Déconnexion de la session
 * @param {function(): Promise<void>} [props.onDeleteAccount] - Suppression irréversible du compte
 * @param {Array<Object>} [props.collection=[]] - Collection complète des cartes
 * @param {Array<string>} [props.favorites=[]] - Liste des IDs de cartes en favori
 * @param {number} [props.wikithunes=0] - Solde de monnaie virtuelle (₩)
 * @param {Object} [props.stats={}] - Statistiques de jeu
 * @param {number} [props.accountCreatedAt] - Timestamp de création du compte
 * @param {function(string): void} [props.onToggleFavorite] - Callback de mise en favori
 * @returns {JSX.Element}
 */
export default function UserProfile({
  userCode,
  profile,
  onUpdateProfile,
  onLogout,
  onDeleteAccount,
  collection = [],
  favorites = [],
  wikithunes = 0,
  stats = {},
  accountCreatedAt,
  onToggleFavorite,
}) {
  const {
    isPickingAvatar,
    setIsPickingAvatar,
    isEditingIdentity,
    draftUsername,
    setDraftUsername,
    draftBio,
    setDraftBio,
    isConfirmingDelete,
    setIsConfirmingDelete,
    isDeleting,
    deleteError,
    setDeleteError,
    activeShowcaseSlot,
    setActiveShowcaseSlot,
    selectedRarityFilter,
    setSelectedRarityFilter,
    selectedThemeFilter,
    setSelectedThemeFilter,
    sortBy,
    setSortBy,
    historyModalMetric,
    setHistoryModalMetric,
    showcaseIds,
    showcaseCards,
    totalCopiesCount,
    legendaryCount,
    ultraRareCount,
    gifCardsCount,
    collectionTotalValue,
    casinoBilan,
    recordStreak,
    netCardsBilan,
    totalCardsDrawn,
    playerScore,
    cardAvatars,
    myAvatarWiki,
    themeCounts,
    filteredAndSortedCollection,
    handleStartEditIdentity,
    handleCancelEditIdentity,
    handleSaveIdentity,
    handleSelectCardAvatar,
    handleAssignCardToShowcase,
    handleConfirmDelete,
  } = useUserProfile({
    userCode,
    profile,
    onUpdateProfile,
    onDeleteAccount,
    collection,
    favorites,
    wikithunes,
    stats,
  });

  return (
    <div className="space-y-6">
      {/* CADRE 1 : IDENTITÉ, AVATAR ET 12 STATISTIQUES DU JOUEUR */}
      <section className="accueil_2017_cadre space-y-4">
        <ProfileHeader
          userCode={userCode}
          profile={profile}
          playerScore={playerScore}
          myAvatarWiki={myAvatarWiki}
          isEditingIdentity={isEditingIdentity}
          draftUsername={draftUsername}
          setDraftUsername={setDraftUsername}
          draftBio={draftBio}
          setDraftBio={setDraftBio}
          onStartEditIdentity={handleStartEditIdentity}
          onCancelEditIdentity={handleCancelEditIdentity}
          onSaveIdentity={handleSaveIdentity}
          onToggleAvatarPicker={() => setIsPickingAvatar((prev) => !prev)}
          onLogout={onLogout}
          onOpenDeleteConfirm={() => setIsConfirmingDelete(true)}
        />

        <ProfileAvatarPicker
          isOpen={isPickingAvatar}
          onClose={() => setIsPickingAvatar(false)}
          cardAvatars={cardAvatars}
          currentAvatar={profile.avatar}
          onSelectCardAvatar={handleSelectCardAvatar}
        />

        <ProfileStatsGrid
          collectionLength={collection.length}
          totalCopiesCount={totalCopiesCount}
          wikithunes={wikithunes}
          collectionTotalValue={collectionTotalValue}
          boostersOpened={stats.boostersOpened || 0}
          legendaryCount={legendaryCount}
          ultraRareCount={ultraRareCount}
          gifCardsCount={gifCardsCount}
          casinoBilan={casinoBilan}
          recordStreak={recordStreak}
          netCardsBilan={netCardsBilan}
          totalCardsDrawn={totalCardsDrawn}
          onSelectMetric={(metricKey) => setHistoryModalMetric(metricKey)}
        />
      </section>

      {/* CADRE 2 : VITRINE DE 4 CARTES FAVORITES EXPOSÉES */}
      <section className="accueil_2017_cadre">
        <div className="wiki-cadre-header flex flex-wrap items-center justify-between gap-2">
          <h2 className="wiki-smallcaps m-0">Vitrine du collectionneur</h2>
        </div>

        <ProfileShowcase
          showcaseCards={showcaseCards}
          activeShowcaseSlot={activeShowcaseSlot}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          onSelectSlot={(slotIdx) =>
            setActiveShowcaseSlot(
              activeShowcaseSlot === slotIdx ? null : slotIdx
            )
          }
        />

        {activeShowcaseSlot !== null && (
          <ProfileShowcasePicker
            onClose={() => setActiveShowcaseSlot(null)}
            collection={collection}
            filteredAndSortedCollection={filteredAndSortedCollection}
            selectedRarityFilter={selectedRarityFilter}
            onSelectRarityFilter={setSelectedRarityFilter}
            selectedThemeFilter={selectedThemeFilter}
            onSelectThemeFilter={setSelectedThemeFilter}
            sortBy={sortBy}
            onSelectSortBy={setSortBy}
            themeCounts={themeCounts}
            showcaseIds={showcaseIds}
            favorites={favorites}
            onAssignCard={handleAssignCardToShowcase}
          />
        )}
      </section>

      {/* MODAL DE CONFIRMATION DE SUPPRESSION DÉFINITIVE */}
      <ProfileDeleteModal
        isOpen={isConfirmingDelete}
        onClose={() => {
          if (!isDeleting) {
            setIsConfirmingDelete(false);
            setDeleteError(null);
          }
        }}
        userCode={userCode}
        collectionLength={collection.length}
        wikithunes={wikithunes}
        isDeleting={isDeleting}
        deleteError={deleteError}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* MODAL HISTORIQUE TRADE REPUBLIC */}
      {historyModalMetric && (
        <StatsHistoryModal
          isOpen={Boolean(historyModalMetric)}
          onClose={() => setHistoryModalMetric(null)}
          metricId={historyModalMetric}
          collection={collection}
          stats={stats}
          wikithunes={wikithunes}
          collectionValue={collectionTotalValue}
          playerName={profile.username || 'Mon profil'}
          isLocalUser={true}
          createdAt={accountCreatedAt || profile.createdAt}
          userCode={userCode}
        />
      )}
    </div>
  );
}
