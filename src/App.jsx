import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  Suspense,
  lazy,
} from 'react';
import WikiHeader from './components/WikiHeader';
import WikiCard from './components/WikiCard';
import BoosterOpening from './components/BoosterOpening';
import WikithuneIcon from './components/WikithuneIcon';
import AuthGateway from './components/AuthGateway';
import confetti from 'canvas-confetti';

const WikiSino = lazy(() => import('./components/WikiSino'));
const UserProfile = lazy(() => import('./components/UserProfile'));
const SocialHub = lazy(() => import('./components/SocialHub'));
const AuctionMarket = lazy(() => import('./components/AuctionMarket'));

function TabLoadingFallback() {
  return (
    <div className="accueil_2017_cadre p-12 text-center flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-3 border-[#3366cc] border-t-transparent rounded-full animate-spin" />
      <span className="text-[13.5px] text-[#54595d] font-medium">
        Chargement du module en cours...
      </span>
    </div>
  );
}

function getTodayDateKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

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
  fetchUserTrades,
  fetchMarketListings,
} from './services/userStorage';
import {
  RARITY_TIERS,
  BOOSTER_PRICE,
  ICONIC_BOOSTER_PRICE,
  INITIAL_WIKITHUNES,
  DAILY_REWARD_AMOUNT,
  getCardRecycleValue,
} from './config/rarities';
import { WIKI_THEMES, detectCardTheme } from './config/themes';
import { soundManager } from './services/sound';
import {
  Languages,
  MoreVertical,
  Volume2,
  VolumeX,
  ArrowUpDown,
  Recycle,
  Check,
  X,
  Eye,
  EyeOff,
  BookOpen,
  Moon,
  Sun,
  Gift,
} from 'lucide-react';

const STORAGE_KEYS = {
  COLLECTION: 'wikicards_collection_v1',
  FAVORITES: 'wikicards_favorites_v1',
  STATS: 'wikicards_stats_v1',
  WIKITHUNES: 'wikicards_wikithunes_v1',
  DARK_MODE: 'wikicards_dark_mode_v1',
  DAILY_REWARD: 'wikicards_daily_reward_claim_v1',
  READ_NOTIFS: 'wikicards_read_notifs_v1',
  SHOW_RARITY_RULES: 'wikicards_show_rarity_rules_v1',
};

const RARITY_ORDER = {
  L: 6,
  UR: 5,
  SR: 4,
  R: 3,
  PC: 2,
  C: 1,
};

