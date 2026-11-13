/**
 * @file Rôle : Composant conteneur de l'Hôtel des ventes et salle des marchés d'enchères entre joueurs.
 * Dépendances : React, `../hooks/useAuctionMarket`, `./market/*`.
 * Effets de bord : Synchronisation de compte joueur et lecture/écriture marché.
 */

import React from 'react';
import {
  useAuctionMarket,
  formatRemainingTime,
  isAuctionInAntiSnipeZone,
  sanitizeNumberInput,
} from '../hooks/useAuctionMarket';
import MarketBrowseTab from './market/MarketBrowseTab';
import MarketSellTab from './market/MarketSellTab';
import MarketMyListingsTab from './market/MarketMyListingsTab';

/**
 * Salle des marchés et d'enchères WikiCards.
 * @param {Object} props
 * @param {string} props.userCode - Identifiant unique du joueur (WIKI-XXXX)
 * @param {Array<Object>} [props.collection=[]] - Collection du joueur
 * @param {Array<string>} [props.favorites=[]] - IDs des cartes favorites
 * @param {number} [props.wikithunes=0] - Solde de monnaie
 * @param {function(Object): void} props.onSyncAccountState - Synchronisation de l'état joueur
 * @returns {JSX.Element} Hôtel des ventes avec onglets de navigation
 */
export default function AuctionMarket({
  userCode,
  collection = [],
  favorites = [],
  wikithunes = 0,
  onSyncAccountState,
}) {
  const market = useAuctionMarket({
    userCode,
    collection,
    favorites,
    wikithunes,
    onSyncAccountState,
  });

  return (
    <div className="space-y-5">
      <section className="accueil_2017_cadre">
        {/* En-tête avec sous-onglets Vector 2022 */}
        <div className="wiki-cadre-header flex flex-wrap items-center justify-between gap-4">
          <h2 className="wiki-smallcaps m-0">
            {market.activeSubTab === 'browse'
              ? 'Hôtel des ventes & Enchères'
              : market.activeSubTab === 'sell'
              ? 'Mettre une carte aux enchères'
              : 'Mes ventes & enchères'}
          </h2>

          <div className="flex items-center gap-5 text-[14px]">
            <button
              type="button"
              onClick={() => market.setActiveSubTab('browse')}
              className={`vector-tab-link ${
                market.activeSubTab === 'browse' ? 'selected' : ''
              }`}
            >
              Enchères en cours ({market.activeListings.length})
            </button>
            <button
              type="button"
              onClick={() => market.setActiveSubTab('sell')}
              className={`vector-tab-link ${
                market.activeSubTab === 'sell' ? 'selected' : ''
              }`}
            >
              Mettre en vente
            </button>
            <button
              type="button"
              onClick={() => market.setActiveSubTab('my_listings')}
              className={`vector-tab-link ${
                market.activeSubTab === 'my_listings' ? 'selected' : ''
              }`}
            >
              Mes annonces (
              {market.myListings.filter((l) => l.status === 'active').length})
            </button>
          </div>
        </div>

        {market.feedback && (
          <div
            className={`mb-4 p-3 rounded-[2px] border text-[13px] font-medium ${
              market.feedback.type === 'success'
                ? 'bg-[#dff2eb] border-[#099979] text-[#177860]'
                : 'bg-[#ffe9e5] border-[#f54739] text-[#bf3c2c]'
            }`}
          >
            {market.feedback.message}
          </div>
        )}

        {market.activeSubTab === 'browse' ? (
          <MarketBrowseTab
            activeListings={market.activeListings}
            filteredBrowseListings={market.filteredBrowseListings}
            rarityFilter={market.rarityFilter}
            setRarityFilter={market.setRarityFilter}
            userCode={userCode}
            wikithunes={wikithunes}
            bidInputs={market.bidInputs}
            setBidInputs={market.setBidInputs}
            handleMarketAction={market.handleMarketAction}
            now={market.now}
            formatRemainingTime={formatRemainingTime}
            isAuctionInAntiSnipeZone={isAuctionInAntiSnipeZone}
            sanitizeNumberInput={sanitizeNumberInput}
          />
        ) : market.activeSubTab === 'sell' ? (
          <MarketSellTab
            collection={collection}
            favorites={favorites}
            sellRarityFilter={market.sellRarityFilter}
            setSellRarityFilter={market.setSellRarityFilter}
            selectedSellCard={market.selectedSellCard}
            selectedSellCardId={market.selectedSellCardId}
            startingBidInput={market.startingBidInput}
            setStartingBidInput={market.setStartingBidInput}
            buyoutPriceInput={market.buyoutPriceInput}
            setBuyoutPriceInput={market.setBuyoutPriceInput}
            isCreatingListing={market.isCreatingListing}
            handleCreateListing={market.handleCreateListing}
            handleSelectCardToSell={market.handleSelectCardToSell}
            sanitizeNumberInput={sanitizeNumberInput}
            sellFormRef={market.sellFormRef}
          />
        ) : (
          <MarketMyListingsTab
            myListings={market.myListings}
            handleMarketAction={market.handleMarketAction}
            now={market.now}
            formatRemainingTime={formatRemainingTime}
          />
        )}
      </section>
    </div>
  );
}
