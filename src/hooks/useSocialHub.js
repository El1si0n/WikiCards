/**
 * @file Rôle : Custom hook gérant la communauté des joueurs, l'annuaire, le classement, les profils pairs et les échanges.
 * Dépendances : React, `../services/userStorage`, `../services/sound`, `../config/playerScore`, `../config/rarities`.
 * Effets de bord : Polling périodique (8s), lecture/écriture API users et trades.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  fetchAllUsersDirectory,
  fetchUserAccountByCode,
  fetchUserTrades,
  createTradeOffer,
  respondToTradeOffer,
} from '../services/userStorage';
import { soundManager } from '../services/sound';
import { calculatePlayerScore } from '../config/playerScore';
import { getCardRecycleValue } from '../config/rarities';

/**
 * Hook personnalisé encapsulant toutes les interactions sociales et d'échange de cartes.
 * @param {Object} params
 * @param {string} params.userCode - Code du joueur courant
 * @param {Array<Object>} [params.collection=[]] - Collection du joueur courant
 * @param {Array<string>} [params.favorites=[]] - IDs des cartes favorites
 * @param {number} [params.wikithunes=0] - Solde de monnaie
 * @param {Object} [params.stats={}] - Statistiques de jeu
 * @param {Object} [params.userProfile={}] - Profil utilisateur courant
 * @param {number|null} [params.accountCreatedAt=null] - Date de création du compte
 * @param {function(Object): void} params.onSyncAccountState - Synchronisation de l'état joueur
 * @returns {Object} Données réactives, sélecteurs et callbacks d'action sociale
 */
