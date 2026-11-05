/**
 * @file Rôle : Hub social MediaWiki (annuaire des joueurs, inspection de profils, propositions et gestion d'échanges).
 * Dépendances : React, `lucide-react`, `../hooks/useSocialHub`, composants sous `src/components/social/`, `StatsHistoryModal`.
 * Effets de bord : Synchronisation serveur bidirectionnelle, sons système, ouverture des graphiques Trade Republic.
 */

import React from 'react';
import { Users, ArrowLeftRight, ArrowLeft } from 'lucide-react';
import useSocialHub from '../hooks/useSocialHub';
import SocialDirectoryTab from './social/SocialDirectoryTab';
import SocialTradesTab from './social/SocialTradesTab';
import PeerProfileView from './social/PeerProfileView';
import TradeProposalView from './social/TradeProposalView';
import StatsHistoryModal from './StatsHistoryModal';

/**
 * Composant principal de l'espace communautaire WikiCards.
 * @param {Object} props
 * @param {string} props.userCode - Code unique du compte joueur
 * @param {Array<Object>} props.collection - Collection locale des cartes
 * @param {Object} props.userProfile - Données de profil du joueur local
 * @param {Object} props.stats - Statistiques d'accomplissement du compte
 * @param {number} props.wikithunes - Solde de monnaie virtuelle
 * @param {number} props.accountCreatedAt - Timestamp de création du compte
 * @param {Array<string>} [props.favorites] - IDs des cartes favorites
 * @param {function(): Promise<void>} [props.onSyncAccountState] - Callback de resynchronisation d'état joueur
 */
