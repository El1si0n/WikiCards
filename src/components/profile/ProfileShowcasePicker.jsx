/**
 * @file Rôle : Sélecteur et tiroir de cartes du classeur pour choisir une carte à exposer en vitrine.
 * Dépendances : React, `lucide-react`, `../../config/rarities`, `../../config/themes`, `../WikiCard`.
 * Effets de bord : Affectation d'une carte dans un emplacement de vitrine.
 */

import React from 'react';
import { X, BookOpen, ArrowUpDown } from 'lucide-react';
import { RARITY_TIERS } from '../../config/rarities';
import { WIKI_THEMES } from '../../config/themes';
import WikiCard from '../WikiCard';

/**
 * Galerie filtrable et triable pour choisir une carte à ajouter en vitrine.
 * @param {Object} props
 * @param {function(): void} props.onClose - Fermeture du sélecteur
 * @param {Array<Object>} props.collection - Collection complète du joueur
 * @param {Array<Object>} props.filteredAndSortedCollection - Cartes filtrées et triées
 * @param {string} props.selectedRarityFilter - Filtre de rareté actif
 * @param {function(string): void} props.onSelectRarityFilter - Changement du filtre de rareté
 * @param {string} props.selectedThemeFilter - Filtre de thème actif
 * @param {function(string): void} props.onSelectThemeFilter - Changement du thème
 * @param {string} props.sortBy - Critère de tri actif
 * @param {function(string): void} props.onSelectSortBy - Changement du tri
 * @param {Object<string, number>} props.themeCounts - Dénombrement des cartes par thème
 * @param {Array<string>} props.showcaseIds - Identifiants des cartes actuellement en vitrine
 * @param {Array<string>} [props.favorites=[]] - Identifiants des cartes favorites
 * @param {function(Object): void} props.onAssignCard - Affectation de la carte sélectionnée
 * @returns {JSX.Element}
 */
export default function ProfileShowcasePicker({
  onClose,
  collection,
  filteredAndSortedCollection,
  selectedRarityFilter,
  onSelectRarityFilter,
  selectedThemeFilter,
  onSelectThemeFilter,
  sortBy,
  onSelectSortBy,
  themeCounts,
  showcaseIds,
  favorites = [],
  onAssignCard,
}) {
  return (
    <div className="mt-6 pt-5 border-t border-[#c8ccd1] dark:border-[#363e4a]">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="text-[14px] font-bold text-[#202122] dark:text-[#eaecf0]">
          Choisissez une carte à exposer
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[#72777d] hover:text-[#202122] dark:text-[#a2a9b1] dark:hover:text-white cursor-pointer p-1"
          title="Fermer"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#eaecf0]">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelectRarityFilter('ALL')}
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
                onClick={() => onSelectRarityFilter(tier.code)}
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
              onChange={(e) => onSelectThemeFilter(e.target.value)}
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
              onChange={(e) => onSelectSortBy(e.target.value)}
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
                onSelectCard={() => onAssignCard(card)}
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
  );
}
