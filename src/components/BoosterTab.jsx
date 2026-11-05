/**
 * @file Rôle : Conteneur de l'onglet Booster associant l'ouverture 3D interactive et le volet de présentation.
 * Dépendances : `./BoosterOpening`, `./WikithuneIcon`, `../config/rarities`, React.
 * Effets de bord : Déclenche l'ouverture de boosters et la dépense de Wikithunes.
 */

import React from 'react';
import BoosterOpening from './BoosterOpening';
import WikithuneIcon from './WikithuneIcon';
import {
  RARITY_TIERS,
  BOOSTER_PRICE,
  ICONIC_BOOSTER_PRICE,
} from '../config/rarities';

/**
 * Vue principale d'ouverture de booster avec barème encyclopédique Wikipédia.
 * @param {Object} props
 * @param {Function} props.onCardsOpened - Callback d'ajout des cartes tirées
 * @param {string[]} props.existingCardIds - IDs des cartes possédées
 * @param {string[]} props.favorites - IDs des cartes favorites
 * @param {Function} props.onToggleFavorite - Bascule de favori
 * @param {Function} props.onGoToClasseur - Navigation vers le classeur
 * @param {number} props.wikithunes - Solde de monnaie
 * @param {Function} props.onSpendWikithunes - Débit de monnaie
 * @param {number} props.freeBoostersCount - Boosters gratuits restants
 * @param {string} props.timeRemainingFreeBoosters - Compte à rebours
 * @param {Function} props.onUseFreeBooster - Consommation d'un booster gratuit
 * @param {boolean} props.showRarityRules - Affichage de la colonne latérale Présentation
 * @returns {JSX.Element}
 */
export default function BoosterTab({
  onCardsOpened,
  existingCardIds,
  favorites,
  onToggleFavorite,
  onGoToClasseur,
  wikithunes,
  onSpendWikithunes,
  freeBoostersCount,
  timeRemainingFreeBoosters,
  onUseFreeBooster,
  showRarityRules,
}) {
  return (
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
          <h2 className="wiki-smallcaps m-0">Ouverture de booster</h2>
          <span className="text-[12.5px] text-[#54595d]">
            Tirage en direct sur Wikipédia FR
          </span>
        </div>

        <BoosterOpening
          onCardsOpened={onCardsOpened}
          existingCardIds={existingCardIds}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          onGoToClasseur={onGoToClasseur}
          wikithunes={wikithunes}
          boosterPrice={BOOSTER_PRICE}
          iconicBoosterPrice={ICONIC_BOOSTER_PRICE}
          onSpendWikithunes={onSpendWikithunes}
          freeBoostersCount={freeBoostersCount}
          timeRemainingFreeBoosters={timeRemainingFreeBoosters}
          onUseFreeBooster={onUseFreeBooster}
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
            <strong>WikiCards</strong>, la rareté de chaque carte dépend du
            nombre de visiteurs mensuels de la page.
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
                        {new Intl.NumberFormat('fr-FR').format(
                          tier.recycleValue
                        )}
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
  );
}
