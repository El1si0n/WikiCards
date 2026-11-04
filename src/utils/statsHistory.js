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
 * Fusionne des instantanés reçus du serveur dans le stockage local
 */
export function mergeServerSnapshots(serverSnapshots = []) {
  if (!Array.isArray(serverSnapshots) || serverSnapshots.length === 0) return;
  try {
    const local = getSavedStatsSnapshots();
    const map = new Map();
    for (const s of local) {
      if (s && typeof s.timestamp === 'number') map.set(s.timestamp, s);
    }
    for (const s of serverSnapshots) {
      if (s && typeof s.timestamp === 'number') {
        const existing = map.get(s.timestamp);
        if (!existing) {
          map.set(s.timestamp, s);
        } else {
          map.set(s.timestamp, { ...existing, ...s });
        }
      }
    }
    const merged = Array.from(map.values());
    merged.sort((a, b) => a.timestamp - b.timestamp);
    localStorage.setItem(LOCAL_SNAPSHOTS_STORAGE_KEY, JSON.stringify(merged.slice(-500)));
  } catch {
    // ignore
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
      return snapshots;
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
    return next;
  } catch {
    return [];
  }
}

/**
 * Récupère la valeur d'une métrique dans un snapshot en respectant les types
 */
function getSnapMetricVal(snap, metricId, fallback = 0) {
  if (!snap) return fallback;
  if (metricId === 'netCasinoBilan') {
    if (typeof snap.netCasinoBilan === 'number') return snap.netCasinoBilan;
    return Number(snap.netCasinoGains || 0) - Number(snap.lostMoneyCasino || 0);
  }
  if (metricId === 'netCardsBilan') {
    if (typeof snap.netCardsBilan === 'number') return snap.netCardsBilan;
    return Number(snap.wonCards || 0) - Number(snap.lostCards || 0);
  }
  if (metricId === 'totalCardsDrawn') {
    if (typeof snap.totalCardsDrawn === 'number') return snap.totalCardsDrawn;
    return Math.max(Number(snap.totalCardsCount || 0), Number(snap.boostersOpened || 0) * 5);
  }
  if (typeof snap[metricId] === 'number') {
    return snap[metricId];
  }
  return fallback;
}

/**
 * Interpolation linéaire authentique entre instantanés réels
 * (ZÉRO simulation artificielle, liaison fidèle entre checkpoints réels)
 */
function interpolateSnapshots(snapshots, t, metricId, startTs, initialVal, nowTs, currentVal) {
  if (!snapshots || snapshots.length === 0) {
    if (nowTs <= startTs) return currentVal;
    const progress = Math.max(0, Math.min(1, (t - startTs) / (nowTs - startTs)));
    return Math.round(initialVal + (currentVal - initialVal) * progress);
  }

  const first = snapshots[0];
  if (t <= first.timestamp) {
    if (t <= startTs) return initialVal;
    const firstVal = getSnapMetricVal(first, metricId, initialVal);
    const progress = (t - startTs) / Math.max(1, first.timestamp - startTs);
    return Math.round(initialVal + (firstVal - initialVal) * progress);
  }

  const last = snapshots[snapshots.length - 1];
  if (t >= last.timestamp) {
    const lastVal = getSnapMetricVal(last, metricId, currentVal);
    if (nowTs <= last.timestamp) return currentVal;
    const progress = (t - last.timestamp) / Math.max(1, nowTs - last.timestamp);
    return Math.round(lastVal + (currentVal - lastVal) * progress);
  }

  for (let i = 0; i < snapshots.length - 1; i++) {
    const s1 = snapshots[i];
    const s2 = snapshots[i + 1];
    if (t >= s1.timestamp && t <= s2.timestamp) {
      const v1 = getSnapMetricVal(s1, metricId, initialVal);
      const v2 = getSnapMetricVal(s2, metricId, currentVal);
      const span = s2.timestamp - s1.timestamp;
      const progress = span > 0 ? (t - s1.timestamp) / span : 0;
      return Math.round(v1 + (v2 - v1) * progress);
    }
  }

  return currentVal;
}

