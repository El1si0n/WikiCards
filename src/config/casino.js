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
 * Pourcentages de chance de doubler de base selon l'échelon de rareté de la carte misée.
 * C: 59%, PC: 56%, R: 53%, SR: 50%, UR: 47%.
 */
export const DOUBLE_CHANCE_BY_RARITY = {
  C: 59,
  PC: 56,
  R: 53,
  SR: 50,
  UR: 47,
};

/** Plancher minimal de probabilité de succès au Quitte ou Double (%) */
export const DOUBLE_MIN_CHANCE = 12;

/** Délai d'inactivité (ms) permettant de récupérer un palier de malus anti-farm (30 secondes) */
export const DOUBLE_FATIGUE_RECOVERY_MS = 30000;

/** Malus dégressif rapide (en points de %) appliqué selon le nombre de parties consécutives */
export const DOUBLE_FATIGUE_PENALTIES = [0, 4, 9, 16, 24, 33, 42];

/**
 * Calcule le malus anti-farm (en points de pourcentage) selon le nombre de parties consécutives.
 * @param {number} [consecutiveCount=0] - Nombre de parties jouées à la suite
 * @returns {number} Malus en points de %
 */
export function getDoubleFatiguePenalty(consecutiveCount = 0) {
  const count = Math.max(0, Math.floor(Number(consecutiveCount) || 0));
  if (count === 0) return 0;
  if (count < DOUBLE_FATIGUE_PENALTIES.length) {
    return DOUBLE_FATIGUE_PENALTIES[count];
  }
  const extra = count - (DOUBLE_FATIGUE_PENALTIES.length - 1);
  return DOUBLE_FATIGUE_PENALTIES[DOUBLE_FATIGUE_PENALTIES.length - 1] + extra * 9;
}

/**
 * Calcule la probabilité effective de gain au Quitte ou Double après application du malus anti-farm.
 * @param {string} rarityCode - Code de rareté ('C', 'PC', 'R', 'SR', 'UR')
 * @param {number} [consecutiveCount=0] - Nombre de parties consécutives actives
 * @returns {number} Probabilité effective en pourcentage [DOUBLE_MIN_CHANCE, base]
 */
export function getEffectiveDoubleChance(rarityCode, consecutiveCount = 0) {
  const base = DOUBLE_CHANCE_BY_RARITY[rarityCode] || 50;
  const penalty = getDoubleFatiguePenalty(consecutiveCount);
  return Math.max(DOUBLE_MIN_CHANCE, base - penalty);
}

/**
 * Résout l'état de fatigue résiduel en fonction du temps d'inactivité écoulé.
 * @param {number} [savedCount=0] - Compteur de fatigue sauvegardé
 * @param {number} [lastTimestamp=0] - Timestamp ms de la dernière partie ou récupération
 * @param {number} [now=Date.now()] - Horodatage courant
 * @returns {{ count: number, lastTimestamp: number, nextRecoveryRemainingMs: number }} État résolu
 */
export function resolveDoubleFatigueState(savedCount = 0, lastTimestamp = 0, now = Date.now()) {
  const count = Math.max(0, Math.floor(Number(savedCount) || 0));
  const lastTs = Number(lastTimestamp) || 0;
  if (count <= 0 || lastTs <= 0) {
    return { count: 0, lastTimestamp: now, nextRecoveryRemainingMs: 0 };
  }
  const elapsed = Math.max(0, now - lastTs);
  const recoveredSteps = Math.floor(elapsed / DOUBLE_FATIGUE_RECOVERY_MS);
  const nextCount = Math.max(0, count - recoveredSteps);
  if (nextCount === 0) {
    return { count: 0, lastTimestamp: now, nextRecoveryRemainingMs: 0 };
  }
  const nextLastTimestamp = lastTs + recoveredSteps * DOUBLE_FATIGUE_RECOVERY_MS;
  const nextRecoveryRemainingMs = Math.max(
    0,
    DOUBLE_FATIGUE_RECOVERY_MS - (now - nextLastTimestamp)
  );
  return {
    count: nextCount,
    lastTimestamp: nextLastTimestamp,
    nextRecoveryRemainingMs,
  };
}

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
