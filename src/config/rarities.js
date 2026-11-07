/**
 * @file Rôle : Définition des constantes économiques, barèmes de rareté et valeurs de recyclage.
 * Dépendances : Aucune.
 * Effets de bord : Aucun (constantes et fonctions pures).
 */

/**
 * @typedef {Object} RarityTier
 * @property {'C'|'PC'|'R'|'SR'|'UR'|'L'} code - Code court de la rareté
 * @property {string} name - Nom français de la rareté
 * @property {string} thresholdLabel - Libellé du seuil de visiteurs
 * @property {string} dropRate - Taux d'apparition indicatif
 * @property {number} recycleValue - Valeur de recyclage unitaire de base en Wikithunes
 * @property {number} minViews - Vues mensuelles minimales
 * @property {number} maxViews - Vues mensuelles maximales (Infinity pour L)
 * @property {string} badgeBg - Couleur de fond CSS du badge
 * @property {string} badgeText - Couleur textuelle CSS du badge
 * @property {string} cardBg - Dégradé CSS d'arrière-plan de la carte
 * @property {string} waveColor1 - Couleur de la première onde SVG
 * @property {string} waveColor2 - Couleur de la seconde onde SVG
 * @property {string} borderColor - Couleur CSS de bordure
 * @property {string} shadowColor - Couleur CSS de halo / ombre
 * @property {string} foilGradient - Dégradé CSS d'effet holographique
 * @property {string} textColor - Couleur principale du texte
 * @property {string} subTextColor - Couleur secondaire du texte
 * @property {string} dividerColor - Couleur de ligne de séparation
 */

export const BOOSTER_PRICE = 200; // Ajusté à 200 ₩ (au lieu de 300 ₩)
export const ICONIC_BOOSTER_PRICE = 1000; // Ajusté à 1 000 ₩ (5x le booster standard)
export const INITIAL_WIKITHUNES = 3000;
export const DAILY_REWARD_AMOUNT = 550; // Bourse journalière augmentée à 550 ₩ (au lieu de 250 ₩)
export const SHINY_RECYCLE_MULTIPLIER = 3;
export const ICONIC_PACK_CHANCE = 0.005; // 0,5 % de chance (1 sur 200 boosters) que le prochain booster soit un Booster Iconique