export default function SocialHub({
  userCode,
  collection,
  userProfile,
  stats,
  wikithunes,
  accountCreatedAt,
  favorites = [],
  onSyncAccountState,
}) {
  const {
    activeSubTab,
    setActiveSubTab,
    selectedPeer,
    setSelectedPeer,
    isProposingTrade,
    setIsProposingTrade,
    tradeFeedback,
    setTradeFeedback,
    tradeActionError,
    trades,
    userSearchQuery,
    setUserSearchQuery,
    myRarityFilter,
    setMyRarityFilter,
    peerRarityFilter,
    setPeerRarityFilter,
    offeredCardIds,
    requestedCardIds,
    isSubmittingTrade,
    historyModalMetric,
    setHistoryModalMetric,
    rankedUsers,
    filteredUsers,
    topPlayerCode,
    isSelectedPeerMe,
    activePeerProfile,
    peerCollection,
    peerShowcaseCards,
    peerAvatarWiki,
    peerStats,
    selectedPeerScore,
    offeredCountsMap,
    requestedCountsMap,
    handleSelectPeer,
    handleToggleMyCardForTrade,
    handleTogglePeerCardForTrade,
    handleSendTradeOffer,
    handleTradeAction,
  } = useSocialHub({
    userCode,
    collection,
    userProfile,
    stats,
    wikithunes,
    accountCreatedAt,
    onSyncAccountState,
  });

  return (
    <div className="space-y-6">
      <section className="bg-white border border-[#a2a9b1] rounded-[2px] p-4 sm:p-6 shadow-xs">
        {/* En-tête avec sous-onglets Vector 2022 : Annuaire des joueurs | Propositions d'échange */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#a2a9b1] pb-3 mb-6">
          <div>
            <h2 className="wiki-serif text-[24px] sm:text-[28px] font-normal text-[#101418] m-0 leading-tight">
              {selectedPeer
                ? activePeerProfile?.username || selectedPeer.code
                : activeSubTab === 'directory'
                ? 'Communauté des joueurs'
                : "Propositions d'échange"}
            </h2>
            <p className="text-[13px] text-[#54595d] mt-1 mb-0">
              {selectedPeer
                ? 'Consultez la vitrine de cartes et les statistiques de ce joueur Wikipédia.'
                : activeSubTab === 'directory'
                ? 'Découvrez les autres joueurs de WikiCards, inspectez leurs collections et proposez des échanges.'
                : "Gérez vos propositions d'échanges de cartes envoyées et reçues."}
            </p>
          </div>

          {/* Onglets style Vector 2022 */}
          {!selectedPeer && (
            <div className="vector-menu-tabs shrink-0">
              <button
                type="button"
                onClick={() => setActiveSubTab('directory')}
                className={`vector-tab ${
                  activeSubTab === 'directory' ? 'selected' : ''
                }`}
              >
                <Users className="w-4 h-4 mr-1.5" />
                <span>Joueurs ({rankedUsers.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('trades')}
                className={`vector-tab ${
                  activeSubTab === 'trades' ? 'selected' : ''
                }`}
              >
                <ArrowLeftRight className="w-4 h-4 mr-1.5" />
                <span>
                  Échanges (
                  {trades.filter((t) => t.status === 'pending').length} en
                  attente)
                </span>
              </button>
            </div>
          )}
        </div>

        {selectedPeer ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#eaecf0]">
              <button
                type="button"
                onClick={() => {
                  setSelectedPeer(null);
                  setIsProposingTrade(false);
                }}
                className="wiki-casino-btn wiki-casino-btn--neutral !min-h-[32px] !py-1 !px-3 !text-[12.5px]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour</span>
              </button>

              {selectedPeer.code !== userCode && (
                <button
                  type="button"
                  onClick={() => {
                    setIsProposingTrade((prev) => !prev);
                    setTradeFeedback(null);
                  }}
                  className={`wiki-casino-btn !min-h-[34px] !py-1 !px-3.5 !text-[13px] ${
                    isProposingTrade
                      ? 'wiki-casino-btn--neutral'
                      : 'wiki-casino-btn--primary'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>
                    {isProposingTrade
                      ? "Fermer l'interface d'échange"
                      : 'Proposer un échange'}
                  </span>
                </button>
              )}
            </div>

            {tradeFeedback && (
              <div
                className={`p-3 rounded-[2px] border text-[13px] font-medium ${
                  tradeFeedback.type === 'success'
                    ? 'bg-[#dff2eb] border-[#099979] text-[#177860]'
                    : 'bg-[#ffe9e5] border-[#f54739] text-[#bf3c2c]'
                }`}
              >
                {tradeFeedback.message}
              </div>
            )}

            {isProposingTrade && (
              <TradeProposalView
                activePeerProfile={activePeerProfile}
                selectedPeer={selectedPeer}
                isSubmittingTrade={isSubmittingTrade}
                requestedCardIds={requestedCardIds}
                offeredCardIds={offeredCardIds}
                offeredCountsMap={offeredCountsMap}
                requestedCountsMap={requestedCountsMap}
                handleSendTradeOffer={handleSendTradeOffer}
                collection={collection}
                favorites={favorites}
                peerCollection={peerCollection}
                myRarityFilter={myRarityFilter}
                setMyRarityFilter={setMyRarityFilter}
                peerRarityFilter={peerRarityFilter}
                setPeerRarityFilter={setPeerRarityFilter}
                handleToggleMyCardForTrade={handleToggleMyCardForTrade}
                handleTogglePeerCardForTrade={handleTogglePeerCardForTrade}
              />
            )}

            <PeerProfileView
              activePeerProfile={activePeerProfile}
              selectedPeer={selectedPeer}
              selectedPeerScore={selectedPeerScore}
              topPlayerCode={topPlayerCode}
              peerAvatarWiki={peerAvatarWiki}
              peerStats={peerStats}
              peerCollection={peerCollection}
              peerShowcaseCards={peerShowcaseCards}
              onOpenHistoryMetric={setHistoryModalMetric}
            />
          </div>
        ) : activeSubTab === 'directory' ? (
          <SocialDirectoryTab
            filteredUsers={filteredUsers}
            userSearchQuery={userSearchQuery}
            setUserSearchQuery={setUserSearchQuery}
            userCode={userCode}
            userProfile={userProfile}
            collection={collection}
            wikithunes={wikithunes}
            handleSelectPeer={handleSelectPeer}
          />
        ) : (
          <SocialTradesTab
            trades={trades}
            tradeActionError={tradeActionError}
            userCode={userCode}
            handleTradeAction={handleTradeAction}
          />
        )}
      </section>

      {/* Modal interactif Trade Republic pour l'historique des stats du joueur visité */}
      {historyModalMetric && (
        <StatsHistoryModal
          isOpen={Boolean(historyModalMetric)}
          onClose={() => setHistoryModalMetric(null)}
          metricId={historyModalMetric}
          collection={peerCollection}
          stats={isSelectedPeerMe ? stats : selectedPeer?.stats || {}}
          wikithunes={peerStats.wikithunes}
          collectionValue={peerStats.totalVal}
          playerName={
            activePeerProfile?.username || selectedPeer?.code || 'Joueur'
          }
          isLocalUser={isSelectedPeerMe}
          createdAt={isSelectedPeerMe ? accountCreatedAt : selectedPeer?.createdAt}
          snapshots={isSelectedPeerMe ? undefined : (selectedPeer?.snapshots || [])}
          userCode={isSelectedPeerMe ? userCode : selectedPeer?.code}
        />
      )}
    </div>
  );
}
