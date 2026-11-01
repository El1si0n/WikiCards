import React, { useState, useMemo } from 'react';
import WikiCard from './WikiCard';
import WikithuneIcon from './WikithuneIcon';
import { RARITY_TIERS, getCardRecycleValue } from '../config/rarities';
import { WIKI_THEMES, detectCardTheme } from '../config/themes';
import { soundManager } from '../services/sound';
import {
  KeyRound,
  Plus,
  X,
  BookOpen,
  ArrowUpDown,
  Pencil,
  Camera,
  LogOut,
  Trash2,
} from 'lucide-react';

const RARITY_ORDER = {
  L: 6,
  UR: 5,
  SR: 4,
  R: 3,
  PC: 2,
  C: 1,
};

export default function UserProfile({
  userCode,
  profile,
  onUpdateProfile,
  onLogout,
  onDeleteAccount,
  collection,
  favorites,
  onToggleFavorite,
  wikithunes,
  stats,
}) {
  // Édition directe en cliquant sur la photo de profil, le nom ou la bio
  const [isPickingAvatar, setIsPickingAvatar] = useState(false);
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const [draftUsername, setDraftUsername] = useState(profile.username || '');
  const [draftBio, setDraftBio] = useState(profile.bio || '');

  // Suppression du compte
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Sélection d'une carte pour l'un des 4 emplacements de la vitrine (0, 1, 2, 3 ou null)
  const [activeShowcaseSlot, setActiveShowcaseSlot] = useState(null);
  const [selectedRarityFilter, setSelectedRarityFilter] = useState('ALL');
  const [selectedThemeFilter, setSelectedThemeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('rarity_desc');

  const showcaseIds = useMemo(() => {
    const raw = Array.isArray(profile.showcaseIds) ? profile.showcaseIds : [];
    return [raw[0] || null, raw[1] || null, raw[2] || null, raw[3] || null];
  }, [profile.showcaseIds]);

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
    () => collection.filter((c) => c.rarity === 'L').length,
    [collection]
  );

  const ultraRareCount = useMemo(
    () => collection.filter((c) => c.rarity === 'UR').length,
    [collection]
  );

  const gifCardsCount = useMemo(
    () =>
      collection.filter((c) =>
        Boolean(c.isShiny || c.isGif || /\.gif(\?|$|\/)/i.test(c.image || ''))
      ).length,
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

  // Cartes possédées ayant une illustration pour choisir sa photo de profil
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
      }));
  }, [collection]);

  const handleStartEditIdentity = () => {
    setDraftUsername(profile.username || '');
    setDraftBio(profile.bio || '');
    setIsEditingIdentity(true);
  };

  const handleSaveIdentity = (e) => {
    e.preventDefault();
    const cleanName = draftUsername.trim() || `Wikipédien-${userCode.slice(-4)}`;
    onUpdateProfile({
      ...profile,
      username: cleanName.slice(0, 36),
      bio: draftBio.trim().slice(0, 180),
    });
    setIsEditingIdentity(false);
  };

  const handleSelectCardAvatar = (imageUrl) => {
    onUpdateProfile({
      ...profile,
      avatar: imageUrl,
    });
    soundManager.playCardSlide();
    setIsPickingAvatar(false);
  };

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

  return (
    <div className="space-y-5">
      {/* =====================================================================
          CADRE 1 : IDENTITÉ DU JOUEUR, CODE UNIQUE & STATISTIQUES
      ===================================================================== */}
      <section className="accueil_2017_cadre space-y-4">
        {/* Bandeau supérieur : Identité à gauche + Code d'accès et Actions en haut à droite */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 pb-4 border-b border-[#eaecf0]">
          {/* Côté Gauche : Photo de profil cliquable + Pseudo & Bio éditables */}
          <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
            {/* Cliquer sur la photo de profil ouvre le sélecteur d'image parmi ses cartes */}
            <button
              type="button"
              onClick={() => setIsPickingAvatar((prev) => !prev)}
              className="group relative w-[76px] h-[76px] sm:w-[82px] sm:h-[82px] rounded-[2px] border border-[#a2a9b1] hover:border-[#3366cc] bg-[#f8f9fa] p-1 shrink-0 flex items-center justify-center overflow-hidden cursor-pointer transition-colors"
              title="Cliquez pour choisir une image parmi vos cartes"
            >
              <img
                src={
                  profile.avatar ||
                  'https://fr.wikipedia.org/static/images/icons/wikipedia.png'
                }
                alt={profile.username}
                className="w-full h-full object-cover rounded-[1px]"
              />
              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-5 h-5" />
              </div>
            </button>

            <div className="flex-1 min-w-0">
              {!isEditingIdentity ? (
                <div
                  onClick={handleStartEditIdentity}
                  className="group cursor-pointer rounded-[2px] -mx-1.5 px-1.5 py-1 hover:bg-[#f8f9fa] transition-colors"
                  title="Cliquez pour modifier votre nom ou votre description"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="wiki-serif text-[22px] font-normal text-[#101418] m-0 leading-tight">
                      {profile.username}
                    </h3>
                    <Pencil className="w-3.5 h-3.5 text-[#72777d] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[13.5px] text-[#54595d] mt-1 mb-0 leading-[1.5] max-w-[480px] sm:max-w-[520px] break-words">
                    {profile.bio ||
                      'Contributeur et collectionneur d’articles sur Wikipédia FR.'}
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSaveIdentity}
                  className="flex flex-col sm:flex-row sm:items-stretch gap-2.5 bg-[#f8f9fa] dark:bg-[#181d24] border border-[#c8ccd1] dark:border-[#363e4a] rounded-[2px] p-2.5 max-w-[620px]"
                >
                  <div className="flex-1 space-y-2 min-w-0 w-full">
                    <input
                      type="text"
                      value={draftUsername}
                      onChange={(e) => setDraftUsername(e.target.value)}
                      maxLength={36}
                      placeholder="Nom d'utilisateur"
                      autoFocus
                      className="w-full h-[30px] px-2.5 text-[13.5px] font-bold bg-white dark:bg-[#12161c] text-[#202122] dark:text-white border border-[#a2a9b1] dark:border-[#4a5360] rounded-[2px] focus:border-[#3366cc] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={draftBio}
                      onChange={(e) => setDraftBio(e.target.value)}
                      maxLength={160}
                      placeholder="Présentation courte..."
                      className="w-full h-[30px] px-2.5 text-[12.5px] bg-white dark:bg-[#12161c] text-[#202122] dark:text-white border border-[#a2a9b1] dark:border-[#4a5360] rounded-[2px] focus:border-[#3366cc] focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-row sm:flex-col gap-2 shrink-0 sm:w-[105px]">
                    <button
                      type="submit"
                      className="wiki-casino-btn wiki-casino-btn--primary !min-h-0 !h-[30px] !py-0 !px-3 !text-[12.5px] w-full font-bold flex items-center justify-center"
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingIdentity(false)}
                      className="wiki-casino-btn wiki-casino-btn--neutral !min-h-0 !h-[30px] !py-0 !px-3 !text-[12.5px] w-full flex items-center justify-center"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Côté Droit : Code Unique statique (sans bordure) + Déconnexion (style bouton notification) */}
          <div className="flex items-center gap-2 shrink-0 self-start">
            <div
              className="h-[32px] px-2.5 bg-[#f8f9fa] rounded-[2px] inline-flex items-center gap-2 font-mono text-[13px] font-bold text-[#101418] select-all"
              title="Code Unique d'identification"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#3366cc] shrink-0" />
              <span>{userCode}</span>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-[32px] h-[32px] rounded-[2px] border border-[#a2a9b1] bg-[#f8f9fa] hover:bg-[#eaecf0] text-[#202122] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                title="Se déconnecter et retourner à la page d'identification"
                aria-label="Se déconnecter"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}

            {onDeleteAccount && (
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingDelete(true);
                  setDeleteError(null);
                }}
                className="w-[32px] h-[32px] rounded-[2px] border border-[#f54739] dark:border-[#b32424] bg-[#fff5f5] dark:bg-[#3b1815] hover:bg-[#ffe9e5] dark:hover:bg-[#4d1f1c] text-[#bf3c2c] dark:text-[#f87171] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                title="Supprimer définitivement mon compte"
                aria-label="Supprimer mon compte"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Menu de sélection d'avatar (uniquement parmi les illustrations des cartes possédées) */}
        {isPickingAvatar && (
          <div className="bg-[#f8f9fa] border border-[#c8ccd1] rounded-[2px] p-3 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#eaecf0] pb-1.5">
              <span className="text-[12.5px] font-bold text-[#202122]">
                Choisir l'illustration d'une de vos cartes comme photo de profil
              </span>
              <button
                type="button"
                onClick={() => setIsPickingAvatar(false)}
                className="text-[#54595d] hover:text-[#202122] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cardAvatars.length > 0 ? (
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-[190px] overflow-y-auto pr-1">
                {cardAvatars.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectCardAvatar(item.url)}
                    className={`aspect-square rounded-[2px] border overflow-hidden bg-white cursor-pointer transition-all ${
                      profile.avatar === item.url
                        ? 'border-[#3366cc] ring-2 ring-[#3366cc]'
                        : 'border-[#c8ccd1] hover:border-[#72777d]'
                    }`}
                    title={item.title}
                  >
                    <img
                      src={item.url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[12.5px] text-[#54595d] m-0 py-2">
                Vous n'avez pas encore de carte illustrée dans votre classeur. Ouvrez un booster pour débloquer des photos de profil !
              </p>
            )}
          </div>
        )}

        {/* Tableau récapitulatif des 8 statistiques du joueur (pleine largeur, 2 lignes de 4) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] p-3">
            <span className="block text-[11.5px] text-[#54595d] uppercase font-bold">
              Articles uniques
            </span>
            <div className="text-[18px] font-extrabold text-[#202122] mt-1">
              {collection.length}
            </div>
          </div>

          <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] p-3">
            <span className="block text-[11.5px] text-[#54595d] uppercase font-bold">
              Total de cartes
            </span>
            <div className="text-[18px] font-extrabold text-[#202122] mt-1">
              {totalCopiesCount}
            </div>
          </div>

          <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] p-3">
            <span className="block text-[11.5px] text-[#54595d] uppercase font-bold">
              Solde actuel
            </span>
            <div className="text-[18px] font-extrabold text-[#202122] mt-1 inline-flex items-center gap-1">
              <span>{new Intl.NumberFormat('fr-FR').format(wikithunes)}</span>
              <WikithuneIcon className="w-4 h-4 text-[#3366cc]" />
            </div>
          </div>

          <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] p-3">
            <span className="block text-[11.5px] text-[#54595d] uppercase font-bold">
              Valeur du classeur
            </span>
            <div className="text-[18px] font-extrabold text-[#202122] mt-1 inline-flex items-center gap-1">
              <span>
                {new Intl.NumberFormat('fr-FR').format(collectionTotalValue)}
              </span>
              <WikithuneIcon className="w-4 h-4 text-[#3366cc]" />
            </div>
          </div>

          <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] p-3">
            <span className="block text-[11.5px] text-[#54595d] uppercase font-bold">
              Boosters ouverts
            </span>
            <div className="text-[18px] font-extrabold text-[#202122] mt-1">
              {stats?.boostersOpened || 0}
            </div>
          </div>

          <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] p-3">
            <span className="block text-[11.5px] text-[#54595d] uppercase font-bold">
              Légendaires (L)
            </span>
            <div className="text-[18px] font-extrabold text-[#202122] mt-1">
              {legendaryCount}
            </div>
          </div>

          <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] p-3">
            <span className="block text-[11.5px] text-[#54595d] uppercase font-bold">
              Ultra Rares (UR)
            </span>
            <div className="text-[18px] font-extrabold text-[#202122] mt-1">
              {ultraRareCount}
            </div>
          </div>

          <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] p-3">
            <span className="block text-[11.5px] text-[#54595d] uppercase font-bold">
              Cartes GIF (Métal)
            </span>
            <div className="text-[18px] font-extrabold text-[#202122] mt-1">
              {gifCardsCount}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CADRE 2 : VITRINE DE 4 CARTES FAVORITES EXPOSÉES SUR LE PROFIL
      ===================================================================== */}
      <section className="accueil_2017_cadre">
        <div className="wiki-cadre-header flex flex-wrap items-center justify-between gap-2">
          <h2 className="wiki-smallcaps m-0">Vitrine du collectionneur</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 justify-items-center">
          {[0, 1, 2, 3].map((slotIdx) => {
            const card = showcaseCards[slotIdx];
            const isSlotActive = activeShowcaseSlot === slotIdx;

            return (
              <div
                key={slotIdx}
                className="w-full max-w-[272px] flex flex-col items-center"
              >
                {card ? (
                  <div
                    className={`w-full rounded-[14px] transition-all ${
                      isSlotActive ? 'ring-3 ring-[#3366cc]' : ''
                    }`}
                  >
                    <WikiCard
                      card={card}
                      compact={true}
                      isFavorite={favorites.includes(card.id)}
                      onToggleFavorite={onToggleFavorite}
                      onSelectCard={() =>
                        setActiveShowcaseSlot(isSlotActive ? null : slotIdx)
                      }
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveShowcaseSlot(isSlotActive ? null : slotIdx)
                    }
                    className={`w-full h-[446px] rounded-[14px] border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors ${
                      isSlotActive
                        ? 'border-[#3366cc] bg-[#eaf3ff]/50 text-[#3366cc]'
                        : 'border-[#c8ccd1] bg-[#f8f9fa] hover:bg-white hover:border-[#72777d] text-[#54595d]'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center border mb-2 ${
                        isSlotActive
                          ? 'bg-[#3366cc] text-white border-[#3366cc]'
                          : 'bg-white text-[#54595d] border-[#c8ccd1]'
                      }`}
                    >
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-[13px] font-bold">
                      {isSlotActive
                        ? 'Sélectionnez une carte ci-dessous'
                        : 'Exposer une carte'}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Sélecteur de carte dans le classeur (affiché lorsqu'on clique sur un emplacement de vitrine) */}
        {activeShowcaseSlot !== null && (
          <div className="mt-6 pt-5 border-t border-[#c8ccd1]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="text-[14px] font-bold text-[#202122]">
                Choisissez la carte à placer dans la{' '}
                <span className="text-[#3366cc]">
                  Vitrine #{activeShowcaseSlot + 1}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveShowcaseSlot(null)}
                className="wiki-casino-btn wiki-casino-btn--neutral !min-h-[30px] !py-1 !px-3 !text-[12px]"
              >
                Fermer le sélecteur
              </button>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#eaecf0]">
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

              <div className="flex flex-wrap items-center gap-3 text-[12.5px] shrink-0">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="profile-showcase-theme"
                    className="inline-flex items-center gap-1 text-[#54595d] font-medium"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Thème :</span>
                  </label>
                  <select
                    id="profile-showcase-theme"
                    value={selectedThemeFilter}
                    onChange={(e) => setSelectedThemeFilter(e.target.value)}
                    className="bg-[#f8f9fa] hover:bg-white border border-[#a2a9b1] rounded-[2px] px-2.5 py-1 text-[12.5px] text-[#202122] focus:outline-none focus:border-[#3366cc] cursor-pointer"
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
                    htmlFor="profile-showcase-sort"
                    className="inline-flex items-center gap-1 text-[#54595d] font-medium"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>Trier par :</span>
                  </label>
                  <select
                    id="profile-showcase-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-[#f8f9fa] hover:bg-white border border-[#a2a9b1] rounded-[2px] px-2.5 py-1 text-[12.5px] text-[#202122] focus:outline-none focus:border-[#3366cc] cursor-pointer"
                  >
                    <option value="rarity_desc">
                      Rareté (plus rare d'abord)
                    </option>
                    <option value="gif_first">Cartes GIF (Métal) d'abord</option>
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
            </div>

            {filteredAndSortedCollection.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 justify-items-center">
                {filteredAndSortedCollection.map((card) => {
                  const slotPosition = showcaseIds.findIndex(
                    (id) => String(id) === String(card.id)
                  );
                  const isAlreadyInShowcase = slotPosition !== -1;

                  return (
                    <WikiCard
                      key={card.id}
                      card={card}
                      mini={true}
                      isFavorite={favorites.includes(card.id)}
                      duplicateCount={card.count || 1}
                      isSelected={isAlreadyInShowcase}
                      selectionBadgeText={
                        isAlreadyInShowcase ? 'Exposée' : 'Exposer'
                      }
                      onSelectCard={() => handleAssignCardToShowcase(card)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px]">
                <p className="text-[14px] text-[#54595d] m-0">
                  Aucune carte disponible dans votre classeur.
                </p>
              </div>
            )}
          </div>
        )}
      </section>



      {/* MODAL ÉPURÉ DE CONFIRMATION DE SUPPRESSION DU COMPTE */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="relative bg-white dark:bg-[#1a1f26] border border-[#d8dce2] dark:border-[#2d3540] rounded-[8px] shadow-2xl max-w-[360px] w-full p-6 text-center select-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <button
              type="button"
              onClick={() => {
                if (!isDeleting) {
                  setIsConfirmingDelete(false);
                  setDeleteError(null);
                }
              }}
              disabled={isDeleting}
              className="absolute top-3 right-3 text-[#72777d] dark:text-[#8892a0] hover:text-[#202122] dark:hover:text-white p-1 rounded transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/50 text-[#d33] dark:text-[#f87171] border border-red-200 dark:border-red-900/60 flex items-center justify-center mx-auto mb-3.5">
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </div>

            <h3
              id="delete-account-title"
              className="text-[16px] font-bold text-[#101418] dark:text-white m-0"
            >
              Supprimer le compte ?
            </h3>

            <div className="mt-1">
              <span className="inline-block font-mono text-[11px] font-semibold text-[#54595d] dark:text-[#94a3b8] bg-[#f0f2f5] dark:bg-slate-800/80 px-2 py-0.5 rounded-[4px]">
                {userCode}
              </span>
            </div>

            <p className="text-[13px] text-[#54595d] dark:text-[#cbd5e1] m-0 mt-3 leading-relaxed">
              Cette action est irréversible. Toutes vos cartes ({collection.length}) et vos Wikithunes ({new Intl.NumberFormat('fr-FR').format(wikithunes)}&nbsp;₩) seront définitivement effacées.
            </p>

            {deleteError && (
              <p className="text-[12px] text-[#d33] dark:text-[#f87171] font-medium mt-2 m-0">
                {deleteError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 mt-5 pt-3 border-t border-[#eaecf0] dark:border-[#2a323d]">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingDelete(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="h-[36px] px-3 rounded-[4px] border border-[#c8ccd1] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#f8f9fa] dark:hover:bg-slate-700 text-[#202122] dark:text-slate-200 text-[13px] font-medium transition-colors cursor-pointer flex items-center justify-center"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  setDeleteError(null);
                  try {
                    await onDeleteAccount();
                  } catch (err) {
                    setDeleteError(
                      err?.message || 'Erreur lors de la suppression.'
                    );
                    setIsDeleting(false);
                  }
                }}
                className="h-[36px] px-3 rounded-[4px] bg-[#d33] hover:bg-[#b32424] active:bg-[#921e1e] text-white text-[13px] font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {isDeleting ? 'Suppression...' : 'Supprimer'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