export const RARITY_TIERS = [
  {
    code: 'C',
    name: 'Commun',
    thresholdLabel: 'Moins de 50 vues',
    dropRate: '52 %',
    recycleValue: 10,
    minViews: 0,
    maxViews: 49,
    badgeBg: '#d9faec',
    badgeText: '#103828',
    cardBg: 'linear-gradient(155deg, #d4f7e6 0%, #a9ebd0 52%, #86ddb9 100%)',
    waveColor1: 'rgba(255, 255, 255, 0.42)',
    waveColor2: 'rgba(20, 90, 60, 0.08)',
    borderColor: '#7fd4b0',
    shadowColor: 'rgba(46, 160, 115, 0.18)',
    foilGradient: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)',
    textColor: '#102a20',
    subTextColor: '#1c4032',
    dividerColor: 'rgba(16, 42, 32, 0.16)',
  },
  {
    code: 'PC',
    name: 'Peu Commun',
    thresholdLabel: 'À partir de 50 vues',
    dropRate: '30 %',
    recycleValue: 35,
    minViews: 50,
    maxViews: 249,
    badgeBg: '#d5e8fa',
    badgeText: '#132c47',
    cardBg: 'linear-gradient(155deg, #cce3f8 0%, #99c5ee 50%, #78aee2 100%)',
    waveColor1: 'rgba(255, 255, 255, 0.45)',
    waveColor2: 'rgba(22, 62, 110, 0.10)',
    borderColor: '#72a8de',
    shadowColor: 'rgba(51, 115, 180, 0.22)',
    foilGradient: 'linear-gradient(115deg, transparent 25%, rgba(220,240,255,0.45) 50%, transparent 75%)',
    textColor: '#10243b',
    subTextColor: '#1c3757',
    dividerColor: 'rgba(16, 36, 59, 0.16)',
  },
  {
    code: 'R',
    name: 'Rare',
    thresholdLabel: 'À partir de 250 vues',
    dropRate: '12 %',
    recycleValue: 125,
    minViews: 250,
    maxViews: 999,
    badgeBg: '#e2d6fc',
    badgeText: '#261447',
    cardBg: 'linear-gradient(155deg, #d7c6f9 0%, #b194f0 48%, #936ee3 100%)',
    waveColor1: 'rgba(255, 255, 255, 0.38)',
    waveColor2: 'rgba(48, 20, 102, 0.13)',
    borderColor: '#9875e6',
    shadowColor: 'rgba(116, 74, 209, 0.26)',
    foilGradient: 'linear-gradient(115deg, transparent 20%, rgba(238,220,255,0.55) 48%, rgba(180,220,255,0.35) 55%, transparent 80%)',
    textColor: '#1d1036',
    subTextColor: '#2c1b4f',
    dividerColor: 'rgba(29, 16, 54, 0.18)',
  },
  {
    code: 'SR',
    name: 'Super Rare',
    thresholdLabel: 'À partir de 1 000 vues',
    dropRate: '4,2 %',
    recycleValue: 420,
    minViews: 1000,
    maxViews: 4999,
    badgeBg: '#fbd0e5',
    badgeText: '#421029',
    cardBg: 'linear-gradient(155deg, #f7bedb 0%, #ea8eba 48%, #dc6da3 100%)',
    waveColor1: 'rgba(255, 255, 255, 0.42)',
    waveColor2: 'rgba(115, 20, 68, 0.14)',
    borderColor: '#e074a8',
    shadowColor: 'rgba(209, 77, 143, 0.30)',
    foilGradient: 'linear-gradient(115deg, transparent 20%, rgba(255,230,245,0.65) 45%, rgba(255,180,225,0.4) 55%, transparent 80%)',
    textColor: '#2b0b1b',
    subTextColor: '#3d1429',
    dividerColor: 'rgba(43, 11, 27, 0.18)',
  },
  {
    code: 'UR',
    name: 'Ultra Rare',
    thresholdLabel: 'À partir de 5 000 vues',
    dropRate: '1,5 %',
    recycleValue: 710,
    minViews: 5000,
    maxViews: 19999,
    badgeBg: '#ffe2b0',
    badgeText: '#422305',
    cardBg: 'linear-gradient(155deg, #ffd08a 0%, #f7a440 48%, #e8831c 100%)',
    waveColor1: 'rgba(255, 244, 214, 0.48)',
    waveColor2: 'rgba(130, 56, 0, 0.16)',
    borderColor: '#f0932b',
    shadowColor: 'rgba(230, 126, 34, 0.34)',
    foilGradient: 'linear-gradient(115deg, transparent 15%, rgba(255,245,200,0.75) 45%, rgba(255,190,100,0.45) 55%, transparent 85%)',
    textColor: '#291400',
    subTextColor: '#3d2004',
    dividerColor: 'rgba(41, 20, 0, 0.18)',
  },
  {
    code: 'L',
    name: 'Légendaire',
    thresholdLabel: 'À partir de 20 000 vues',
    dropRate: '0,3 %',
    recycleValue: 2100,
    minViews: 20000,
    maxViews: Infinity,
    badgeBg: '#ffea5a',
    badgeText: '#261e00',
    cardBg: 'linear-gradient(145deg, #f6dc6b 0%, #d4a11d 38%, #b37e08 72%, #e8be3f 100%)',
    waveColor1: 'rgba(255, 248, 190, 0.50)',
    waveColor2: 'rgba(92, 62, 0, 0.24)',
    borderColor: '#deb226',
    shadowColor: 'rgba(212, 161, 29, 0.44)',
    foilGradient: 'linear-gradient(115deg, transparent 10%, rgba(255,255,210,0.85) 40%, rgba(255,215,80,0.55) 50%, rgba(190,245,255,0.4) 60%, transparent 90%)',
    textColor: '#1f1700',
    subTextColor: '#302400',
    dividerColor: 'rgba(31, 23, 0, 0.22)',
  },
];

/**
 * Détermine le palier de rareté correspondant à un nombre de vues mensuelles.
 * @param {number} [views=0] - Vues cumulées sur les 30 derniers jours
 * @returns {RarityTier} Objet palier de rareté
 */
export function getRarityByViews(views = 0) {
  for (let i = RARITY_TIERS.length - 1; i >= 0; i--) {
    if (views >= RARITY_TIERS[i].minViews) {
      return RARITY_TIERS[i];
    }
  }
  return RARITY_TIERS[0];
}

/**
 * Récupère la configuration d'un palier à partir de son code court.
 * @param {'C'|'PC'|'R'|'SR'|'UR'|'L'|string} code - Code de rareté
 * @returns {RarityTier} Objet palier de rareté
 */
export function getRarityByCode(code) {
  return RARITY_TIERS.find((t) => t.code === code) || RARITY_TIERS[0];
}

/**
 * Calcule la valeur de recyclage en Wikithunes d'une carte.
 * @param {{ rarity?: string, isShiny?: boolean } | null} card - Carte à recycler
 * @returns {number} Montant en Wikithunes obtenu
 */
export function getCardRecycleValue(card) {
  if (!card) return 10;
  const tier = getRarityByCode(card.rarity);
  const base = tier.recycleValue || 10;
  return card.isShiny ? base * SHINY_RECYCLE_MULTIPLIER : base;
}

export const DEMO_CARDS = [];

