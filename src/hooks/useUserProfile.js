/**
 * @file Rôle : Custom hook encapsulant l'état réactif, les calculs de statistiques et les actions du profil joueur.
 * Dépendances : React, `../config/rarities`, `../config/themes`, `../config/playerScore`, `../utils/statsHistory`, `../services/sound`.
 * Effets de bord : Mise à jour du profil utilisateur, copie dans le presse-papier, audio procédural.
 */

import { useState, useMemo } from 'react';
import { getCardRecycleValue } from '../config/rarities';
import { WIKI_THEMES, detectCardTheme } from '../config/themes';
import { calculatePlayerScore } from '../config/playerScore';
import { countRarityCopies, countGifCopies } from '../utils/statsHistory';
import { soundManager } from '../services/sound';

const RARITY_ORDER = {
  L: 6,
  UR: 5,
  SR: 4,
  R: 3,
  PC: 2,
  C: 1,
};

/**
 * Hook personnalisé gérant la logique et les métriques du profil joueur.
 *
 * @param {Object} params
 * @param {string} params.userCode - Identifiant unique du compte (ex: WIKI-XXXX-XXXX)
 * @param {Object} params.profile - Informations de profil (username, avatar, bio, showcaseIds)
 * @param {function(Object): void} params.onUpdateProfile - Callback de mise à jour du profil
 * @param {function(): Promise<void>} [params.onDeleteAccount] - Callback asynchrone de suppression définitive
 * @param {Array<Object>} [params.collection=[]] - Collection des cartes possédées
 * @param {Array<string>} [params.favorites=[]] - Identifiants des cartes favorites
 * @param {number} [params.wikithunes=0] - Solde en monnaie virtuelle
 * @param {Object} [params.stats={}] - Statistiques de jeu
 * @returns {Object} États réactifs, données calculées et gestionnaires d'actions
 */
