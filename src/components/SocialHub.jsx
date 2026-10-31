import React, { useState, useEffect, useMemo } from 'react';
import WikiCard from './WikiCard';
import { RARITY_TIERS, getCardRecycleValue } from '../config/rarities';
import { WIKI_THEMES, detectCardTheme } from '../config/themes';
import {
  fetchAllUsersDirectory,
  fetchUserAccountByCode,
  fetchUserTrades,
  createTradeOffer,
  respondToTradeOffer,
} from '../services/userStorage';
import { soundManager } from '../services/sound';
import {
  Users,
  ArrowLeftRight,
  ArrowLeft,
  Check,
  X,
  Search,
  BookOpen,
} from 'lucide-react';
import WikithuneIcon from './WikithuneIcon';

const RARITY_ORDER = {
  L: 6,
  UR: 5,
  SR: 4,
  R: 3,
  PC: 2,
  C: 1,
};

export default function SocialHub({
  userCode,
  collection,
  favorites,
  wikithunes = 0,
  stats = {},
  userProfile = {},
  onSyncAccountState,
}) {
  // Navigation interne : 'directory' (Annuaire des joueurs) | 'trades' (Mes propositions d'échange)
  const [activeSubTab, setActiveSubTab] = useState('directory');

  // Liste des utilisateurs enregistrés
  const [usersList, setUsersList] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Profil d'un ami / joueur actuellement consulté (null si on est sur l'annuaire)
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [isLoadingPeer, setIsLoadingPeer] = useState(false);

  // Mode création d'échange avec le joueur consulté
  const [isProposingTrade, setIsProposingTrade] = useState(false);
  const [requestedCardIds, setRequestedCardIds] = useState([]); // IDs demandés chez l'ami (max 4)
  const [offeredCardIds, setOfferedCardIds] = useState([]); // IDs offerts depuis notre classeur (max 4)
  const [peerRarityFilter, setPeerRarityFilter] = useState('C');
  const [myRarityFilter, setMyRarityFilter] = useState('C');
  const [tradeFeedback, setTradeFeedback] = useState(null);
  const [isSubmittingTrade, setIsSubmittingTrade] = useState(false);

  // Liste des échanges reçus / envoyés
  const [trades, setTrades] = useState([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [tradeActionError, setTradeActionError] = useState(null);

  const loadDirectoryAndTrades = async (silent = false) => {
    if (!silent) {
      setIsLoadingUsers(true);
      setIsLoadingTrades(true);
    }
    try {
      const [allUsers, myTrades] = await Promise.all([
        fetchAllUsersDirectory(),
        fetchUserTrades(userCode),
      ]);
      setUsersList(allUsers);
      setTrades(myTrades);
    } finally {
      if (!silent) {
        setIsLoadingUsers(false);
        setIsLoadingTrades(false);
      }
    }
  };

  useEffect(() => {
    loadDirectoryAndTrades(false);

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        loadDirectoryAndTrades(true);
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    const interval = setInterval(() => loadDirectoryAndTrades(true), 8000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      clearInterval(interval);
    };
  }, [userCode]);

  const handleInspectPeer = async (targetCode) => {
    setIsLoadingPeer(true);
    setTradeFeedback(null);
    setIsProposingTrade(false);
    setRequestedCardIds([]);
    setOfferedCardIds([]);
    try {
      if (targetCode === userCode) {
        setSelectedPeer({
          code: userCode,
          profile: userProfile,
          collection: collection,
          favorites: favorites,
          wikithunes: wikithunes,
          stats: stats,
        });
        if (collection.length > 0) {
          setPeerRarityFilter(collection[0].rarity || 'C');
          setMyRarityFilter(collection[0].rarity || 'C');
        }
        setIsLoadingPeer(false);
        return;
      }
      const fullAccount = await fetchUserAccountByCode(targetCode);
      setSelectedPeer(fullAccount);
      // Choisir par défaut une rareté présente chez le joueur
      const peerCol = Array.isArray(fullAccount.collection)
        ? fullAccount.collection
        : [];
      if (peerCol.length > 0) {
        setPeerRarityFilter(peerCol[0].rarity || 'C');
      }
      if (collection.length > 0) {
        setMyRarityFilter(collection[0].rarity || 'C');
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingPeer(false);
    }
  };

  // Filtrage de l'annuaire des joueurs
  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    return usersList.filter((u) => {
      if (!q) return true;
      return (
        String(u.username || '')
          .toLowerCase()
          .includes(q) ||
        String(u.code || '')
          .toLowerCase()
          .includes(q)
      );
    });
  }, [usersList, userSearchQuery]);

  // Données du joueur inspecté
  const isSelectedPeerMe = selectedPeer?.code === userCode;

  const activePeerProfile = useMemo(() => {
    if (isSelectedPeerMe) {
      return { ...selectedPeer?.profile, ...userProfile };
    }
    return selectedPeer?.profile || {};
  }, [isSelectedPeerMe, selectedPeer, userProfile]);

  const peerCollection = useMemo(() => {
    if (isSelectedPeerMe) {
      return Array.isArray(collection) ? collection : [];
    }
    return Array.isArray(selectedPeer?.collection) ? selectedPeer.collection : [];
  }, [isSelectedPeerMe, collection, selectedPeer]);

  const peerShowcaseCards = useMemo(() => {
    const ids = Array.isArray(activePeerProfile?.showcaseIds)
      ? activePeerProfile.showcaseIds
      : [];
    return [0, 1, 2, 3].map((idx) => {
      const id = ids[idx];
      return id
        ? peerCollection.find((c) => String(c.id) === String(id)) || null
        : null;
    });
  }, [activePeerProfile, peerCollection]);

  const peerStats = useMemo(() => {
    const totalCopies = peerCollection.reduce(
      (s, c) => s + (c.count || 1),
      0
    );
    const legendaries = peerCollection.filter((c) => c.rarity === 'L').length;
    const ultraRares = peerCollection.filter((c) => c.rarity === 'UR').length;
    const gifs = peerCollection.filter((c) =>
      Boolean(c.isShiny || c.isGif || /\.gif(\?|$|\/)/i.test(c.image || ''))
    ).length;
    const totalVal = peerCollection.reduce(
      (s, c) => s + getCardRecycleValue(c) * (c.count || 1),
      0
    );
    const boostersOpened = isSelectedPeerMe
      ? stats?.boostersOpened || 0
      : selectedPeer?.stats?.boostersOpened || 0;
    const currentWikithunes = isSelectedPeerMe
      ? typeof wikithunes === 'number'
        ? wikithunes
        : 0
      : typeof selectedPeer?.wikithunes === 'number'
      ? selectedPeer.wikithunes
      : 0;

    return {
      totalCopies,
      legendaries,
      ultraRares,
      gifs,
      totalVal,
      boostersOpened,
      wikithunes: currentWikithunes,
    };
  }, [peerCollection, isSelectedPeerMe, stats, wikithunes, selectedPeer]);

  // Compteurs d'exemplaires sélectionnés pour l'échange
  const requestedCountsMap = useMemo(() => {
    const m = {};
    requestedCardIds.forEach((id) => {
      m[id] = (m[id] || 0) + 1;
    });
    return m;
  }, [requestedCardIds]);

  const offeredCountsMap = useMemo(() => {
    const m = {};
    offeredCardIds.forEach((id) => {
      m[id] = (m[id] || 0) + 1;
    });
    return m;
  }, [offeredCardIds]);

  const handleTogglePeerCardForTrade = (card) => {
    if (!card) return;
    const currentQty = requestedCountsMap[card.id] || 0;
    const maxQty = card.count || 1;
    if (currentQty > 0 && (currentQty >= maxQty || requestedCardIds.length >= 4)) {
      setRequestedCardIds((prev) => prev.filter((id) => id !== card.id));
      soundManager.playCardSlide();
      return;
    }
    if (requestedCardIds.length >= 4) return;
    setRequestedCardIds((prev) => [...prev, card.id]);
    soundManager.playCardSlide();
  };

  const handleToggleMyCardForTrade = (card) => {
    if (!card) return;
    const isFav = favorites.includes(card.id);
    const maxQty = isFav ? Math.max(0, (card.count || 1) - 1) : card.count || 1;
    const currentQty = offeredCountsMap[card.id] || 0;

    if (currentQty > 0 && (currentQty >= maxQty || offeredCardIds.length >= 4)) {
      setOfferedCardIds((prev) => prev.filter((id) => id !== card.id));
      soundManager.playCardSlide();
      return;
    }
    if (maxQty <= 0 || offeredCardIds.length >= 4) return;
    setOfferedCardIds((prev) => [...prev, card.id]);
    soundManager.playCardSlide();
  };

  const handleSendTradeOffer = async () => {
    if (
      !selectedPeer ||
      isSubmittingTrade ||
      (requestedCardIds.length === 0 && offeredCardIds.length === 0)
    ) {
      return;
    }

    setIsSubmittingTrade(true);
    setTradeFeedback(null);
    try {
      const offeredCardsPayload = Object.entries(offeredCountsMap)
        .map(([id, qty]) => {
          const cardObj = collection.find((c) => String(c.id) === String(id));
          return cardObj ? { card: { ...cardObj, count: 1 }, qty } : null;
        })
        .filter(Boolean);

      const requestedCardsPayload = Object.entries(requestedCountsMap)
        .map(([id, qty]) => {
          const cardObj = peerCollection.find(
            (c) => String(c.id) === String(id)
          );
          return cardObj ? { card: { ...cardObj, count: 1 }, qty } : null;
        })
        .filter(Boolean);

      await createTradeOffer({
        fromCode: userCode,
        toCode: selectedPeer.code,
        offeredCards: offeredCardsPayload,
        requestedCards: requestedCardsPayload,
      });

      setRequestedCardIds([]);
      setOfferedCardIds([]);
      setIsProposingTrade(false);
      setTradeFeedback({
        type: 'success',
        message: `Proposition d'échange envoyée à ${
          activePeerProfile?.username || selectedPeer.code
        } !`,
      });
      await loadDirectoryAndTrades();
    } catch (err) {
      setTradeFeedback({
        type: 'error',
        message: err?.message || "Erreur lors de l'envoi de l'échange.",
      });
    } finally {
      setIsSubmittingTrade(false);
    }
  };

  const handleTradeAction = async (tradeId, action) => {
    setTradeActionError(null);
    try {
      const res = await respondToTradeOffer(tradeId, action);
      if (action === 'accept') {
        soundManager.playSummaryFanfare();
        // Si on est l'un des deux joueurs, on met à jour notre état local immédiatement
        if (res.updatedTo && res.updatedTo.code === userCode) {
          onSyncAccountState(res.updatedTo);
        } else if (res.updatedFrom && res.updatedFrom.code === userCode) {
          onSyncAccountState(res.updatedFrom);
        }
      }
      await loadDirectoryAndTrades();
    } catch (err) {
      setTradeActionError(
        err?.message || "Impossible d'effectuer cette action."
      );
    }
  };

  const pendingIncomingCount = useMemo(
    () =>
      trades.filter((t) => t.status === 'pending' && t.toCode === userCode)
        .length,
    [trades, userCode]
  );

  return (
    <div className="space-y-5">
      <section className="accueil_2017_cadre">
        {/* En-tête avec sous-onglets Vector 2022 : Annuaire des joueurs | Propositions d'échange */}
        <div className="wiki-cadre-header flex flex-wrap items-center justify-between gap-4">
          <h2 className="wiki-smallcaps m-0">
            {selectedPeer
              ? `Profil de ${
                  activePeerProfile?.username || selectedPeer.code
                }`
              : activeSubTab === 'directory'
              ? 'Communauté des joueurs'
              : "Propositions d'échange"}
          </h2>

          <div className="flex items-center gap-5 text-[14px]">
            <button
              type="button"
              onClick={() => {
                setSelectedPeer(null);
                setActiveSubTab('directory');
              }}
              className={`vector-tab-link ${
                activeSubTab === 'directory' ? 'selected' : ''
              }`}
            >
              Joueurs ({usersList.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPeer(null);
                setActiveSubTab('trades');
              }}
              className={`vector-tab-link inline-flex items-center gap-1.5 ${
                activeSubTab === 'trades' ? 'selected' : ''
              }`}
            >
              <span>Échanges</span>
              {pendingIncomingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#3366cc] text-white text-[11px] font-bold">
                  {pendingIncomingCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* =====================================================================
            VUE 1 : PROFIL D'UN AMI / JOUEUR INSPECTÉ + PROPOSITION D'ÉCHANGE
        ===================================================================== */}
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
                <span>Retour à la liste des joueurs</span>
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
                      : 'Proposer un échange de cartes'}
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

            {/* Identité & 8 statistiques du joueur visité */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-[#eaecf0]">
                <div className="w-[80px] h-[80px] rounded-[2px] border border-[#a2a9b1] bg-[#f8f9fa] p-1 shrink-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={
                      activePeerProfile?.avatar ||
                      'https://fr.wikipedia.org/static/images/icons/wikipedia.png'
                    }
                    alt=""
                    className="w-full h-full object-cover rounded-[1px]"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="wiki-serif text-[22px] font-normal text-[#101418] m-0 leading-tight">
                      {activePeerProfile?.username || selectedPeer.code}
                    </h3>
                  </div>
                  <p className="text-[13.5px] text-[#54595d] mt-1 mb-0 leading-[1.5]">
                    {activePeerProfile?.bio ||
                      'Contributeur et collectionneur d’articles sur Wikipédia FR.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] p-3">
                  <span className="block text-[11.5px] text-[#54595d] uppercase font-bold">
                    Articles uniques
                  </span>
                  <div className="text-[18px] font-extrabold text-[#202122] mt-1">
                    {peerCollection.length}
                  </div>
                </div>

                <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] p-3">
                  <span className="block text-[11.5px] text-[#54595d] uppercase font-bold">
                    Total de cartes
                  </span>
                  <div className="text-[18px] font-extrabold text-[#202122] mt-1">
                    {peerStats.totalCopies}
                  </div>
                </div>

                <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] p-3">
                  <span className="block text-[11.5px] text-[#54595d] uppercase font-bold">
                    Solde actuel
                  </span>
                  <div className="text-[18px] font-extrabold text-[#202122] mt-1 inline-flex items-center gap-1">
                    <span>
                      {new Intl.NumberFormat('fr-FR').format(
                        peerStats.wikithunes
                      )}
                    </span>
                    <WikithuneIcon className="w-4 h-4 text-[#3366cc]" />
                  </div>
                </div>

                <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] p-3">
                  <span className="block text-[11.5px] text-[#54595d] uppercase font-bold">
                    Valeur du classeur
                  </span>
                  <div className="text-[18px] font-extrabold text-[#202122] mt-1 inline-flex items-center gap-1">
                    <span>
                      {new Intl.NumberFormat('fr-FR').format(peerStats.totalVal)}
                    </span>
                    <WikithuneIcon className="w-4 h-4 text-[#3366cc]" />
                  </div>
                </div>

                <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] p-3">
                  <span className="block text-[11.5px] text-[#54595d] uppercase font-bold">
                    Boosters ouverts
                  </span>
                  <div className="text-[18px] font-extrabold text-[#202122] mt-1">
                    {peerStats.boostersOpened}
                  </div>
                </div>

                <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] p-3">
                  <span className="block text-[11.5px] text-[#54595d] uppercase font-bold">
                    Légendaires (L)
                  </span>
                  <div className="text-[18px] font-extrabold text-[#202122] mt-1">
                    {peerStats.legendaries}
                  </div>
                </div>

                <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] p-3">
                  <span className="block text-[11.5px] text-[#54595d] uppercase font-bold">
                    Ultra Rares (UR)
                  </span>
                  <div className="text-[18px] font-extrabold text-[#202122] mt-1">
                    {peerStats.ultraRares}
                  </div>
                </div>

                <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] p-3">
                  <span className="block text-[11.5px] text-[#54595d] uppercase font-bold">
                    Cartes GIF (Métal)
                  </span>
                  <div className="text-[18px] font-extrabold text-[#202122] mt-1">
                    {peerStats.gifs}
                  </div>
                </div>
              </div>
            </div>

            {/* INTERFACE DE PROPOSITION D'ÉCHANGE (si active) */}
            {isProposingTrade && (
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
                      (requestedCardIds.length === 0 &&
                        offeredCardIds.length === 0)
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
                        {activePeerProfile?.username || selectedPeer.code} (
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
            )}

            {/* Vitrine du joueur visité */}
            <div className="pt-2 border-t border-[#eaecf0]">
              <h3 className="wiki-smallcaps mb-3">Vitrine du collectionneur</h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 justify-items-center">
                {peerShowcaseCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="w-full max-w-[272px] flex flex-col items-center"
                  >
                    <div className="w-full flex items-center justify-between mb-2 px-1">
                      <span className="text-[12px] font-bold text-[#54595d] uppercase tracking-wider">
                        Vitrine #{idx + 1}
                      </span>
                    </div>
                    {card ? (
                      <WikiCard card={card} compact={true} />
                    ) : (
                      <div className="w-full h-[446px] rounded-[14px] border-2 border-dashed border-[#c8ccd1] bg-[#f8f9fa] flex items-center justify-center p-6 text-center text-[13px] text-[#72777d]">
                        Emplacement vide
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeSubTab === 'directory' ? (
          /* =====================================================================
             VUE 2 : ANNUAIRE DE TOUS LES JOUEURS ENREGISTRÉS
          ===================================================================== */
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
                  const displayUsername = isMe
                    ? userProfile?.username || u.username
                    : u.username;
                  const displayAvatar = isMe
                    ? userProfile?.avatar || u.avatar
                    : u.avatar;
                  const displayBio = isMe
                    ? userProfile?.bio || u.bio
                    : u.bio;
                  const displayUniqueCount = isMe
                    ? collection.length
                    : u.uniqueCardsCount || 0;
                  const displayTotalCount = isMe
                    ? collection.reduce((s, c) => s + (c.count || 1), 0)
                    : u.totalCardsCount || 0;
                  const displayLegendaryCount = isMe
                    ? collection.filter((c) => c.rarity === 'L').length
                    : u.legendaryCount || 0;

                  return (
                    <div
                      key={u.code}
                      className="bg-[#f8f9fa] border border-[#c8ccd1] hover:border-[#3366cc] rounded-[2px] p-4 flex flex-col justify-between gap-3.5 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 rounded-[2px] border border-[#a2a9b1] bg-white p-0.5 shrink-0 overflow-hidden">
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
                            <span className="font-bold text-[15px] text-[#202122] truncate">
                              {displayUsername}
                            </span>
                            {isMe && (
                              <span className="px-1.5 py-0.2 text-[10.5px] font-bold bg-[#eaf3ff] text-[#3366cc] border border-[#3366cc] rounded-[2px]">
                                Vous
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-[#54595d] m-0 mt-1 line-clamp-2">
                            {displayBio ||
                              'Contributeur et collectionneur sur Wikipédia FR.'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#eaecf0] text-center text-[12px]">
                        <div className="bg-white border border-[#eaecf0] rounded-[2px] py-1.5 px-2">
                          <span className="block text-[10.5px] text-[#54595d] uppercase font-bold">
                            Uniques
                          </span>
                          <strong className="text-[13.5px] font-extrabold text-[#202122] block mt-0.5">
                            {new Intl.NumberFormat('fr-FR').format(
                              displayUniqueCount
                            )}
                          </strong>
                        </div>
                        <div className="bg-white border border-[#eaecf0] rounded-[2px] py-1.5 px-2">
                          <span className="block text-[10.5px] text-[#54595d] uppercase font-bold">
                            Cartes
                          </span>
                          <strong className="text-[13.5px] font-extrabold text-[#202122] block mt-0.5">
                            {new Intl.NumberFormat('fr-FR').format(
                              displayTotalCount
                            )}
                          </strong>
                        </div>
                        <div className="bg-white border border-[#eaecf0] rounded-[2px] py-1.5 px-2">
                          <span className="block text-[10.5px] text-[#54595d] uppercase font-bold">
                            Légendaires
                          </span>
                          <strong className="text-[13.5px] font-extrabold text-[#202122] block mt-0.5">
                            {new Intl.NumberFormat('fr-FR').format(
                              displayLegendaryCount
                            )}
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleInspectPeer(u.code)}
                          disabled={isLoadingPeer}
                          className="wiki-casino-btn wiki-casino-btn--subtle w-full !min-h-[34px] !py-1 !text-[12.5px]"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            {isMe
                              ? 'Voir mon profil public'
                              : 'Voir le profil & Échanger'}
                          </span>
                        </button>
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
        ) : (
          /* =====================================================================
             VUE 3 : LISTE DES PROPOSITIONS D'ÉCHANGE REÇUES ET ENVOYÉES
          ===================================================================== */
          <div className="space-y-4">
            {tradeActionError && (
              <div className="p-3 bg-[#ffe9e5] border border-[#f54739] text-[#bf3c2c] rounded-[2px] text-[13px] font-medium">
                {tradeActionError}
              </div>
            )}

            {trades.length > 0 ? (
              <div className="space-y-3">
                {trades.map((trade) => {
                  const isIncoming = trade.toCode === userCode;
                  const isPending = trade.status === 'pending';

                  return (
                    <div
                      key={trade.id}
                      className="bg-[#f8f9fa] border border-[#c8ccd1] rounded-[2px] p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eaecf0] pb-2">
                        <div className="flex items-center gap-2 text-[13.5px]">
                          <span className="font-bold text-[#202122]">
                            {isIncoming
                              ? `Offre reçue de ${trade.fromUsername}`
                              : `Offre envoyée à ${trade.toUsername}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[12.5px] font-semibold ${
                              trade.status === 'accepted'
                                ? 'text-[#177860]'
                                : trade.status === 'declined' ||
                                  trade.status === 'cancelled'
                                ? 'text-[#bf3c2c]'
                                : 'text-[#3366cc]'
                            }`}
                          >
                            {trade.status === 'accepted'
                              ? 'Accepté'
                              : trade.status === 'declined'
                              ? 'Refusé'
                              : trade.status === 'cancelled'
                              ? 'Annulé'
                              : 'En attente'}
                          </span>

                          {isPending && isIncoming && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleTradeAction(trade.id, 'accept')
                                }
                                className="wiki-casino-btn wiki-casino-btn--success !min-h-[30px] !py-1 !px-3 !text-[12px]"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Accepter</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleTradeAction(trade.id, 'decline')
                                }
                                className="wiki-casino-btn wiki-casino-btn--danger !min-h-[30px] !py-1 !px-3 !text-[12px]"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Refuser</span>
                              </button>
                            </>
                          )}

                          {isPending && !isIncoming && (
                            <button
                              type="button"
                              onClick={() =>
                                handleTradeAction(trade.id, 'cancel')
                              }
                              className="wiki-casino-btn wiki-casino-btn--neutral !min-h-[30px] !py-1 !px-3 !text-[12px]"
                            >
                              <span>Annuler l'offre</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-[#eaecf0] rounded-[2px] p-3">
                          <span className="block text-[11.5px] font-bold text-[#54595d] uppercase mb-2">
                            {isIncoming
                              ? `${trade.fromUsername} propose :`
                              : 'Vous proposez :'}
                          </span>
                          <div className="flex flex-wrap gap-2.5">
                            {(trade.offeredCards || []).map((item, i) => (
                              <div key={i} className="w-[145px] sm:w-[150px]">
                                <WikiCard
                                  card={item.card}
                                  trade={true}
                                  duplicateCount={item.qty || 1}
                                />
                              </div>
                            ))}
                            {(trade.offeredCards || []).length === 0 && (
                              <span className="text-[12px] text-[#72777d]">
                                Aucune carte (don)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="bg-white border border-[#eaecf0] rounded-[2px] p-3">
                          <span className="block text-[11.5px] font-bold text-[#54595d] uppercase mb-2">
                            {isIncoming
                              ? 'En échange de vos cartes :'
                              : `Demandé à ${trade.toUsername} :`}
                          </span>
                          <div className="flex flex-wrap gap-2.5">
                            {(trade.requestedCards || []).map((item, i) => (
                              <div key={i} className="w-[145px] sm:w-[150px]">
                                <WikiCard
                                  card={item.card}
                                  trade={true}
                                  duplicateCount={item.qty || 1}
                                />
                              </div>
                            ))}
                            {(trade.requestedCards || []).length === 0 && (
                              <span className="text-[12px] text-[#72777d]">
                                Aucune carte (cadeau)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px]">
                <p className="text-[14px] text-[#54595d] m-0">
                  Aucune proposition d'échange pour le moment. Cliquez sur un joueur dans l'onglet Joueurs pour lui proposer un échange !
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
