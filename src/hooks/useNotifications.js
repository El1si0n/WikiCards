/**
 * @file Rôle : Gestion du cycle de vie, chargement asynchrone et persistance des notifications utilisateur.
 * Dépendances : `../services/userStorage`, `../config/rarities`, localStorage, React.
 * Effets de bord : Requêtes réseau vers `/api/trades` et `/api/market`, écriture dans localStorage.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchUserTrades,
  fetchMarketListings,
} from '../services/userStorage';
import { DAILY_REWARD_AMOUNT } from '../config/rarities';

const STORAGE_KEYS = {
  READ_NOTIFS: 'wikicards_read_notifs_v1',
  DISMISSED_NOTIFS: 'wikicards_dismissed_notifs_v1',
};

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const NOTIF_MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 heures de conservation

/**
 * Formate un horodatage pour l'affichage relatif ou calendaire dans le centre de notifications.
 * @param {number|string} timestamp - Timestamp ms
 * @returns {string} Chaîne lisible
 */
export function formatNotifTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';

  const now = Date.now();
  const diffMs = Math.max(0, now - date.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffSec < 60) {
    return "À l'instant";
  }
  if (diffMin < 60) {
    return `Il y a ${diffMin} min`;
  }

  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isToday) {
    return `Aujourd'hui à ${timeStr}`;
  }
  if (isYesterday) {
    return `Hier à ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
  return `${dateStr} à ${timeStr}`;
}

/**
 * Hook personnalisé gérant l'agrégation, le filtrage et les actions sur les notifications.
 * @param {Object} params
 * @param {string|null} params.userCode - Code du joueur
 * @param {boolean} params.isDailyRewardAvailable - Disponibilité de la bourse journalière
 * @param {string} params.todayKey - Clé YYYY-MM-DD du jour
 * @param {number} params.freeBoostersCount - Nombre de boosters gratuits
 * @param {number} params.lastFreeBoostersResetTime - Horodatage de dernière recharge
 * @param {Function} [params.setActiveTab] - Callback de bascule d'onglet
 * @returns {Object} Notifications, IDs lus et gestionnaires d'actions
 */
export function useNotifications({
  userCode,
  isDailyRewardAvailable,
  todayKey,
  freeBoostersCount,
  lastFreeBoostersResetTime,
  setActiveTab,
  onTriggerServerReconcile,
  readNotifIds: externalReadNotifIds,
  setReadNotifIds: setExternalReadNotifIds,
  dismissedNotifIds: externalDismissedNotifIds,
  setDismissedNotifIds: setExternalDismissedNotifIds,
}) {
  const [internalReadNotifIds, setInternalReadNotifIds] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.READ_NOTIFS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [internalDismissedNotifIds, setInternalDismissedNotifIds] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DISMISSED_NOTIFS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const readNotifIds = externalReadNotifIds !== undefined ? externalReadNotifIds : internalReadNotifIds;
  const setReadNotifIds = setExternalReadNotifIds || setInternalReadNotifIds;
  const dismissedNotifIds = externalDismissedNotifIds !== undefined ? externalDismissedNotifIds : internalDismissedNotifIds;
  const setDismissedNotifIds = setExternalDismissedNotifIds || setInternalDismissedNotifIds;

  const [notifications, setNotifications] = useState([]);
  const isFetchingRef = useRef(false);
  const seenAsyncEventIdsRef = useRef(new Set());
  const onTriggerServerReconcileRef = useRef(onTriggerServerReconcile);

  useEffect(() => {
    onTriggerServerReconcileRef.current = onTriggerServerReconcile;
  }, [onTriggerServerReconcile]);

  // Agrégation dynamique des notifications (échanges, marché, boosters, bourse)
  useEffect(() => {
    if (!userCode) {
      setNotifications([]);
      return;
    }

    let isMounted = true;
    const loadNotifs = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const notifs = [];

        // 1. Notification Bourse de recherche quotidienne
        if (isDailyRewardAvailable) {
          notifs.push({
            id: `daily-reward-${todayKey}`,
            type: 'daily_reward',
            title: 'Bourse de recherche',
            message: `+${DAILY_REWARD_AMOUNT} ₩ disponibles à réclamer !`,
            tab: 'booster',
            timestamp: Date.now(),
            time: "Aujourd'hui",
          });
        }

        // 1.b Notification Boosters gratuits (2 toutes les 12h)
        const nextReset = lastFreeBoostersResetTime + TWELVE_HOURS_MS;
        const nextTimeStr = new Date(nextReset).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        if (freeBoostersCount > 0) {
          notifs.push({
            id: `free-boosters-${lastFreeBoostersResetTime}`,
            type: 'free_boosters',
            title: 'Boosters gratuits',
            message: `${freeBoostersCount} booster${freeBoostersCount > 1 ? 's' : ''} disponible${freeBoostersCount > 1 ? 's' : ''} (prochains à ${nextTimeStr}).`,
            tab: 'booster',
            timestamp: lastFreeBoostersResetTime,
            time: formatNotifTime(lastFreeBoostersResetTime),
          });
        } else if (Date.now() - lastFreeBoostersResetTime < TWELVE_HOURS_MS) {
          notifs.push({
            id: `free-boosters-${lastFreeBoostersResetTime}-used`,
            type: 'free_boosters_used',
            title: 'Boosters gratuits',
            message: `Recharge de 2 boosters à ${nextTimeStr}.`,
            tab: 'booster',
            timestamp: lastFreeBoostersResetTime,
            time: formatNotifTime(lastFreeBoostersResetTime),
            isAutoRead: true,
          });
        }

        // 2. Notifications d'échanges
        const userTrades = await fetchUserTrades(userCode);
        if (Array.isArray(userTrades)) {
          userTrades.forEach((trade) => {
            const tradeTime = trade.resolvedAt || trade.createdAt || Date.now();
            if (trade.toCode === userCode && trade.status === 'pending') {
              notifs.push({
                id: `trade-incoming-${trade.id}`,
                type: 'trade_incoming',
                title: "Offre d'échange",
                message: `${trade.fromUsername || 'Un joueur'} vous propose un échange.`,
                tab: 'social',
                timestamp: trade.createdAt || Date.now(),
                time: formatNotifTime(trade.createdAt),
              });
            } else if (
              trade.fromCode === userCode &&
              trade.status === 'accepted'
            ) {
              notifs.push({
                id: `trade-accepted-${trade.id}`,
                type: 'trade_accepted',
                title: 'Échange accepté !',
                message: `${trade.toUsername || 'Un joueur'} a accepté votre offre.`,
                tab: 'social',
                timestamp: tradeTime,
                time: formatNotifTime(tradeTime),
              });
            } else if (
              trade.fromCode === userCode &&
              trade.status === 'declined'
            ) {
              notifs.push({
                id: `trade-declined-${trade.id}`,
                type: 'trade_declined',
                title: 'Échange refusé',
                message: `${trade.toUsername || 'Un joueur'} a décliné votre offre.`,
                tab: 'social',
                timestamp: tradeTime,
                time: formatNotifTime(tradeTime),
              });
            }
          });
        }

        // 3. Notifications du Marché aux enchères
        const listings = await fetchMarketListings();
        if (Array.isArray(listings)) {
          listings.forEach((listing) => {
            const cardTitle = listing.card?.title || 'Une carte';
            const resolvedTime =
              listing.resolvedAt || listing.createdAt || Date.now();
            if (
              listing.sellerCode === userCode &&
              (listing.status === 'sold' || listing.status === 'bought_out')
            ) {
              notifs.push({
                id: `market-sold-${listing.id}`,
                type: 'market_sold',
                title: 'Carte vendue !',
                message: `"${cardTitle}" vendue pour ${new Intl.NumberFormat(
                  'fr-FR'
                ).format(listing.buyoutPrice || listing.currentBid || listing.finalPrice || 0)} ₩.`,
                tab: 'market',
                timestamp: resolvedTime,
                time: formatNotifTime(resolvedTime),
              });
            }
            if (
              listing.status === 'active' &&
              Array.isArray(listing.bids) &&
              listing.bids.some((b) => b.bidderCode === userCode) &&
              listing.highestBidderCode !== userCode &&
              listing.highestBidder !== userCode
            ) {
              const outbidTime =
                listing.lastBidAt || listing.createdAt || Date.now();
              notifs.push({
                id: `market-outbid-${listing.id}-${listing.currentBid}`,
                type: 'market_outbid',
                title: 'Vous avez été surenchéri !',
                message: `Une offre de ${new Intl.NumberFormat('fr-FR').format(
                  listing.currentBid
                )} ₩ a dépassé la vôtre sur "${cardTitle}".`,
                tab: 'market',
                timestamp: outbidTime,
                time: formatNotifTime(outbidTime),
              });
            }
            if (
              (listing.status === 'ended' || listing.status === 'sold') &&
              (listing.highestBidder === userCode ||
                listing.highestBidderCode === userCode ||
                listing.buyerCode === userCode) &&
              listing.sellerCode !== userCode
            ) {
              notifs.push({
                id: `market-won-${listing.id}`,
                type: 'market_won',
                title: 'Enchère remportée !',
                message: `Félicitations, vous avez remporté l'enchère pour "${cardTitle}" !`,
                tab: 'classeur',
                timestamp: resolvedTime,
                time: formatNotifTime(resolvedTime),
              });
            }
          });
        }

        const now = Date.now();
        const validNotifs = notifs.filter((n) => {
          if (dismissedNotifIds.includes(n.id)) {
            return false;
          }
          if (
            n.timestamp &&
            n.type !== 'trade_incoming' &&
            now - n.timestamp > NOTIF_MAX_AGE_MS
          ) {
            return false;
          }
          return true;
        });

        validNotifs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        if (isMounted) {
          setNotifications(validNotifs.slice(0, 20));
          const asyncEvents = validNotifs.filter((n) =>
            ['market_won', 'market_sold', 'market_outbid', 'trade_accepted'].includes(
              n.type
            )
          );
          let hasNewAsyncEvent = false;
          for (const ev of asyncEvents) {
            if (!seenAsyncEventIdsRef.current.has(ev.id)) {
              seenAsyncEventIdsRef.current.add(ev.id);
              hasNewAsyncEvent = true;
            }
          }
          if (hasNewAsyncEvent && typeof onTriggerServerReconcileRef.current === 'function') {
            onTriggerServerReconcileRef.current();
          }
        }
      } catch {
        // ignore
      } finally {
        isFetchingRef.current = false;
      }
    };

    loadNotifs();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        loadNotifs();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
        loadNotifs();
      }
    }, 10000);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, [
    userCode,
    isDailyRewardAvailable,
    todayKey,
    freeBoostersCount,
    lastFreeBoostersResetTime,
    dismissedNotifIds,
  ]);

  const handleMarkAllNotifsRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds((prev) => {
      const updated = Array.from(new Set([...prev, ...allIds]));
      try {
        localStorage.setItem(STORAGE_KEYS.READ_NOTIFS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, [notifications, setReadNotifIds]);

  const handleMarkNotifRead = useCallback((notifId) => {
    if (!notifId) return;
    setReadNotifIds((prev) => {
      if (prev.includes(notifId)) return prev;
      const updated = [...prev, notifId];
      try {
        localStorage.setItem(STORAGE_KEYS.READ_NOTIFS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, [setReadNotifIds]);

  const handleDismissNotification = useCallback((notifId) => {
    if (!notifId) return;
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    setDismissedNotifIds((prev) => {
      if (prev.includes(notifId)) return prev;
      const updated = [...prev.slice(-200), notifId];
      try {
        localStorage.setItem(
          STORAGE_KEYS.DISMISSED_NOTIFS,
          JSON.stringify(updated)
        );
      } catch {
        // ignore
      }
      return updated;
    });
  }, [setDismissedNotifIds]);

  const handleClearAllNotifications = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    setNotifications([]);
    setDismissedNotifIds((prev) => {
      const updated = Array.from(new Set([...prev, ...allIds])).slice(-200);
      try {
        localStorage.setItem(
          STORAGE_KEYS.DISMISSED_NOTIFS,
          JSON.stringify(updated)
        );
      } catch {
        // ignore
      }
      return updated;
    });
  }, [notifications, setDismissedNotifIds]);

  const handleSelectNotification = useCallback((notif) => {
    if (!notif) return;
    handleMarkNotifRead(notif.id);
    if (
      ['market_won', 'market_sold', 'market_outbid', 'trade_accepted'].includes(
        notif.type
      ) &&
      typeof onTriggerServerReconcileRef.current === 'function'
    ) {
      onTriggerServerReconcileRef.current();
    }
    if (notif.tab && typeof setActiveTab === 'function') {
      setActiveTab(notif.tab);
    }
  }, [handleMarkNotifRead, setActiveTab]);

  return {
    notifications,
    setNotifications,
    readNotifIds,
    setReadNotifIds,
    dismissedNotifIds,
    setDismissedNotifIds,
    handleMarkAllNotifsRead,
    handleMarkNotifRead,
    handleDismissNotification,
    handleClearAllNotifications,
    handleSelectNotification,
  };
}
