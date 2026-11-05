import { getCardRecycleValue, INITIAL_WIKITHUNES } from '../config/rarities';

const LOCAL_SNAPSHOTS_STORAGE_KEY = 'wikicards_stats_timeline_v1';

/**
 * Retourne la clé de stockage des instantanés, optionnellement cloisonnée par utilisateur
 */
export function getSnapshotStorageKey(userCode = null) {
  if (userCode && typeof userCode === 'string') {
    const clean = userCode.trim().toUpperCase();
    if (clean.length > 0) {
      return `wikicards_stats_timeline_${clean}`;
    }
  }
  return LOCAL_SNAPSHOTS_STORAGE_KEY;
}

/**
 * Récupère les instantanés persistés localement (cloisonnés par utilisateur pour éviter les contaminations)
 */
export function getSavedStatsSnapshots(userCode = null) {
  try {
    const scopedKey = getSnapshotStorageKey(userCode);
    let raw = localStorage.getItem(scopedKey);

    // Rétrocompatibilité : si aucune donnée cloisonnée, lecture du stockage global
    if (!raw && scopedKey !== LOCAL_SNAPSHOTS_STORAGE_KEY) {
      raw = localStorage.getItem(LOCAL_SNAPSHOTS_STORAGE_KEY);
    }

    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filtre les éléments valides et trie par chronologie croissante
    let valid = parsed.filter((s) => s && typeof s.timestamp === 'number');

    // Si un code utilisateur est fourni, exclut les instantanés explicitement étiquetés d'un autre joueur
    if (userCode && typeof userCode === 'string') {
      const cleanCode = userCode.trim().toUpperCase();
      valid = valid.filter((s) => !s.userCode || s.userCode === cleanCode);
    }

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

      // Assainissement des bilans nets : ils ne peuvent pas excéder leurs gains respectifs
      const gCasino = Math.max(0, Number(s.netCasinoGains || 0));
      const lCasino = Math.max(0, Number(s.lostMoneyCasino || 0));
      if (typeof s.netCasinoBilan === 'number') {
        s.netCasinoBilan = Math.max(-lCasino, Math.min(gCasino, s.netCasinoBilan));
      } else {
        s.netCasinoBilan = gCasino - lCasino;
      }

      const wCards = Math.max(0, Number(s.wonCards || 0));
      const lCards = Math.max(0, Number(s.lostCards || 0));
      if (typeof s.netCardsBilan === 'number') {
        s.netCardsBilan = Math.max(-lCards, Math.min(wCards, s.netCardsBilan));
      } else {
        s.netCardsBilan = wCards - lCards;
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
    const userCode = data.userCode ? String(data.userCode).trim().toUpperCase() : null;
    const snapshots = getSavedStatsSnapshots(userCode);
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

    // Si data.stats est explicitement fourni, on respecte fidèlement les valeurs réelles du compte actuel
    const hasExplicitStats = Boolean(data.stats && typeof data.stats === 'object');

    const boostersOpened = hasExplicitStats
      ? Number(data.stats.boostersOpened || 0)
      : Number(last?.boostersOpened || 0);
    const recordStreak = hasExplicitStats
      ? Number(data.stats.recordStreak || 0)
      : Number(last?.recordStreak || 0);
    const lostMoneyCasino = hasExplicitStats
      ? Number(data.stats.lostMoneyCasino || 0)
      : Number(last?.lostMoneyCasino || 0);
    const netCasinoGains = hasExplicitStats
      ? Number(data.stats.netCasinoGains || 0)
      : Number(last?.netCasinoGains || 0);
    const lostCards = hasExplicitStats
      ? Number(data.stats.lostCards || 0)
      : Number(last?.lostCards || 0);
    const wonCards = hasExplicitStats
      ? Number(data.stats.wonCards || 0)
      : Number(last?.wonCards || 0);
    const totalCardsDrawn = hasExplicitStats
      ? Math.max(
          Number(data.stats.totalCardsDrawn || 0),
          boostersOpened * 6,
          Number(data.totalCardsCount || 0)
        )
      : Number(last?.totalCardsDrawn || 0);

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
      last.gifCount === gifCount &&
      last.netCasinoBilan === (netCasinoGains - lostMoneyCasino) &&
      last.netCardsBilan === (wonCards - lostCards)
    ) {
      return;
    }

    const snap = {
      timestamp: now,
      userCode: userCode || undefined,
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
    const storageKey = getSnapshotStorageKey(userCode);
    localStorage.setItem(storageKey, JSON.stringify(next));
    if (storageKey !== LOCAL_SNAPSHOTS_STORAGE_KEY) {
      localStorage.setItem(LOCAL_SNAPSHOTS_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // ignore storage limit
  }
}

/**
 * Assure le bornage mathématique strict d'une métrique pour éviter toute valeur absurde ou fictive
 */
function clampMetricValue(metricId, val, safeStats, currentVal) {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  switch (metricId) {
    case 'netCasinoBilan': {
      const maxGains = Math.max(0, Number(safeStats?.netCasinoGains || 0));
      const maxLosses = Math.max(0, Number(safeStats?.lostMoneyCasino || 0));
      if (maxGains === 0 && maxLosses === 0) return 0;
      return Math.max(-maxLosses, Math.min(maxGains, val));
    }
    case 'netCardsBilan': {
      const maxWon = Math.max(0, Number(safeStats?.wonCards || 0));
      const maxLost = Math.max(0, Number(safeStats?.lostCards || 0));
      if (maxWon === 0 && maxLost === 0) return 0;
      return Math.max(-maxLost, Math.min(maxWon, val));
    }
    case 'lostMoneyCasino':
      return Math.max(0, Math.min(Number(safeStats?.lostMoneyCasino || 0), val));
    case 'netCasinoGains':
      return Math.max(0, Math.min(Number(safeStats?.netCasinoGains || 0), val));
    case 'wonCards':
      return Math.max(0, Math.min(Number(safeStats?.wonCards || 0), val));
    case 'lostCards':
      return Math.max(0, Math.min(Number(safeStats?.lostCards || 0), val));
    case 'recordStreak':
      return Math.max(0, Math.min(Number(safeStats?.recordStreak || 0), val));
    case 'boostersOpened':
      return Math.max(0, Math.min(Number(safeStats?.boostersOpened || 0), val));
    case 'totalCardsDrawn':
      return Math.max(0, Math.min(currentVal, val));
    default:
      return val;
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
 * @param {boolean} isLocalUser - Indique s'il s'agit du joueur actif sur cet appareil
 * @param {number|null} createdAt - Horodatage de création du compte (timestamp ms)
 * @param {Array|undefined} snapshots - Liste d'instantanés réels (ex: envoyés par le serveur ou un pair)
 * @param {string|null} userCode - Code d'identification unique du compte
 */
export function generateMetricTimeSeries(metricId, {
  collection = [],
  stats = {},
  wikithunes = 0,
  collectionValue = null,
  period = 'TOUT',
  isLocalUser = false,
  createdAt = null,
  snapshots = undefined,
  userCode = null,
}) {
  const safeCollection = Array.isArray(collection) ? collection.filter(Boolean) : [];
  const safeStats = stats || {};
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Trouve la date de la première carte obtenue (moment où le joueur a commencé à jouer)
  const collectionCardDates = safeCollection
    .map((c) => Number(c?.obtainedAt || 0))
    .filter((ts) => ts > 0 && ts <= now);
  const minCardTs = collectionCardDates.length > 0
    ? Math.min(...collectionCardDates)
    : null;

  const parsedCreatedAt = Number(
    createdAt || safeStats?.accountCreatedAt || safeStats?.createdAt || 0
  );

  // Le début officiel du compte est la date de création ou de la 1ère carte
  let accountStartTs = now;
  if (parsedCreatedAt > 0 && parsedCreatedAt <= now) {
    accountStartTs = parsedCreatedAt;
  }
  if (minCardTs && minCardTs < accountStartTs) {
    accountStartTs = minCardTs;
  }

  // Âge réel du compte (au moins 1 minute pour le calcul de pas)
  const realAccountAgeMs = Math.max(60 * 1000, now - accountStartTs);

  let targetWindowMs = dayMs * 30; // 1M par défaut
  let sampleCount = 30;

  switch (period) {
    case '1J':
      targetWindowMs = dayMs;
      sampleCount = 24; // 1 point par heure
      break;
    case '1S':
      targetWindowMs = dayMs * 7;
      sampleCount = 28;
      break;
    case '1M':
      targetWindowMs = dayMs * 30;
      sampleCount = 30;
      break;
    case 'TOUT':
    default:
      targetWindowMs = realAccountAgeMs + 60 * 1000;
      sampleCount = 35;
      break;
  }

  // Si le compte est plus récent que la fenêtre cible (ex: créé il y a 2h mais on consulte '1M', '1S' ou '1J') :
  // La série débute exactement au début du compte (avec 1 min de marge pour capter l'état initial),
  // sans jamais reculer dans le temps avant la création de l'utilisateur.
  const windowMs = Math.min(targetWindowMs, realAccountAgeMs + 60 * 1000);
  const startTime = now - windowMs;
  const timeStep = windowMs / Math.max(1, sampleCount - 1);

  const rawSnapshots = Array.isArray(snapshots) && snapshots.length > 0
    ? snapshots
    : isLocalUser
    ? getSavedStatsSnapshots(userCode)
    : [];
  // On ne garde que les snapshots valides postérieurs au début du compte
  const savedSnapshots = rawSnapshots.filter(
    (s) => s && typeof s.timestamp === 'number' && s.timestamp >= accountStartTs - 60 * 1000
  );

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
          Number(safeStats?.boostersOpened || 0) * 6,
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
    const isBeforeAccount = t < accountStartTs;

    if (isCollectionMetric) {
      if (isBeforeAccount) {
        points.push({
          timestamp: t,
          value: 0,
        });
        continue;
      }

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

      const finalVal = i === sampleCount - 1 ? currentVal : val;
      points.push({
        timestamp: t,
        value: Math.max(0, Math.min(currentVal, finalVal)),
      });
    } else {
      // Pour les métriques de statistiques (solde, boosters, casino) :
      const ratio = i / (sampleCount - 1);
      let simulatedVal = 0;

      if (isBeforeAccount) {
        // Avant l'existence du compte : strictement 0 (ou solde de bienvenue à l'ouverture)
        simulatedVal = metricId === 'wikithunes' ? INITIAL_WIKITHUNES : 0;
      } else if (metricId === 'wikithunes') {
        const isAccountStartInWindow = startTime <= accountStartTs;

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

            // Décroissance naturelle de 3 000 ₩ vers le solde actuel au fur et à mesure des achats (sans oscillations artificielles)
            const baseEst = initialBal + (currentVal - initialBal) * Math.pow(cardProgress, 0.9);
            simulatedVal = Math.max(0, Math.round(baseEst));
          }
        } else {
          // Fenêtre plus courte (ex: 1J alors que le compte est plus ancien) :
          const cardsInWindow = safeCollection.filter(
            (c) => Number(c?.obtainedAt || 0) >= startTime && Number(c?.obtainedAt || 0) <= now
          ).length;
          const estimatedCostInWindow = Math.round((cardsInWindow / 6) * 200);
          const startBal = Math.max(0, currentVal + estimatedCostInWindow);

          const cardsSinceStart = safeCollection.filter(
            (c) => Number(c?.obtainedAt || 0) >= startTime && Number(c?.obtainedAt || 0) <= t
          ).length;
          const windowRatio = cardsInWindow > 0 ? cardsSinceStart / cardsInWindow : ratio;
          const baseEst = startBal + (currentVal - startBal) * windowRatio;
          simulatedVal = Math.max(0, Math.round(baseEst));
        }
      } else if (metricId === 'netCasinoBilan') {
        // Courbe P&L boursière du casino :
        if (i === 0 && startTime <= accountStartTs) {
          simulatedVal = 0;
        } else if (i === sampleCount - 1) {
          simulatedVal = currentVal;
        } else if (
          currentVal === 0 &&
          Number(safeStats?.lostMoneyCasino || 0) === 0 &&
          Number(safeStats?.netCasinoGains || 0) === 0
        ) {
          // Si le joueur n'a jamais joué au casino : solde strictement plat à 0 ₩
          simulatedVal = 0;
        } else {
          // Reconstitution basée sur le rythme d'activité du compte, sans faux pics/creux synthétiques
          const cardsAtT = safeCollection.filter((c) => Number(c?.obtainedAt || 0) <= t);
          const totalColCount = safeCollection.length || 1;
          const cardProgress = safeCollection.length > 0 ? cardsAtT.length / totalColCount : ratio;
          simulatedVal = Math.round(currentVal * Math.pow(cardProgress, 1.05));
        }
      } else if (metricId === 'netCardsBilan') {
        if (i === 0 && startTime <= accountStartTs) {
          simulatedVal = 0;
        } else if (i === sampleCount - 1) {
          simulatedVal = currentVal;
        } else if (
          currentVal === 0 &&
          Number(safeStats?.wonCards || 0) === 0 &&
          Number(safeStats?.lostCards || 0) === 0
        ) {
          simulatedVal = 0;
        } else {
          const cardsAtT = safeCollection.filter((c) => Number(c?.obtainedAt || 0) <= t);
          const totalColCount = safeCollection.length || 1;
          const cardProgress = safeCollection.length > 0 ? cardsAtT.length / totalColCount : ratio;
          simulatedVal = Math.round(currentVal * Math.pow(cardProgress, 1.05));
        }
      } else if (metricId === 'totalCardsDrawn') {
        if (i === 0 && startTime <= accountStartTs) {
          simulatedVal = Math.min(currentVal, safeCollection.length > 0 ? 5 : 0);
        } else if (i === sampleCount - 1) {
          simulatedVal = currentVal;
        } else {
          const cardsAtT = safeCollection.filter((c) => Number(c?.obtainedAt || 0) <= t);
          const totalColCount = safeCollection.length || 1;
          const cardProgress = safeCollection.length > 0 ? cardsAtT.length / totalColCount : ratio;
          simulatedVal = Math.min(currentVal, Math.floor(currentVal * Math.pow(cardProgress, 1.0)));
        }
      } else if (metricId === 'recordStreak') {
        if (i === 0 && startTime <= accountStartTs) {
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
        if (i === 0 && startTime <= accountStartTs) {
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
                : Math.max(Number(closestSnap.totalCardsCount || 0), Number(closestSnap.boostersOpened || 0) * 6);
            simulatedVal = snapVal;
          } else if (typeof closestSnap[metricId] === 'number') {
            simulatedVal = closestSnap[metricId];
          }
        }
      }

      const finalVal = i === sampleCount - 1 ? currentVal : simulatedVal;
      points.push({
        timestamp: t,
        value: clampMetricValue(metricId, finalVal, safeStats, currentVal),
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