export default function App() {
  const [activeTab, setActiveTab] = useState('booster'); // 'booster' | 'classeur'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRarityFilter, setSelectedRarityFilter] = useState('ALL'); // 'ALL' | 'L' | 'UR' | 'SR' | 'R' | 'PC' | 'C'
  const [selectedThemeFilter, setSelectedThemeFilter] = useState('ALL'); // 'ALL' | 'SCIENCE' | 'NATURE' | 'GEOGRAPHIE' | 'HISTOIRE' | 'CULTURE' | 'SOCIETE'
  const [sortBy, setSortBy] = useState('rarity_desc'); // 'rarity_desc' | 'gif_first' | 'views_desc' | 'views_asc' | 'alpha_asc' | 'recent' | 'count_desc'
  const [showRarityRules, setShowRarityRules] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SHOW_RARITY_RULES);
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {
      // ignore
    }
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.SHOW_RARITY_RULES,
        String(showRarityRules)
      );
    } catch {
      // ignore
    }
  }, [showRarityRules]);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => soundManager.isMuted());

  // Étape 12 : Mode Sombre (Vector 2022) : initialisé selon les préférences système ou le choix sauvegardé
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
      if (saved !== null) {
        return saved === 'true';
      }
      return (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    try {
      localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(isDarkMode));
    } catch {
      // ignore
    }
  }, [isDarkMode]);

  // Mode sélection de cartes à recycler dans le classeur
  const [isRecycleMode, setIsRecycleMode] = useState(false);
  const [selectedRecycleIds, setSelectedRecycleIds] = useState([]);

  // Étape 10 : Code Unique d'identification (WIKI-XXXX) & Profil Utilisateur (style OpenGym)
  const [userCode, setUserCode] = useState(() => getStoredUserCode());
  const [userProfile, setUserProfile] = useState(() => {
    const stored = getStoredUserCode();
    return stored ? loadLocalProfile(stored) : getDefaultProfile('WIKI-0000');
  });

  const toolsDropdownRef = useRef(null);

  // Fermeture du menu Outils (⋮) au clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        toolsDropdownRef.current &&
        !toolsDropdownRef.current.contains(e.target)
      ) {
        setIsToolsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Solde de Wikithunes persisté dans localStorage
  const [wikithunes, setWikithunes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WIKITHUNES);
      if (saved !== null) {
        const parsed = Number(JSON.parse(saved));
        if (!Number.isNaN(parsed) && parsed >= 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_WIKITHUNES;
  });

  // Bourse de recherche quotidienne (Daily Reward de 250 ₩)
  const [lastDailyClaimDate, setLastDailyClaimDate] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.DAILY_REWARD) || '';
    } catch {
      return '';
    }
  });
  const [dailyRewardToast, setDailyRewardToast] = useState(null);

  const todayKey = getTodayDateKey();
  const isDailyRewardAvailable = lastDailyClaimDate !== todayKey;

  const handleClaimDailyReward = async () => {
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
    if (userCode) {
      syncUserAccountToServer(userCode, {
        profile: userProfile,
        collection,
        favorites,
        wikithunes: nextWikithunes,
        stats,
        lastDailyClaimDate: nowKey,
        clientUpdatedAt: now,
      });
    }
    soundManager.play('rare');
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
  };

  // Favoris persistés dans localStorage
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

  // Statistiques globales persistées dans localStorage
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STATS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return { boostersOpened: 0, totalCardsDrawn: 0 };
  });

  // Cartes présentes dans le classeur
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

  // Horodatage de la dernière modification locale du joueur (pour la synchro multi-appareils PC <-> Téléphone)
  const [localUpdatedAt, setLocalUpdatedAt] = useState(() =>
    getStoredUpdatedAt(getStoredUserCode(), collection)
  );
  const isServerHydratedRef = useRef(false);
  const skipNextPushRef = useRef(false);

  const bumpLocalUpdatedAt = () => {
    const now = setStoredUpdatedAt(Date.now());
    setLocalUpdatedAt(now);
    return now;
  };

  // Sauvegarde automatique dans localStorage à chaque changement
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WIKITHUNES, JSON.stringify(wikithunes));
    } catch {
      // ignore
    }
  }, [wikithunes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COLLECTION, JSON.stringify(collection));
    } catch {
      // ignore quota error
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

  // Applique un état reçu depuis le serveur sans déclencher de renvoi inutile
  const applyServerAccountState = (serverAccount) => {
    if (!serverAccount) return;
    skipNextPushRef.current = true;
    if (serverAccount.profile) {
      setUserProfile({
        ...getDefaultProfile(serverAccount.code || userCode),
        ...serverAccount.profile,
      });
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
    if (serverAccount.stats && typeof serverAccount.stats === 'object') {
      setStats({
        boostersOpened: Number(serverAccount.stats.boostersOpened || 0),
        totalCardsDrawn: Number(serverAccount.stats.totalCardsDrawn || 0),
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
    if (serverAccount.updatedAt) {
      const syncedTs = setStoredUpdatedAt(serverAccount.updatedAt);
      setLocalUpdatedAt(syncedTs);
    }
  };

  // Référence toujours à jour pour la réconciliation périodique et au retour sur l'onglet
  const latestAccountRef = useRef({
    userCode,
    userProfile,
    collection,
    favorites,
    wikithunes,
    stats,
    lastDailyClaimDate,
    localUpdatedAt,
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
      localUpdatedAt,
    };
  }, [
    userCode,
    userProfile,
    collection,
    favorites,
    wikithunes,
    stats,
    lastDailyClaimDate,
    localUpdatedAt,
  ]);

  // Réconciliation bidirectionnelle avec le serveur (au chargement, au focus PC/Mobile, et toutes les 6s)
  useEffect(() => {
    if (!userCode) {
      isServerHydratedRef.current = false;
      return;
    }

    let isCancelled = false;

    const reconcileWithServer = async () => {
      const current = latestAccountRef.current;
      if (!current.userCode) return;

      const localSnapshot = {
        code: current.userCode,
        profile: current.userProfile,
        collection: current.collection,
        favorites: current.favorites,
        wikithunes: current.wikithunes,
        stats: current.stats,
        lastDailyClaimDate: current.lastDailyClaimDate || '',
        updatedAt: current.localUpdatedAt,
        clientUpdatedAt: current.localUpdatedAt,
      };

      const res = await fetchServerUserAccount(current.userCode);
      if (isCancelled) return;

      if (res.status === 'not_found') {
        // Le serveur a redémarré ou redéployé : on restaure immédiatement le compte local sur le serveur
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
          // Le serveur possède une version plus récente (ex: partie jouée sur téléphone ou vente marché)
          applyServerAccountState(res.user);
        } else if (isAccountStateNewer(localSnapshot, res.user)) {
          // L'appareil local possède une version plus avancée que le serveur : on la pousse
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
    };

    reconcileWithServer();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        reconcileWithServer();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    const interval = setInterval(reconcileWithServer, 6000);

    return () => {
      isCancelled = true;
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, [userCode]);

  // Synchronisation automatique vers data/users/<CODE>.json lors d'une modification locale
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
        lastDailyClaimDate,
        clientUpdatedAt: localUpdatedAt,
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
    localUpdatedAt,
  ]);

  const handleUpdateUserProfile = (nextProfile) => {
    const now = bumpLocalUpdatedAt();
    setUserProfile(nextProfile);
    if (userCode) {
      saveLocalProfile(nextProfile, userCode);
      syncUserAccountToServer(userCode, {
        profile: nextProfile,
        collection,
        favorites,
        wikithunes,
        stats,
        lastDailyClaimDate,
        clientUpdatedAt: now,
      });
    }
  };

  // Met à jour l'état local après une transaction serveur (échange accepté ou achat/vente sur le marché)
  const handleSyncAccountState = (updatedAccount) => {
    if (!updatedAccount) return;
    applyServerAccountState(updatedAccount);
  };

  const handleLoginSuccess = (account) => {
    if (!account || !account.code) return;
    const cleanCode = setStoredUserCode(account.code);
    const syncedTs = setStoredUpdatedAt(account.updatedAt || Date.now());
    skipNextPushRef.current = true;
    isServerHydratedRef.current = true;
    setLocalUpdatedAt(syncedTs);
    setUserCode(cleanCode);
    const nextProf = account.profile || getDefaultProfile(cleanCode);
    setUserProfile(nextProf);
    saveLocalProfile(nextProf, cleanCode);
    setCollection(Array.isArray(account.collection) ? account.collection : []);
    setFavorites(Array.isArray(account.favorites) ? account.favorites : []);
    setWikithunes(
      typeof account.wikithunes === 'number'
        ? account.wikithunes
        : INITIAL_WIKITHUNES
    );
    setStats(account.stats || { boostersOpened: 0, totalCardsDrawn: 0 });
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
  };

  const handleLogout = () => {
    clearStoredUserCode();
    setUserCode(null);
  };

  // État des notifications et liste des identifiants marqués comme lus
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.READ_NOTIFS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [notifications, setNotifications] = useState([]);

  // Agrégation dynamique des notifications (échanges, marché, bourse de recherche)
  useEffect(() => {
    if (!userCode) {
      setNotifications([]);
      return;
    }

    let isMounted = true;
    const loadNotifs = async () => {
      try {
        const notifs = [];

        // 1. Notification Bourse de recherche quotidienne
        if (isDailyRewardAvailable) {
          notifs.push({
            id: `daily-reward-${todayKey}`,
            type: 'daily_reward',
            title: 'Bourse de recherche disponible',
            message: `Réclamez votre allocation journalière (+${DAILY_REWARD_AMOUNT} ₩) pour financer vos boosters !`,
            tab: 'booster',
          });
        }

        // 2. Notifications d'échanges
        const userTrades = await fetchUserTrades(userCode);
        if (Array.isArray(userTrades)) {
          userTrades.forEach((trade) => {
            if (trade.toCode === userCode && trade.status === 'pending') {
              notifs.push({
                id: `trade-incoming-${trade.id}`,
                type: 'trade_incoming',
                title: "Nouvelle offre d'échange",
                message: `${trade.fromUsername || 'Un joueur'} vous propose un échange de cartes.`,
                tab: 'social',
                time: trade.createdAt
                  ? new Date(trade.createdAt).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : undefined,
              });
            } else if (
              trade.fromCode === userCode &&
              trade.status === 'accepted'
            ) {
              notifs.push({
                id: `trade-accepted-${trade.id}`,
                type: 'trade_accepted',
                title: 'Échange accepté !',
                message: `${trade.toUsername || 'Un joueur'} a accepté votre proposition d'échange.`,
                tab: 'social',
              });
            } else if (
              trade.fromCode === userCode &&
              trade.status === 'declined'
            ) {
              notifs.push({
                id: `trade-declined-${trade.id}`,
                type: 'trade_declined',
                title: 'Échange refusé',
                message: `${trade.toUsername || 'Un joueur'} a décliné votre offre d'échange.`,
                tab: 'social',
              });
            }
          });
        }

        // 3. Notifications du Marché aux enchères
        const listings = await fetchMarketListings();
        if (Array.isArray(listings)) {
          listings.forEach((listing) => {
            const cardTitle = listing.card?.title || 'Une carte';
            // Vente de carte par le joueur
            if (
              listing.sellerCode === userCode &&
              (listing.status === 'sold' || listing.status === 'bought_out')
            ) {
              notifs.push({
                id: `market-sold-${listing.id}`,
                type: 'market_sold',
                title: 'Carte vendue au marché !',
                message: `Votre carte "${cardTitle}" a été vendue pour ${new Intl.NumberFormat(
                  'fr-FR'
                ).format(listing.buyoutPrice || listing.currentBid)} ₩ !`,
                tab: 'market',
              });
            }
            // Surenchère subie par le joueur
            if (
              listing.status === 'active' &&
              Array.isArray(listing.bids) &&
              listing.bids.some((b) => b.bidderCode === userCode) &&
              listing.highestBidder !== userCode
            ) {
              notifs.push({
                id: `market-outbid-${listing.id}-${listing.currentBid}`,
                type: 'market_outbid',
                title: 'Vous avez été surenchéri !',
                message: `Une offre de ${new Intl.NumberFormat('fr-FR').format(
                  listing.currentBid
                )} ₩ a dépassé la vôtre sur "${cardTitle}".`,
                tab: 'market',
              });
            }
            // Enchère remportée par le joueur
            if (
              listing.status === 'ended' &&
              listing.highestBidder === userCode
            ) {
              notifs.push({
                id: `market-won-${listing.id}`,
                type: 'market_won',
                title: 'Enchère remportée !',
                message: `Félicitations, vous avez remporté l'enchère pour "${cardTitle}" !`,
                tab: 'classeur',
              });
            }
          });
        }

        if (isMounted) {
          setNotifications(notifs);
        }
      } catch {
        // ignore
      }
    };

    loadNotifs();
    const interval = setInterval(loadNotifs, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [userCode, isDailyRewardAvailable, todayKey]);

  const handleMarkAllNotifsRead = () => {
    const allIds = notifications.map((n) => n.id);
    const updated = Array.from(new Set([...readNotifIds, ...allIds]));
    setReadNotifIds(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.READ_NOTIFS, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleSelectNotification = (notif) => {
    if (!notif) return;
    if (!readNotifIds.includes(notif.id)) {
      const updated = [...readNotifIds, notif.id];
      setReadNotifIds(updated);
      try {
        localStorage.setItem(STORAGE_KEYS.READ_NOTIFS, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
    if (notif.tab) {
      setActiveTab(notif.tab);
    }
  };

  const handleToggleSound = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      soundManager.playBoosterCharge();
    }
  };

  const toggleFavorite = (cardId) => {
    const isAdding = !favorites.includes(cardId);
    soundManager.playFavoriteToggle(isAdding);
    bumpLocalUpdatedAt();
    setFavorites((prev) =>
      isAdding ? [...prev, cardId] : prev.filter((id) => id !== cardId)
    );
  };

  const spendWikithunes = (amount) => {
    bumpLocalUpdatedAt();
    setWikithunes((prev) => Math.max(0, prev - amount));
  };

  const addWikithunes = (amount) => {
    bumpLocalUpdatedAt();
    setWikithunes((prev) => Math.max(0, prev + amount));
  };

  // Ajoute les cartes d'un booster ouvert (ou d'un gain WikiSino) au classeur
  const addCardsToCollection = (newCards, fromBooster = true) => {
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
            obtainedAt: now + idx,
          });
        } else {
          map.set(card.id, {
            ...card,
            theme: resolvedTheme,
            count: 1,
            obtainedAt: now + idx,
          });
        }
      });
      return Array.from(map.values());
    });

    setStats((prev) => ({
      boostersOpened: (prev.boostersOpened || 0) + (fromBooster ? 1 : 0),
      totalCardsDrawn: (prev.totalCardsDrawn || 0) + newCards.length,
    }));
  };

  // Consomme un dictionnaire { [cardId]: quantity } d'exemplaires dans le classeur (pour l'Upgrader du WikiSino)
  const consumeCardsFromCollection = (quantitiesMap) => {
    if (!quantitiesMap) return;
    bumpLocalUpdatedAt();
    setCollection((prev) =>
      prev
        .map((item) => {
          const toRemove = Number(quantitiesMap[item.id] || 0);
          if (toRemove <= 0) return item;
          return {
            ...item,
            count: Math.max(0, (item.count || 1) - toRemove),
          };
        })
        .filter((item) => (item.count || 0) > 0)
    );
  };

  // Sélection / Désélection d'une carte en mode recyclage
  const handleToggleSelectForRecycle = (card) => {
    const isFav = favorites.includes(card.id);
    const currentCount = card.count || 1;
    if (isFav && currentCount <= 1) return;

    setSelectedRecycleIds((prev) =>
      prev.includes(card.id)
        ? prev.filter((id) => id !== card.id)
        : [...prev, card.id]
    );
  };

  // Calcul du gain total des cartes sélectionnées pour le recyclage
  const selectedRecycleGain = useMemo(() => {
    if (selectedRecycleIds.length === 0) return 0;
    const selectedSet = new Set(selectedRecycleIds);
    return collection.reduce((sum, card) => {
      if (!selectedSet.has(card.id)) return sum;
      return sum + getCardRecycleValue(card);
    }, 0);
  }, [collection, selectedRecycleIds]);

  // Confirme le recyclage des cartes sélectionnées (retire 1 exemplaire de chaque carte sélectionnée)
  const handleConfirmRecycleSelection = () => {
    if (selectedRecycleIds.length === 0) return;
    const selectedSet = new Set(selectedRecycleIds);
    const gain = selectedRecycleGain;

    setCollection((prev) =>
      prev
        .map((item) => {
          if (!selectedSet.has(item.id)) return item;
          return { ...item, count: (item.count || 1) - 1 };
        })
        .filter((item) => (item.count || 0) > 0)
    );

    addWikithunes(gain);
    soundManager.playCoinSound();
    setSelectedRecycleIds([]);
    setIsRecycleMode(false);
  };

  const handleToggleRecycleMode = () => {
    setIsRecycleMode((prev) => {
      const next = !prev;
      if (!next) setSelectedRecycleIds([]);
      return next;
    });
  };

  // Calcul du total d'exemplaires (avec doublons)
  const totalCopiesCount = useMemo(
    () => collection.reduce((sum, c) => sum + (c.count || 1), 0),
    [collection]
  );

  // Comptage des cartes par thème encyclopédique pour l'étape 8
  const themeCounts = useMemo(() => {
    const counts = {};
    WIKI_THEMES.forEach((t) => {
      counts[t.id] = 0;
    });
    collection.forEach((card) => {
      const tId = card.theme || detectCardTheme(card);
      counts[tId] = (counts[tId] || 0) + 1;
    });
    return counts;
  }, [collection]);

  // Filtrage et tri des cartes du classeur (les cartes en favori sont TOUJOURS affichées en 1er tout en haut)
  const filteredAndSortedCollection = useMemo(() => {
    const filtered = collection.filter((card) => {
      const matchesRarity =
        selectedRarityFilter === 'ALL'
          ? true
          : card.rarity === selectedRarityFilter;

      const cardTheme = card.theme || detectCardTheme(card);
      const matchesTheme =
        selectedThemeFilter === 'ALL'
          ? true
          : cardTheme === selectedThemeFilter;

      const matchesSearch =
        !searchQuery.trim() ||
        card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.extract.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesRarity && matchesTheme && matchesSearch;
    });

    const favSet = new Set(favorites);

    return [...filtered].sort((a, b) => {
      // 1. Les cartes en favori apparaissent toujours tout en haut du classeur
      const aFav = favSet.has(a.id) ? 1 : 0;
      const bFav = favSet.has(b.id) ? 1 : 0;
      if (bFav !== aFav) return bFav - aFav;

      // 2. Tri secondaire selon l'option choisie
      switch (sortBy) {
        case 'rarity_desc': {
          const diff =
            (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
          if (diff !== 0) return diff;
          return (b.views || 0) - (a.views || 0);
        }
        case 'gif_first': {
          const aGif = Boolean(
            a.isShiny || a.isGif || /\.gif(\?|$|\/)/i.test(a.image || '')
          )
            ? 1
            : 0;
          const bGif = Boolean(
            b.isShiny || b.isGif || /\.gif(\?|$|\/)/i.test(b.image || '')
          )
            ? 1
            : 0;
          if (bGif !== aGif) return bGif - aGif;
          const diff =
            (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
          if (diff !== 0) return diff;
          return (b.views || 0) - (a.views || 0);
        }
        case 'views_desc':
          return (b.views || 0) - (a.views || 0);
        case 'views_asc':
          return (a.views || 0) - (b.views || 0);
        case 'alpha_asc':
          return a.title.localeCompare(b.title, 'fr');
        case 'recent':
          return (b.obtainedAt || 0) - (a.obtainedAt || 0);
        case 'count_desc': {
          const diff = (b.count || 1) - (a.count || 1);
          if (diff !== 0) return diff;
          return (b.views || 0) - (a.views || 0);
        }
        default:
          return 0;
      }
    });
  }, [
    collection,
    selectedRarityFilter,
    selectedThemeFilter,
    favorites,
    searchQuery,
    sortBy,
  ]);

  const existingCardIds = useMemo(
    () => collection.map((c) => c.id),
    [collection]
  );

  // Si aucun compte n'est encore associé (premier lancement ou déconnexion),
  // afficher la page d'identification / création pour éviter les comptes fantômes
  if (!userCode) {
    return <AuthGateway onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-white text-[#202122] flex flex-col">
      {/* Barre supérieure Wikipédia Vector 2022 */}
      <WikiHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        wikithunes={wikithunes}
        userProfile={userProfile}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        notifications={notifications}
        readNotificationIds={readNotifIds}
        onMarkAllNotifsRead={handleMarkAllNotifsRead}
        onSelectNotification={handleSelectNotification}
      />

      {/* mw-page-container : Conteneur officiel Vector 2022 */}
      <div className="mw-page-container flex-1 w-full max-w-[1440px] mx-auto px-2.5 sm:px-[44px] pt-[12px] sm:pt-[18px] pb-[60px] sm:pb-[82px]">
        <div className="mw-content-container">
          <main id="content" className="mw-body">
            {/* mw-body-header vector-page-titlebar : Titre H1 "Bienvenue sur Wikipédia" + indicateur "Wikipédia FR" */}
            <header className="mw-body-header vector-page-titlebar pb-[2px] flex items-center justify-between gap-2">
              <h1
                id="firstHeading"
                className="firstHeading mw-first-heading wiki-serif text-[22px] sm:text-[28.8px] font-normal text-[#101418] leading-[1.375] m-0 p-0 truncate"
              >
                {activeTab === 'profile'
                  ? 'Utilisateur'
                  : 'Bienvenue sur WikiCards'}
              </h1>

              <div className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 text-[12px] sm:text-[14px] font-bold text-[#3366cc] rounded-[2px] select-none shrink-0">
                <Languages className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] stroke-[2]" />
                <span>Wikipédia&nbsp;FR</span>
              </div>
            </header>

            {/* vector-page-toolbar : Onglets 14px + Ombre inférieure #c8ccd1 (exactement comme load.php) */}
            <div className="vector-page-toolbar mb-[16px]">
              <div className="vector-page-toolbar-container flex items-center justify-between min-h-[35px] overflow-hidden">
                {/* left-navigation : Onglets défilables horizontalement sur mobile */}
                <div id="left-navigation" className="flex items-center gap-[10px] sm:gap-[16px] overflow-x-auto whitespace-nowrap scrollbar-none pb-1 sm:pb-0 max-w-full">
                  <button
                    type="button"
                    onClick={() => setActiveTab('booster')}
                    className={`vector-tab-link ${
                      activeTab === 'booster' ? 'selected' : ''
                    }`}
                  >
                    Accueil
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('classeur')}
                    className={`vector-tab-link ${
                      activeTab === 'classeur' ? 'selected' : ''
                    }`}
                  >
                    Classeur ({collection.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('wikisino')}
                    className={`vector-tab-link ${
                      activeTab === 'wikisino' ? 'selected' : ''
                    }`}
                  >
                    WikiSino
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('social')}
                    className={`vector-tab-link ${
                      activeTab === 'social' ? 'selected' : ''
                    }`}
                  >
                    Social
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('market')}
                    className={`vector-tab-link ${
                      activeTab === 'market' ? 'selected' : ''
                    }`}
                  >
                    Marché
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className={`vector-tab-link ${
                      activeTab === 'profile' ? 'selected' : ''
                    }`}
                  >
                    Profil
                  </button>
                </div>

                {/* right-navigation : Lire | Ouvrir une page au hasard | Menu Outils (⋮) */}
                <div id="right-navigation" className="flex items-center gap-[8px] sm:gap-[16px] shrink-0 ml-2">
                  <span className="vector-tab-link selected hidden xs:inline-flex">Lire</span>
                  <a
                    href="https://fr.wikipedia.org/wiki/Sp%C3%A9cial:Page_au_hasard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vector-tab-link hidden md:inline-flex"
                  >
                    Ouvrir une page au hasard
                  </a>

                  {/* Menu déroulant Outils (⋮) fidèle à vector-page-tools de Wikipédia Vector 2022 */}
                  <div
                    ref={toolsDropdownRef}
                    id="vector-page-tools-dropdown"
                    className="vector-dropdown relative"
                  >
                    <button
                      type="button"
                      onClick={() => setIsToolsMenuOpen((prev) => !prev)}
                      className={`w-[32px] h-[32px] text-[#202122] hover:bg-[#eaecf0] active:bg-[#dadde3] rounded-[2px] cursor-pointer flex items-center justify-center transition-colors ${
                        isToolsMenuOpen ? 'bg-[#dadde3]' : ''
                      }`}
                      title="Outils"
                      aria-label="Outils"
                      aria-expanded={isToolsMenuOpen}
                    >
                      <MoreVertical className="w-[16px] h-[16px]" />
                    </button>

                    {isToolsMenuOpen && (
                      <div className="vector-dropdown-content absolute right-0 top-full mt-1 w-[240px] bg-white border border-[#a2a9b1] rounded-[2px] shadow-[0_2px_6px_-1px_rgba(0,0,0,0.2)] py-[14px] px-[16px] z-50 text-[14px] leading-[1.4]">
                        <div
                          id="vector-page-tools-unpinned-container"
                          className="vector-unpinned-container"
                        >
                          <div
                            id="vector-page-tools"
                            className="vector-page-tools vector-pinnable-element"
                          >
                            {/* En-tête du menu Outils */}
                            <div className="vector-pinnable-header flex items-center justify-between border-b border-[#eaecf0] pb-[6px] mb-[6px]">
                              <div className="vector-pinnable-header-label font-bold text-[#202122] text-[14px]">
                                Outils
                              </div>
                            </div>

                            {/* Section Général : Son activé, Masquer le barème, Dev Menu */}
                            <div
                              id="p-tb"
                              className="vector-menu mw-portlet mw-portlet-tb"
                            >
                              <div className="vector-menu-heading text-[14px] text-[#54595d] border-b border-[#eaecf0] py-[6px] mb-[6px]">
                                Général
                              </div>
                              <div className="vector-menu-content">
                                <ul className="vector-menu-content-list list-none m-0 p-0 space-y-0.5">
                                  <li className="mw-list-item">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setIsDarkMode((prev) => !prev)
                                      }
                                      className="w-full text-left py-[6px] text-[#3366cc] hover:text-[#3056a9] hover:underline cursor-pointer inline-flex items-center gap-1.5 text-[14px]"
                                    >
                                      {isDarkMode ? (
                                        <>
                                          <Sun className="w-[14px] h-[14px] text-[#3366cc]" />
                                          <span>Mode clair</span>
                                        </>
                                      ) : (
                                        <>
                                          <Moon className="w-[14px] h-[14px]" />
                                          <span>Mode sombre</span>
                                        </>
                                      )}
                                    </button>
                                  </li>
                                  <li className="mw-list-item">
                                    <button
                                      type="button"
                                      onClick={handleToggleSound}
                                      className="w-full text-left py-[6px] text-[#3366cc] hover:text-[#3056a9] hover:underline cursor-pointer inline-flex items-center gap-1.5 text-[14px]"
                                      title={
                                        isMuted
                                          ? 'Activer les effets sonores'
                                          : 'Couper les effets sonores'
                                      }
                                    >
                                      {isMuted ? (
                                        <>
                                          <VolumeX className="w-[14px] h-[14px] text-[#72777d]" />
                                          <span>Son coupé</span>
                                        </>
                                      ) : (
                                        <>
                                          <Volume2 className="w-[14px] h-[14px]" />
                                          <span>Son activé</span>
                                        </>
                                      )}
                                    </button>
                                  </li>
                                  <li className="mw-list-item">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowRarityRules((prev) => !prev)
                                      }
                                      className="w-full text-left py-[6px] text-[#3366cc] hover:text-[#3056a9] hover:underline cursor-pointer inline-flex items-center gap-1.5 text-[14px]"
                                    >
                                      {showRarityRules ? (
                                        <>
                                          <EyeOff className="w-[14px] h-[14px]" />
                                          <span>Masquer le barème</span>
                                        </>
                                      ) : (
                                        <>
                                          <Eye className="w-[14px] h-[14px]" />
                                          <span>Voir le barème</span>
                                        </>
                                      )}
                                    </button>
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* bodyContent : Bandeau d'accueil officiel (#accueil_2017_en-tete & #accueil_2017_bandeau) + Cadres (.accueil_2017_cadre) */}
            <div id="bodyContent" className="vector-body">
              <div id="mw-content-text" className="mw-body-content">
                {/* Bandeau d'accueil officiel de fr.wikipedia.org (reproduit à l'identique depuis load(2).php) */}
                <div id="accueil_2017_en-tete" className="mb-[16px]">
                  <div
                    id="accueil_2017_bandeau"
                    className="flex flex-col md:flex-row flex-wrap items-start md:items-center justify-between gap-4"
                  >
                    <div
                      id="accueil_2017_bloc-titre"
                      className="pl-0 sm:ml-[14rem] mb-1 sm:mb-[1rem] text-left"
                    >
                      <h2>Wikicards</h2>
                      <p>
                        L'encyclopédie libre que vous pouvez collectionner
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notification toast de la Bourse Quotidienne */}
                {dailyRewardToast && (
                  <div className="mb-4 bg-[#dff2eb] border border-[#099979] text-[#177860] font-medium rounded-[2px] p-3 flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{dailyRewardToast}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDailyRewardToast(null)}
                      className="text-[#177860] hover:text-[#103828] cursor-pointer"
                      title="Fermer"
                      aria-label="Fermer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Bannière d'annonce Bourse de recherche quotidienne (si disponible) */}
                {isDailyRewardAvailable && (
                  <div className="mb-4 bg-[#eaf3ff] border border-[#3366cc] rounded-[2px] p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px]">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-8 h-8 rounded-[2px] bg-[#3366cc] text-white flex items-center justify-center shrink-0">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-[#101418] font-bold block sm:inline">
                          Bourse de recherche quotidienne disponible !
                        </strong>{' '}
                        <span className="text-[#54595d]">
                          Recevez votre allocation journalière (+{DAILY_REWARD_AMOUNT} ₩) pour financer vos ouvertures de boosters.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClaimDailyReward}
                      className="wiki-casino-btn wiki-casino-btn--primary !min-h-[32px] !py-1 !px-3.5 text-[12.5px] font-bold shrink-0 inline-flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>Réclamer +{DAILY_REWARD_AMOUNT} ₩</span>
                    </button>
                  </div>
                )}

                {/* Contenu selon l'onglet actif */}
                {activeTab === 'booster' ? (
                  <div
                    id="accueil_2017_contenu"
                    className={`grid grid-cols-1 ${
                      showRarityRules ? 'lg:grid-cols-12' : 'lg:grid-cols-1'
                    } gap-[19.2px] items-start`}
                  >
                    {/* Cadre Gauche (.accueil_2017_cadre) : Ouverture Interactive de Booster */}
                    <section
                      className={`${
                        showRarityRules ? 'lg:col-span-9' : 'lg:col-span-12'
                      } accueil_2017_cadre`}
                    >
                      <div className="wiki-cadre-header flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="wiki-smallcaps m-0">
                          Ouverture de booster
                        </h2>
                        <span className="text-[12.5px] text-[#54595d]">
                          Tirage en direct sur Wikipédia FR
                        </span>
                      </div>

                      <BoosterOpening
                        onCardsOpened={addCardsToCollection}
                        existingCardIds={existingCardIds}
                        favorites={favorites}
                        onToggleFavorite={toggleFavorite}
                        onGoToClasseur={() => setActiveTab('classeur')}
                        wikithunes={wikithunes}
                        boosterPrice={BOOSTER_PRICE}
                        iconicBoosterPrice={ICONIC_BOOSTER_PRICE}
                        onSpendWikithunes={spendWikithunes}
                      />
                    </section>

                    {/* Cadre Droit (.accueil_2017_cadre) : style "PRÉSENTATION" de l'Accueil Wikipédia */}
                    {showRarityRules && (
                      <aside className="lg:col-span-3 accueil_2017_cadre lg:sticky lg:top-4">
                        <div className="wiki-cadre-header">
                          <h2 className="wiki-smallcaps m-0">Présentation</h2>
                        </div>

                        <p className="text-[14px] text-[#202122] leading-[1.6] mb-3 mt-0">
                          <a
                            href="https://fr.wikipedia.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="wiki-link"
                          >
                            Wikipédia
                          </a>{' '}
                          est un projet d’encyclopédie collective en ligne. Dans{' '}
                          <strong>WikiCards</strong>, la rareté de chaque carte
                          dépend du nombre de visiteurs mensuels de la page.
                        </p>

                        <div className="border border-[#eaecf0] bg-[#f8f9fa] p-3 rounded-[2px] space-y-1.5">
                          <div className="flex items-center justify-between text-[11.5px] font-bold text-[#54595d] uppercase tracking-wider mb-1">
                            <span>Échelle des raretés</span>
                            <span>Chance</span>
                          </div>
                          {RARITY_TIERS.map((tier) => (
                            <div
                              key={tier.code}
                              className="w-full flex items-center justify-between text-[12.5px] py-1.5 border-b last:border-b-0 border-[#eaecf0] gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-[5px] text-[11px] font-bold shadow-2xs shrink-0"
                                  style={{
                                    backgroundColor: tier.badgeBg,
                                    color: tier.badgeText,
                                  }}
                                >
                                  {tier.code}
                                </span>
                                <div className="flex flex-col leading-tight min-w-0">
                                  <span className="font-medium text-[#202122] truncate">
                                    {tier.name}
                                  </span>
                                  <span className="text-[#54595d] text-[11px] inline-flex items-center gap-1 flex-wrap">
                                    <span>{tier.thresholdLabel}</span>
                                    <span>•</span>
                                    <span className="inline-flex items-center gap-0.5 text-[#202122] font-medium">
                                      {tier.recycleValue}
                                      <WikithuneIcon className="w-2.5 h-2.5 text-[#3366cc]" />
                                    </span>
                                  </span>
                                </div>
                              </div>
                              <span className="font-bold text-[#202122] text-[12.5px] shrink-0">
                                {tier.dropRate}
                              </span>
                            </div>
                          ))}
                        </div>
                      </aside>
                    )}
                  </div>
                ) : activeTab === 'wikisino' ? (
                  /* =====================================================================
                     ONGLET WIKISINO (Étape 9 : Upgrader, Plus ou Moins, Quitte ou Double)
                  ===================================================================== */
                  <Suspense fallback={<TabLoadingFallback />}>
                    <WikiSino
                      collection={collection}
                      favorites={favorites}
                      wikithunes={wikithunes}
                      onSpendWikithunes={spendWikithunes}
                      onAddWikithunes={addWikithunes}
                      onConsumeCards={consumeCardsFromCollection}
                      onCardWon={(wonCard) =>
                        addCardsToCollection([wonCard], false)
                      }
                      existingCardIds={existingCardIds}
                      onToggleFavorite={toggleFavorite}
                    />
                  </Suspense>
                ) : activeTab === 'social' ? (
                  /* =====================================================================
                     ONGLET SOCIAL : ANNUAIRE DES JOUEURS, VISITE DE PROFIL & ÉCHANGES
                  ===================================================================== */
                  <Suspense fallback={<TabLoadingFallback />}>
                    <SocialHub
                      userCode={userCode}
                      collection={collection}
                      favorites={favorites}
                      wikithunes={wikithunes}
                      stats={stats}
                      userProfile={userProfile}
                      onSyncAccountState={handleSyncAccountState}
                    />
                  </Suspense>
                ) : activeTab === 'market' ? (
                  /* =====================================================================
                     ONGLET MARCHÉ : HÔTEL DES VENTES & ENCHÈRES EN WIKITHUNES
                  ===================================================================== */
                  <Suspense fallback={<TabLoadingFallback />}>
                    <AuctionMarket
                      userCode={userCode}
                      collection={collection}
                      favorites={favorites}
                      wikithunes={wikithunes}
                      onSyncAccountState={handleSyncAccountState}
                    />
                  </Suspense>
                ) : activeTab === 'profile' ? (
                  /* =====================================================================
                     ONGLET PROFIL UTILISATEUR & CODE UNIQUE (Étape 10)
                  ===================================================================== */
                  <Suspense fallback={<TabLoadingFallback />}>
                    <UserProfile
                      userCode={userCode}
                      profile={userProfile}
                      onUpdateProfile={handleUpdateUserProfile}
                      onLogout={handleLogout}
                      collection={collection}
                      favorites={favorites}
                      onToggleFavorite={toggleFavorite}
                      wikithunes={wikithunes}
                      stats={stats}
                    />
                  </Suspense>
                ) : (
                  /* =====================================================================
                     ONGLET CLASSEUR (.accueil_2017_cadre) : 4 CARTES PAR LIGNE, FAVORIS EN 1ER
                  ===================================================================== */
                  <section className="accueil_2017_cadre">
                    <div className="wiki-cadre-header flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h2 className="wiki-smallcaps m-0">
                        Classeur de cartes Wikipédia
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-[#54595d]">
                        <span>
                          <strong className="text-[#202122]">
                            {collection.length}
                          </strong>{' '}
                          pages uniques
                        </span>
                        <span>•</span>
                        <span>
                          <strong className="text-[#202122]">
                            {totalCopiesCount}
                          </strong>{' '}
                          cartes au total
                        </span>
                        <span>•</span>
                        <span>
                          <strong className="text-[#202122]">
                            {stats.boostersOpened}
                          </strong>{' '}
                          booster(s) ouvert(s)
                        </span>
                      </div>
                    </div>

                    {/* Barre de filtres par rareté + Filtre par Thème (Étape 8) + Sélecteur de tri */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#eaecf0]">
                      {/* Filtres par rareté (sans le bouton GIF séparé, conservé uniquement dans Trier par) */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedRarityFilter('ALL')}
                          className={`px-2.5 py-1 text-[12px] rounded-[2px] border cursor-pointer transition-colors ${
                            selectedRarityFilter === 'ALL'
                              ? 'bg-[#202122] text-white border-[#202122] font-semibold'
                              : 'bg-[#f8f9fa] text-[#202122] border-[#a2a9b1] hover:bg-white'
                          }`}
                        >
                          Toutes ({collection.length})
                        </button>

                        {[...RARITY_TIERS].reverse().map((tier) => {
                          const count = collection.filter(
                            (c) => c.rarity === tier.code
                          ).length;
                          return (
                            <button
                              key={tier.code}
                              type="button"
                              onClick={() => setSelectedRarityFilter(tier.code)}
                              className={`px-2.5 py-1 text-[12px] rounded-[2px] border cursor-pointer transition-all flex items-center gap-1.5 ${
                                selectedRarityFilter === tier.code
                                  ? 'ring-2 ring-[#3366cc] font-bold bg-white border-[#3366cc]'
                                  : 'bg-[#f8f9fa] hover:bg-white border-[#c8ccd1]'
                              }`}
                              title={`${tier.name} (${tier.thresholdLabel} • Recyclage : +${tier.recycleValue} ₩)`}
                            >
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: tier.borderColor }}
                              />
                              <span>
                                {tier.code} ({count})
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Filtre par Thème (Étape 8) + Sélecteur de Tri */}
                      <div className="flex flex-wrap items-center gap-3 text-[12.5px] shrink-0">
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor="classeur-theme"
                            className="inline-flex items-center gap-1 text-[#54595d] font-medium"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Thème :</span>
                          </label>
                          <select
                            id="classeur-theme"
                            value={selectedThemeFilter}
                            onChange={(e) =>
                              setSelectedThemeFilter(e.target.value)
                            }
                            className="bg-[#f8f9fa] hover:bg-white border border-[#a2a9b1] rounded-[2px] px-2.5 h-[28px] text-[12.5px] text-[#202122] focus:outline-none focus:border-[#3366cc] cursor-pointer"
                          >
                            <option value="ALL">
                              Tous les thèmes ({collection.length})
                            </option>
                            {WIKI_THEMES.map((theme) => (
                              <option key={theme.id} value={theme.id}>
                                {theme.label} ({themeCounts[theme.id] || 0})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <label
                            htmlFor="classeur-sort"
                            className="inline-flex items-center gap-1 text-[#54595d] font-medium"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                            <span>Trier par :</span>
                          </label>
                          <select
                            id="classeur-sort"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-[#f8f9fa] hover:bg-white border border-[#a2a9b1] rounded-[2px] px-2.5 h-[28px] text-[12.5px] text-[#202122] focus:outline-none focus:border-[#3366cc] cursor-pointer"
                          >
                            <option value="rarity_desc">
                              Rareté (plus rare d'abord)
                            </option>
                            <option value="gif_first">
                              Cartes GIF (Métal) d'abord
                            </option>
                            <option value="views_desc">
                              Vues (plus vues d'abord)
                            </option>
                            <option value="views_asc">
                              Vues (moins vues d'abord)
                            </option>
                            <option value="recent">Obtenues récemment</option>
                            <option value="alpha_asc">
                              Ordre alphabétique (A → Z)
                            </option>
                            <option value="count_desc">
                              Doublons (exemplaires)
                            </option>
                          </select>
                        </div>

                        {/* Bouton de recyclage à droite du sélecteur de tri avec le même espacement gap-3 */}
                        {!isRecycleMode ? (
                          <button
                            type="button"
                            disabled={collection.length === 0}
                            onClick={handleToggleRecycleMode}
                            className="bg-[#006b24] hover:bg-[#00802b] disabled:bg-[#c8ccd1] border border-[#00571d] disabled:border-[#a2a9b1] rounded-[2px] w-[28px] h-[28px] text-[12.5px] font-bold text-white inline-flex items-center justify-center cursor-pointer disabled:opacity-50 transition-colors shrink-0"
                            title="Recycler des cartes"
                            aria-label="Recycler des cartes"
                          >
                            <Recycle className="w-3.5 h-3.5 text-white" />
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 h-[28px]">
                            <button
                              type="button"
                              disabled={selectedRecycleIds.length === 0}
                              onClick={handleConfirmRecycleSelection}
                              className="bg-[#006b24] hover:bg-[#00802b] disabled:bg-[#c8ccd1] border border-[#00571d] disabled:border-[#a2a9b1] rounded-[2px] px-2.5 h-[28px] text-[12.5px] font-bold text-white inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                              title={
                                selectedRecycleIds.length > 0
                                  ? `Recycler pour +${new Intl.NumberFormat('fr-FR').format(selectedRecycleGain)} Wikithunes`
                                  : 'Sélectionnez des cartes à recycler'
                              }
                            >
                              <span>
                                +{new Intl.NumberFormat('fr-FR').format(
                                  selectedRecycleGain
                                )}
                              </span>
                              <WikithuneIcon className="w-3.5 h-3.5 text-white" />
                            </button>
                            <button
                              type="button"
                              onClick={handleToggleRecycleMode}
                              className="bg-[#f8f9fa] hover:bg-white border border-[#a2a9b1] rounded-[2px] w-[28px] h-[28px] text-[12.5px] text-[#202122] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
                              title="Annuler le recyclage"
                              aria-label="Annuler le recyclage"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Grille 2 colonnes sur mobile, jusqu'à 4 sur grand écran (lg:grid-cols-4) avec cartes au format compact */}
                    {filteredAndSortedCollection.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 justify-items-center">
                        {filteredAndSortedCollection.map((card) => (
                          <WikiCard
                            key={card.id}
                            card={card}
                            compact={true}
                            isFavorite={favorites.includes(card.id)}
                            onToggleFavorite={toggleFavorite}
                            duplicateCount={card.count || 1}
                            isRecycleMode={isRecycleMode}
                            isSelectedForRecycle={selectedRecycleIds.includes(
                              card.id
                            )}
                            onSelectForRecycle={handleToggleSelectForRecycle}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="py-14 text-center bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px]">
                        <p className="text-[14px] text-[#54595d] mb-3">
                          {collection.length === 0
                            ? 'Votre classeur est vide pour le moment. Ouvrez un booster pour découvrir vos premières pages Wikipédia !'
                            : 'Aucune carte ne correspond à votre filtre actuel.'}
                        </p>
                        <div className="flex items-center justify-center gap-3 text-[13px]">
                          {collection.length > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRarityFilter('ALL');
                                  setSelectedThemeFilter('ALL');
                                  setSearchQuery('');
                                }}
                                className="wiki-link font-semibold"
                              >
                                Réinitialiser les filtres
                              </button>
                              <span className="text-[#a2a9b1]">•</span>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveTab('booster')}
                            className="wiki-link font-semibold"
                          >
                            Ouvrir un booster →
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                )}
              </div>
            </div>
          </main>
        </div>

        {/* mw-footer-container : Pied de page officiel Wikipédia Vector 2022 (aligné dans mw-page-container) */}
        <div className="mw-footer-container pt-[50px]">
          <footer
            id="footer"
            className="mw-footer border-t border-[#a2a9b1] py-[12px] text-[12px] text-[#202122] leading-[1.4]"
          >
            <ul id="footer-info" className="list-none m-0 p-0">
              <li id="footer-info-copyright">
                <a
                  href="https://fr.wikipedia.org/wiki/Wikip%C3%A9dia:Citation_et_r%C3%A9utilisation_du_contenu_de_Wikip%C3%A9dia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wiki-link"
                >
                  Droit d'auteur
                </a>
                &nbsp;: les textes et illustrations des cartes proviennent de{' '}
                <a
                  href="https://fr.wikipedia.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wiki-link"
                >
                  Wikipédia en français
                </a>{' '}
                et sont disponibles sous{' '}
                <a
                  href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wiki-link"
                >
                  licence Creative Commons attribution, partage dans les mêmes
                  conditions
                </a>
                .
              </li>
            </ul>
          </footer>
        </div>
      </div>
    </div>
  );
}
