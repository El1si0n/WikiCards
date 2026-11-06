// Rôle : Composant d'affichage du classeur de cartes Wikipédia, recherche, filtres et mode recyclage.
// Dépendances : React, Lucide-react, WikiCard, WikithuneIcon, rarities.js, themes.js, useClasseurCollection.
// Effets de bord : Déclenche le recyclage des cartes et la navigation vers l'onglet booster.

import React from 'react';
import { BookOpen, ArrowUpDown, Recycle, X } from 'lucide-react';
import WikiCard from './WikiCard';
import WikithuneIcon from './WikithuneIcon';
import { RARITY_TIERS } from '../config/rarities';
import { WIKI_THEMES } from '../config/themes';
import { useClasseurCollection } from '../hooks/useClasseurCollection';

/**
 * Composant de présentation et gestion du classeur de cartes du joueur.
 * @param {object} props
 * @param {import('../types').Card[]} props.collection - Liste des cartes possédées.
 * @param {string[]} props.favorites - Identifiants des cartes favorites.
 * @param {(cardId: string) => void} props.onToggleFavorite - Bascule de l'état favori d'une carte.
 * @param {(selectedCounts: Record<string, number>, gain: number) => void} props.onRecycleCards - Callback de recyclage.
 * @param {() => void} props.onGoToBooster - Redirection vers l'onglet d'ouverture de booster.
 * @param {string} props.searchQuery - Terme de recherche textuelle.
 * @param {(query: string) => void} props.setSearchQuery - Mise à jour du terme de recherche.
 * @returns {React.ReactElement}
 */
