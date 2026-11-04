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
    if (!Array.isArray(parsed)) return [];

    // Filtre les éléments valides et trie par chronologie croissante
    const valid = parsed.filter((s) => s && typeof s.timestamp === 'number');
    valid.sort((a, b) => a.timestamp - b.timestamp);

    // Auto-réparation des anomalies et creux aberrants dans l'historique local
    let maxLeg = 0;
    let maxUR = 0;
    let maxGif = 0;
    let maxBoosters = 0;
    let maxStreak = 0;
    let maxDraws = 0;
    let maxWon = 0;
    let maxLost = 0;

    for (const s of valid) {
      // Réparation des creux à 0 sur raretés et gifs dus aux anciens snapshots incomplets
      if (typeof s.legendaryCount === 'number') {
        if (s.legendaryCount === 0 && maxLeg > 0) s.legendaryCount = maxLeg;
        else maxLeg = Math.max(maxLeg, s.legendaryCount);
      }
      if (typeof s.ultraRareCount === 'number') {
        if (s.ultraRareCount === 0 && maxUR > 0) s.ultraRareCount = maxUR;
        else maxUR = Math.max(maxUR, s.ultraRareCount);
      }
      if (typeof s.gifCount === 'number') {
        if (s.gifCount === 0 && maxGif > 0) s.gifCount = maxGif;
        else maxGif = Math.max(maxGif, s.gifCount);
      }

      // Réparation des compteurs cumulatifs (ne régressent jamais dans le temps)
      if (typeof s.boostersOpened === 'number') {
        if (s.boostersOpened < maxBoosters) s.boostersOpened = maxBoosters;
        else maxBoosters = s.boostersOpened;
      }
      if (typeof s.recordStreak === 'number') {
        if (s.recordStreak < maxStreak) s.recordStreak = maxStreak;
        else maxStreak = s.recordStreak;
      }
      if (typeof s.totalCardsDrawn === 'number') {
        if (s.totalCardsDrawn < maxDraws) s.totalCardsDrawn = maxDraws;
        else maxDraws = s.totalCardsDrawn;
      }
      if (typeof s.wonCards === 'number') {
        if (s.wonCards < maxWon) s.wonCards = maxWon;
        else maxWon = s.wonCards;
      }
      if (typeof s.lostCards === 'number') {
        if (s.lostCards < maxLost) s.lostCards = maxLost;
        else maxLost = s.lostCards;
      }
    }

    return valid;
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
    const last = snapshots[snapshots.length - 1];

    const safeCol = Array.isArray(data.collection) ? data.collection : [];
    const legendaryCount = typeof data.legendaryCount === 'number'
      ? data.legendaryCount
      : safeCol.length > 0
      ? safeCol.filter((c) => c?.rarity === 'L').length
      : last?.legendaryCount || 0;
    const ultraRareCount = typeof data.ultraRareCount === 'number'
      ? data.ultraRareCount
      : safeCol.length > 0
      ? safeCol.filter((c) => c?.rarity === 'UR').length
      : last?.ultraRareCount || 0;
    const gifCount = typeof data.gifCount === 'number'
      ? data.gifCount
      : safeCol.length > 0
      ? safeCol.filter((c) =>
          Boolean(c?.isShiny || c?.isGif || /\.gif(\?|$|\/)/i.test(c?.image || ''))
        ).length
      : last?.gifCount || 0;

    // Protection de monotonie contre les désynchronisations temporaires
    const boostersOpened = Math.max(
      last?.boostersOpened || 0,
      Number(data.stats?.boostersOpened || 0)
    );
    const recordStreak = Math.max(
      last?.recordStreak || 0,
      Number(data.stats?.recordStreak || 0)
    );
    const lostMoneyCasino = Math.max(
      last?.lostMoneyCasino || 0,
      Number(data.stats?.lostMoneyCasino || 0)
    );
    const netCasinoGains = Math.max(
      last?.netCasinoGains || 0,
      Number(data.stats?.netCasinoGains || 0)
    );
    const lostCards = Math.max(
      last?.lostCards || 0,
      Number(data.stats?.lostCards || 0)
    );
    const wonCards = Math.max(
      last?.wonCards || 0,
      Number(data.stats?.wonCards || 0)
    );
    const totalCardsDrawn = Math.max(
      last?.totalCardsDrawn || 0,
      Number(data.stats?.totalCardsDrawn || 0),
      boostersOpened * 5,
      Number(data.totalCardsCount || 0)
    );

    // Évite de spammer si le dernier snapshot date de moins de 30 secondes et que les valeurs n'ont pas bougé
    if (
      last &&
      now - last.timestamp < 30000 &&
      last.wikithunes === data.wikithunes &&
      last.collectionValue === data.collectionValue &&
      last.uniqueCardsCount === data.uniqueCardsCount &&
      last.boostersOpened === boostersOpened &&
      last.recordStreak === recordStreak &&
      last.ultraRareCount === ultraRareCount &&
      last.gifCount === gifCount
    ) {
      return;
    }

    const snap = {
      timestamp: now,
      wikithunes: Number(data.wikithunes || 0),
      collectionValue: Number(data.collectionValue || 0),
      uniqueCardsCount: Number(data.uniqueCardsCount || 0),
      totalCardsCount: Number(data.totalCardsCount || 0),
      boostersOpened,
      legendaryCount,
      ultraRareCount,
      gifCount,
      lostMoneyCasino,
      netCasinoGains,
      netCasinoBilan: netCasinoGains - lostMoneyCasino,
      recordStreak,
      lostCards,
      wonCards,
      netCardsBilan: wonCards - lostCards,
      totalCardsDrawn,
    };

    const next = [...snapshots, snap].slice(-500);
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
          // Ne remplace jamais un comptage réel par 0 (évite les trous de données accidentels)
          if (closestSnap[metricId] > 0 || val === 0) {
            val = closestSnap[metricId];
          }
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
        // Courbe P&L boursière du casino : peut monter en territoire positif ou descendre en négatif
        if (i === 0 && startTime <= minCardTs) {
          simulatedVal = 0;
        } else if (i === sampleCount - 1) {
          simulatedVal = currentVal;
        } else {
          // Reconstitution avec fluctuations réelles (hausses lors des gains, baisses lors des pertes)
          const cardsAtT = safeCollection.filter((c) => Number(c?.obtainedAt || 0) <= t);
          const totalColCount = safeCollection.length || 1;
          const cardProgress = safeCollection.length > 0 ? cardsAtT.length / totalColCount : ratio;
          const trend = currentVal * Math.pow(cardProgress, 1.05);
          // Onde de casino fluctuante avec des swings au fil des sessions de jeu
          const amplitude = Math.max(30, Math.abs(currentVal) * 0.35 + 20);
          const swing = Math.sin(i * 1.75) * amplitude * (1 - Math.abs(ratio - 0.5));
          simulatedVal = Math.round(trend + (i === 0 ? 0 : swing));
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
          const trend = currentVal * Math.pow(cardProgress, 1.05);
          const amplitude = Math.max(2, Math.abs(currentVal) * 0.25 + 2);
          const swing = Math.sin(i * 1.75) * amplitude * (1 - Math.abs(ratio - 0.5));
          simulatedVal = Math.round(trend + (i === 0 ? 0 : swing));
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

  // Sécurité anti-régressions pour les métriques de progression et d'inventaire cumulatif
  const isMonotonic = [
    'boostersOpened',
    'recordStreak',
    'totalCardsDrawn',
    'wonCards',
    'lostCards',
    'lostMoneyCasino',
    'netCasinoGains',
    'uniqueCardsCount',
    'totalCardsCount',
    'legendaryCount',
    'ultraRareCount',
    'gifCount',
  ].includes(metricId);

  if (isMonotonic && points.length > 1) {
    let runningMax = 0;
    for (let i = 0; i < points.length; i++) {
      if (i === points.length - 1) {
        points[i].value = currentVal;
      } else {
        if (points[i].value < runningMax) {
          points[i].value = runningMax;
        } else {
          runningMax = Math.min(currentVal, points[i].value);
          points[i].value = runningMax;
        }
      }
    }
  }

  return points;
}
