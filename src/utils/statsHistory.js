import { getCardRecycleValue, INITIAL_WIKITHUNES } from '../config/rarities';

const LOCAL_SNAPSHOTS_STORAGE_KEY = 'wikicards_stats_timeline_v1';

/**
 * Récupère les instantanés persistés localement
 */
export function getSavedStatsSnapshots() {
  try {
    const raw = localStorage.getItem(LOCAL_SNAPSHOTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((s) => s && typeof s.timestamp === 'number')
      : [];
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
      netCasinoBilan:
        Number(data.stats?.netCasinoGains || 0) - Number(data.stats?.lostMoneyCasino || 0),
      recordStreak: Number(data.stats?.recordStreak || 0),
      lostCards: Number(data.stats?.lostCards || 0),
      wonCards: Number(data.stats?.wonCards || 0),
      netCardsBilan:
        Number(data.stats?.wonCards || 0) - Number(data.stats?.lostCards || 0),
      totalCardsDrawn: Math.max(
        Number(data.stats?.totalCardsDrawn || 0),
        Number(data.stats?.boostersOpened || 0) * 5,
        Number(data.totalCardsCount || 0)
      ),
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
  isLocalUser = false,
}) {
  const safeCollection = Array.isArray(collection) ? collection.filter(Boolean) : [];
  const safeStats = stats || {};
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Trouve la date de la première carte obtenue (moment où le joueur a commencé à jouer)
  const minCardTs = safeCollection.reduce(
    (min, c) => Math.min(min, Number(c?.obtainedAt || now)),
    now
  );
  const accountAgeMs = Math.max(dayMs, now - minCardTs);

  let windowMs = dayMs * 30; // 1M par défaut
  let sampleCount = 30;

  switch (period) {
    case '1J':
      windowMs = dayMs;
      sampleCount = 24; // 1 point par heure
      break;
    case '1S':
      // Si le compte a moins de 7 jours, on commence au début du compte
      windowMs = Math.min(dayMs * 7, accountAgeMs + 15 * 60 * 1000);
      sampleCount = 28;
      break;
    case '1M':
      // Si le compte a moins de 30 jours, on commence au début du compte
      windowMs = Math.min(dayMs * 30, accountAgeMs + 15 * 60 * 1000);
      sampleCount = 30;
      break;
    case 'TOUT':
    default:
      // Période complète : commence 15 minutes avant le tout premier booster
      // pour capturer l'état initial exact à la création (3 000 ₩ et 0 cartes)
      windowMs = accountAgeMs + 15 * 60 * 1000;
      sampleCount = 35;
      break;
  }

  const startTime = now - windowMs;
  const timeStep = windowMs / (sampleCount - 1);
  const savedSnapshots = isLocalUser ? getSavedStatsSnapshots() : [];

  // Calcule la valeur finale actuelle de la métrique
  const calcCurrentValue = () => {
    switch (metricId) {
      case 'wikithunes':
        return typeof wikithunes === 'number' ? wikithunes : 0;
      case 'collectionValue':
        return typeof collectionValue === 'number'
          ? collectionValue
          : safeCollection.reduce(
              (sum, c) => sum + (c ? getCardRecycleValue(c) * (c.count || 1) : 0),
              0
            );
      case 'uniqueCardsCount':
        return safeCollection.length;
      case 'totalCardsCount':
        return safeCollection.reduce((sum, c) => sum + (c?.count || 1), 0);
      case 'boostersOpened':
        return Number(safeStats?.boostersOpened || 0);
      case 'legendaryCount':
        return safeCollection.filter((c) => c?.rarity === 'L').length;
      case 'ultraRareCount':
        return safeCollection.filter((c) => c?.rarity === 'UR').length;
      case 'gifCount':
        return safeCollection.filter((c) =>
          Boolean(c?.isShiny || c?.isGif || /\.gif(\?|$|\/)/i.test(c?.image || ''))
        ).length;
      case 'lostMoneyCasino':
        return Number(safeStats?.lostMoneyCasino || 0);
      case 'netCasinoGains':
        return Number(safeStats?.netCasinoGains || 0);
      case 'netCasinoBilan':
        return Number(safeStats?.netCasinoGains || 0) - Number(safeStats?.lostMoneyCasino || 0);
      case 'recordStreak':
        return Number(safeStats?.recordStreak || 0);
      case 'netCardsBilan':
        return Number(safeStats?.wonCards || 0) - Number(safeStats?.lostCards || 0);
      case 'totalCardsDrawn':
        return Math.max(
          Number(safeStats?.totalCardsDrawn || 0),
          Number(safeStats?.boostersOpened || 0) * 5,
          safeCollection.reduce((s, c) => s + (c?.count || 1), 0)
        );
      case 'lostCards':
        return Number(safeStats?.lostCards || 0);
      case 'wonCards':
        return Number(safeStats?.wonCards || 0);
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
      // on applique une courbe de croissance naturelle jusqu'à la valeur actuelle (sauf au point initial t0 = 0)
      if (val === 0 && currentVal > 0 && i > 0 && collection.length > 0) {
        const progressRatio = Math.pow(i / (sampleCount - 1), 1.4);
        val = Math.round(currentVal * progressRatio);
      }

      // Si un instantané réel a été sauvegardé pour cette métrique
      if (savedSnapshots.length > 0 && i > 0 && i < sampleCount - 1) {
        let closestSnap = null;
        let minDiff = Infinity;
        for (const s of savedSnapshots) {
          if (!s || typeof s.timestamp !== 'number') continue;
          const diff = Math.abs(s.timestamp - t);
          if (diff <= timeStep && diff < minDiff) {
            minDiff = diff;
            closestSnap = s;
          }
        }
        if (closestSnap && typeof closestSnap[metricId] === 'number') {
          val = closestSnap[metricId];
        }
      }

      points.push({
        timestamp: t,
        value: i === sampleCount - 1 ? currentVal : val,
      });
    } else {
      // Pour les métriques de statistiques (solde, boosters, casino) :
      const ratio = i / (sampleCount - 1);
      let simulatedVal = 0;

      if (metricId === 'wikithunes') {
        // En période "TOUT" ou si la fenêtre englobe la création du compte :
        // Le joueur a débuté avec EXACTEMENT 3 000 ₩ (INITIAL_WIKITHUNES).
        const isAccountStartInWindow = startTime <= minCardTs;

        if (isAccountStartInWindow) {
          const initialBal = INITIAL_WIKITHUNES; // 3000 ₩

          if (i === 0) {
            simulatedVal = initialBal;
          } else if (i === sampleCount - 1) {
            simulatedVal = currentVal;
          } else {
            // Reconstitution proportionnelle au rythme d'ouverture des boosters et cartes
            const cardsAtT = safeCollection.filter((c) => Number(c?.obtainedAt || 0) <= t);
            const totalColCount = safeCollection.length || 1;
            const cardProgress = safeCollection.length > 0
              ? cardsAtT.length / totalColCount
              : ratio;

            // Décroissance naturelle de 3 000 ₩ vers le solde actuel au fur et à mesure des achats
            const baseEst = initialBal + (currentVal - initialBal) * Math.pow(cardProgress, 0.9);
            const wiggle = Math.sin(i * 1.8) * Math.min(45, Math.abs(currentVal - initialBal) * 0.035);
            simulatedVal = Math.max(0, Math.round(baseEst + wiggle));
          }
        } else {
          // Fenêtre plus courte (ex: 1J alors que le compte est plus ancien) :
          // Le solde au début de la fenêtre reflète les liquidités récentes
          const cardsInWindow = safeCollection.filter(
            (c) => Number(c?.obtainedAt || 0) >= startTime && Number(c?.obtainedAt || 0) <= now
          ).length;
          const estimatedCostInWindow = Math.round((cardsInWindow / 5) * 200);
          const startBal = Math.max(0, currentVal + estimatedCostInWindow);

          const cardsSinceStart = safeCollection.filter(
            (c) => Number(c?.obtainedAt || 0) >= startTime && Number(c?.obtainedAt || 0) <= t
          ).length;
          const windowRatio = cardsInWindow > 0 ? cardsSinceStart / cardsInWindow : ratio;
          const baseEst = startBal + (currentVal - startBal) * windowRatio;
          const wiggle = Math.sin(i * 1.6) * Math.min(20, Math.abs(currentVal - startBal) * 0.02);
          simulatedVal = Math.max(0, Math.round(baseEst + (i === 0 ? 0 : wiggle)));
        }
      } else if (metricId === 'netCasinoBilan') {
        if (i === 0 && startTime <= minCardTs) {
          simulatedVal = 0;
        } else if (i === sampleCount - 1) {
          simulatedVal = currentVal;
        } else {
          const cardsAtT = safeCollection.filter((c) => Number(c?.obtainedAt || 0) <= t);
          const totalColCount = safeCollection.length || 1;
          const cardProgress = safeCollection.length > 0 ? cardsAtT.length / totalColCount : ratio;
          const trend = currentVal * Math.pow(cardProgress, 1.15);
          const swing = Math.sin(i * 1.6) * Math.min(25, Math.abs(currentVal) * 0.06);
          simulatedVal = Math.round(trend + (i === 0 ? 0 : swing));
          if (currentVal >= 0) {
            simulatedVal = Math.max(0, simulatedVal);
          }
        }
      } else if (metricId === 'netCardsBilan') {
        if (i === 0 && startTime <= minCardTs) {
          simulatedVal = 0;
        } else if (i === sampleCount - 1) {
          simulatedVal = currentVal;
        } else {
          const cardsAtT = safeCollection.filter((c) => Number(c?.obtainedAt || 0) <= t);
          const totalColCount = safeCollection.length || 1;
          const cardProgress = safeCollection.length > 0 ? cardsAtT.length / totalColCount : ratio;
          const trend = currentVal * Math.pow(cardProgress, 1.15);
          simulatedVal = Math.round(trend);
          if (currentVal >= 0) {
            simulatedVal = Math.max(0, simulatedVal);
          }
        }
      } else if (metricId === 'totalCardsDrawn') {
        if (i === 0 && startTime <= minCardTs) {
          simulatedVal = Math.min(currentVal, 5);
        } else if (i === sampleCount - 1) {
          simulatedVal = currentVal;
        } else {
          const cardsAtT = safeCollection.filter((c) => Number(c?.obtainedAt || 0) <= t);
          const totalColCount = safeCollection.length || 1;
          const cardProgress = safeCollection.length > 0 ? cardsAtT.length / totalColCount : ratio;
          simulatedVal = Math.max(5, Math.min(currentVal, Math.floor(currentVal * Math.pow(cardProgress, 1.0))));
        }
      } else if (metricId === 'recordStreak') {
        // Progression par paliers de records de victoires consécutives
        if (i === 0 && startTime <= minCardTs) {
          simulatedVal = 0;
        } else if (i === sampleCount - 1) {
          simulatedVal = currentVal;
        } else {
          const cardsAtT = safeCollection.filter((c) => Number(c?.obtainedAt || 0) <= t);
          const totalColCount = safeCollection.length || 1;
          const cardProgress = safeCollection.length > 0 ? cardsAtT.length / totalColCount : ratio;
          simulatedVal = Math.min(currentVal, Math.floor(currentVal * Math.pow(cardProgress, 1.3)));
        }
      } else if (
        ['boostersOpened', 'wonCards', 'lostCards', 'lostMoneyCasino', 'netCasinoGains'].includes(
          metricId
        )
      ) {
        // Métriques cumulatives : démarrent à 0 à la création du compte et montent avec l'activité
        if (i === 0 && startTime <= minCardTs) {
          simulatedVal = 0;
        } else if (i === sampleCount - 1) {
          simulatedVal = currentVal;
        } else {
          const cardsAtT = safeCollection.filter((c) => Number(c?.obtainedAt || 0) <= t);
          const totalColCount = safeCollection.length || 1;
          const cardProgress = safeCollection.length > 0
            ? cardsAtT.length / totalColCount
            : Math.pow(ratio, 1.3);
          simulatedVal = Math.round(currentVal * cardProgress);
        }
      } else {
        simulatedVal = Math.round(currentVal * ratio);
      }

      // Si un instantané réel a été sauvegardé
      if (savedSnapshots.length > 0 && i > 0 && i < sampleCount - 1) {
        let closestSnap = null;
        let minDiff = Infinity;
        for (const s of savedSnapshots) {
          if (!s || typeof s.timestamp !== 'number') continue;
          const diff = Math.abs(s.timestamp - t);
          if (diff <= timeStep && diff < minDiff) {
            minDiff = diff;
            closestSnap = s;
          }
        }
        if (closestSnap) {
          if (metricId === 'netCasinoBilan') {
            const snapVal =
              typeof closestSnap.netCasinoBilan === 'number'
                ? closestSnap.netCasinoBilan
                : Number(closestSnap.netCasinoGains || 0) - Number(closestSnap.lostMoneyCasino || 0);
            simulatedVal = snapVal;
          } else if (metricId === 'netCardsBilan') {
            const snapVal =
              typeof closestSnap.netCardsBilan === 'number'
                ? closestSnap.netCardsBilan
                : Number(closestSnap.wonCards || 0) - Number(closestSnap.lostCards || 0);
            simulatedVal = snapVal;
          } else if (metricId === 'totalCardsDrawn') {
            const snapVal =
              typeof closestSnap.totalCardsDrawn === 'number'
                ? closestSnap.totalCardsDrawn
                : Math.max(Number(closestSnap.totalCardsCount || 0), Number(closestSnap.boostersOpened || 0) * 5);
            simulatedVal = snapVal;
          } else if (typeof closestSnap[metricId] === 'number') {
            simulatedVal = closestSnap[metricId];
          }
        }
      }

      points.push({
        timestamp: t,
        value: i === sampleCount - 1 ? currentVal : simulatedVal,
      });
    }
  }

  return points;
}
