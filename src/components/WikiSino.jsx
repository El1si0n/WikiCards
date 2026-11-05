/**
 * @file Rôle : Hub principal du Casino (WikiSino) hébergeant l'Upgrader, le Plus ou Moins et le Quitte ou Double.
 * Dépendances : React, `UpgraderGame`, `HigherLowerGame`, `DoubleOrNothingGame`.
 * Effets de bord : Navigation par sous-onglets MediaWiki Vector 2022.
 */

import React, { useState } from 'react';
import UpgraderGame from './casino/UpgraderGame';
import HigherLowerGame from './HigherLowerGame';
import DoubleOrNothingGame from './DoubleOrNothingGame';

/**
 * @typedef {Object} CurrencyCasinoGameProps
 * @property {number} wikithunes - Solde de monnaie virtuelle actuelle
 * @property {function(number): boolean} onSpendWikithunes - Déduction d'une mise
 * @property {function(number): void} onAddWikithunes - Crédit des gains
 * @property {Object} stats - Statistiques globales du compte joueur
 * @property {function(Object): void} onUpdateStats - Mise à jour partielle des stats
 */

/**
 * @typedef {Object} CardWagerCasinoGameProps
 * @property {Array<Object>} collection - Collection des cartes du joueur
 * @property {Array<string>} [favorites=[]] - IDs des cartes favorites protégées
 * @property {function(Object.<string, number>): void} onConsumeCards - Suppression des cartes misées/perdues
 * @property {function(Object): void} onCardWon - Ajout d'une carte gagnée
 * @property {function(string): void} [onToggleFavorite] - Bascule du statut favori
 * @property {Object} [stats] - Statistiques du joueur
 * @property {function(Object): void} [onUpdateStats] - Mise à jour des stats
 */

/**
 * Composant principal de la salle de jeux du casino WikiSino.
 * @param {Object} props
 * @param {Array<Object>} props.collection - Collection de cartes du joueur
 * @param {Array<string>} [props.favorites=[]] - IDs des cartes favorites
 * @param {number} props.wikithunes - Solde en monnaie virtuelle
 * @param {function(number): boolean} props.onSpendWikithunes - Callback de débit de monnaie
 * @param {function(number): void} props.onAddWikithunes - Callback de crédit de monnaie
 * @param {function(Object.<string, number>): void} props.onConsumeCards - Callback de suppression de cartes
 * @param {function(Object): void} props.onCardWon - Callback d'attribution de carte
 * @param {Array<string>} [props.existingCardIds=[]] - Liste des IDs de cartes possédées
 * @param {function(string): void} [props.onToggleFavorite] - Callback de bascule favori
 * @param {Object} props.stats - Statistiques d'accomplissement du joueur
 * @param {function(Object): void} props.onUpdateStats - Callback de mise à jour des stats
 */
export default function WikiSino({
  collection = [],
  favorites = [],
  wikithunes = 0,
  onSpendWikithunes,
  onAddWikithunes,
  onConsumeCards,
  onCardWon,
  existingCardIds = [],
  onToggleFavorite,
  stats,
  onUpdateStats,
}) {
  const [activeGame, setActiveGame] = useState('upgrader');

  return (
    <div className="space-y-5">
      <section className="accueil_2017_cadre">
        {/* En-tête avec navigation style onglets Wikipédia Vector 2022 */}
        <div className="wiki-cadre-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="wiki-smallcaps m-0 text-[18px] sm:text-[20px]">
            {activeGame === 'upgrader'
              ? 'Upgrader de cartes'
              : activeGame === 'higher_lower'
              ? 'Plus ou Moins de vues'
              : 'Quitte ou Double'}
          </h2>

          <div className="flex items-center gap-2.5 sm:gap-5 text-[13px] sm:text-[14px] overflow-x-auto whitespace-nowrap scrollbar-none pb-1 sm:pb-0 max-w-full">
            <button
              type="button"
              onClick={() => setActiveGame('upgrader')}
              className={`vector-tab-link ${
                activeGame === 'upgrader' ? 'selected' : ''
              }`}
            >
              Upgrader
            </button>
            <button
              type="button"
              onClick={() => setActiveGame('higher_lower')}
              className={`vector-tab-link ${
                activeGame === 'higher_lower' ? 'selected' : ''
              }`}
            >
              Plus ou Moins
            </button>
            <button
              type="button"
              onClick={() => setActiveGame('double_or_nothing')}
              className={`vector-tab-link ${
                activeGame === 'double_or_nothing' ? 'selected' : ''
              }`}
            >
              Quitte ou Double
            </button>
          </div>
        </div>

        {activeGame === 'higher_lower' ? (
          <HigherLowerGame
            wikithunes={wikithunes}
            onSpendWikithunes={onSpendWikithunes}
            onAddWikithunes={onAddWikithunes}
            stats={stats}
            onUpdateStats={onUpdateStats}
          />
        ) : activeGame === 'double_or_nothing' ? (
          <DoubleOrNothingGame
            collection={collection}
            favorites={favorites}
            onConsumeCards={onConsumeCards}
            onCardWon={onCardWon}
            onToggleFavorite={onToggleFavorite}
            onUpdateStats={onUpdateStats}
          />
        ) : (
          <UpgraderGame
            collection={collection}
            favorites={favorites}
            wikithunes={wikithunes}
            onSpendWikithunes={onSpendWikithunes}
            onConsumeCards={onConsumeCards}
            onCardWon={onCardWon}
            existingCardIds={existingCardIds}
            onToggleFavorite={onToggleFavorite}
            onUpdateStats={onUpdateStats}
          />
        )}
      </section>
    </div>
  );
}
