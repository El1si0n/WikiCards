export const BOOSTER_PRICE = 300; // Multiplié par 3 (anciennement 100 ₩)
export const ICONIC_BOOSTER_PRICE = 1500; // Multiplié par 3 (anciennement 500 ₩)
export const INITIAL_WIKITHUNES = 3000;
export const DAILY_REWARD_AMOUNT = 250;
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
    recycleValue: 25,
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
    recycleValue: 60,
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
    recycleValue: 150,
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
    recycleValue: 400,
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
    recycleValue: 1000,
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

export function getRarityByViews(views = 0) {
  for (let i = RARITY_TIERS.length - 1; i >= 0; i--) {
    if (views >= RARITY_TIERS[i].minViews) {
      return RARITY_TIERS[i];
    }
  }
  return RARITY_TIERS[0];
}

export function getRarityByCode(code) {
  return RARITY_TIERS.find((t) => t.code === code) || RARITY_TIERS[0];
}

export function getCardRecycleValue(card) {
  if (!card) return 10;
  const tier = getRarityByCode(card.rarity);
  const base = tier.recycleValue || 10;
  return card.isShiny ? base * SHINY_RECYCLE_MULTIPLIER : base;
}

export const DEMO_CARDS = [];
