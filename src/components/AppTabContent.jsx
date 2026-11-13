// Rôle : Conteneur et routeur d'affichage des vues d'onglets (Booster, WikiSino, Social, Marché, Profil, Classeur).
// Dépendances : React, BoosterTab, Classeur, WikiSino, SocialHub, AuctionMarket, UserProfile.
// Effets de bord : Aucun (délègue les interactions aux sous-composants).

import React from 'react';
import BoosterTab from './BoosterTab';
import Classeur from './Classeur';
import WikiSino from './WikiSino';
import SocialHub from './SocialHub';
import AuctionMarket from './AuctionMarket';
import UserProfile from './UserProfile';

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
  account,
}) {
  if (activeTab === 'booster') {
    return (
      <BoosterTab
        onCardsOpened={account.addCardsToCollection}
        existingCardIds={account.existingCardIds}
        favorites={account.favorites}
        onToggleFavorite={account.toggleFavorite}
        onGoToClasseur={() => setActiveTab('classeur')}
        wikithunes={account.wikithunes}
        onSpendWikithunes={account.spendWikithunes}
        freeBoostersCount={account.freeBoostersCount}
        timeRemainingFreeBoosters={account.timeRemainingFreeBoosters}
        onUseFreeBooster={account.handleUseFreeBooster}
        showRarityRules={showRarityRules}
      />
    );
  }

  if (activeTab === 'wikisino') {
    return (
      <WikiSino
        collection={account.collection}
        favorites={account.favorites}
        wikithunes={account.wikithunes}
        onSpendWikithunes={account.spendWikithunes}
        onAddWikithunes={account.addWikithunes}
        onConsumeCards={account.consumeCardsFromCollection}
        onCardWon={(wonCard) => account.addCardsToCollection([wonCard], false)}
        existingCardIds={account.existingCardIds}
        onToggleFavorite={account.toggleFavorite}
        stats={account.stats}
        onUpdateStats={account.handleUpdateStats}
      />
    );
  }

  if (activeTab === 'social') {
    return (
      <SocialHub
        userCode={account.userCode}
        collection={account.collection}
        favorites={account.favorites}
        wikithunes={account.wikithunes}
        stats={account.stats}
        userProfile={account.userProfile}
        accountCreatedAt={account.accountCreatedAt}
        onSyncAccountState={account.handleSyncAccountState}
      />
    );
  }

  if (activeTab === 'market') {
    return (
      <AuctionMarket
        userCode={account.userCode}
        collection={account.collection}
        favorites={account.favorites}
        wikithunes={account.wikithunes}
        onSyncAccountState={account.handleSyncAccountState}
      />
    );
  }

  if (activeTab === 'profile') {
    return (
      <UserProfile
        userCode={account.userCode}
        profile={account.userProfile}
        onUpdateProfile={account.handleUpdateUserProfile}
        onLogout={account.handleLogout}
        onDeleteAccount={account.handleDeleteAccount}
        collection={account.collection}
        favorites={account.favorites}
        onToggleFavorite={account.toggleFavorite}
        wikithunes={account.wikithunes}
        stats={account.stats}
        accountCreatedAt={account.accountCreatedAt}
      />
    );
  }

  return (
    <Classeur
      collection={account.collection}
      favorites={account.favorites}
      onToggleFavorite={account.toggleFavorite}
      onRecycleCards={account.recycleCards}
      onGoToBooster={() => setActiveTab('booster')}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
  );
}
