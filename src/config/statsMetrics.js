/**
 * @file Rôle : Définition des métriques de statistiques et des périodes de visualisation (Trade Republic).
 * Dépendances : Lucide-react (Coins, Layers, Package, Crown, Sparkles, BookOpen, Flame, TrendingDown, TrendingUp, Trophy).
 * Effets de bord : Aucun (configuration pure).
 */

import {
  Coins,
  Layers,
  Package,
  Crown,
  Sparkles,
  BookOpen,
  Flame,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react';

/**
 * Définition complète des 17 métriques observables dans l'historique du joueur.
 */
export const METRIC_DEFINITIONS = {
  playerScore: {
    title: "Score d'accomplissement",
    unit: ' pts',
    isCurrency: false,
    description:
      'Évolution du score global du collectionneur (raretés, diversité, économie et prouesses au jeu).',
    icon: Trophy,
  },
  collectionValue: {
    title: 'Valeur du classeur',
    unit: ' ₩',
    isCurrency: true,
    description: 'Estimation de la valeur marchande totale du classeur au cours du temps.',
    icon: Coins,
  },
  wikithunes: {
    title: 'Solde actuel',
    unit: ' ₩',
    isCurrency: true,
    description: 'Évolution des liquidités en Wikithunes en banque.',
    icon: Coins,
  },
  uniqueCardsCount: {
    title: 'Articles uniques',
    unit: ' articles',
    isCurrency: false,
    description: 'Progression de la diversité de pages Wikipédia découvertes.',
    icon: Layers,
  },
  totalCardsCount: {
    title: 'Total de cartes',
    unit: ' cartes',
    isCurrency: false,
    description: 'Volume total de cartes et doublons possédés.',
    icon: Layers,
  },
  boostersOpened: {
    title: 'Boosters ouverts',
    unit: ' boosters',
    isCurrency: false,
    description: 'Cumul des paquets de cartes ouverts depuis vos débuts.',
    icon: Package,
  },
  legendaryCount: {
    title: 'Légendaires (L)',
    unit: ' cartes',
    isCurrency: false,
    description: 'Nombre de cartes Légendaires possédées dans le classeur.',
    icon: Crown,
  },
  ultraRareCount: {
    title: 'Ultra Rares (UR)',
    unit: ' cartes',
    isCurrency: false,
    description: 'Nombre de cartes Ultra Rares possédées dans le classeur.',
    icon: Sparkles,
  },
  gifCount: {
    title: 'Cartes GIF (Métal)',
    unit: ' cartes',
    isCurrency: false,
    description: 'Nombre de cartes animées et holographiques dans la collection.',
    icon: Sparkles,
  },
  netCasinoBilan: {
    title: 'Bilan Casino (Net)',
    unit: ' ₩',
    isCurrency: true,
    description: 'Solde net cumulé du jeu Plus ou Moins (Gains nets empochés − Mises perdues).',
    icon: Coins,
  },
  netCardsBilan: {
    title: 'Bilan Cartes (Net)',
    unit: ' cartes',
    isCurrency: false,
    description: 'Bilan net de volume des cartes au jeu (Gains du Quitte ou Double − Cartes détruites aux jeux).',
    icon: Layers,
  },
  totalCardsDrawn: {
    title: 'Cartes tirées au total',
    unit: ' cartes',
    isCurrency: false,
    description: 'Cumul total de toutes les cartes piochées dans l’histoire du compte (Volume exploré).',
    icon: BookOpen,
  },
  recordStreak: {
    title: 'Série record',
    unit: ' victoires',
    isCurrency: false,
    description: 'Plus longue série ininterrompue de bonnes réponses au jeu Plus ou Moins.',
    icon: Flame,
  },
  lostMoneyCasino: {
    title: 'Argent perdu au jeu',
    unit: ' ₩',
    isCurrency: true,
    description: 'Cumul des mises perdues au Plus ou Moins et des % d’upgrades échouées.',
    icon: TrendingDown,
  },
  netCasinoGains: {
    title: 'Gains casino (Gain net)',
    unit: ' ₩',
    isCurrency: true,
    description: 'Bénéfices réels nets empochés lors des victoires au Plus ou Moins.',
    icon: Flame,
  },
  lostCards: {
    title: 'Cartes perdues',
    unit: ' cartes',
    isCurrency: false,
    description: 'Cartes détruites lors des échecs d’upgrades et de quitte ou double.',
    icon: TrendingDown,
  },
  wonCards: {
    title: 'Cartes gagnées',
    unit: ' cartes',
    isCurrency: false,
    description: 'Cartes supplémentaires gagnées lors du quitte ou double.',
    icon: TrendingUp,
  },
};

/**
 * Périodes disponibles pour l'analyse historique.
 */
export const PERIODS = [
  { id: '1J', label: '1J' },
  { id: '1S', label: '1S' },
  { id: '1M', label: '1M' },
  { id: 'TOUT', label: 'TOUT' },
];
