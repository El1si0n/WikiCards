/**
 * @file Rôle : Composant de sélection de cartes du classeur partagé entre les mini-jeux de casino (Upgrader, Quitte ou Double).
 * Dépendances : React, `lucide-react`, `../WikiCard`, `../../config/rarities`, `../../config/themes`.
 * Effets de bord : Sélection / désélection de cartes au clic.
 */

import React, { useMemo } from 'react';
import WikiCard from '../WikiCard';
import { RARITY_TIERS } from '../../config/rarities';
import { WIKI_THEMES, detectCardTheme } from '../../config/themes';
import { BookOpen, ArrowUpDown } from 'lucide-react';

/**
 * Sélecteur de cartes encyclopédiques avec filtres par rareté, thème et options de tri.
 * @param {Object} props
 * @param {Array<Object>} props.collection - Collection de cartes du joueur
 * @param {Array<string>} [props.favorites=[]] - IDs des cartes favorites
 * @param {string} props.selectedRarityFilter - Échelon de rareté filtré (C, PC, R, SR, UR)
 * @param {function(string): void} props.setSelectedRarityFilter - Callback de changement de rareté
 * @param {string} props.selectedThemeFilter - Thème filtré ('ALL' ou identifiant de thème)
 * @param {function(string): void} props.setSelectedThemeFilter - Callback de changement de thème
 * @param {string} props.sortBy - Critère de tri sélectionné
 * @param {function(string): void} props.setSortBy - Callback de changement de tri
 * @param {Object.<string, number>} [props.selectedCountsMap={}] - Nombre d'exemplaires sélectionnés par ID
 * @param {function(Object): void} props.onSelectCard - Callback au clic sur une carte
 * @param {function(Object, Object): string} props.getCardBadgeText - Générateur de texte du badge de la carte
 * @param {function(Object): boolean} [props.isCardLocked] - Prédicat déterminant si la carte est verrouillée en jeu
 * @param {function(Object): number} props.getMaxSelectableCopies - Nombre maximal d'exemplaires sélectionnables pour une carte
 * @param {string} [props.title="Classeur de cartes Wikipédia"] - Titre de la section
 */
