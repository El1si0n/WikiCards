// Rôle : Hook gérant les filtres de rareté, de thèmes, de tri et le mode recyclage du classeur.
// Dépendances : React, rarities.js, themes.js.
// Effets de bord : Met à jour les sélections locales de recyclage et déclenche le callback de recyclage.

import { useState, useMemo } from 'react';
import { getCardRecycleValue } from '../config/rarities';
import { WIKI_THEMES, detectCardTheme } from '../config/themes';

const RARITY_ORDER = { L: 6, UR: 5, SR: 4, R: 3, PC: 2, C: 1 };

/**
 * Hook de filtrage, tri et recyclage de la collection du classeur.
 * @param {object} params
 * @param {import('../types').Card[]} params.collection
 * @param {string[]} params.favorites
 * @param {string} params.searchQuery
 * @param {(selectedCounts: Record<string, number>, gain: number) => void} [params.onRecycleCards]
 */
export function useClasseurCollection({ collection = [], favorites = [], searchQuery = '', onRecycleCards }) {
  const [selectedRarityFilter, setSelectedRarityFilter] = useState('ALL');
  const [selectedThemeFilter, setSelectedThemeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('rarity_desc');
  const [isRecycleMode, setIsRecycleMode] = useState(false);
  const [selectedRecycleCounts, setSelectedRecycleCounts] = useState({});

  const handleToggleSelectForRecycle = (card) => {
    const cardIdStr = String(card.id);
    const isFav = favorites.some((id) => String(id) === cardIdStr);
    const currentCount = card.count || 1;
    const maxAllowed = isFav ? Math.max(0, currentCount - 1) : currentCount;
    if (maxAllowed <= 0) return;

    setSelectedRecycleCounts((prev) => {
      const currentSelected = prev[cardIdStr] || 0;
      if (currentSelected >= maxAllowed) {
        const next = { ...prev };
        delete next[cardIdStr];
        return next;
      }
      return { ...prev, [cardIdStr]: currentSelected + 1 };
    });
  };

  const totalSelectedRecycleCount = useMemo(() => {
    return Object.values(selectedRecycleCounts).reduce((sum, count) => sum + (count || 0), 0);
  }, [selectedRecycleCounts]);

  const selectedRecycleGain = useMemo(() => {
    let total = 0;
    for (const card of collection) {
      const qty = selectedRecycleCounts[String(card.id)] || 0;
      if (qty > 0) {
        total += getCardRecycleValue(card) * qty;
      }
    }
    return total;
  }, [collection, selectedRecycleCounts]);

  const handleConfirmRecycleSelection = () => {
    if (totalSelectedRecycleCount === 0) return;
    if (typeof onRecycleCards === 'function') {
      onRecycleCards(selectedRecycleCounts, selectedRecycleGain);
    }
    setSelectedRecycleCounts({});
    setIsRecycleMode(false);
  };

  const handleToggleRecycleMode = () => {
    setIsRecycleMode((prev) => {
      const next = !prev;
      if (!next) setSelectedRecycleCounts({});
      return next;
    });
  };

  const themeCounts = useMemo(() => {
    const counts = {};
    WIKI_THEMES.forEach((t) => { counts[t.id] = 0; });
    collection.forEach((card) => {
      const tId = card.theme || detectCardTheme(card);
      counts[tId] = (counts[tId] || 0) + 1;
    });
    return counts;
  }, [collection]);

  const filteredAndSortedCollection = useMemo(() => {
    const filtered = collection.filter((card) => {
      const matchesRarity = selectedRarityFilter === 'ALL' || card.rarity === selectedRarityFilter;
      const cardTheme = card.theme || detectCardTheme(card);
      const matchesTheme = selectedThemeFilter === 'ALL' || cardTheme === selectedThemeFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || card.title.toLowerCase().includes(q) || card.extract.toLowerCase().includes(q);
      return matchesRarity && matchesTheme && matchesSearch;
    });

    const favSet = new Set(favorites);

    return [...filtered].sort((a, b) => {
      const aFav = favSet.has(a.id) ? 1 : 0;
      const bFav = favSet.has(b.id) ? 1 : 0;
      if (bFav !== aFav) return bFav - aFav;

      switch (sortBy) {
        case 'rarity_desc': {
          const diff = (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
          return diff !== 0 ? diff : (b.views || 0) - (a.views || 0);
        }
        case 'gif_first': {
          const aGif = (a.isShiny || a.isGif || /\.gif(\?|$|\/)/i.test(a.image || '')) ? 1 : 0;
          const bGif = (b.isShiny || b.isGif || /\.gif(\?|$|\/)/i.test(b.image || '')) ? 1 : 0;
          if (bGif !== aGif) return bGif - aGif;
          const diff = (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
          return diff !== 0 ? diff : (b.views || 0) - (a.views || 0);
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
          return diff !== 0 ? diff : (b.views || 0) - (a.views || 0);
        }
        default:
          return 0;
      }
    });
  }, [collection, selectedRarityFilter, selectedThemeFilter, favorites, searchQuery, sortBy]);

  return {
    selectedRarityFilter,
    setSelectedRarityFilter,
    selectedThemeFilter,
    setSelectedThemeFilter,
    sortBy,
    setSortBy,
    isRecycleMode,
    selectedRecycleCounts,
    totalSelectedRecycleCount,
    selectedRecycleGain,
    handleToggleSelectForRecycle,
    handleConfirmRecycleSelection,
    handleToggleRecycleMode,
    themeCounts,
    filteredAndSortedCollection,
  };
}
