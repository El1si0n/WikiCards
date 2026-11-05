// Rôle : Conteneur et routeur d'affichage des vues d'onglets (Booster, WikiSino, Social, Marché, Profil, Classeur).
// Dépendances : React (lazy, Suspense), BoosterTab, Classeur, WikiSino, SocialHub, AuctionMarket, UserProfile.
// Effets de bord : Aucun (délègue les interactions aux sous-composants).

import React, { lazy, Suspense } from 'react';
import BoosterTab from './BoosterTab';
import Classeur from './Classeur';

const WikiSino = lazy(() => import('./WikiSino'));
const SocialHub = lazy(() => import('./SocialHub'));
const AuctionMarket = lazy(() => import('./AuctionMarket'));
const UserProfile = lazy(() => import('./UserProfile'));

function TabLoadingFallback() {
  return (
    <div className="py-20 flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-3 border-[#3366cc] border-t-transparent rounded-full animate-spin" />
      <span className="text-[13px] text-[#54595d]">Chargement...</span>
    </div>
  );
}

/**
 * Routeur de contenu pour l'onglet actuellement sélectionné.
 * @param {object} props
 * @param {string} props.activeTab - Identifiant de l'onglet actif.
 * @param {(tab: string) => void} props.setActiveTab - Callback de changement d'onglet.
 * @param {boolean} props.showRarityRules - Affichage de la colonne de barème dans le booster.
 * @param {string} props.searchQuery - Terme de recherche textuelle du classeur.
 * @param {(query: string) => void} props.setSearchQuery - Mise à jour du terme de recherche.
 * @param {object} props.account - Objet d'état et actions du joueur issu de usePlayerAccount.
 * @returns {React.ReactElement}
 */
export default function AppTabContent({
  activeTab,
  setActiveTab,
  showRarityRules,
  searchQuery,
  setSearchQuery,
  account = {},
}) {
  const collection = account.collection || [];
  const favorites = account.favorites || [];
  const existingCardIds = account.existingCardIds || [];
  const stats = account.stats || {};
  const wikithunes = account.wikithunes ?? 0;

  if (activeTab === 'booster') {
    return (
      <BoosterTab
        onCardsOpened={account.addCardsToCollection}
        existingCardIds={existingCardIds}
        favorites={favorites}
        onToggleFavorite={account.toggleFavorite}
        onGoToClasseur={() => setActiveTab('classeur')}
        wikithunes={wikithunes}
        onSpendWikithunes={account.spendWikithunes}
        freeBoostersCount={account.freeBoostersCount ?? 0}
        timeRemainingFreeBoosters={account.timeRemainingFreeBoosters || ''}
        onUseFreeBooster={account.handleUseFreeBooster}
        showRarityRules={showRarityRules}
      />
    );
  }

  if (activeTab === 'wikisino') {
    return (
      <Suspense fallback={<TabLoadingFallback />}>
        <WikiSino
          collection={collection}
          favorites={favorites}
          wikithunes={wikithunes}
          onSpendWikithunes={account.spendWikithunes}
          onAddWikithunes={account.addWikithunes}
          onConsumeCards={account.consumeCardsFromCollection}
          onCardWon={(wonCard) => account.addCardsToCollection([wonCard], false)}
          existingCardIds={existingCardIds}
          onToggleFavorite={account.toggleFavorite}
          stats={stats}
          onUpdateStats={account.handleUpdateStats}
        />
      </Suspense>
    );
  }

  if (activeTab === 'social') {
    return (
      <Suspense fallback={<TabLoadingFallback />}>
        <SocialHub
          userCode={account.userCode}
          collection={collection}
          favorites={favorites}
          wikithunes={wikithunes}
          stats={stats}
          userProfile={account.userProfile}
          accountCreatedAt={account.accountCreatedAt}
          onSyncAccountState={account.handleSyncAccountState}
        />
      </Suspense>
    );
  }

  if (activeTab === 'market') {
    return (
      <Suspense fallback={<TabLoadingFallback />}>
        <AuctionMarket
          userCode={account.userCode}
          collection={collection}
          favorites={favorites}
          wikithunes={wikithunes}
          onSyncAccountState={account.handleSyncAccountState}
        />
      </Suspense>
    );
  }

  if (activeTab === 'profile') {
    return (
      <Suspense fallback={<TabLoadingFallback />}>
        <UserProfile
          userCode={account.userCode}
          profile={account.userProfile}
          onUpdateProfile={account.handleUpdateUserProfile}
          onLogout={account.handleLogout}
          onDeleteAccount={account.handleDeleteAccount}
          collection={collection}
          favorites={favorites}
          onToggleFavorite={account.toggleFavorite}
          wikithunes={wikithunes}
          stats={stats}
          accountCreatedAt={account.accountCreatedAt}
        />
      </Suspense>
    );
  }

  return (
    <Classeur
      collection={collection}
      favorites={favorites}
      onToggleFavorite={account.toggleFavorite}
      onRecycleCards={account.recycleCards}
      onGoToBooster={() => setActiveTab('booster')}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
  );
}
