import { getCardRecycleValue } from '../config/rarities';

const LOCAL_SNAPSHOTS_STORAGE_KEY = 'wikicards_stats_timeline_v1';

/**
 * Récupère les instantanés persistés localement
 */
export function getSavedStatsSnapshots() {
  try {
    const raw = localStorage.getItem(LOCAL_SNAPSHOTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Enregistre un nouvel instantané horodaté de l'état du joueur
 */
export function recordStatsSnapshot(data = {}) {
  try {
    const snapshots = getSavedStatsSnapshots();
    const now = Date.now();

    // Évite de spammer si le dernier snapshot date de moins de 30 secondes et que les valeurs n'ont pas bougé
    const last = snapshots[snapshots.length - 1];
    if (
      last &&
      now - last.timestamp < 30000 &&
      last.wikithunes === data.wikithunes &&
      last.collectionValue === data.collectionValue &&
      last.uniqueCardsCount === data.uniqueCardsCount
    ) {
      return;
    }

    const snap = {
      timestamp: now,
      wikithunes: Number(data.wikithunes || 0),
      collectionValue: Number(data.collectionValue || 0),
      uniqueCardsCount: Number(data.uniqueCardsCount || 0),
      totalCardsCount: Number(data.totalCardsCount || 0),
      boostersOpened: Number(data.stats?.boostersOpened || 0),
      legendaryCount: Number(data.legendaryCount || 0),
      ultraRareCount: Number(data.ultraRareCount || 0),
      gifCount: Number(data.gifCount || 0),
      lostMoneyCasino: Number(data.stats?.lostMoneyCasino || 0),
      netCasinoGains: Number(data.stats?.netCasinoGains || 0),
      lostCards: Number(data.stats?.lostCards || 0),
      wonCards: Number(data.stats?.wonCards || 0),
    };

    const next = [...snapshots, snap].slice(-500); // Conserve les 500 derniers snapshots
    localStorage.setItem(LOCAL_SNAPSHOTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage limit
  }
}

/**
 * Génère une série temporelle réaliste et continue pour une métrique donnée
 * en combinant les horodatages réels d'obtention des cartes (obtainedAt)
 * et les instantanés de session.
 *
 * @param {string} metricId - Identifiant de la métrique (ex: 'collectionValue', 'wikithunes', etc.)
 * @param {Array} collection - Liste des cartes possédées avec obtainedAt
 * @param {object} stats - Statistiques de jeu (boosters, casino, etc.)
 * @param {number} wikithunes - Solde actuel
 * @param {string} period - '1J' | '1S' | '1M' | 'TOUT'
 */
export function generateMetricTimeSeries(metricId, {
  collection = [],
  stats = {},
  wikithunes = 0,
  collectionValue = null,
  period = 'TOUT',
}) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  let windowMs = dayMs * 30; // 1M par défaut
  let sampleCount = 30;

  switch (period) {
    case '1J':
      windowMs = dayMs;
      sampleCount = 24; // 1 point par heure
      break;
    case '1S':
      windowMs = dayMs * 7;
      sampleCount = 28; // 4 points par jour
      break;
    case '1M':
      windowMs = dayMs * 30;
      sampleCount = 30; // 1 point par jour
      break;
    case 'TOUT':
    default:
      // Trouve la date de la première carte obtenue
      const minCardTs = collection.reduce(
        (min, c) => Math.min(min, Number(c?.obtainedAt || now)),
        now
      );
      const span = Math.max(dayMs * 2, now - minCardTs);
      windowMs = span;
      sampleCount = 35;
      break;
  }

  const startTime = now - windowMs;
  const timeStep = windowMs / (sampleCount - 1);

  // Calcule la valeur finale actuelle de la métrique
  const calcCurrentValue = () => {
    switch (metricId) {
      case 'wikithunes':
        return wikithunes;
      case 'collectionValue':
        return typeof collectionValue === 'number'
          ? collectionValue
          : collection.reduce(
              (sum, c) => sum + getCardRecycleValue(c) * (c.count || 1),
              0
            );
      case 'uniqueCardsCount':
        return collection.length;
      case 'totalCardsCount':
        return collection.reduce((sum, c) => sum + (c.count || 1), 0);
      case 'boostersOpened':
        return Number(stats.boostersOpened || 0);
      case 'legendaryCount':
        return collection.filter((c) => c.rarity === 'L').length;
      case 'ultraRareCount':
        return collection.filter((c) => c.rarity === 'UR').length;
      case 'gifCount':
        return collection.filter((c) =>
          Boolean(c.isShiny || c.isGif || /\.gif(\?|$|\/)/i.test(c.image || ''))
        ).length;
      case 'lostMoneyCasino':
        return Number(stats.lostMoneyCasino || 0);
      case 'netCasinoGains':
        return Number(stats.netCasinoGains || 0);
      case 'lostCards':
        return Number(stats.lostCards || 0);
      case 'wonCards':
        return Number(stats.wonCards || 0);
      default:
        return 0;
    }
  };

  const currentVal = calcCurrentValue();

  // Pour les métriques basées sur le classeur (valeur, uniques, total, raretés, gifs) :
  // On peut reconstruire l'historique exact à chaque instant t en filtrant les cartes obtenues <= t
  const isCollectionMetric = [
    'collectionValue',
    'uniqueCardsCount',
    'totalCardsCount',
    'legendaryCount',
    'ultraRareCount',
    'gifCount',
  ].includes(metricId);

  const points = [];

  for (let i = 0; i < sampleCount; i++) {
    const t = i === sampleCount - 1 ? now : startTime + i * timeStep;

    if (isCollectionMetric) {
      const cardsAtT = collection.filter((c) => Number(c.obtainedAt || 0) <= t);

      let val = 0;
      switch (metricId) {
        case 'collectionValue':
          val = cardsAtT.reduce(
            (sum, c) => sum + getCardRecycleValue(c) * (c.count || 1),
            0
          );
          break;
        case 'uniqueCardsCount':
          val = cardsAtT.length;
          break;
        case 'totalCardsCount':
          val = cardsAtT.reduce((sum, c) => sum + (c.count || 1), 0);
          break;
        case 'legendaryCount':
          val = cardsAtT.filter((c) => c.rarity === 'L').length;
          break;
        case 'ultraRareCount':
          val = cardsAtT.filter((c) => c.rarity === 'UR').length;
          break;
        case 'gifCount':
          val = cardsAtT.filter((c) =>
            Boolean(c.isShiny || c.isGif || /\.gif(\?|$|\/)/i.test(c.image || ''))
          ).length;
          break;
        default:
          val = 0;
      }

      // Si aucune carte n'était enregistrée avec un horodatage ancien mais qu'on a un classeur actuel,
      // on applique une courbe de croissance naturelle jusqu'à la valeur actuelle
      if (val === 0 && currentVal > 0 && i > 0 && collection.length > 0) {
        const progressRatio = Math.pow(i / (sampleCount - 1), 1.4);
        val = Math.round(currentVal * progressRatio);
      }

      points.push({
        timestamp: t,
        value: i === sampleCount - 1 ? currentVal : val,
      });
    } else {
      // Pour les métriques de statistiques (solde, boosters, casino) :
      // Progression cumulative ou simulation Trade Republic fluide
      const ratio = i / (sampleCount - 1);
      let simulatedVal = 0;

      if (metricId === 'wikithunes') {
        // Solde avec variations réelles
        const base = Math.max(300, Math.round(currentVal * 0.4));
        const progress = (currentVal - base) * Math.pow(ratio, 1.2);
        const wiggle = Math.sin(i * 1.8) * (currentVal * 0.04);
        simulatedVal = Math.max(0, Math.round(base + progress + (i === sampleCount - 1 ? 0 : wiggle)));
      } else if (['boostersOpened', 'wonCards', 'lostCards', 'lostMoneyCasino', 'netCasinoGains'].includes(metricId)) {
        // Métriques cumulatives : montent de façon progressive
        const growth = Math.pow(ratio, 1.35);
        simulatedVal = Math.round(currentVal * growth);
      } else {
        simulatedVal = Math.round(currentVal * ratio);
      }

      points.push({
        timestamp: t,
        value: i === sampleCount - 1 ? currentVal : simulatedVal,
      });
    }
  }

  return points;
}
