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
    return next;
  } catch {
    return [];
  }
}

/**
 * Fusionne les instantanés du serveur dans le stockage local
 */
export function mergeServerSnapshots(serverSnapshots = []) {
  if (!Array.isArray(serverSnapshots) || serverSnapshots.length === 0) return [];
  try {
    const local = getSavedStatsSnapshots();
    const byTs = new Map();
    for (const s of local) {
      if (s && typeof s.timestamp === 'number') byTs.set(s.timestamp, s);
    }
    for (const s of serverSnapshots) {
      if (s && typeof s.timestamp === 'number') {
        if (!byTs.has(s.timestamp)) {
          byTs.set(s.timestamp, s);
        }
      }
    }
    const merged = Array.from(byTs.values());
    merged.sort((a, b) => a.timestamp - b.timestamp);
    const trimmed = merged.slice(-500);
    localStorage.setItem(LOCAL_SNAPSHOTS_STORAGE_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return [];
  }
}

/**
 * Génère une série temporelle 100% factuelle et réelle pour une métrique donnée.
 * RÈGLES STRICTES :
 * 1. Zéro point avant la date de création du compte (createdAt).
 * 2. Zéro donnée inventée ni fluctuation artificielle (aucun pic ou creux aléatoire).
 * 3. Si aucune activité n'a eu lieu sur la métrique, tracé d'une ligne neutre à 0 (ou valeur initiale).
 * 4. Reconstitution exacte pour le classeur via obtainedAt de chaque carte.
 * 5. Reconstitution fidèle entre instantanés réels (snapshots) sans vagues inventées.
 *
 * @param {string} metricId - Identifiant de la métrique (ex: 'collectionValue', 'wikithunes', etc.)
 * @param {Array} collection - Liste des cartes possédées avec obtainedAt
 * @param {object} stats - Statistiques de jeu (boosters, casino, etc.)
 * @param {number} wikithunes - Solde actuel
 * @param {string} period - '1J' | '1S' | '1M' | 'TOUT'
 * @param {boolean} isLocalUser - Profil du joueur local ou d'un ami
 * @param {number|null} createdAt - Timestamp de création officiel du compte
 * @param {Array|null} snapshots - Liste d'instantanés réels (pour joueur distant)
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

  // Récupère les instantanés (soit fournis directement pour un ami, soit stockés localement)
  const savedSnapshots = Array.isArray(snapshots) && snapshots.length > 0
    ? snapshots.filter((s) => s && typeof s.timestamp === 'number').sort((a, b) => a.timestamp - b.timestamp)
    : (isLocalUser ? getSavedStatsSnapshots() : []);

  // 1. Détermination rigoureuse de la date de création du compte (borne absolue infranchissable)
  const minCardTs = safeCollection.reduce(
    (min, c) => Math.min(min, Number(c?.obtainedAt || now)),
    savedSnapshots.length > 0 ? savedSnapshots[0].timestamp : now
  );
  const validCreatedAt =
    typeof createdAt === 'number' && createdAt > 0 && createdAt <= now
      ? createdAt
      : (minCardTs < now ? minCardTs : now);

  const accountAgeMs = Math.max(60 * 1000, now - validCreatedAt);

  let requestedWindowMs = dayMs * 30; // 1M par défaut
  let sampleCount = 30;

  switch (period) {
    case '1J':
      requestedWindowMs = dayMs;
      sampleCount = 24;
      break;
    case '1S':
      requestedWindowMs = dayMs * 7;
      sampleCount = 28;
      break;
    case '1M':
      requestedWindowMs = dayMs * 30;
      sampleCount = 30;
      break;
    case 'TOUT':
    default:
      requestedWindowMs = accountAgeMs;
      sampleCount = 35;
      break;
  }

  // RÈGLE D'OR : La fenêtre temporelle ne doit JAMAIS remonter avant la création du compte !
  const windowMs = Math.min(requestedWindowMs, accountAgeMs);
  const startTime = Math.max(validCreatedAt, now - windowMs);

  // Adapte la résolution temporelle si le compte est tout jeune
  if (windowMs < 15 * 60 * 1000) {
    sampleCount = Math.max(2, Math.min(15, Math.floor(windowMs / 15000) + 2));
  }

  const timeStep = sampleCount > 1 ? (now - startTime) / (sampleCount - 1) : 0;

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

  // État initial à t = validCreatedAt (moment précis de l'inscription)
  const getInitialBaseline = () => {
    switch (metricId) {
      case 'wikithunes':
        return INITIAL_WIKITHUNES; // 3 000 ₩ à l'inscription
      case 'collectionValue':
      case 'uniqueCardsCount':
      case 'totalCardsCount':
      case 'legendaryCount':
      case 'ultraRareCount':
      case 'gifCount':
      case 'boostersOpened':
      case 'lostMoneyCasino':
      case 'netCasinoGains':
      case 'netCasinoBilan':
      case 'recordStreak':
      case 'netCardsBilan':
      case 'lostCards':
      case 'wonCards':
      case 'totalCardsDrawn':
      default:
        return 0;
    }
  };

  const initialVal = getInitialBaseline();

  const isCollectionMetric = [
    'collectionValue',
    'uniqueCardsCount',
    'totalCardsCount',
    'legendaryCount',
    'ultraRareCount',
    'gifCount',
  ].includes(metricId);

  // Construction des checkpoints réels pour les métriques de statistiques
  const checkpoints = [];

  // Checkpoint 0 : à la création
  checkpoints.push({ timestamp: validCreatedAt, value: initialVal });

  // Checkpoints intermédiaires : instantanés réels
  for (const s of savedSnapshots) {
    if (!s || typeof s.timestamp !== 'number') continue;
    if (s.timestamp <= validCreatedAt || s.timestamp >= now) continue;

    let snapVal = null;
    if (metricId === 'netCasinoBilan') {
      snapVal = typeof s.netCasinoBilan === 'number'
        ? s.netCasinoBilan
        : Number(s.netCasinoGains || 0) - Number(s.lostMoneyCasino || 0);
    } else if (metricId === 'netCardsBilan') {
      snapVal = typeof s.netCardsBilan === 'number'
        ? s.netCardsBilan
        : Number(s.wonCards || 0) - Number(s.lostCards || 0);
    } else if (metricId === 'totalCardsDrawn') {
      snapVal = typeof s.totalCardsDrawn === 'number'
        ? s.totalCardsDrawn
        : Math.max(Number(s.totalCardsCount || 0), Number(s.boostersOpened || 0) * 5);
    } else if (typeof s[metricId] === 'number') {
      snapVal = s[metricId];
    }

    if (typeof snapVal === 'number') {
      checkpoints.push({ timestamp: s.timestamp, value: snapVal });
    }
  }

  // Checkpoint final : état actuel
  checkpoints.push({ timestamp: now, value: currentVal });
  checkpoints.sort((a, b) => a.timestamp - b.timestamp);

  const points = [];

  for (let i = 0; i < sampleCount; i++) {
    const t = i === sampleCount - 1 ? now : startTime + i * timeStep;

    if (isCollectionMetric) {
      // 100% FACTUEL : cartes obtenues à ou avant cet instant t
      const cardsAtT = safeCollection.filter((c) => Number(c?.obtainedAt || validCreatedAt) <= t);

      let val = 0;
      switch (metricId) {
        case 'collectionValue':
          val = cardsAtT.reduce(
            (sum, c) => sum + (c ? getCardRecycleValue(c) * (c.count || 1) : 0),
            0
          );
          break;
        case 'uniqueCardsCount':
          val = cardsAtT.length;
          break;
        case 'totalCardsCount':
          val = cardsAtT.reduce((sum, c) => sum + (c?.count || 1), 0);
          break;
        case 'legendaryCount':
          val = cardsAtT.filter((c) => c?.rarity === 'L').length;
          break;
        case 'ultraRareCount':
          val = cardsAtT.filter((c) => c?.rarity === 'UR').length;
          break;
        case 'gifCount':
          val = cardsAtT.filter((c) =>
            Boolean(c?.isShiny || c?.isGif || /\.gif(\?|$|\/)/i.test(c?.image || ''))
          ).length;
          break;
        default:
          val = 0;
      }

      // Si un instantané réel était disponible pour ce point précis, on s'assure de la cohérence
      if (savedSnapshots.length > 0 && i > 0 && i < sampleCount - 1) {
        let closestSnap = null;
        let minDiff = Infinity;
        for (const s of savedSnapshots) {
          const diff = Math.abs(s.timestamp - t);
          if (diff <= timeStep && diff < minDiff) {
            minDiff = diff;
            closestSnap = s;
          }
        }
        if (closestSnap && typeof closestSnap[metricId] === 'number') {
          if (closestSnap[metricId] > 0 || val === 0) {
            val = closestSnap[metricId];
          }
        }
      }

      points.push({
        timestamp: t,
        value: i === sampleCount - 1 ? currentVal : Math.max(0, val),
      });
    } else {
      // Métriques de solde, boosters, casino :
      // Cas 1 : Métrique sans aucune activité (ex: casino jamais joué, solde 0) -> Ligne plate neutre à 0
      if (initialVal === 0 && currentVal === 0 && checkpoints.every((c) => c.value === 0)) {
        points.push({
          timestamp: t,
          value: 0,
        });
        continue;
      }

      // Cas 2 : Interpolation factuelle entre les vrais checkpoints connus (SANS AUCUN MATH.SIN)
      let before = checkpoints[0];
      let after = checkpoints[checkpoints.length - 1];

      for (let cIdx = 0; cIdx < checkpoints.length; cIdx++) {
        if (checkpoints[cIdx].timestamp <= t) {
          before = checkpoints[cIdx];
        }
        if (checkpoints[cIdx].timestamp >= t) {
          after = checkpoints[cIdx];
          break;
        }
      }

      let val = before.value;
      if (after.timestamp > before.timestamp && before.value !== after.value) {
        const ratio = (t - before.timestamp) / (after.timestamp - before.timestamp);
        val = Math.round(before.value + (after.value - before.value) * ratio);
      }

      // Protection supplémentaire pour les métriques cumulatives (jamais négatives)
      if (['boostersOpened', 'totalCardsDrawn', 'wonCards', 'lostCards', 'recordStreak'].includes(metricId)) {
        val = Math.max(0, val);
      }

      points.push({
        timestamp: t,
        value: i === sampleCount - 1 ? currentVal : val,
      });
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
