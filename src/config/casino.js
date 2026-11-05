/**
 * @file Rôle : Configuration économique et probabilités des jeux de casino WikiCards.
 * Dépendances : Aucune.
 * Effets de bord : Aucun (fonctions pures et constantes immuables).
 */

/**
 * Configuration des paliers d'Upgrade de cartes (N -> N+1).
 * La limite maximale de succès est indexée sur la rareté source :
 * 95% pour C, 90% pour PC, 85% pour Rare, 80% pour SR, 75% pour UR.
 */
export const UPGRADE_RULES = {
  C: {
    sourceCode: 'C',
    targetCode: 'PC',
    chancePerCard: 25,
    costPerPercent: 1,
    maxChance: 95,
  },
  PC: {
    sourceCode: 'PC',
    targetCode: 'R',
    chancePerCard: 20,
    costPerPercent: 2,
    maxChance: 90,
  },
  R: {
    sourceCode: 'R',
    targetCode: 'SR',
    chancePerCard: 14,
    costPerPercent: 10,
    maxChance: 85,
  },
  SR: {
    sourceCode: 'SR',
    targetCode: 'UR',
    chancePerCard: 12,
    costPerPercent: 38,
    maxChance: 80,
  },
  UR: {
    sourceCode: 'UR',
    targetCode: 'L',
    chancePerCard: 9,
    costPerPercent: 85,
    maxChance: 75,
  },
};

/** Plafond absolu maximal de succès de l'Upgrader (95%) */
export const MAX_UPGRADE_CHANCE = 95;

/** Nombre maximum strict de cartes sélectionnables pour un tirage (8 cartes) */
export const MAX_SELECTED_CARDS = 8;

/**
 * Pourcentages de chance de doubler selon l'échelon de rareté de la carte misée.
 * C: 55%, PC: 52%, R: 49%, SR: 46%, UR: 43%.
 */
export const DOUBLE_CHANCE_BY_RARITY = {
  C: 55,
  PC: 52,
  R: 49,
  SR: 46,
  UR: 43,
};

/**
 * Multiplicateurs de gain indexés sur la série de victoires au jeu Plus ou Moins.
 */
export const STREAK_MULTIPLIERS = [
  1.0, // 0
  1.5, // 1 bonne réponse (+50% de gain net)
  2.1, // 2 bonnes réponses (mise plus que doublée)
  2.9, // 3 bonnes réponses (~triplée)
  4.0, // 4 bonnes réponses (x4.0)
  5.5, // 5 bonnes réponses (x5.5)
  7.5, // 6 bonnes réponses (x7.5)
  10.2, // 7 bonnes réponses (x10.2)
  14.0, // 8+ bonnes réponses (x14.0)
];

/**
 * Calcule le multiplicateur de gains en fonction de la série (streak).
 * @param {number} streak - Nombre consécutif de prédictions correctes
 * @returns {number} Multiplicateur de gain
 */
export function getMultiplierForStreak(streak) {
  if (streak <= 0) return 1.0;
  if (streak < STREAK_MULTIPLIERS.length) {
    return STREAK_MULTIPLIERS[streak];
  }
  const extra = streak - (STREAK_MULTIPLIERS.length - 1);
  return Number(
    (
      STREAK_MULTIPLIERS[STREAK_MULTIPLIERS.length - 1] * Math.pow(1.36, extra)
    ).toFixed(2)
  );
}