export default function useUserProfile({
  userCode,
  profile,
  onUpdateProfile,
  onDeleteAccount,
  collection = [],
  favorites = [],
  wikithunes = 0,
  stats = {},
}) {
  // Édition directe de l'identité
  const [isPickingAvatar, setIsPickingAvatar] = useState(false);
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const [draftUsername, setDraftUsername] = useState(profile?.username || '');
  const [draftBio, setDraftBio] = useState(profile?.bio || '');

  // Presse-papier
  const [copiedCode, setCopiedCode] = useState(false);

  // Suppression du compte
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Vitrine (4 emplacements)
  const [activeShowcaseSlot, setActiveShowcaseSlot] = useState(null);
  const [selectedRarityFilter, setSelectedRarityFilter] = useState('ALL');
  const [selectedThemeFilter, setSelectedThemeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('rarity_desc');

  // Modal d'historique Trade Republic
  const [historyModalMetric, setHistoryModalMetric] = useState(null);

  const showcaseIds = useMemo(() => {
    const raw = Array.isArray(profile?.showcaseIds) ? profile.showcaseIds : [];
    return [raw[0] || null, raw[1] || null, raw[2] || null, raw[3] || null];
  }, [profile?.showcaseIds]);

  const showcaseCards = useMemo(() => {
    return showcaseIds.map((id) =>
      id ? collection.find((c) => String(c.id) === String(id)) || null : null
    );
  }, [showcaseIds, collection]);

  const totalCopiesCount = useMemo(
    () => collection.reduce((sum, c) => sum + (c.count || 1), 0),
    [collection]
  );

  const legendaryCount = useMemo(
    () => countRarityCopies(collection, 'L'),
    [collection]
  );

  const ultraRareCount = useMemo(
    () => countRarityCopies(collection, 'UR'),
    [collection]
  );

  const superRareCount = useMemo(
    () => countRarityCopies(collection, 'SR'),
    [collection]
  );

  const gifCardsCount = useMemo(
    () => countGifCopies(collection),
    [collection]
  );

  const collectionTotalValue = useMemo(
    () =>
      collection.reduce(
        (sum, c) => sum + getCardRecycleValue(c) * (c.count || 1),
        0
      ),
    [collection]
  );

  const casinoBilan = useMemo(
    () => Number(stats?.netCasinoGains || 0) - Number(stats?.lostMoneyCasino || 0),
    [stats]
  );

  const recordStreak = Number(stats?.recordStreak || 0);

  const netCardsBilan = useMemo(
    () => Number(stats?.wonCards || 0) - Number(stats?.lostCards || 0),
    [stats]
  );

  const totalCardsDrawn = useMemo(
    () =>
      Math.max(
        Number(stats?.totalCardsDrawn || 0),
        Number(stats?.boostersOpened || 0) * 6,
        totalCopiesCount
      ),
    [stats, totalCopiesCount]
  );

  const playerScore = useMemo(
    () =>
      calculatePlayerScore({
        collection,
        wikithunes,
        stats,
        legendaryCount,
        ultraRareCount,
        superRareCount,
        gifCount: gifCardsCount,
        collectionValue: collectionTotalValue,
        uniqueCardsCount: collection.length,
        totalCardsCount: totalCopiesCount,
        totalCardsDrawn,
      }),
    [
      collection,
      wikithunes,
      stats,
      legendaryCount,
      ultraRareCount,
      superRareCount,
      gifCardsCount,
      collectionTotalValue,
      totalCopiesCount,
      totalCardsDrawn,
    ]
  );

  // Cartes possédées avec illustration pour le choix de la photo de profil
  const cardAvatars = useMemo(() => {
    const withImage = collection.filter((c) => Boolean(c.image));
    return [...withImage]
      .sort(
        (a, b) =>
          (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0) ||
          (b.views || 0) - (a.views || 0)
      )
      .map((c) => ({
        id: c.id,
        title: c.title,
        rarity: c.rarity,
        url: c.image,
        pageUrl: c.url,
      }));
  }, [collection]);

  const handleStartEditIdentity = () => {
    setDraftUsername(profile?.username || '');
    setDraftBio(profile?.bio || '');
    setIsEditingIdentity(true);
  };

  const handleCancelEditIdentity = () => {
    setIsEditingIdentity(false);
  };

  const handleSaveIdentity = (e) => {
    if (e) e.preventDefault();
    const cleanName = draftUsername.trim() || `Wikipédien-${userCode.slice(-4)}`;
    onUpdateProfile({
      ...profile,
      username: cleanName.slice(0, 36),
      bio: draftBio.trim().slice(0, 180),
    });
    setIsEditingIdentity(false);
  };

  const handleSelectCardAvatar = (item) => {
    if (!item) return;
    onUpdateProfile({
      ...profile,
      avatar: item.url,
      avatarTitle: item.title,
      avatarUrl:
        item.pageUrl ||
        `https://fr.wikipedia.org/wiki/${encodeURIComponent(
          item.title.replace(/ /g, '_')
        )}`,
    });
    soundManager.playCardSlide();
    setIsPickingAvatar(false);
  };

  const myAvatarWiki = useMemo(() => {
    const av = profile?.avatar;
    if (!av || av.includes('icons/wikipedia.png')) {
      return { url: 'https://fr.wikipedia.org/', title: 'Wikipédia' };
    }
    if (profile?.avatarUrl) {
      return {
        url: profile.avatarUrl,
        title: profile.avatarTitle || 'Article Wikipédia',
      };
    }
    const card = collection.find(
      (c) =>
        c.image === av ||
        (c.image && av && c.image.split('?')[0] === av.split('?')[0])
    );
    if (card) {
      return {
        url:
          card.url ||
          `https://fr.wikipedia.org/wiki/${encodeURIComponent(
            card.title.replace(/ /g, '_')
          )}`,
        title: card.title,
      };
    }
    return { url: 'https://fr.wikipedia.org/', title: 'Wikipédia' };
  }, [profile?.avatar, profile?.avatarUrl, profile?.avatarTitle, collection]);

  const handleAssignCardToShowcase = (card) => {
    if (activeShowcaseSlot === null || !card) return;
    const nextIds = [...showcaseIds];

    const existingIdx = nextIds.findIndex(
      (id) => String(id) === String(card.id)
    );
    if (existingIdx !== -1) {
      nextIds[existingIdx] = null;
    }

    nextIds[activeShowcaseSlot] = card.id;
    onUpdateProfile({
      ...profile,
      showcaseIds: nextIds,
    });
    soundManager.playCardSlide();

    const nextEmptySlot = nextIds.findIndex((id) => !id);
    setActiveShowcaseSlot(nextEmptySlot !== -1 ? nextEmptySlot : null);
  };

  const handleRemoveShowcaseSlot = (slotIdx, e) => {
    if (e) e.stopPropagation();
    const nextIds = [...showcaseIds];
    nextIds[slotIdx] = null;
    onUpdateProfile({
      ...profile,
      showcaseIds: nextIds,
    });
    soundManager.playCardSlide();
  };

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

      return matchesRarity && matchesTheme;
    });

    const favSet = new Set(favorites);

    return [...filtered].sort((a, b) => {
      const aFav = favSet.has(a.id) ? 1 : 0;
      const bFav = favSet.has(b.id) ? 1 : 0;
      if (bFav !== aFav) return bFav - aFav;

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
  }, [collection, selectedRarityFilter, selectedThemeFilter, favorites, sortBy]);

  const handleConfirmDelete = async () => {
    if (!onDeleteAccount || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteAccount();
    } catch (err) {
      setDeleteError(err?.message || 'Erreur lors de la suppression.');
      setIsDeleting(false);
    }
  };

  const handleCopyCode = async () => {
    if (!userCode) return;
    try {
      await navigator.clipboard.writeText(userCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback si l'accès presse-papier est restreint
    }
  };

  return {
    isPickingAvatar,
    setIsPickingAvatar,
    isEditingIdentity,
    setIsEditingIdentity,
    draftUsername,
    setDraftUsername,
    draftBio,
    setDraftBio,
    copiedCode,
    isConfirmingDelete,
    setIsConfirmingDelete,
    isDeleting,
    deleteError,
    setDeleteError,
    activeShowcaseSlot,
    setActiveShowcaseSlot,
    selectedRarityFilter,
    setSelectedRarityFilter,
    selectedThemeFilter,
    setSelectedThemeFilter,
    sortBy,
    setSortBy,
    historyModalMetric,
    setHistoryModalMetric,
    showcaseIds,
    showcaseCards,
    totalCopiesCount,
    legendaryCount,
    ultraRareCount,
    superRareCount,
    gifCardsCount,
    collectionTotalValue,
    casinoBilan,
    recordStreak,
    netCardsBilan,
    totalCardsDrawn,
    playerScore,
    cardAvatars,
    myAvatarWiki,
    themeCounts,
    filteredAndSortedCollection,
    handleStartEditIdentity,
    handleCancelEditIdentity,
    handleSaveIdentity,
    handleSelectCardAvatar,
    handleAssignCardToShowcase,
    handleRemoveShowcaseSlot,
    handleConfirmDelete,
    handleCopyCode,
  };
}