export default function useSocialHub({
  userCode,
  collection = [],
  favorites = [],
  wikithunes = 0,
  stats = {},
  userProfile = {},
  accountCreatedAt = null,
  onSyncAccountState,
}) {
  const [activeSubTab, setActiveSubTab] = useState('directory');

  const [usersList, setUsersList] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const [selectedPeer, setSelectedPeer] = useState(null);
  const [isLoadingPeer, setIsLoadingPeer] = useState(false);

  const [isProposingTrade, setIsProposingTrade] = useState(false);
  const [requestedCardIds, setRequestedCardIds] = useState([]);
  const [offeredCardIds, setOfferedCardIds] = useState([]);
  const [peerRarityFilter, setPeerRarityFilter] = useState('C');
  const [myRarityFilter, setMyRarityFilter] = useState('C');
  const [tradeFeedback, setTradeFeedback] = useState(null);
  const [isSubmittingTrade, setIsSubmittingTrade] = useState(false);

  const [historyModalMetric, setHistoryModalMetric] = useState(null);

  const [trades, setTrades] = useState([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [tradeActionError, setTradeActionError] = useState(null);
  const isFetchingRef = useRef(false);

  const loadDirectoryAndTrades = useCallback(async (silent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
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
      isFetchingRef.current = false;
      if (!silent) {
        setIsLoadingUsers(false);
        setIsLoadingTrades(false);
      }
    }
  }, [userCode]);

  useEffect(() => {
    loadDirectoryAndTrades(false);

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        loadDirectoryAndTrades(true);
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
        loadDirectoryAndTrades(true);
      }
    }, 8000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      clearInterval(interval);
    };
  }, [loadDirectoryAndTrades]);

  const handleInspectPeer = async (targetCode) => {
    setTradeFeedback(null);
    setIsProposingTrade(false);
    setRequestedCardIds([]);
    setOfferedCardIds([]);

    if (targetCode === userCode) {
      setSelectedPeer({
        code: userCode,
        createdAt: accountCreatedAt,
        profile: userProfile,
        collection,
        favorites,
        wikithunes,
        stats,
      });
      if (collection.length > 0) {
        setPeerRarityFilter(collection[0].rarity || 'C');
        setMyRarityFilter(collection[0].rarity || 'C');
      }
      return;
    }

    const cachedUser = usersList.find((u) => u.code === targetCode);
    if (cachedUser) {
      setSelectedPeer({
        code: cachedUser.code,
        profile: {
          username: cachedUser.username,
          avatar: cachedUser.avatar,
          bio: cachedUser.bio,
          showcaseIds: cachedUser.showcaseIds || [],
        },
        collection: cachedUser.showcaseCards || [],
        showcaseCards: cachedUser.showcaseCards || [],
        uniqueCardsCount: cachedUser.uniqueCardsCount,
        totalCardsCount: cachedUser.totalCardsCount,
        legendaryCount: cachedUser.legendaryCount,
        ultraRareCount: cachedUser.ultraRareCount,
        gifCount: cachedUser.gifCount,
        wikithunes: cachedUser.wikithunes,
        stats: cachedUser.stats || {},
        createdAt: cachedUser.createdAt || null,
        snapshots: cachedUser.snapshots || [],
      });
    }

    setIsLoadingPeer(true);
    try {
      const fullAccount = await fetchUserAccountByCode(targetCode);
      if (fullAccount) {
        setSelectedPeer((prev) => {
          if (!prev || prev.code !== targetCode) return prev;
          return {
            ...prev,
            ...fullAccount,
            profile: {
              ...(prev.profile || {}),
              ...(fullAccount.profile || {}),
            },
          };
        });
        const peerCol = Array.isArray(fullAccount.collection)
          ? fullAccount.collection
          : [];
        if (peerCol.length > 0) {
          setPeerRarityFilter(peerCol[0].rarity || 'C');
        }
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

  const rankedUsers = useMemo(() => {
    if (!usersList || usersList.length === 0) return [];

    const scored = usersList.map((u) => {
      const isMe = u.code === userCode;
      const uStats = isMe ? stats || {} : u.stats || {};
      const uCol = isMe ? collection : [];
      const uColCount = isMe ? collection.length : u.uniqueCardsCount || 0;
      const uTotalCards = isMe
        ? collection.reduce((s, c) => s + (c.count || 1), 0)
        : u.totalCardsCount || uColCount;
      const uLegCount = isMe
        ? collection.filter((c) => c.rarity === 'L').length
        : u.legendaryCount || 0;
      const uUrCount = isMe
        ? collection.filter((c) => c.rarity === 'UR').length
        : u.ultraRareCount || 0;
      const uSrCount = isMe
        ? collection.filter((c) => c.rarity === 'SR').reduce((s, c) => s + (c.count || 1), 0)
        : u.superRareCount || 0;
      const uRCount = isMe
        ? collection.filter((c) => c.rarity === 'R').reduce((s, c) => s + (c.count || 1), 0)
        : u.rareCount || 0;
      const uPcCount = isMe
        ? collection.filter((c) => c.rarity === 'PC').reduce((s, c) => s + (c.count || 1), 0)
        : u.uncommonCount || 0;
      const uCCount = isMe
        ? collection.filter((c) => c.rarity === 'C').reduce((s, c) => s + (c.count || 1), 0)
        : u.commonCount || 0;
      const uGifCount = isMe
        ? collection.filter((c) =>
            Boolean(c.isShiny || c.isGif || /\.gif(\?|$|\/)/i.test(c.image || ''))
          ).length
        : u.gifCount || 0;
      const uColVal = isMe
        ? collection.reduce((s, c) => s + getCardRecycleValue(c) * (c.count || 1), 0)
        : u.collectionValue || 0;
      const uMoney = isMe ? wikithunes : u.wikithunes || 0;

      const score = calculatePlayerScore({
        collection: uCol,
        uniqueCardsCount: uColCount,
        uniqueCount: uColCount,
        totalCardsCount: uTotalCards,
        legendaryCount: uLegCount,
        ultraRareCount: uUrCount,
        superRareCount: uSrCount,
        rareCount: uRCount,
        uncommonCount: uPcCount,
        commonCount: uCCount,
        gifCount: uGifCount,
        collectionValue: uColVal,
        wikithunes: uMoney,
        stats: uStats,
      });

      return {
        ...u,
        calculatedScore: score,
      };
    });

    scored.sort((a, b) => b.calculatedScore - a.calculatedScore);

    return scored.map((u, idx) => ({
      ...u,
      rank: idx + 1,
    }));
  }, [usersList, userCode, stats, collection, wikithunes]);

  const topPlayerCode = useMemo(() => {
    return rankedUsers[0]?.code || null;
  }, [rankedUsers]);

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return rankedUsers;
    const q = userSearchQuery.trim().toLowerCase();
    return rankedUsers.filter(
      (u) =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.code || '').toLowerCase().includes(q) ||
        (u.bio || '').toLowerCase().includes(q)
    );
  }, [rankedUsers, userSearchQuery]);

  const isSelectedPeerMe = selectedPeer?.code === userCode;

  const activePeerProfile = isSelectedPeerMe
    ? userProfile
    : selectedPeer?.profile || {};

  const peerCollection = useMemo(() => {
    if (isSelectedPeerMe) return collection;
    return Array.isArray(selectedPeer?.collection)
      ? selectedPeer.collection
      : [];
  }, [isSelectedPeerMe, collection, selectedPeer]);

  const peerAvatarWiki = useMemo(() => {
    const av = activePeerProfile?.avatar || '';
    if (!av) {
      return {
        title: 'Wikipédia',
        url: 'https://fr.wikipedia.org/wiki/Wikip%C3%A9dia:Accueil_principal',
      };
    }
    try {
      const match = av.match(/\/([^/?#]+)\.(jpg|jpeg|png|gif|svg|webp)/i);
      if (match && match[1]) {
        let rawTitle = decodeURIComponent(match[1]);
        rawTitle = rawTitle.replace(/^\d+px-/, '').replace(/_/g, ' ');
        return {
          title: rawTitle,
          url: `https://fr.wikipedia.org/wiki/${encodeURIComponent(rawTitle)}`,
        };
      }
    } catch {
      // ignore
    }
    return {
      title: 'Wikipédia',
      url: 'https://fr.wikipedia.org/wiki/Wikip%C3%A9dia:Accueil_principal',
    };
  }, [activePeerProfile]);

  const peerStats = useMemo(() => {
    const raw = isSelectedPeerMe ? stats : selectedPeer?.stats || {};
    const money = isSelectedPeerMe
      ? wikithunes
      : typeof selectedPeer?.wikithunes === 'number'
      ? selectedPeer.wikithunes
      : 0;

    const totalCopies = isSelectedPeerMe
      ? collection.reduce((s, c) => s + (c.count || 1), 0)
      : typeof selectedPeer?.totalCardsCount === 'number'
      ? selectedPeer.totalCardsCount
      : peerCollection.reduce((s, c) => s + (c.count || 1), 0);

    const totalVal = isSelectedPeerMe
      ? collection.reduce((s, c) => s + getCardRecycleValue(c) * (c.count || 1), 0)
      : typeof selectedPeer?.collectionValue === 'number'
      ? selectedPeer.collectionValue
      : peerCollection.reduce((s, c) => s + getCardRecycleValue(c) * (c.count || 1), 0);

    const legendaries = isSelectedPeerMe
      ? collection.filter((c) => c.rarity === 'L').length
      : typeof selectedPeer?.legendaryCount === 'number'
      ? selectedPeer.legendaryCount
      : peerCollection.filter((c) => c.rarity === 'L').length;

    const ultraRares = isSelectedPeerMe
      ? collection.filter((c) => c.rarity === 'UR').length
      : typeof selectedPeer?.ultraRareCount === 'number'
      ? selectedPeer.ultraRareCount
      : peerCollection.filter((c) => c.rarity === 'UR').length;

    const gifs = isSelectedPeerMe
      ? collection.filter((c) =>
          Boolean(c.isShiny || c.isGif || /\.gif(\?|$|\/)/i.test(c.image || ''))
        ).length
      : typeof selectedPeer?.gifCount === 'number'
      ? selectedPeer.gifCount
      : peerCollection.filter((c) =>
          Boolean(c.isShiny || c.isGif || /\.gif(\?|$|\/)/i.test(c.image || ''))
        ).length;

    const boostersOpened = Number(raw.boostersOpened || 0);
    const lostMoneyCasino = Number(raw.lostMoneyCasino || 0);
    const netCasinoGains = Number(raw.netCasinoGains || 0);
    const wonCards = Number(raw.wonCards || 0);
    const lostCards = Number(raw.lostCards || 0);
    const recordStreak = Number(raw.recordStreak || 0);
    const casinoBilan = netCasinoGains - lostMoneyCasino;
    const netCardsBilan = wonCards - lostCards;

    const totalCardsDrawn = Math.max(
      Number(raw.totalCardsDrawn || 0),
      boostersOpened * 6,
      totalCopies
    );

    return {
      wikithunes: money,
      totalCopies,
      totalVal,
      legendaries,
      ultraRares,
      gifs,
      boostersOpened,
      lostMoneyCasino,
      netCasinoGains,
      wonCards,
      lostCards,
      recordStreak,
      casinoBilan,
      netCardsBilan,
      totalCardsDrawn,
    };
  }, [isSelectedPeerMe, selectedPeer, wikithunes, collection, stats, peerCollection]);

  const selectedPeerScore = useMemo(() => {
    if (!selectedPeer?.code) return null;
    const found = rankedUsers.find((u) => u.code === selectedPeer.code);
    return found ? found.calculatedScore : null;
  }, [rankedUsers, selectedPeer]);

  const peerShowcaseCards = useMemo(() => {
    if (
      Array.isArray(selectedPeer?.showcaseCards) &&
      selectedPeer.showcaseCards.length > 0
    ) {
      return [0, 1, 2, 3].map((idx) => selectedPeer.showcaseCards[idx] || null);
    }
    const ids = Array.isArray(activePeerProfile?.showcaseIds)
      ? activePeerProfile.showcaseIds
      : [];
    return [0, 1, 2, 3].map((idx) => {
      const id = ids[idx];
      return id
        ? peerCollection.find((c) => String(c.id) === String(id)) || null
        : null;
    });
  }, [selectedPeer, activePeerProfile, peerCollection]);

  const offeredCountsMap = useMemo(() => {
    const map = {};
    offeredCardIds.forEach((id) => {
      map[id] = (map[id] || 0) + 1;
    });
    return map;
  }, [offeredCardIds]);

  const requestedCountsMap = useMemo(() => {
    const map = {};
    requestedCardIds.forEach((id) => {
      map[id] = (map[id] || 0) + 1;
    });
    return map;
  }, [requestedCardIds]);

  const handleToggleMyCardForTrade = (card) => {
    const count = offeredCountsMap[card.id] || 0;
    const maxAvailable = card.count || 1;
    const isFav = favorites.includes(card.id);
    const usableMax = isFav ? Math.max(0, maxAvailable - 1) : maxAvailable;

    if (count < usableMax && offeredCardIds.length < 4) {
      setOfferedCardIds((prev) => [...prev, card.id]);
      soundManager.playCardSlide();
    } else if (count > 0) {
      setOfferedCardIds((prev) => {
        const idx = prev.lastIndexOf(card.id);
        if (idx !== -1) {
          const next = [...prev];
          next.splice(idx, 1);
          return next;
        }
        return prev;
      });
      soundManager.playCardSlide();
    }
  };

  const handleTogglePeerCardForTrade = (card) => {
    const count = requestedCountsMap[card.id] || 0;
    const maxAvailable = card.count || 1;

    if (count < maxAvailable && requestedCardIds.length < 4) {
      setRequestedCardIds((prev) => [...prev, card.id]);
      soundManager.playCardSlide();
    } else if (count > 0) {
      setRequestedCardIds((prev) => {
        const idx = prev.lastIndexOf(card.id);
        if (idx !== -1) {
          const next = [...prev];
          next.splice(idx, 1);
          return next;
        }
        return prev;
      });
      soundManager.playCardSlide();
    }
  };

  const handleSendTradeOffer = async () => {
    if (!selectedPeer || isSubmittingTrade) return;
    if (offeredCardIds.length === 0 && requestedCardIds.length === 0) {
      setTradeFeedback({
        type: 'error',
        message: 'Vous devez choisir au moins une carte à proposer ou à demander.',
      });
      return;
    }

    setIsSubmittingTrade(true);
    setTradeFeedback(null);
    try {
      const offeredMap = {};
      offeredCardIds.forEach((id) => {
        offeredMap[id] = (offeredMap[id] || 0) + 1;
      });
      const offered = Object.entries(offeredMap)
        .map(([id, qty]) => {
          const c = collection.find((item) => String(item.id) === String(id));
          return c ? { card: c, qty } : null;
        })
        .filter(Boolean);

      const requestedMap = {};
      requestedCardIds.forEach((id) => {
        requestedMap[id] = (requestedMap[id] || 0) + 1;
      });
      const requested = Object.entries(requestedMap)
        .map(([id, qty]) => {
          const c = peerCollection.find((item) => String(item.id) === String(id));
          return c ? { card: c, qty } : null;
        })
        .filter(Boolean);

      await createTradeOffer({
        fromCode: userCode,
        fromUsername: userProfile?.username || 'Wikipédien',
        fromAvatar:
          userProfile?.avatar ||
          'https://fr.wikipedia.org/static/images/icons/wikipedia.png',
        toCode: selectedPeer.code,
        toUsername: activePeerProfile?.username || selectedPeer.code,
        toAvatar:
          activePeerProfile?.avatar ||
          'https://fr.wikipedia.org/static/images/icons/wikipedia.png',
        offeredCards: offered,
        requestedCards: requested,
      });

      soundManager.playSummaryFanfare();
      setTradeFeedback({
        type: 'success',
        message: `Votre offre d'échange a été envoyée avec succès à ${
          activePeerProfile?.username || selectedPeer.code
        } !`,
      });
      setOfferedCardIds([]);
      setRequestedCardIds([]);
      setIsProposingTrade(false);
      await loadDirectoryAndTrades(true);
    } catch (err) {
      setTradeFeedback({
        type: 'error',
        message: err?.message || "Erreur lors de l'envoi de la proposition.",
      });
    } finally {
      setIsSubmittingTrade(false);
    }
  };

  const handleTradeAction = async (tradeId, action) => {
    setTradeActionError(null);
    try {
      const res = await respondToTradeOffer(tradeId, action, userCode);
      if (res.updatedUser && res.updatedUser.code === userCode) {
        onSyncAccountState(res.updatedUser);
      }
      if (action === 'accept') {
        soundManager.playSummaryFanfare();
      } else {
        soundManager.playCardSlide();
      }
      await loadDirectoryAndTrades(true);
    } catch (err) {
      setTradeActionError(
        err?.message || "Erreur lors de l'action sur la proposition d'échange."
      );
    }
  };

  const pendingIncomingCount = useMemo(
    () =>
      trades.filter((t) => t.status === 'pending' && t.toCode === userCode)
        .length,
    [trades, userCode]
  );

  return {
    activeSubTab,
    setActiveSubTab,
    usersList,
    isLoadingUsers,
    userSearchQuery,
    setUserSearchQuery,
    selectedPeer,
    setSelectedPeer,
    isLoadingPeer,
    isProposingTrade,
    setIsProposingTrade,
    requestedCardIds,
    offeredCardIds,
    peerRarityFilter,
    setPeerRarityFilter,
    myRarityFilter,
    setMyRarityFilter,
    tradeFeedback,
    setTradeFeedback,
    isSubmittingTrade,
    historyModalMetric,
    setHistoryModalMetric,
    trades,
    pendingIncomingCount,
    isLoadingTrades,
    tradeActionError,
    rankedUsers,
    topPlayerCode,
    filteredUsers,
    isSelectedPeerMe,
    activePeerProfile,
    peerCollection,
    peerAvatarWiki,
    peerStats,
    selectedPeerScore,
    peerShowcaseCards,
    offeredCountsMap,
    requestedCountsMap,
    handleInspectPeer,
    handleSelectPeer: handleInspectPeer,
    handleToggleMyCardForTrade,
    handleTogglePeerCardForTrade,
    handleSendTradeOffer,
    handleTradeAction,
    loadDirectoryAndTrades,
  };
}