export default function CasinoCardPicker({
  collection = [],
  favorites = [],
  selectedRarityFilter,
  setSelectedRarityFilter,
  selectedThemeFilter,
  setSelectedThemeFilter,
  sortBy,
  setSortBy,
  selectedCountsMap = {},
  onSelectCard,
  getCardBadgeText,
  isCardLocked,
  getMaxSelectableCopies,
  title = 'Classeur de cartes Wikipédia',
}) {
  const eligibleRarityTiers = useMemo(
    () => RARITY_TIERS.filter((t) => t.code !== 'L'),
    []
  );

  const eligibleCollection = useMemo(
    () => collection.filter((c) => c.rarity !== 'L'),
    [collection]
  );

  const themeCounts = useMemo(() => {
    const counts = {};
    eligibleCollection.forEach((card) => {
      const t = detectCardTheme(card);
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [eligibleCollection]);

  const filteredAndSortedCollection = useMemo(() => {
    let result = eligibleCollection.filter(
      (c) => c.rarity === selectedRarityFilter
    );

    if (selectedThemeFilter !== 'ALL') {
      result = result.filter((c) => detectCardTheme(c) === selectedThemeFilter);
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'gif_first': {
          const aGif = (a.isShiny || a.isGif || /\.gif(\?|$|\/)/i.test(a.image || '')) ? 1 : 0;
          const bGif = (b.isShiny || b.isGif || /\.gif(\?|$|\/)/i.test(b.image || '')) ? 1 : 0;
          if (aGif !== bGif) return bGif - aGif;
          return (b.views || 0) - (a.views || 0);
        }
        case 'views_desc':
          return (b.views || 0) - (a.views || 0);
        case 'views_asc':
          return (a.views || 0) - (b.views || 0);
        case 'recent':
          return (b.obtainedAt || 0) - (a.obtainedAt || 0);
        case 'alpha_asc':
          return (a.title || '').localeCompare(b.title || '', 'fr');
        case 'count_desc':
          return (b.count || 1) - (a.count || 1);
        case 'rarity_desc':
        default:
          return (b.views || 0) - (a.views || 0);
      }
    });

    return result;
  }, [eligibleCollection, selectedRarityFilter, selectedThemeFilter, sortBy]);

  return (
    <section className="accueil_2017_cadre">
      <div className="wiki-cadre-header flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="wiki-smallcaps m-0">{title}</h2>
      </div>

      {/* Barre de filtres par rareté + Thème + Tri */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#eaecf0]">
        <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none pb-1.5 -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap">
          {eligibleRarityTiers.map((tier) => {
            const count = eligibleCollection.filter(
              (c) => c.rarity === tier.code
            ).length;
            return (
              <button
                key={tier.code}
                type="button"
                onClick={() => setSelectedRarityFilter(tier.code)}
                className={`shrink-0 px-2.5 py-1 text-[12px] rounded-[2px] border cursor-pointer transition-all flex items-center gap-1.5 ${
                  selectedRarityFilter === tier.code
                    ? 'ring-2 ring-[#3366cc] font-bold bg-white border-[#3366cc]'
                    : 'bg-[#f8f9fa] hover:bg-white border-[#c8ccd1]'
                }`}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: tier.borderColor }}
                />
                <span>
                  {tier.code} ({count})
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2.5 sm:gap-3 text-[12.5px] w-full lg:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label
              htmlFor="casino-classeur-theme"
              className="inline-flex items-center gap-1 text-[#54595d] font-medium shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Thème :</span>
            </label>
            <select
              id="casino-classeur-theme"
              value={selectedThemeFilter}
              onChange={(e) => setSelectedThemeFilter(e.target.value)}
              className="flex-1 sm:flex-initial bg-[#f8f9fa] hover:bg-white border border-[#a2a9b1] rounded-[2px] px-2.5 h-[32px] sm:h-[28px] text-[12.5px] text-[#202122] focus:outline-none focus:border-[#3366cc] cursor-pointer min-w-0"
            >
              <option value="ALL">
                Tous les thèmes ({eligibleCollection.length})
              </option>
              {WIKI_THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.label} ({themeCounts[theme.id] || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label
              htmlFor="casino-classeur-sort"
              className="inline-flex items-center gap-1 text-[#54595d] font-medium shrink-0"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Trier :</span>
            </label>
            <select
              id="casino-classeur-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 sm:flex-initial bg-[#f8f9fa] hover:bg-white border border-[#a2a9b1] rounded-[2px] px-2.5 h-[32px] sm:h-[28px] text-[12.5px] text-[#202122] focus:outline-none focus:border-[#3366cc] cursor-pointer min-w-0"
            >
              <option value="rarity_desc">Rareté (plus rare)</option>
              <option value="gif_first">Cartes GIF Métal d'abord</option>
              <option value="views_desc">Vues (plus vues)</option>
              <option value="views_asc">Vues (moins vues)</option>
              <option value="recent">Obtenues récemment</option>
              <option value="alpha_asc">Alphabétique (A → Z)</option>
              <option value="count_desc">Doublons</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grille responsive 6 colonnes au format mini */}
      {filteredAndSortedCollection.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 justify-items-center">
          {filteredAndSortedCollection.map((card) => {
            const locked = isCardLocked ? isCardLocked(card) : false;
            const selectedQty = selectedCountsMap[card.id] || 0;
            const maxCopies = getMaxSelectableCopies ? getMaxSelectableCopies(card) : (card.count || 1);
            const isSelected = selectedQty > 0 || locked;
            const isFavProtected =
              favorites.includes(card.id) && (card.count || 1) <= 1;

            const badgeText = getCardBadgeText
              ? getCardBadgeText(card, {
                  isLockedInSpin: locked,
                  isFavProtected,
                  isSelected,
                  selectedQty,
                  maxCopies,
                })
              : isFavProtected
              ? '★ Protégée'
              : isSelected
              ? `Sélectionné (${selectedQty})`
              : 'Choisir';

            return (
              <WikiCard
                key={card.id}
                card={card}
                mini={true}
                isFavorite={favorites.includes(card.id)}
                duplicateCount={card.count || 1}
                isSelected={isSelected}
                isDisabledSelection={isFavProtected}
                selectionBadgeText={badgeText}
                onSelectCard={() => onSelectCard(card)}
              />
            );
          })}
        </div>
      ) : (
        <div className="py-14 text-center bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px]">
          <p className="text-[14px] text-[#54595d] m-0">
            {eligibleCollection.length === 0
              ? 'Aucune carte améliorable dans votre classeur. Ouvrez un booster pour obtenir des cartes !'
              : 'Aucune carte ne correspond à votre filtre actuel.'}
          </p>
        </div>
      )}
    </section>
  );
}