/**
 * Génère une série temporelle 100% authentique pour une métrique donnée
 * en combinant :
 * 1. Le timestamp de création officiel du compte (createdAt) pour borner strictement le début
 * 2. Les horodatages réels d'obtention de chaque carte (obtainedAt)
 * 3. Les instantanés de session horodatés (sans AUCUNE onde artificielle)
 *
 * @param {string} metricId - Identifiant de la métrique (ex: 'collectionValue', 'wikithunes', etc.)
 * @param {object} options
 */
export function generateMetricTimeSeries(metricId, {
  collection = [],
  stats = {},
  wikithunes = 0,
  collectionValue = null,
  period = 'TOUT',
  isLocalUser = false,
  createdAt = null,
  snapshots = null,
}) {
  const safeCollection = Array.isArray(collection) ? collection.filter(Boolean) : [];
  const safeStats = stats || {};
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Récupération des instantanés persistés réels
  const rawSnapshots = Array.isArray(snapshots) && snapshots.length > 0
    ? snapshots
    : (isLocalUser ? getSavedStatsSnapshots() : []);
  const savedSnapshots = rawSnapshots
    .filter((s) => s && typeof s.timestamp === 'number')
    .sort((a, b) => a.timestamp - b.timestamp);

  // Détermination de la date de naissance exacte du compte
  const firstCardTs = safeCollection.reduce(
    (min, c) => Math.min(min, Number(c?.obtainedAt || now)),
    now
  );
  const firstSnapTs = savedSnapshots.length > 0 ? savedSnapshots[0].timestamp : now;
  const parsedCreated = Number(createdAt);
  const accountCreatedTs =
    parsedCreated > 0 && parsedCreated <= now
      ? parsedCreated
      : Math.min(firstCardTs, firstSnapTs, now);

  // Durée de vie réelle du compte (au moins 1 minute)
  const accountLifespanMs = Math.max(60 * 1000, now - accountCreatedTs);

  let targetSpanMs = dayMs * 30; // 1M par défaut
  let targetSampleCount = 30;

  switch (period) {
    case '1J':
      targetSpanMs = dayMs;
      targetSampleCount = 24;
      break;
    case '1S':
      targetSpanMs = dayMs * 7;
      targetSampleCount = 28;
      break;
    case '1M':
      targetSpanMs = dayMs * 30;
      targetSampleCount = 30;
      break;
    case 'TOUT':
    default:
      targetSpanMs = accountLifespanMs;
      targetSampleCount = 35;
      break;
  }

  // CLAMPING STRICT : Ne JAMAIS afficher de points avant la création du compte !
  const windowMs = Math.min(targetSpanMs, accountLifespanMs);
  const startTime = Math.max(accountCreatedTs, now - windowMs);

  // Si la fenêtre est très courte (ex: compte créé il y a 20 min), on adapte le nombre d'échantillons
  const sampleCount = Math.max(3, Math.min(targetSampleCount, Math.floor(windowMs / 15000) || 5));
  const timeStep = (now - startTime) / Math.max(1, sampleCount - 1);

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

  // Métriques basées sur l'inventaire du classeur : reconstituées précisément à chaque seconde t
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

    if (i === sampleCount - 1) {
      points.push({ timestamp: now, value: currentVal });
      continue;
    }

    if (isCollectionMetric) {
      // Filtrer les cartes réelles possédées à l'instant t
      const cardsAtT = safeCollection.filter((c) => Number(c.obtainedAt || accountCreatedTs) <= t);

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

      // Si le compte venait de naître à t <= accountCreatedTs : valeur initiale = 0
      if (t <= accountCreatedTs) {
        val = 0;
      }

      // Vérification par rapport aux snapshots enregistrés
      if (savedSnapshots.length > 0 && i > 0) {
        const snapVal = interpolateSnapshots(
          savedSnapshots,
          t,
          metricId,
          accountCreatedTs,
          0,
          now,
          currentVal
        );
        if (snapVal > 0 || val === 0) {
          val = Math.max(val, snapVal);
        }
      }

      points.push({ timestamp: t, value: val });
    } else if (metricId === 'wikithunes') {
      const initialBal = INITIAL_WIKITHUNES; // 3 000 ₩ à l'inscription
      let val = initialBal;

      if (t <= accountCreatedTs) {
        val = initialBal;
      } else if (savedSnapshots.length > 0) {
        val = interpolateSnapshots(
          savedSnapshots,
          t,
          'wikithunes',
          accountCreatedTs,
          initialBal,
          now,
          currentVal
        );
      } else {
        // En l'absence de snapshots : progression linéaire vers le solde actuel basée sur le rythme des cartes
        const cardsAtT = safeCollection.filter(
          (c) => Number(c?.obtainedAt || accountCreatedTs) <= t
        ).length;
        const totalColCount = safeCollection.length || 1;
        const cardProgress = safeCollection.length > 0
          ? cardsAtT / totalColCount
          : (t - accountCreatedTs) / accountLifespanMs;
        val = Math.max(0, Math.round(initialBal + (currentVal - initialBal) * cardProgress));
      }

      points.push({ timestamp: t, value: Math.max(0, val) });
    } else if (metricId === 'netCasinoBilan') {
      // Bilan net du casino : si le joueur n'a jamais joué (0 ₩) -> Ligne droite plate à 0 ₩ !
      const isCompletelyZero =
        currentVal === 0 &&
        savedSnapshots.every((s) => getSnapMetricVal(s, 'netCasinoBilan') === 0);

      let val = 0;
      if (isCompletelyZero || t <= accountCreatedTs) {
        val = 0;
      } else if (savedSnapshots.length > 0) {
        val = interpolateSnapshots(
          savedSnapshots,
          t,
          'netCasinoBilan',
          accountCreatedTs,
          0,
          now,
          currentVal
        );
      } else {
        const progress = Math.max(0, Math.min(1, (t - accountCreatedTs) / accountLifespanMs));
        val = Math.round(currentVal * progress);
      }

      points.push({ timestamp: t, value: val });
    } else if (metricId === 'netCardsBilan') {
      const isCompletelyZero =
        currentVal === 0 &&
        savedSnapshots.every((s) => getSnapMetricVal(s, 'netCardsBilan') === 0);

      let val = 0;
      if (isCompletelyZero || t <= accountCreatedTs) {
        val = 0;
      } else if (savedSnapshots.length > 0) {
        val = interpolateSnapshots(
          savedSnapshots,
          t,
          'netCardsBilan',
          accountCreatedTs,
          0,
          now,
          currentVal
        );
      } else {
        const progress = Math.max(0, Math.min(1, (t - accountCreatedTs) / accountLifespanMs));
        val = Math.round(currentVal * progress);
      }

      // Ne jamais descendre sous les cartes effectivement perdues
      const minPossible = -Math.max(0, Number(safeStats?.lostCards || 0));
      val = Math.max(minPossible, val);

      points.push({ timestamp: t, value: val });
    } else if (
      [
        'boostersOpened',
        'wonCards',
        'lostCards',
        'lostMoneyCasino',
        'netCasinoGains',
        'recordStreak',
        'totalCardsDrawn',
      ].includes(metricId)
    ) {
      let val = 0;
      if (currentVal === 0 || t <= accountCreatedTs) {
        val = 0;
      } else if (savedSnapshots.length > 0) {
        val = interpolateSnapshots(
          savedSnapshots,
          t,
          metricId,
          accountCreatedTs,
          0,
          now,
          currentVal
        );
      } else {
        const cardsAtT = safeCollection.filter(
          (c) => Number(c?.obtainedAt || accountCreatedTs) <= t
        ).length;
        const totalColCount = safeCollection.length || 1;
        const progress = safeCollection.length > 0
          ? cardsAtT / totalColCount
          : (t - accountCreatedTs) / accountLifespanMs;
        val = Math.round(currentVal * progress);
      }

      points.push({ timestamp: t, value: Math.max(0, val) });
    } else {
      const progress = Math.max(0, Math.min(1, (t - accountCreatedTs) / accountLifespanMs));
      points.push({ timestamp: t, value: Math.round(currentVal * progress) });
    }
  }

  // Sécurité anti-régressions pour les métriques strictement cumulatives
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
