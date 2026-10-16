import React, { useState, useEffect, useMemo, useRef } from 'react';
import WikiHeader from './components/WikiHeader';
import WikiCard from './components/WikiCard';
import BoosterOpening from './components/BoosterOpening';
import { RARITY_TIERS } from './config/rarities';
import { soundManager } from './services/sound';
import {
  Languages,
  MoreVertical,
  ExternalLink,
  Volume2,
  VolumeX,
  ArrowUpDown,
  Download,
  Upload,
  RotateCcw,
} from 'lucide-react';

const STORAGE_KEYS = {
  COLLECTION: 'wikicards_collection_v1',
  FAVORITES: 'wikicards_favorites_v1',
  STATS: 'wikicards_stats_v1',
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
  const [sortBy, setSortBy] = useState('rarity_desc'); // 'rarity_desc' | 'views_desc' | 'views_asc' | 'alpha_asc' | 'recent' | 'count_desc'
  const [showRarityRules, setShowRarityRules] = useState(true);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => soundManager.isMuted());
  const [confirmReset, setConfirmReset] = useState(false);

  const fileInputRef = useRef(null);
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

  // Favoris persistés dans localStorage (en retirant automatiquement les anciennes cartes de démo)
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

  // Cartes présentes dans le classeur (sans les 6 anciennes cartes de démo "demo-*")
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

  // Sauvegarde automatique dans localStorage à chaque changement
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
    setFavorites((prev) =>
      isAdding ? [...prev, cardId] : prev.filter((id) => id !== cardId)
    );
  };

  // Ajoute les 5 cartes d'un booster ouvert au classeur (gestion des doublons + stats)
  const addCardsToCollection = (newCards) => {
    const now = Date.now();
    setCollection((prev) => {
      const map = new Map(prev.map((item) => [item.id, { ...item }]));
      newCards.forEach((card, idx) => {
        if (map.has(card.id)) {
          const existing = map.get(card.id);
          map.set(card.id, {
            ...existing,
            count: (existing.count || 1) + 1,
            obtainedAt: now + idx,
          });
        } else {
          map.set(card.id, {
            ...card,
            count: 1,
            obtainedAt: now + idx,
          });
        }
      });
      return Array.from(map.values());
    });

    setStats((prev) => ({
      boostersOpened: (prev.boostersOpened || 0) + 1,
      totalCardsDrawn: (prev.totalCardsDrawn || 0) + newCards.length,
    }));
  };

  // Export JSON de la collection
  const handleExportCollection = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      collection,
      favorites,
      stats,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wikicards-classeur-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON d'une sauvegarde
  const handleImportCollection = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed.collection)) {
          setCollection(
            parsed.collection.filter((c) => !String(c?.id).startsWith('demo-'))
          );
        }
        if (Array.isArray(parsed.favorites)) {
          setFavorites(
            parsed.favorites.filter((id) => !String(id).startsWith('demo-'))
          );
        }
        if (parsed.stats && typeof parsed.stats === 'object') {
          setStats(parsed.stats);
        }
      } catch {
        // Fichier invalide ignoré
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Réinitialisation complète du classeur (vide toutes les cartes)
  const handleResetCollection = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    setCollection([]);
    setFavorites([]);
    setStats({ boostersOpened: 0, totalCardsDrawn: 0 });
    setConfirmReset(false);
  };

  // Calcul du total d'exemplaires (avec doublons)
  const totalCopiesCount = useMemo(
    () => collection.reduce((sum, c) => sum + (c.count || 1), 0),
    [collection]
  );

  // Filtrage et tri des cartes du classeur (les cartes en favori sont TOUJOURS affichées en 1er tout en haut)
  const filteredAndSortedCollection = useMemo(() => {
    const filtered = collection.filter((card) => {
      const matchesRarity =
        selectedRarityFilter === 'ALL'
          ? true
          : card.rarity === selectedRarityFilter;

      const matchesSearch =
        !searchQuery.trim() ||
        card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.extract.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesRarity && matchesSearch;
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
  }, [collection, selectedRarityFilter, favorites, searchQuery, sortBy]);

  const existingCardIds = useMemo(
    () => collection.map((c) => c.id),
    [collection]
  );

  return (
    <div className="min-h-screen bg-white text-[#202122] flex flex-col">
      {/* Barre supérieure Wikipédia Vector 2022 */}
      <WikiHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        collectionCount={collection.length}
      />

      {/* mw-page-container : Conteneur élargi (1440px) pour réduire l'espace vide à gauche et à droite */}
      <div className="mw-page-container flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 pt-[18px] pb-16">
        <main id="content" className="mw-body">
          {/* mw-body-header : Titre H1 "Bienvenue sur Wikipédia" + indicateur "Wikipédia FR" */}
          <header className="mw-body-header flex items-center justify-between pb-[2px]">
            <h1
              id="firstHeading"
              className="wiki-serif text-[28.8px] font-normal text-[#101418] leading-[1.375] m-0 p-0"
            >
              Bienvenue sur WikiCards
            </h1>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[14px] font-bold text-[#3366cc] rounded-[2px] select-none">
              <Languages className="w-[18px] h-[18px] stroke-[2]" />
              <span>Wikipédia&nbsp;FR</span>
            </div>
          </header>

          {/* vector-page-toolbar : Filet supérieur #a2a9b1 + Onglets 12.5px + Filet inférieur #eaecf0 */}
          <div className="vector-page-toolbar border-t border-[#a2a9b1] border-b border-b-[#eaecf0] mb-[16px]">
            <div className="flex items-center justify-between min-h-[35px] text-[12.5px]">
              {/* left-navigation : Accueil | Classeur */}
              <nav
                aria-label="Espaces de noms"
                className="flex items-center gap-[16px]"
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('booster')}
                  className={`py-[7px] cursor-pointer transition-colors border-b-2 -mb-[1px] ${
                    activeTab === 'booster'
                      ? 'border-[#202122] text-[#202122]'
                      : 'border-transparent text-[#3366cc] hover:underline'
                  }`}
                >
                  Accueil
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('classeur')}
                  className={`py-[7px] cursor-pointer transition-colors border-b-2 -mb-[1px] ${
                    activeTab === 'classeur'
                      ? 'border-[#202122] text-[#202122]'
                      : 'border-transparent text-[#3366cc] hover:underline'
                  }`}
                >
                  Classeur ({collection.length})
                </button>
              </nav>

              {/* right-navigation : Lire | Ouvrir une page au hasard | Menu Outils (⋮) */}
              <div className="flex items-center gap-[16px]">
                <span className="py-[7px] border-b-2 border-[#202122] text-[#202122] -mb-[1px]">
                  Lire
                </span>
                <a
                  href="https://fr.wikipedia.org/wiki/Sp%C3%A9cial:Page_au_hasard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-[7px] text-[#3366cc] hover:underline hidden md:inline"
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
                    className={`p-1.5 text-[#202122] hover:bg-[#f8f9fa] rounded-[2px] cursor-pointer flex items-center justify-center ${
                      isToolsMenuOpen ? 'bg-[#eaecf0]' : ''
                    }`}
                    title="Outils"
                    aria-label="Outils"
                    aria-expanded={isToolsMenuOpen}
                  >
                    <MoreVertical className="w-[16px] h-[16px]" />
                  </button>

                  {isToolsMenuOpen && (
                    <div className="vector-dropdown-content absolute right-0 top-full mt-1 w-[240px] bg-white border border-[#a2a9b1] rounded-[2px] shadow-[0_2px_6px_-1px_rgba(0,0,0,0.2)] py-[12px] px-[16px] z-50 text-[14px] leading-[1.4]">
                      <div
                        id="vector-page-tools-unpinned-container"
                        className="vector-unpinned-container"
                      >
                        <div
                          id="vector-page-tools"
                          className="vector-page-tools vector-pinnable-element"
                        >
                          {/* En-tête du menu Outils */}
                          <div className="vector-pinnable-header flex items-center justify-between border-b border-[#eaecf0] pb-[6px] mb-[8px]">
                            <div className="vector-pinnable-header-label font-bold text-[#202122] text-[14px]">
                              Outils
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsToolsMenuOpen(false)}
                              className="vector-pinnable-header-toggle-button text-[12px] text-[#54595d] hover:text-[#202122] bg-[#f8f9fa] hover:bg-[#eaecf0] px-2 py-0.5 rounded-[2px] cursor-pointer"
                            >
                              masquer
                            </button>
                          </div>

                          {/* Section Général : Son activé & Masquer le barème */}
                          <div
                            id="p-tb"
                            className="vector-menu mw-portlet mw-portlet-tb"
                          >
                            <div className="vector-menu-heading text-[12px] text-[#54595d] border-b border-[#eaecf0] pb-[4px] mb-[6px]">
                              Général
                            </div>
                            <div className="vector-menu-content">
                              <ul className="vector-menu-content-list list-none m-0 p-0 space-y-1">
                                <li className="mw-list-item">
                                  <button
                                    type="button"
                                    onClick={handleToggleSound}
                                    className="w-full text-left py-[4px] text-[#3366cc] hover:underline cursor-pointer inline-flex items-center gap-1.5 text-[14px]"
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
                                    className="w-full text-left py-[4px] text-[#3366cc] hover:underline cursor-pointer text-[14px]"
                                  >
                                    {showRarityRules
                                      ? 'Masquer le barème'
                                      : 'Voir le barème'}
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

          {/* Bandeau d'accueil Wikipédia épuré avec uniquement les liens utiles */}
          <section className="wiki-welcome-banner relative overflow-hidden rounded-[2px] mb-[18px] min-h-[84px] px-5 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <img
              src="https://fr.wikipedia.org/static/images/icons/wikipedia.png"
              alt=""
              aria-hidden="true"
              className="w-[148px] h-[148px] object-contain opacity-25 absolute -left-4 -bottom-7 pointer-events-none select-none"
            />

            <div className="relative z-10 pl-0 sm:pl-[135px]">
              <div className="text-[23px] font-semibold text-[#202122] leading-[1.2]">
                WikiCards
              </div>
              <div className="text-[13px] text-[#3366cc] mt-0.5">
                L'encyclopédie libre que vous pouvez collectionner
              </div>
            </div>

            {/* Liens utiles organisés proprement à droite */}
            <div className="relative z-10 flex flex-col items-center sm:items-end gap-1 text-[13px] w-full md:w-auto pr-2">
              <button
                type="button"
                onClick={() => setActiveTab('booster')}
                className="wiki-link font-medium"
              >
                Ouvrir un booster
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('classeur')}
                className="wiki-link font-medium"
              >
                Mon classeur ({collection.length} cartes)
              </button>
            </div>
          </section>

          {/* Contenu selon l'onglet actif */}
          {activeTab === 'booster' ? (
            <div
              className={`grid grid-cols-1 ${
                showRarityRules ? 'lg:grid-cols-12' : 'lg:grid-cols-1'
              } gap-[18px] items-start`}
            >
              {/* Cadre Gauche : Ouverture Interactive de Booster */}
              <section
                className={`${
                  showRarityRules ? 'lg:col-span-9' : 'lg:col-span-12'
                } border border-[#c8ccd1] bg-white p-[20px] rounded-[2px] shadow-[0_1px_1px_rgba(0,0,0,0.04)]`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#a7d7f9] pb-[2px] mb-[14px]">
                  <h2 className="wiki-smallcaps text-[19.2px] font-normal text-[#000000] m-0">
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
                />
              </section>

              {/* Cadre Droit : style "PRÉSENTATION" de l'Accueil Wikipédia */}
              {showRarityRules && (
                <aside className="lg:col-span-3 border border-[#c8ccd1] bg-white p-[20px] rounded-[2px] shadow-[0_1px_1px_rgba(0,0,0,0.04)] lg:sticky lg:top-4">
                  <h2 className="wiki-smallcaps text-[19.2px] font-normal text-[#000000] border-b border-[#a7d7f9] pb-[2px] mb-[12px]">
                    Présentation
                  </h2>

                  <p className="text-[13.5px] text-[#202122] leading-[1.55] mb-3">
                    <a
                      href="https://fr.wikipedia.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wiki-link"
                    >
                      Wikipédia
                    </a>{' '}
                    est un projet d’encyclopédie collective en ligne. Dans{' '}
                    <strong>WikiCards</strong>, la rareté de chaque carte dépend
                    du nombre de visiteurs réels de la page.
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
                            <span className="text-[#54595d] text-[11px]">
                              {tier.thresholdLabel}
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
          ) : (
            /* =====================================================================
               ONGLET CLASSEUR (ÉTAPE 5) : 4 CARTES PAR LIGNE, FAVORIS EN 1ER, FILTRES & TRI
            ===================================================================== */
            <section className="border border-[#c8ccd1] bg-white p-[20px] rounded-[2px] shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-[#a7d7f9] pb-[2px] mb-4 gap-2">
                <h2 className="wiki-smallcaps text-[19.2px] font-normal text-[#000000] m-0">
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

              {/* Barre de filtres par rareté + Sélecteur de tri */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#eaecf0]">
                {/* Filtres par rareté */}
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
                        title={`${tier.name} (${tier.thresholdLabel})`}
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

                {/* Tri du classeur dans le style Wikipédia */}
                <div className="flex items-center gap-2 text-[12.5px] shrink-0">
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
                    className="bg-[#f8f9fa] hover:bg-white border border-[#a2a9b1] rounded-[2px] px-2.5 py-1 text-[12.5px] text-[#202122] focus:outline-none focus:border-[#3366cc] cursor-pointer"
                  >
                    <option value="rarity_desc">
                      Rareté (plus rare d'abord)
                    </option>
                    <option value="views_desc">Vues (plus vues d'abord)</option>
                    <option value="views_asc">Vues (moins vues d'abord)</option>
                    <option value="recent">Obtenues récemment</option>
                    <option value="alpha_asc">
                      Ordre alphabétique (A → Z)
                    </option>
                    <option value="count_desc">Doublons (exemplaires)</option>
                  </select>
                </div>
              </div>

              {/* Grille 4 colonnes (lg:grid-cols-4) avec cartes au format compact */}
              {filteredAndSortedCollection.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 justify-items-center">
                  {filteredAndSortedCollection.map((card) => (
                    <WikiCard
                      key={card.id}
                      card={card}
                      compact={true}
                      isFavorite={favorites.includes(card.id)}
                      onToggleFavorite={toggleFavorite}
                      duplicateCount={card.count || 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-14 text-center bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px]">
                  <p className="text-[14px] text-[#54595d] mb-3">
                    {collection.length === 0
                      ? "Votre classeur est vide pour le moment. Ouvrez un booster pour découvrir vos premières pages Wikipédia !"
                      : 'Aucune carte ne correspond à votre filtre actuel.'}
                  </p>
                  <div className="flex items-center justify-center gap-3 text-[13px]">
                    {collection.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRarityFilter('ALL');
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

              {/* Pied du classeur : Sauvegarde locale (Export / Import / Réinitialisation) */}
              <div className="mt-8 pt-4 border-t border-[#eaecf0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12px] text-[#54595d]">
                <div>
                  Sauvegarde automatique activée sur ce navigateur (
                  <code>localStorage</code>).
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExportCollection}
                    className="inline-flex items-center gap-1 wiki-link"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exporter (.json)</span>
                  </button>
                  <span className="text-[#c8ccd1]">|</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 wiki-link"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Importer (.json)</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json"
                    onChange={handleImportCollection}
                    className="hidden"
                  />
                  <span className="text-[#c8ccd1]">|</span>
                  <button
                    type="button"
                    onClick={handleResetCollection}
                    className={`inline-flex items-center gap-1 cursor-pointer hover:underline ${
                      confirmReset
                        ? 'text-[#b32424] font-bold'
                        : 'text-[#54595d]'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {confirmReset
                        ? 'Confirmer la suppression de toutes les cartes ?'
                        : 'Réinitialiser le classeur'}
                    </span>
                  </button>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Pied de page minimaliste fidèle à Wikipédia */}
      <footer className="w-full border-t border-[#a2a9b1] bg-[#f8f9fa] py-5 text-[12px] text-[#54595d]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            Les textes et illustrations des cartes proviennent de{' '}
            <a
              href="https://fr.wikipedia.org"
              target="_blank"
              rel="noopener noreferrer"
              className="wiki-link inline-flex items-center gap-0.5"
            >
              Wikipédia en français <ExternalLink className="w-3 h-3" />
            </a>{' '}
            et sont disponibles sous licence Creative Commons BY-SA.
          </div>
          <div>WikiCards — Mode local (sans base de données)</div>
        </div>
      </footer>
    </div>
  );
}