export const RARITY_ORDER = ['C', 'PC', 'R', 'SR', 'UR', 'L'];

/**
 * Configurations des effets de lumière lors de l'ouverture d'un booster, indexées par code de rareté.
 */
export const BOOSTER_LIGHT_EFFECTS = {
  C: {
    beamGradient:
      'linear-gradient(to top, rgba(217, 250, 236, 0.78) 0%, rgba(110, 231, 183, 0.45) 22%, rgba(16, 185, 129, 0.16) 55%, transparent 100%)',
    conicRays:
      'conic-gradient(from 295deg at 50% 108%, transparent 0deg, rgba(167, 243, 208, 0.45) 14deg, transparent 26deg, rgba(236, 253, 245, 0.6) 42deg, transparent 54deg, rgba(52, 211, 153, 0.65) 65deg, transparent 76deg, rgba(236, 253, 245, 0.6) 88deg, transparent 100deg, rgba(167, 243, 208, 0.45) 114deg, transparent 130deg)',
    slitGradient:
      'linear-gradient(90deg, rgba(52,211,153,0.25) 0%, rgba(255,255,255,0.85) 25%, #ecfdf5 50%, rgba(255,255,255,0.85) 75%, rgba(52,211,153,0.25) 100%)',
    slitShadow: '0 -1px 7px 1px rgba(16, 185, 129, 0.65)',
    tearLineColor: '#10b981',
    tearLineShadow: '0 0 14px #34d399',
    ambientGlow:
      'radial-gradient(circle, #6ee7b7 0%, #10b981 55%, transparent 100%)',
  },
  PC: {
    beamGradient:
      'linear-gradient(to top, rgba(191, 227, 255, 0.75) 0%, rgba(96, 165, 250, 0.42) 22%, rgba(51, 102, 204, 0.15) 55%, transparent 100%)',
    conicRays:
      'conic-gradient(from 295deg at 50% 108%, transparent 0deg, rgba(147, 197, 253, 0.45) 14deg, transparent 26deg, rgba(224, 242, 254, 0.6) 42deg, transparent 54deg, rgba(96, 165, 250, 0.65) 65deg, transparent 76deg, rgba(224, 242, 254, 0.6) 88deg, transparent 100deg, rgba(147, 197, 253, 0.45) 114deg, transparent 130deg)',
    slitGradient:
      'linear-gradient(90deg, rgba(96,165,250,0.25) 0%, rgba(255,255,255,0.85) 25%, #eff6ff 50%, rgba(255,255,255,0.85) 75%, rgba(96,165,250,0.25) 100%)',
    slitShadow: '0 -1px 7px 1px rgba(59, 130, 246, 0.65)',
    tearLineColor: '#3366cc',
    tearLineShadow: '0 0 14px #3366cc',
    ambientGlow:
      'radial-gradient(circle, #60a5fa 0%, #3b82f6 55%, transparent 100%)',
  },
  R: {
    beamGradient:
      'linear-gradient(to top, rgba(233, 213, 255, 0.78) 0%, rgba(192, 132, 252, 0.45) 22%, rgba(147, 51, 234, 0.16) 55%, transparent 100%)',
    conicRays:
      'conic-gradient(from 295deg at 50% 108%, transparent 0deg, rgba(216, 180, 254, 0.45) 14deg, transparent 26deg, rgba(250, 245, 255, 0.6) 42deg, transparent 54deg, rgba(168, 85, 247, 0.65) 65deg, transparent 76deg, rgba(250, 245, 255, 0.6) 88deg, transparent 100deg, rgba(216, 180, 254, 0.45) 114deg, transparent 130deg)',
    slitGradient:
      'linear-gradient(90deg, rgba(168,85,247,0.25) 0%, rgba(255,255,255,0.85) 25%, #faf5ff 50%, rgba(255,255,255,0.85) 75%, rgba(168,85,247,0.25) 100%)',
    slitShadow: '0 -1px 7px 1px rgba(168, 85, 247, 0.65)',
    tearLineColor: '#9333ea',
    tearLineShadow: '0 0 14px #c084fc',
    ambientGlow:
      'radial-gradient(circle, #c084fc 0%, #9333ea 55%, transparent 100%)',
  },
  SR: {
    beamGradient:
      'linear-gradient(to top, rgba(251, 207, 232, 0.78) 0%, rgba(244, 114, 182, 0.45) 22%, rgba(219, 39, 119, 0.16) 55%, transparent 100%)',
    conicRays:
      'conic-gradient(from 295deg at 50% 108%, transparent 0deg, rgba(249, 168, 212, 0.45) 14deg, transparent 26deg, rgba(253, 242, 248, 0.6) 42deg, transparent 54deg, rgba(236, 72, 153, 0.65) 65deg, transparent 76deg, rgba(253, 242, 248, 0.6) 88deg, transparent 100deg, rgba(249, 168, 212, 0.45) 114deg, transparent 130deg)',
    slitGradient:
      'linear-gradient(90deg, rgba(236,72,153,0.25) 0%, rgba(255,255,255,0.85) 25%, #fdf2f8 50%, rgba(255,255,255,0.85) 75%, rgba(236,72,153,0.25) 100%)',
    slitShadow: '0 -1px 7px 1px rgba(236, 72, 153, 0.65)',
    tearLineColor: '#db2777',
    tearLineShadow: '0 0 14px #f472b6',
    ambientGlow:
      'radial-gradient(circle, #f472b6 0%, #db2777 55%, transparent 100%)',
  },
  UR: {
    beamGradient:
      'linear-gradient(to top, rgba(254, 215, 170, 0.78) 0%, rgba(251, 146, 60, 0.48) 22%, rgba(234, 88, 12, 0.18) 55%, transparent 100%)',
    conicRays:
      'conic-gradient(from 295deg at 50% 108%, transparent 0deg, rgba(253, 186, 116, 0.45) 14deg, transparent 26deg, rgba(255, 247, 237, 0.6) 42deg, transparent 54deg, rgba(249, 115, 22, 0.68) 65deg, transparent 76deg, rgba(255, 247, 237, 0.6) 88deg, transparent 100deg, rgba(253, 186, 116, 0.45) 114deg, transparent 130deg)',
    slitGradient:
      'linear-gradient(90deg, rgba(249,115,22,0.25) 0%, rgba(255,255,255,0.85) 25%, #fff7ed 50%, rgba(255,255,255,0.85) 75%, rgba(249,115,22,0.25) 100%)',
    slitShadow: '0 -1px 7px 1px rgba(249, 115, 22, 0.70)',
    tearLineColor: '#ea580c',
    tearLineShadow: '0 0 14px #fb923c',
    ambientGlow:
      'radial-gradient(circle, #fb923c 0%, #ea580c 55%, transparent 100%)',
  },
  L: {
    beamGradient:
      'linear-gradient(to top, rgba(255, 240, 145, 0.78) 0%, rgba(255, 215, 64, 0.45) 22%, rgba(212, 161, 29, 0.16) 55%, transparent 100%)',
    conicRays:
      'conic-gradient(from 295deg at 50% 108%, transparent 0deg, rgba(255, 240, 138, 0.48) 14deg, transparent 26deg, rgba(255, 250, 205, 0.62) 42deg, transparent 54deg, rgba(255, 234, 90, 0.68) 65deg, transparent 76deg, rgba(255, 250, 205, 0.62) 88deg, transparent 100deg, rgba(255, 240, 138, 0.48) 114deg, transparent 130deg)',
    slitGradient:
      'linear-gradient(90deg, rgba(255,234,90,0.25) 0%, rgba(255,255,255,0.85) 25%, #fffbeb 50%, rgba(255,255,255,0.85) 75%, rgba(255,234,90,0.25) 100%)',
    slitShadow: '0 -1px 7px 1px rgba(255, 215, 64, 0.65)',
    tearLineColor: '#d4a11d',
    tearLineShadow: '0 0 14px #ffea5a',
    ambientGlow:
      'radial-gradient(circle, #ffea5a 0%, #f0b429 55%, transparent 100%)',
  },
};

