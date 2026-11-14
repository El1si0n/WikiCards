/**
 * @file Rôle : Gestion réactive de l'état du joueur, persistance locale et synchronisation serveur bidirectionnelle.
 * Dépendances : `../services/userStorage`, `../config/rarities`, `../config/themes`, `../config/playerScore`, `../utils/statsHistory`, `../services/sound`.
 * Effets de bord : Lecture/écriture dans localStorage, requêtes réseau vers `/api/users/*`, et déclenchement audio.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  getStoredUserCode,
  clearStoredUserCode,
  setStoredUserCode,
  getDefaultProfile,
  loadLocalProfile,
  saveLocalProfile,
  getStoredUpdatedAt,
  setStoredUpdatedAt,
  isAccountStateNewer,
  fetchServerUserAccount,
  syncUserAccountToServer,
  deleteUserAccount,
} from '../services/userStorage';
import {
  INITIAL_WIKITHUNES,
  DAILY_REWARD_AMOUNT,
  getCardRecycleValue,
} from '../config/rarities';
import { detectCardTheme } from '../config/themes';
import { calculatePlayerScore } from '../config/playerScore';
import {
  recordStatsSnapshot,
  getSavedStatsSnapshots,
  getSnapshotStorageKey,
  countRarityCopies,
  countGifCopies,
} from '../utils/statsHistory';
import { soundManager } from '../services/sound';

export const STORAGE_KEYS = {
  COLLECTION: 'wikicards_collection_v1',
  FAVORITES: 'wikicards_favorites_v1',
  STATS: 'wikicards_stats_v1',
  WIKITHUNES: 'wikicards_wikithunes_v1',
  DAILY_REWARD: 'wikicards_daily_reward_claim_v1',
  FREE_BOOSTERS: 'wikicards_free_boosters_count_v1',
  FREE_BOOSTERS_RESET: 'wikicards_free_boosters_reset_v1',
  ACCOUNT_CREATED_AT: 'wikicards_account_created_at_v1',
};

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const MAX_FREE_BOOSTERS = 2;

/**
 * Retourne la clé de date locale du jour au format YYYY-MM-DD.
 * @returns {string} Date au format ISO court
 */
export function getTodayDateKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Hook centralisant l'intégralité de l'état joueur, de sa collection et de la synchronisation serveur.
 * @param {Object} [options={}]
 * @param {Function} [options.onHydrateDarkMode] - Callback d'hydratation du thème sombre depuis le profil serveur
 * @param {string[]} [options.readNotifIds=[]] - IDs des notifications lues
 * @param {string[]} [options.dismissedNotifIds=[]] - IDs des notifications rejetées
 * @param {Function} [options.onHydrateNotifIds] - Callback pour hydrater les IDs de notifications du serveur
 * @returns {Object} Ensemble complet de l'état joueur et de ses gestionnaires
 */