export default function Classeur({
  collection = [],
  favorites = [],
  onToggleFavorite,
  onRecycleCards,
  onGoToBooster,
  searchQuery = '',
  setSearchQuery,
}) {
  const {
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
  } = useClasseurCollection({
    collection,
    favorites,
    searchQuery,
    onRecycleCards,
  });

  return (
    <section className="accueil_2017_cadre">
      <div className="wiki-cadre-header flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="wiki-smallcaps m-0">Classeur de cartes Wikipédia</h2>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#eaecf0]">
        <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none py-1.5 -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedRarityFilter('ALL')}
            className={`shrink-0 my-0.5 px-2.5 py-1 text-[12px] rounded-[2px] border cursor-pointer transition-colors ${
              selectedRarityFilter === 'ALL'
                ? 'bg-[#202122] text-white border-[#202122] font-semibold'
                : 'bg-[#f8f9fa] text-[#202122] border-[#a2a9b1] hover:bg-white'
            }`}
          >
            Toutes ({collection.length})
          </button>

          {RARITY_TIERS.map((tier) => {
            const count = collection.filter((c) => c.rarity === tier.code).length;
            return (
              <button
                key={tier.code}
                type="button"
                onClick={() => setSelectedRarityFilter(tier.code)}
                className={`shrink-0 my-0.5 px-2.5 py-1 text-[12px] rounded-[2px] border cursor-pointer transition-all flex items-center gap-1.5 ${
                  selectedRarityFilter === tier.code
                    ? 'ring-2 ring-[#3366cc] font-bold bg-white border-[#3366cc]'
                    : 'bg-[#f8f9fa] hover:bg-white border-[#c8ccd1]'
                }`}
                title={`${tier.name} (${tier.thresholdLabel} • Recyclage : +${new Intl.NumberFormat('fr-FR').format(tier.recycleValue)} ₩)`}
              >
                <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tier.borderColor }} />
                <span>{tier.code} ({count})</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2.5 sm:gap-3 text-[12.5px] w-full lg:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="classeur-theme" className="inline-flex items-center gap-1 text-[#54595d] font-medium shrink-0">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Thème :</span>
            </label>
            <select
              id="classeur-theme"
              value={selectedThemeFilter}
              onChange={(e) => setSelectedThemeFilter(e.target.value)}
              className="flex-1 sm:flex-initial bg-[#f8f9fa] hover:bg-white border border-[#a2a9b1] rounded-[2px] px-2.5 h-[32px] sm:h-[28px] text-[12.5px] text-[#202122] focus:outline-none focus:border-[#3366cc] cursor-pointer min-w-0"
            >
              <option value="ALL">Tous les thèmes ({collection.length})</option>
              {WIKI_THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.label} ({themeCounts[theme.id] || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="classeur-sort" className="inline-flex items-center gap-1 text-[#54595d] font-medium shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Trier :</span>
            </label>
            <select
              id="classeur-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 sm:flex-initial bg-[#f8f9fa] hover:bg-white border border-[#a2a9b1] rounded-[2px] px-2.5 h-[32px] sm:h-[28px] text-[12.5px] text-[#202122] focus:outline-none focus:border-[#3366cc] cursor-pointer min-w-0"
            >
              <option value="rarity_desc">Rareté (plus rare d'abord)</option>
              <option value="gif_first">Cartes GIF (Métal) d'abord</option>
              <option value="views_desc">Vues (plus vues d'abord)</option>
              <option value="views_asc">Vues (moins vues d'abord)</option>
              <option value="recent">Obtenues récemment</option>
              <option value="alpha_asc">Ordre alphabétique (A → Z)</option>
              <option value="count_desc">Doublons (exemplaires)</option>
            </select>

            {!isRecycleMode ? (
              <button
                type="button"
                disabled={collection.length === 0}
                onClick={handleToggleRecycleMode}
                className="bg-[#006b24] hover:bg-[#00802b] disabled:bg-[#c8ccd1] border border-[#00571d] disabled:border-[#a2a9b1] rounded-[2px] w-[32px] sm:w-[28px] h-[32px] sm:h-[28px] text-[12.5px] font-bold text-white inline-flex items-center justify-center cursor-pointer disabled:opacity-50 transition-colors shrink-0"
                title="Recycler des cartes"
                aria-label="Recycler des cartes"
              >
                <Recycle className="w-3.5 h-3.5 text-white" />
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 h-[32px] sm:h-[28px] shrink-0">
                <button
                  type="button"
                  disabled={totalSelectedRecycleCount === 0}
                  onClick={handleConfirmRecycleSelection}
                  className="bg-[#006b24] hover:bg-[#00802b] disabled:bg-[#c8ccd1] border border-[#00571d] disabled:border-[#a2a9b1] rounded-[2px] px-2.5 h-[32px] sm:h-[28px] text-[12.5px] font-bold text-white inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                  title={totalSelectedRecycleCount > 0 ? `Recycler pour +${new Intl.NumberFormat('fr-FR').format(selectedRecycleGain)} Wikifeet` : 'Sélectionnez des cartes à recycler'}
                >
                  <span>+{new Intl.NumberFormat('fr-FR').format(selectedRecycleGain)}</span>
                  <WikithuneIcon className="w-3.5 h-3.5 text-white" />
                </button>
                <button
                  type="button"
                  onClick={handleToggleRecycleMode}
                  className="bg-[#f8f9fa] hover:bg-white border border-[#a2a9b1] rounded-[2px] w-[32px] sm:w-[28px] h-[32px] sm:h-[28px] text-[12.5px] text-[#202122] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
                  title="Annuler le recyclage"
                  aria-label="Annuler le recyclage"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {filteredAndSortedCollection.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5 justify-items-center">
          {filteredAndSortedCollection.map((card) => {
            const cardQty = selectedRecycleCounts[String(card.id)] || 0;
            return (
              <WikiCard
                key={card.id}
                card={card}
                compact={true}
                isFavorite={favorites.includes(card.id)}
                onToggleFavorite={onToggleFavorite}
                duplicateCount={card.count || 1}
                isRecycleMode={isRecycleMode}
                isSelectedForRecycle={cardQty > 0}
                selectedRecycleCount={cardQty}
                onSelectForRecycle={handleToggleSelectForRecycle}
              />
            );
          })}
        </div>
      ) : (
        <div className="py-14 text-center bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px]">
          <p className="text-[14px] text-[#54595d] mb-3">
            {collection.length === 0
              ? 'Votre classeur est vide pour le moment. Ouvrez un booster pour découvrir vos premières pages Wikipédia !'
              : 'Aucune carte ne correspond à votre filtre actuel.'}
          </p>
          <div className="flex items-center justify-center gap-3 text-[13px]">
            {collection.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedRarityFilter('ALL');
                  setSelectedThemeFilter('ALL');
                  if (typeof setSearchQuery === 'function') setSearchQuery('');
                }}
                className="wiki-link font-semibold"
              >
                Réinitialiser les filtres
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoToBooster}
                className="wiki-link font-semibold"
              >
                Ouvrir un booster →
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