/**
 * Trouve le palier de rareté le plus élevé parmi une liste de cartes.
 * @param {Array<{ rarity?: string }>} [cards=[]] - Liste des cartes
 * @returns {RarityTier} Objet palier de rareté le plus élevé
 */
export function getHighestRarityTier(cards = []) {
  if (!cards || cards.length === 0) return RARITY_TIERS[0];
  let maxRank = -1;
  let highestTier = RARITY_TIERS[0];

  for (const card of cards) {
    if (!card || !card.rarity) continue;
    const rank = RARITY_ORDER.indexOf(card.rarity);
    if (rank > maxRank) {
      maxRank = rank;
      highestTier = getRarityByCode(card.rarity);
    }
  }

  return highestTier;
}

/**
 * Récupère la configuration d'effet de lumière d'ouverture adaptée à la plus haute rareté du booster.
 * @param {Array<{ rarity?: string }>} [cards=[]] - Liste des cartes du booster
 * @param {boolean} [isIconic=false] - Indique si le booster est iconique
 * @returns {Object} Configuration CSS de l'effet de lumière
 */
export function getBoosterOpeningLight(cards = [], isIconic = false) {
  if (!cards || cards.length === 0) {
    return isIconic ? BOOSTER_LIGHT_EFFECTS.L : BOOSTER_LIGHT_EFFECTS.C;
  }
  const highest = getHighestRarityTier(cards);
  return BOOSTER_LIGHT_EFFECTS[highest.code] || BOOSTER_LIGHT_EFFECTS.C;
}