export function usePlayerAccount({
  onHydrateDarkMode,
  readNotifIds = [],
  dismissedNotifIds = [],
  onHydrateNotifIds,
} = {}) {
  const [userCode, setUserCode] = useState(() => getStoredUserCode());
  const [userProfile, setUserProfile] = useState(() => {
    const code = getStoredUserCode();
    return code ? loadLocalProfile(code) : getDefaultProfile('WIKI-0000');
  });

  const [accountCreatedAt, setAccountCreatedAt] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(STORAGE_KEYS.ACCOUNT_CREATED_AT));
      return saved > 0 ? saved : null;
    } catch {
      return null;
    }
  });

  const [wikithunes, setWikithunes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WIKITHUNES);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'number' && !Number.isNaN(parsed)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_WIKITHUNES;
  });

  const [lastDailyClaimDate, setLastDailyClaimDate] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.DAILY_REWARD) || '';
    } catch {
      return '';
    }
  });
  const [dailyRewardToast, setDailyRewardToast] = useState(null);

  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((id) => !String(id).startsWith('demo-'));
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STATS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          boostersOpened: 0,
          totalCardsDrawn: 0,
          lostMoneyCasino: 0,
          lostCards: 0,
          wonCards: 0,
          netCasinoGains: 0,
          recordStreak: 0,
          ...parsed,
        };
      }
    } catch {
      // ignore
    }
    return {
      boostersOpened: 0,
      totalCardsDrawn: 0,
      lostMoneyCasino: 0,
      lostCards: 0,
      wonCards: 0,
      netCasinoGains: 0,
      recordStreak: 0,
    };
  });

  const [collection, setCollection] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COLLECTION);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((c) => !String(c?.id).startsWith('demo-'));
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  const playerScore = useMemo(
    () =>
      calculatePlayerScore({
        collection,
        wikithunes,
        stats,
      }),
    [collection, wikithunes, stats]
  );

  const [localUpdatedAt, setLocalUpdatedAt] = useState(() =>
    getStoredUpdatedAt(getStoredUserCode(), collection)
  );
  const [adminOverrideAt, setAdminOverrideAt] = useState(() => {
    try {
      return Number(localStorage.getItem('wikicards_admin_override_at_v1') || 0);
    } catch {
      return 0;
    }
  });
  const isServerHydratedRef = useRef(false);
  const skipNextPushRef = useRef(false);
  const isReconcilingRef = useRef(false);
  const reconcileFnRef = useRef(null);

  const bumpLocalUpdatedAt = useCallback(() => {
    const now = setStoredUpdatedAt(Date.now());
    setLocalUpdatedAt(now);
    return now;
  }, []);

  const [freeBoostersCount, setFreeBoostersCount] = useState(() => {
    try {
      const savedReset = localStorage.getItem(STORAGE_KEYS.FREE_BOOSTERS_RESET);
      const savedCount = localStorage.getItem(STORAGE_KEYS.FREE_BOOSTERS);
      if (savedReset !== null) {
        const resetNum = Number(savedReset);
        if (!Number.isNaN(resetNum) && resetNum > 0) {
          const elapsed = Date.now() - resetNum;
          if (elapsed >= TWELVE_HOURS_MS) {
            return MAX_FREE_BOOSTERS;
          }
          if (savedCount !== null) {
            const parsed = Number(savedCount);
            if (!Number.isNaN(parsed) && parsed >= 0) {
              return Math.min(MAX_FREE_BOOSTERS, parsed);
            }
          }
        }
      }
    } catch {
      // ignore
    }
    return MAX_FREE_BOOSTERS;
  });

  const [lastFreeBoostersResetTime, setLastFreeBoostersResetTime] = useState(() => {
    try {
      const savedReset = localStorage.getItem(STORAGE_KEYS.FREE_BOOSTERS_RESET);
      if (savedReset !== null) {
        const resetNum = Number(savedReset);
        if (!Number.isNaN(resetNum) && resetNum > 0) {
          const elapsed = Date.now() - resetNum;
          if (elapsed >= TWELVE_HOURS_MS) {
            const newReset = Date.now();
            try {
              localStorage.setItem(STORAGE_KEYS.FREE_BOOSTERS_RESET, String(newReset));
              localStorage.setItem(STORAGE_KEYS.FREE_BOOSTERS, String(MAX_FREE_BOOSTERS));
            } catch {
              // ignore
            }
            return newReset;
          }
          return resetNum;
        }
      }
    } catch {
      // ignore
    }
    const now = Date.now();
    try {
      localStorage.setItem(STORAGE_KEYS.FREE_BOOSTERS_RESET, String(now));
      localStorage.setItem(STORAGE_KEYS.FREE_BOOSTERS, String(MAX_FREE_BOOSTERS));
    } catch {
      // ignore
    }
    return now;
  });

  const [timeRemainingFreeBoosters, setTimeRemainingFreeBoosters] = useState('');

  // Compte à rebours des 12 heures et recharge automatique des boosters gratuits
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const nextReset = lastFreeBoostersResetTime + TWELVE_HOURS_MS;
      const diff = nextReset - now;

      if (diff <= 0) {
        setFreeBoostersCount(MAX_FREE_BOOSTERS);
        setLastFreeBoostersResetTime(now);
        try {
          localStorage.setItem(STORAGE_KEYS.FREE_BOOSTERS, String(MAX_FREE_BOOSTERS));
          localStorage.setItem(STORAGE_KEYS.FREE_BOOSTERS_RESET, String(now));
        } catch {
          // ignore
        }
        bumpLocalUpdatedAt();
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemainingFreeBoosters(
          `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
        );
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lastFreeBoostersResetTime, bumpLocalUpdatedAt]);

  const handleUseFreeBooster = useCallback(() => {
    setFreeBoostersCount((prev) => {
      const next = Math.max(0, prev - 1);
      try {
        localStorage.setItem(STORAGE_KEYS.FREE_BOOSTERS, String(next));
      } catch {
        // ignore
      }
      const now = bumpLocalUpdatedAt();
      if (userCode) {
        syncUserAccountToServer(userCode, {
          profile: userProfile,
          collection,
          favorites,
          wikithunes,
          stats,
          lastDailyClaimDate,
          freeBoostersCount: next,
          lastFreeBoostersResetTime,
          clientUpdatedAt: now,
        }).catch(() => {});
      }
      return next;
    });
  }, [
    userCode,
    userProfile,
    collection,
    favorites,
    wikithunes,
    stats,
    lastDailyClaimDate,
    lastFreeBoostersResetTime,
    bumpLocalUpdatedAt,
  ]);

  // Sauvegarde automatique de l'état dans localStorage et enregistrement des instantanés
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WIKITHUNES, JSON.stringify(wikithunes));
    } catch {
      // ignore
    }
    if (
      typeof wikithunes === 'number' &&
      userCode &&
      typeof userCode === 'string' &&
      userCode.startsWith('WIKI-')
    ) {
      try {
        const safeCol = Array.isArray(collection) ? collection : [];
        const legendaryCount = countRarityCopies(safeCol, 'L');
        const ultraRareCount = countRarityCopies(safeCol, 'UR');
        const gifCount = countGifCopies(safeCol);
        recordStatsSnapshot({
          userCode,
          playerScore,
          wikithunes,
          collectionValue: safeCol.reduce(
            (sum, c) => sum + (c ? getCardRecycleValue(c) * (c.count || 1) : 0),
            0
          ),
          uniqueCardsCount: safeCol.length,
          totalCardsCount: safeCol.reduce((sum, c) => sum + (c?.count || 1), 0),
          legendaryCount,
          ultraRareCount,
          gifCount,
          collection: safeCol,
          stats: stats || {},
        });
      } catch (snapErr) {
        console.warn('[WikiCards stats snapshot error]:', snapErr);
      }
    }
  }, [wikithunes, collection, stats, userCode, playerScore]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COLLECTION, JSON.stringify(collection));
    } catch {
      // ignore
    }
  }, [collection]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    } catch {
      // ignore
    }
  }, [stats]);

  useEffect(() => {
    if (userCode) {
      saveLocalProfile(userProfile, userCode);
    }
  }, [userProfile, userCode]);

  const applyServerAccountState = useCallback(
    (serverAccount) => {
      if (!serverAccount) return;
      skipNextPushRef.current = true;
      if (serverAccount.profile) {
        setUserProfile({
          ...getDefaultProfile(serverAccount.code || userCode),
          ...serverAccount.profile,
        });
        if (serverAccount.profile.themePreference && typeof onHydrateDarkMode === 'function') {
          onHydrateDarkMode(serverAccount.profile.themePreference === 'dark');
        }
      }
      if (Array.isArray(serverAccount.collection)) {
        setCollection(
          serverAccount.collection.filter(
            (c) => !String(c?.id).startsWith('demo-')
          )
        );
      }
      if (Array.isArray(serverAccount.favorites)) {
        setFavorites(
          serverAccount.favorites.filter((id) => !String(id).startsWith('demo-'))
        );
      }
      if (typeof serverAccount.wikithunes === 'number') {
        setWikithunes(serverAccount.wikithunes);
      }
      if (typeof onHydrateNotifIds === 'function') {
        if (Array.isArray(serverAccount.readNotifIds) || Array.isArray(serverAccount.dismissedNotifIds)) {
          onHydrateNotifIds({
            read: serverAccount.readNotifIds,
            dismissed: serverAccount.dismissedNotifIds,
          });
        }
      }
      if (serverAccount.stats && typeof serverAccount.stats === 'object') {
        setStats({
          boostersOpened: Number(serverAccount.stats.boostersOpened || 0),
          totalCardsDrawn: Number(serverAccount.stats.totalCardsDrawn || 0),
          lostMoneyCasino: Number(serverAccount.stats.lostMoneyCasino || 0),
          lostCards: Number(serverAccount.stats.lostCards || 0),
          wonCards: Number(serverAccount.stats.wonCards || 0),
          netCasinoGains: Number(serverAccount.stats.netCasinoGains || 0),
          recordStreak: Number(serverAccount.stats.recordStreak || 0),
          ...serverAccount.stats,
        });
      }
      if (serverAccount.lastDailyClaimDate) {
        setLastDailyClaimDate(serverAccount.lastDailyClaimDate);
        try {
          localStorage.setItem(
            STORAGE_KEYS.DAILY_REWARD,
            serverAccount.lastDailyClaimDate
          );
        } catch {
          // ignore
        }
      }
      if (typeof serverAccount.freeBoostersCount === 'number') {
        let serverCount = serverAccount.freeBoostersCount;
        let serverReset =
          Number(serverAccount.lastFreeBoostersResetTime) || Date.now();
        if (Date.now() - serverReset >= TWELVE_HOURS_MS) {
          serverCount = MAX_FREE_BOOSTERS;
          serverReset = Date.now();
        }
        setFreeBoostersCount(serverCount);
        setLastFreeBoostersResetTime(serverReset);
        try {
          localStorage.setItem(STORAGE_KEYS.FREE_BOOSTERS, String(serverCount));
          localStorage.setItem(
            STORAGE_KEYS.FREE_BOOSTERS_RESET,
            String(serverReset)
          );
        } catch {
          // ignore
        }
      }
      if (serverAccount.createdAt) {
        const createdTs = Number(serverAccount.createdAt);
        if (createdTs > 0) {
          setAccountCreatedAt(createdTs);
          try {
            localStorage.setItem(STORAGE_KEYS.ACCOUNT_CREATED_AT, String(createdTs));
          } catch {}
        }
      }
      if (serverAccount.adminOverrideAt !== undefined) {
        const overrideTs = Number(serverAccount.adminOverrideAt || 0);
        setAdminOverrideAt(overrideTs);
        try {
          localStorage.setItem('wikicards_admin_override_at_v1', String(overrideTs));
        } catch {}
      }
      if (serverAccount.updatedAt) {
        const syncedTs = setStoredUpdatedAt(serverAccount.updatedAt);
        setLocalUpdatedAt(syncedTs);
      }
    },
    [userCode, onHydrateDarkMode, onHydrateNotifIds]
  );

  const latestAccountRef = useRef({
    userCode,
    userProfile,
    collection,
    favorites,
    wikithunes,
    stats,
    lastDailyClaimDate,
    freeBoostersCount,
    lastFreeBoostersResetTime,
    localUpdatedAt,
    adminOverrideAt,
    accountCreatedAt,
  });

  useEffect(() => {
    latestAccountRef.current = {
      userCode,
      userProfile,
      collection,
      favorites,
      wikithunes,
      stats,
      lastDailyClaimDate,
      freeBoostersCount,
      lastFreeBoostersResetTime,
      localUpdatedAt,
      adminOverrideAt,
      accountCreatedAt,
    };
  }, [
    userCode,
    userProfile,
    collection,
    favorites,
    wikithunes,
    stats,
    lastDailyClaimDate,
    freeBoostersCount,
    lastFreeBoostersResetTime,
    localUpdatedAt,
    adminOverrideAt,
    accountCreatedAt,
  ]);

  // Réconciliation bidirectionnelle avec le serveur
  useEffect(() => {
    if (!userCode) {
      isServerHydratedRef.current = false;
      return;
    }

    let isCancelled = false;

    const reconcileWithServer = async () => {
      if (isReconcilingRef.current) return;
      isReconcilingRef.current = true;
      try {
        const current = latestAccountRef.current;
        if (!current.userCode) return;

        const localSnapshot = {
          code: current.userCode,
          profile: current.userProfile,
          collection: current.collection,
          favorites: current.favorites,
          wikithunes: current.wikithunes,
          stats: current.stats,
          createdAt: current.accountCreatedAt || undefined,
          snapshots: getSavedStatsSnapshots(current.userCode).slice(-40),
          lastDailyClaimDate: current.lastDailyClaimDate || '',
          freeBoostersCount:
            typeof current.freeBoostersCount === 'number'
              ? current.freeBoostersCount
              : MAX_FREE_BOOSTERS,
          lastFreeBoostersResetTime:
            current.lastFreeBoostersResetTime || Date.now(),
          updatedAt: current.localUpdatedAt,
          clientUpdatedAt: current.localUpdatedAt,
          adminOverrideAt: current.adminOverrideAt || 0,
        };

        const res = await fetchServerUserAccount(current.userCode);
        if (isCancelled) return;

        if (res.status === 'not_found') {
          const pushed = await syncUserAccountToServer(
            current.userCode,
            localSnapshot,
            { forceOverwrite: true }
          );
          if (!isCancelled && pushed?.user?.updatedAt) {
            setLocalUpdatedAt(setStoredUpdatedAt(pushed.user.updatedAt));
          }
        } else if (res.status === 'ok' && res.user) {
          if (isAccountStateNewer(res.user, localSnapshot)) {
            applyServerAccountState(res.user);
          } else if (isAccountStateNewer(localSnapshot, res.user)) {
            const pushed = await syncUserAccountToServer(
              current.userCode,
              localSnapshot
            );
            if (!isCancelled && pushed?.serverIsNewer && pushed?.user) {
              applyServerAccountState(pushed.user);
            } else if (!isCancelled && pushed?.user?.updatedAt) {
              setLocalUpdatedAt(setStoredUpdatedAt(pushed.user.updatedAt));
            }
          }
        }

        if (!isCancelled) {
          isServerHydratedRef.current = true;
        }
      } finally {
        isReconcilingRef.current = false;
      }
    };

    reconcileFnRef.current = reconcileWithServer;
    reconcileWithServer();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        reconcileWithServer();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
        reconcileWithServer();
      }
    }, 6000);

    return () => {
      isCancelled = true;
      reconcileFnRef.current = null;
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, [userCode, applyServerAccountState]);

  const triggerServerReconcile = useCallback(() => {
    if (typeof reconcileFnRef.current === 'function') {
      reconcileFnRef.current();
    }
  }, []);

  // Synchronisation automatique vers data/users/<CODE>.json
  useEffect(() => {
    if (!userCode || !isServerHydratedRef.current) return;
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      const result = await syncUserAccountToServer(userCode, {
        profile: userProfile,
        collection,
        favorites,
        wikithunes,
        stats,
        createdAt: accountCreatedAt || undefined,
        snapshots: getSavedStatsSnapshots(userCode).slice(-40),
        lastDailyClaimDate,
        freeBoostersCount,
        lastFreeBoostersResetTime,
        readNotifIds,
        dismissedNotifIds,
        clientUpdatedAt: localUpdatedAt,
        adminOverrideAt,
      });
      if (result?.serverIsNewer && result?.user) {
        applyServerAccountState(result.user);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [
    userCode,
    userProfile,
    collection,
    favorites,
    wikithunes,
    stats,
    lastDailyClaimDate,
    freeBoostersCount,
    lastFreeBoostersResetTime,
    readNotifIds,
    dismissedNotifIds,
    localUpdatedAt,
    adminOverrideAt,
    accountCreatedAt,
    applyServerAccountState,
  ]);

  const todayKey = getTodayDateKey();
  const isDailyRewardAvailable = lastDailyClaimDate !== todayKey;

  const handleClaimDailyReward = useCallback(async () => {
    if (!isDailyRewardAvailable) return;
    const nowKey = getTodayDateKey();
    setLastDailyClaimDate(nowKey);
    try {
      localStorage.setItem(STORAGE_KEYS.DAILY_REWARD, nowKey);
    } catch {
      // ignore
    }
    const now = bumpLocalUpdatedAt();
    const nextWikithunes = wikithunes + DAILY_REWARD_AMOUNT;
    setWikithunes(nextWikithunes);

    try {
      const safeCol = Array.isArray(collection) ? collection : [];
      const legendaryCount = countRarityCopies(safeCol, 'L');
      const ultraRareCount = countRarityCopies(safeCol, 'UR');
      const gifCount = countGifCopies(safeCol);
      recordStatsSnapshot({
        userCode,
        wikithunes: nextWikithunes,
        collectionValue: safeCol.reduce(
          (sum, c) => sum + (c ? getCardRecycleValue(c) * (c.count || 1) : 0),
          0
        ),
        uniqueCardsCount: safeCol.length,
        totalCardsCount: safeCol.reduce((sum, c) => sum + (c?.count || 1), 0),
        legendaryCount,
        ultraRareCount,
        gifCount,
        collection: safeCol,
        stats: stats || {},
      });
    } catch (snapErr) {
      console.warn('[WikiCards Snapshot Daily Reward Error]:', snapErr);
    }

    if (userCode) {
      syncUserAccountToServer(userCode, {
        profile: userProfile,
        collection,
        favorites,
        wikithunes: nextWikithunes,
        stats,
        createdAt: accountCreatedAt || undefined,
        snapshots: getSavedStatsSnapshots(userCode).slice(-40),
        lastDailyClaimDate: nowKey,
        clientUpdatedAt: now,
      });
    }

    soundManager.playRarityReveal('R');
    try {
      confetti({
        particleCount: 55,
        spread: 60,
        origin: { y: 0.15 },
      });
    } catch {
      // ignore
    }
    setDailyRewardToast(
      `Bourse quotidienne réclamée : +${DAILY_REWARD_AMOUNT} ₩ ont été crédités à votre solde !`
    );
    setTimeout(() => {
      setDailyRewardToast(null);
    }, 4500);
  }, [
    isDailyRewardAvailable,
    bumpLocalUpdatedAt,
    wikithunes,
    collection,
    stats,
    userCode,
    userProfile,
    favorites,
    accountCreatedAt,
  ]);

  const toggleFavorite = useCallback((cardId) => {
    setFavorites((prev) => {
      const isAdding = !prev.includes(cardId);
      soundManager.playFavoriteToggle(isAdding);
      bumpLocalUpdatedAt();
      return isAdding ? [...prev, cardId] : prev.filter((id) => id !== cardId);
    });
  }, [bumpLocalUpdatedAt]);

  const spendWikithunes = useCallback((amount) => {
    bumpLocalUpdatedAt();
    setWikithunes((prev) => Math.max(0, prev - amount));
  }, [bumpLocalUpdatedAt]);

  const addWikithunes = useCallback((amount) => {
    bumpLocalUpdatedAt();
    setWikithunes((prev) => Math.max(0, prev + amount));
  }, [bumpLocalUpdatedAt]);

  const handleUpdateStats = useCallback((deltas) => {
    if (!deltas || typeof deltas !== 'object') return;
    bumpLocalUpdatedAt();
    setStats((prev) => {
      const next = { ...prev };
      if (typeof deltas.boostersOpened === 'number') {
        next.boostersOpened = (next.boostersOpened || 0) + deltas.boostersOpened;
      }
      if (typeof deltas.totalCardsDrawn === 'number') {
        next.totalCardsDrawn = (next.totalCardsDrawn || 0) + deltas.totalCardsDrawn;
      }
      if (typeof deltas.lostMoneyCasino === 'number') {
        next.lostMoneyCasino = (next.lostMoneyCasino || 0) + deltas.lostMoneyCasino;
      }
      if (typeof deltas.lostCards === 'number') {
        next.lostCards = (next.lostCards || 0) + deltas.lostCards;
      }
      if (typeof deltas.wonCards === 'number') {
        next.wonCards = (next.wonCards || 0) + deltas.wonCards;
      }
      if (typeof deltas.netCasinoGains === 'number') {
        next.netCasinoGains = (next.netCasinoGains || 0) + deltas.netCasinoGains;
      }
      if (typeof deltas.recordStreak === 'number') {
        next.recordStreak = Math.max(next.recordStreak || 0, deltas.recordStreak);
      }
      return next;
    });
  }, [bumpLocalUpdatedAt]);

  const addCardsToCollection = useCallback((newCards, fromBooster = true) => {
    const now = bumpLocalUpdatedAt();
    setCollection((prev) => {
      const map = new Map(prev.map((item) => [item.id, { ...item }]));
      newCards.forEach((card, idx) => {
        const resolvedTheme = card.theme || detectCardTheme(card);
        if (map.has(card.id)) {
          const existing = map.get(card.id);
          map.set(card.id, {
            ...existing,
            theme: existing.theme || resolvedTheme,
            isShiny: Boolean(existing.isShiny || card.isShiny),
            count: (existing.count || 1) + 1,
            firstObtainedAt:
              existing.firstObtainedAt || existing.obtainedAt || now + idx,
            obtainedAt: now + idx,
          });
        } else {
          map.set(card.id, {
            ...card,
            theme: resolvedTheme,
            count: 1,
            firstObtainedAt: now + idx,
            obtainedAt: now + idx,
          });
        }
      });
      return Array.from(map.values());
    });

    setStats((prev) => ({
      ...prev,
      boostersOpened: (prev.boostersOpened || 0) + (fromBooster ? 1 : 0),
      totalCardsDrawn: (prev.totalCardsDrawn || 0) + newCards.length,
    }));
  }, [bumpLocalUpdatedAt]);

  const consumeCardsFromCollection = useCallback((quantitiesMap) => {
    if (!quantitiesMap) return;
    bumpLocalUpdatedAt();
    setCollection((prev) =>
      prev
        .map((item) => {
          const idKey = String(item.id);
          const toRemove = Number(
            quantitiesMap[item.id] !== undefined
              ? quantitiesMap[item.id]
              : quantitiesMap[idKey] || 0
          );
          if (toRemove <= 0) return item;
          return {
            ...item,
            count: Math.max(0, (item.count || 1) - toRemove),
          };
        })
        .filter((item) => (item.count || 0) > 0)
    );
  }, [bumpLocalUpdatedAt]);

  const recycleCards = useCallback((selectedCounts, gain) => {
    if (!selectedCounts || gain <= 0) return;
    bumpLocalUpdatedAt();
    setCollection((prev) =>
      prev
        .map((item) => {
          const qtyToRemove = selectedCounts[String(item.id)] || 0;
          if (qtyToRemove <= 0) return item;
          return { ...item, count: (item.count || 1) - qtyToRemove };
        })
        .filter((item) => (item.count || 0) > 0)
    );
    addWikithunes(gain);
    soundManager.playCoinSound();
  }, [bumpLocalUpdatedAt, addWikithunes]);

  const handleUpdateUserProfile = useCallback(async (nextProfile) => {
    if (!nextProfile || !userCode) return;
    setUserProfile(nextProfile);
    saveLocalProfile(nextProfile, userCode);
    const now = bumpLocalUpdatedAt();
    try {
      await syncUserAccountToServer(userCode, {
        profile: nextProfile,
        collection,
        favorites,
        wikithunes,
        stats,
        lastDailyClaimDate,
        clientUpdatedAt: now,
      });
    } catch {
      // ignore
    }
  }, [
    userCode,
    collection,
    favorites,
    wikithunes,
    stats,
    lastDailyClaimDate,
    bumpLocalUpdatedAt,
  ]);

  const handleSyncAccountState = useCallback((updatedAccount) => {
    if (!updatedAccount) return;
    applyServerAccountState(updatedAccount);
  }, [applyServerAccountState]);

  const handleLoginSuccess = useCallback((account) => {
    if (!account || !account.code) return;
    const cleanCode = setStoredUserCode(account.code);
    const syncedTs = setStoredUpdatedAt(account.updatedAt || Date.now());
    skipNextPushRef.current = true;
    isServerHydratedRef.current = true;
    setLocalUpdatedAt(syncedTs);
    setUserCode(cleanCode);
    if (account.createdAt) {
      const cTs = Number(account.createdAt);
      if (cTs > 0) {
        setAccountCreatedAt(cTs);
        try {
          localStorage.setItem(STORAGE_KEYS.ACCOUNT_CREATED_AT, String(cTs));
        } catch {}
      }
    }
    const nextProf = account.profile || getDefaultProfile(cleanCode);
    setUserProfile(nextProf);
    saveLocalProfile(nextProf, cleanCode);
    if (nextProf.themePreference && typeof onHydrateDarkMode === 'function') {
      onHydrateDarkMode(nextProf.themePreference === 'dark');
    }
    setCollection(Array.isArray(account.collection) ? account.collection : []);
    setFavorites(Array.isArray(account.favorites) ? account.favorites : []);
    setWikithunes(
      typeof account.wikithunes === 'number'
        ? account.wikithunes
        : INITIAL_WIKITHUNES
    );
    setStats({
      boostersOpened: 0,
      totalCardsDrawn: 0,
      lostMoneyCasino: 0,
      lostCards: 0,
      wonCards: 0,
      netCasinoGains: 0,
      recordStreak: 0,
      ...(account.stats || {}),
    });
    if (Array.isArray(account.snapshots) && account.snapshots.length > 0) {
      try {
        localStorage.setItem(
          getSnapshotStorageKey(cleanCode),
          JSON.stringify(account.snapshots.slice(-120))
        );
      } catch {}
    }
    if (account.lastDailyClaimDate) {
      setLastDailyClaimDate(account.lastDailyClaimDate);
      try {
        localStorage.setItem(
          STORAGE_KEYS.DAILY_REWARD,
          account.lastDailyClaimDate
        );
      } catch {
        // ignore
      }
    }
    let loginCount =
      typeof account.freeBoostersCount === 'number'
        ? account.freeBoostersCount
        : MAX_FREE_BOOSTERS;
    let loginReset = Number(account.lastFreeBoostersResetTime) || Date.now();
    if (Date.now() - loginReset >= TWELVE_HOURS_MS) {
      loginCount = MAX_FREE_BOOSTERS;
      loginReset = Date.now();
    }
    setFreeBoostersCount(loginCount);
    setLastFreeBoostersResetTime(loginReset);
    if (typeof onHydrateNotifIds === 'function') {
      onHydrateNotifIds({
        read: account.readNotifIds,
        dismissed: account.dismissedNotifIds,
      });
    }
    try {
      localStorage.setItem(STORAGE_KEYS.FREE_BOOSTERS, String(loginCount));
      localStorage.setItem(
        STORAGE_KEYS.FREE_BOOSTERS_RESET,
        String(loginReset)
      );
    } catch {
      // ignore
    }
  }, [onHydrateDarkMode, onHydrateNotifIds]);

  const handleLogout = useCallback(() => {
    clearStoredUserCode();
    setUserCode(null);
    setAccountCreatedAt(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCOUNT_CREATED_AT);
      localStorage.removeItem(STORAGE_KEYS.STATS);
      localStorage.removeItem(STORAGE_KEYS.COLLECTION);
      localStorage.removeItem(STORAGE_KEYS.WIKITHUNES);
      localStorage.removeItem(STORAGE_KEYS.FREE_BOOSTERS);
      localStorage.removeItem(STORAGE_KEYS.FREE_BOOSTERS_RESET);
      localStorage.removeItem(STORAGE_KEYS.DAILY_REWARD);
    } catch {}
    if (typeof onHydrateDarkMode === 'function') {
      onHydrateDarkMode(false);
    }
    if (typeof onHydrateNotifIds === 'function') {
      onHydrateNotifIds({ read: [], dismissed: [] });
    }
    setCollection([]);
    setFavorites([]);
    setWikithunes(INITIAL_WIKITHUNES);
    setStats({
      boostersOpened: 0,
      totalCardsDrawn: 0,
      lostMoneyCasino: 0,
      lostCards: 0,
      wonCards: 0,
      netCasinoGains: 0,
      recordStreak: 0,
    });
  }, [onHydrateDarkMode, onHydrateNotifIds]);

  const handleDeleteAccount = useCallback(async () => {
    if (!userCode) return;
    try {
      await deleteUserAccount(userCode);
    } catch (err) {
      console.error('[handleDeleteAccount Error]:', err);
    }

    try {
      localStorage.removeItem(STORAGE_KEYS.COLLECTION);
      localStorage.removeItem(STORAGE_KEYS.FAVORITES);
      localStorage.removeItem(STORAGE_KEYS.STATS);
      localStorage.removeItem(STORAGE_KEYS.WIKITHUNES);
      localStorage.removeItem(STORAGE_KEYS.DAILY_REWARD);
      localStorage.removeItem(STORAGE_KEYS.FREE_BOOSTERS);
      localStorage.removeItem(STORAGE_KEYS.FREE_BOOSTERS_RESET);
    } catch {
      // ignore
    }

    setUserCode(null);
    setCollection([]);
    setFavorites([]);
    setWikithunes(INITIAL_WIKITHUNES);
    setStats({
      boostersOpened: 0,
      totalCardsDrawn: 0,
      lostMoneyCasino: 0,
      lostCards: 0,
      wonCards: 0,
      netCasinoGains: 0,
      recordStreak: 0,
    });
    setLastDailyClaimDate('');
    setFreeBoostersCount(MAX_FREE_BOOSTERS);
    setLastFreeBoostersResetTime(Date.now());
    setUserProfile(getDefaultProfile('WIKI-0000'));
    if (typeof onHydrateNotifIds === 'function') {
      onHydrateNotifIds({ read: [], dismissed: [] });
    }
    soundManager.playCardSlide();
  }, [userCode, onHydrateNotifIds]);

  const existingCardIds = useMemo(
    () => collection.map((c) => c.id),
    [collection]
  );

  const totalCopiesCount = useMemo(
    () => collection.reduce((sum, c) => sum + (c.count || 1), 0),
    [collection]
  );

  return {
    userCode,
    setUserCode,
    userProfile,
    setUserProfile,
    accountCreatedAt,
    wikithunes,
    setWikithunes,
    lastDailyClaimDate,
    dailyRewardToast,
    setDailyRewardToast,
    favorites,
    setFavorites,
    stats,
    setStats,
    collection,
    setCollection,
    playerScore,
    localUpdatedAt,
    bumpLocalUpdatedAt,
    freeBoostersCount,
    lastFreeBoostersResetTime,
    timeRemainingFreeBoosters,
    handleUseFreeBooster,
    isDailyRewardAvailable,
    todayKey,
    handleClaimDailyReward,
    toggleFavorite,
    spendWikithunes,
    addWikithunes,
    handleUpdateStats,
    addCardsToCollection,
    consumeCardsFromCollection,
    recycleCards,
    handleUpdateUserProfile,
    handleSyncAccountState,
    triggerServerReconcile,
    handleLoginSuccess,
    handleLogout,
    handleDeleteAccount,
    existingCardIds,
    totalCopiesCount,
  };
}
