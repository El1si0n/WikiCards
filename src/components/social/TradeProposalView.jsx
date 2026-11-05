/**
 * @file Rôle : Composant d'interface de composition et d'envoi d'une offre d'échange de cartes avec un autre joueur.
 * Dépendances : React, `lucide-react`, `../WikiCard`, `../../config/rarities`.
 * Effets de bord : Sélection des cartes à offrir/demander et envoi de la proposition d'échange.
 */

import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import WikiCard from '../WikiCard';
import { RARITY_TIERS } from '../../config/rarities';

/**
 * Interface bilatérale de sélection des cartes pour une proposition d'échange.
 * @param {Object} props
 * @param {Object} props.activePeerProfile - Profil de l'ami inspecté
 * @param {Object} props.selectedPeer - Données du joueur pair sélectionné
 * @param {boolean} props.isSubmittingTrade - Indicateur de soumission réseau en cours
 * @param {Array<string>} props.requestedCardIds - IDs des cartes réclamées
 * @param {Array<string>} props.offeredCardIds - IDs des cartes proposées
 * @param {Object.<string, number>} props.offeredCountsMap - Quantités de cartes proposées par ID
 * @param {Object.<string, number>} props.requestedCountsMap - Quantités de cartes réclamées par ID
 * @param {function(): Promise<void>} props.handleSendTradeOffer - Callback d'envoi de l'offre
 * @param {Array<Object>} props.collection - Collection du joueur local
 * @param {Array<string>} props.favorites - IDs des cartes favorites protégées
 * @param {Array<Object>} props.peerCollection - Collection du joueur ami
 * @param {string} props.myRarityFilter - Filtre de rareté actif pour l'inventaire local
 * @param {function(string): void} props.setMyRarityFilter - Callback de changement du filtre local
 * @param {string} props.peerRarityFilter - Filtre de rareté actif pour l'inventaire de l'ami
 * @param {function(string): void} props.setPeerRarityFilter - Callback de changement du filtre ami
 * @param {function(Object): void} props.handleToggleMyCardForTrade - Bascule d'ajout/retrait d'une carte locale
 * @param {function(Object): void} props.handleTogglePeerCardForTrade - Bascule d'ajout/retrait d'une carte distante
 */
export default function TradeProposalView({
  activePeerProfile,
  selectedPeer,
  isSubmittingTrade,
  requestedCardIds,
  offeredCardIds,
  offeredCountsMap,
  requestedCountsMap,
  handleSendTradeOffer,
  collection,
  favorites,
  peerCollection,
  myRarityFilter,
  setMyRarityFilter,
  peerRarityFilter,
  setPeerRarityFilter,
  handleToggleMyCardForTrade,
  handleTogglePeerCardForTrade,
}) {
  return (
    <div className="bg-[#f8f9fa] border border-[#a2a9b1] rounded-[2px] p-4 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#c8ccd1] pb-2.5">
        <div>
          <h3 className="text-[14px] font-bold text-[#202122] uppercase tracking-wider m-0">
            Créer une proposition d'échange
          </h3>
          <p className="text-[12px] text-[#54595d] m-0 mt-0.5">
            Cliquez sur les cartes ci-dessous pour composer l'échange (jusqu'à 4 cartes de chaque côté).
          </p>
        </div>

        <button
          type="button"
          disabled={
            isSubmittingTrade ||
            (requestedCardIds.length === 0 && offeredCardIds.length === 0)
          }
          onClick={handleSendTradeOffer}
          className="wiki-casino-btn wiki-casino-btn--primary !min-h-[36px] !py-1.5 !px-4 !text-[13px]"
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>
            {isSubmittingTrade
              ? 'Envoi en cours...'
              : "Envoyer l'offre d'échange"}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Côté Gauche : Ce que vous donnez */}
        <div className="bg-white border border-[#c8ccd1] rounded-[2px] p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#eaecf0] pb-2">
            <span className="text-[12.5px] font-bold text-[#202122] uppercase">
              Vos cartes proposées ({offeredCardIds.length}/4)
            </span>
            <div className="flex flex-wrap gap-1">
              {[...RARITY_TIERS].reverse().map((t) => {
                const cnt = collection.filter(
                  (c) => c.rarity === t.code
                ).length;
                return (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() => setMyRarityFilter(t.code)}
                    className={`px-2 py-0.5 text-[11px] rounded-[2px] border cursor-pointer ${
                      myRarityFilter === t.code
                        ? 'ring-2 ring-[#3366cc] font-bold bg-white border-[#3366cc]'
                        : 'bg-[#f8f9fa] border-[#c8ccd1]'
                    }`}
                  >
                    {t.code} ({cnt})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto p-1 justify-items-center">
            {collection
              .filter((c) => c.rarity === myRarityFilter)
              .map((card) => {
                const selQty = offeredCountsMap[card.id] || 0;
                const isFavProtected =
                  favorites.includes(card.id) &&
                  (card.count || 1) <= 1;
                return (
                  <WikiCard
                    key={card.id}
                    card={card}
                    mini={true}
                    duplicateCount={card.count || 1}
                    isSelected={selQty > 0}
                    isDisabledSelection={isFavProtected}
                    selectionBadgeText={
                      isFavProtected
                        ? '★ Protégée'
                        : selQty > 0
                        ? `Offert ×${selQty}`
                        : 'Proposer'
                    }
                    onSelectCard={() =>
                      handleToggleMyCardForTrade(card)
                    }
                  />
                );
              })}
          </div>
        </div>

        {/* Côté Droit : Ce que vous demandez chez l'ami */}
        <div className="bg-white border border-[#c8ccd1] rounded-[2px] p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#eaecf0] pb-2">
            <span className="text-[12.5px] font-bold text-[#202122] uppercase">
              Cartes demandées à{' '}
              {activePeerProfile?.username || selectedPeer?.code} (
              {requestedCardIds.length}/4)
            </span>
            <div className="flex flex-wrap gap-1">
              {[...RARITY_TIERS].reverse().map((t) => {
                const cnt = peerCollection.filter(
                  (c) => c.rarity === t.code
                ).length;
                return (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() => setPeerRarityFilter(t.code)}
                    className={`px-2 py-0.5 text-[11px] rounded-[2px] border cursor-pointer ${
                      peerRarityFilter === t.code
                        ? 'ring-2 ring-[#3366cc] font-bold bg-white border-[#3366cc]'
                        : 'bg-[#f8f9fa] border-[#c8ccd1]'
                    }`}
                  >
                    {t.code} ({cnt})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto p-1 justify-items-center">
            {peerCollection
              .filter((c) => c.rarity === peerRarityFilter)
              .map((card) => {
                const selQty = requestedCountsMap[card.id] || 0;
                return (
                  <WikiCard
                    key={card.id}
                    card={card}
                    mini={true}
                    duplicateCount={card.count || 1}
                    isSelected={selQty > 0}
                    selectionBadgeText={
                      selQty > 0 ? `Demandé ×${selQty}` : 'Demander'
                    }
                    onSelectCard={() =>
                      handleTogglePeerCardForTrade(card)
                    }
                  />
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
