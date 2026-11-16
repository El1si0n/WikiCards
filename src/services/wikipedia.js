/**
 * @file Rôle : Client d'interrogation de l'API Wikipédia FR, Wikimedia Pageviews et génération de cartes.
 * Dépendances : `../config/rarities`, `../config/themes`, `../utils/cardText`, API REST Wikipédia, API Wikimedia Pageviews.
 * Effets de bord : Requêtes réseau HTTP externes vers Wikipédia / Wikimedia et appels proxy locaux.
 */

/**
 * @typedef {Object} WikiCard
 * @property {string} id - Identifiant unique préfixé (ex: "wiki-12345")
 * @property {number} [pageid] - Identifiant officiel d'article Wikipédia
 * @property {string} title - Titre de l'article encyclopédique
 * @property {string} description - Description courte officielle
 * @property {string} extract - Résumé textuel d'introduction
 * @property {string|null} image - URL de l'illustration
 * @property {boolean} [imageContain] - Affichage avec ajustement de ratio
 * @property {boolean} isGif - Image animée .gif
 * @property {boolean} isShiny - Carte holographique / GIF Métal
 * @property {number} views - Vues réelles des 30 derniers jours
 * @property {'C'|'PC'|'R'|'SR'|'UR'|'L'} rarity - Rareté calculée
 * @property {string} url - URL de la page officielle sur fr.wikipedia.org
 * @property {string} theme - Identifiant du thème thématique
 * @property {number} [count] - Nombre d'exemplaires dans le classeur
 * @property {number} [obtainedAt] - Timestamp ms d'obtention
 */

/**
 * @typedef {Object} BoosterPackOptions
 * @property {boolean} [isIconic=false] - Garantit au moins 1 Légendaire et le reste en Ultra Rare
 */

import { getRarityByViews, getRarityByCode } from '../config/rarities';
import { detectCardTheme } from '../config/themes';
import { cleanWikiText, cleanCardTitle, fitSummaryToCard } from '../utils/cardText';

const WIKI_API_BASE = 'https://fr.wikipedia.org/w/api.php';
const WIKI_REST_SUMMARY = 'https://fr.wikipedia.org/api/rest_v1/page/summary';
const WIKIMEDIA_PAGEVIEWS =
  'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/user';

/**
 * Enveloppe fetch avec un timeout strict pour éviter que les appels Wikipédia ne bloquent
 */
function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

// Pages Wikipédia FR réelles illustrées par un vrai fichier .gif animé sur Wikimedia Commons
export const WIKI_GIF_ARTICLES = [
  'Jeu de la vie',
  'Tesseract',
  'Pendule de Newton',
  'Croix de Malte (mécanisme)',
  'Triangle de Reuleaux',
  'Onde stationnaire',
  'Attracteur de Lorenz',
  'Hypersphère',
  'Bouteille de Klein',
  'Cycloïde',
  'Épicycloïde',
  'Effet Doppler',
  'Nœud de trèfle',
  'Pulsar',
  'Courbe de Péano',
];

/**
 * Formate une plage de 30 jours consolidés pour l'API Wikimedia Pageviews (YYYYMMDD00).
 */
function getPageviewsDateRange() {
  const now = new Date();
  const safeEnd = new Date(
    Math.min(now.getTime(), new Date('2025-02-15T00:00:00Z').getTime())
  );
  safeEnd.setDate(safeEnd.getDate() - 2);

  const safeStart = new Date(safeEnd);
  safeStart.setDate(safeStart.getDate() - 30);

  const fmt = (d) => {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}00`;
  };

  return { start: fmt(safeStart), end: fmt(safeEnd) };
}

/**
 * Récupère le nombre réel de visiteurs sur 30 jours via l'API officielle Wikimedia Pageviews.
 * @param {string} title - Titre de l'article Wikipédia
 * @returns {Promise<number>} Somme cumulée des vues
 */
export async function fetchPageViews30Days(title) {
  try {
    const normalizedTitle = title.trim().replace(/ /g, '_');
    const { start, end } = getPageviewsDateRange();

    // 1. Essai via le proxy backend avec cache mémoire (évite les 404 dans la console et le double-timeout)
    try {
      const proxyRes = await fetchWithTimeout(
        `/api/pageviews?title=${encodeURIComponent(normalizedTitle)}&start=${start}&end=${end}`,
        {},
        2300
      );
      if (proxyRes.ok) {
        const json = await proxyRes.json();
        if (typeof json?.views === 'number') {
          return json.views;
        }
      }
      // Si le proxy local a répondu (même hors 200), inutile de relancer un second appel lent
      if (proxyRes.status !== 404) {
        return 0;
      }
    } catch (err) {
      // Si la requête a expiré par timeout (AbortError), ne pas doubler l'attente
      if (err?.name === 'AbortError') {
        return 0;
      }
    }

    // 2. Requête directe Wikimedia Pageviews (uniquement si /api/pageviews n'existe pas en mode statique)
    const url = `${WIKIMEDIA_PAGEVIEWS}/${encodeURIComponent(
      normalizedTitle
    )}/daily/${start}/${end}`;

    const res = await fetchWithTimeout(url, {}, 2300);
    if (!res.ok) return 0;

    const data = await res.json();
    if (!data?.items || !Array.isArray(data.items)) return 0;

    return data.items.reduce((sum, item) => sum + (item.views || 0), 0);
  } catch {
    return 0;
  }
}

/**
 * Récupère en une seule requête HTTP (`POST /api/pageviews/batch`) les vues mensuelles de plusieurs articles.
 * Réduit la latence réseau des boosters de 6 allers-retours à 1 seul appel.
 *
 * @param {string[]} titles - Titres d'articles Wikipédia
 * @returns {Promise<Record<string, number>>} Dictionnaire `{ [title]: views }`
 */
export async function fetchPageViewsBatch(titles = []) {
  const cleanTitles = Array.from(
    new Set(titles.map((t) => String(t || '').trim()).filter(Boolean))
  );
  if (cleanTitles.length === 0) return {};

  const { start, end } = getPageviewsDateRange();

  try {
    const proxyRes = await fetchWithTimeout(
      '/api/pageviews/batch',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titles: cleanTitles, start, end }),
      },
      3500
    );
    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (json?.ok && json.viewsByTitle && typeof json.viewsByTitle === 'object') {
        return json.viewsByTitle;
      }
    }
  } catch {
    // Repli individuel ci-dessous si l'endpoint batch n'est pas joignable
  }

  const fallbackEntries = await Promise.all(
    cleanTitles.map(async (title) => [title, await fetchPageViews30Days(title)])
  );
  return Object.fromEntries(fallbackEntries);
}

/**
 * Vérifie si l'URL d'image Wikipédia correspond à un fichier .gif animé.
 * @param {string} [url=''] - URL de l'illustration
 * @returns {boolean} Vrai si l'extension est .gif
 */
export function isGifImageUrl(url = '') {
  if (!url) return false;
  return /\.gif(\?|$|\/)/i.test(url);
}

/**
 * Récupère une carte complète à partir du titre d'une page Wikipédia FR.
 * (Résumé officiel + Image miniature ou .gif animé + Vues réelles sur 30 jours + Rareté + Thème + détection GIF)
 * @param {string} title - Titre de l'article
 * @returns {Promise<WikiCard>} Carte instanciée
 */
export async function fetchWikiCardByTitle(title) {
  const cleanTitle = title.trim();
  const encoded = encodeURIComponent(cleanTitle.replace(/ /g, '_'));
  const [summaryRes, views] = await Promise.all([
    fetchWithTimeout(`${WIKI_REST_SUMMARY}/${encoded}`, {}, 4000),
    fetchPageViews30Days(cleanTitle),
  ]);

  if (!summaryRes.ok) {
    throw new Error(`Impossible de charger la page Wikipédia "${cleanTitle}"`);
  }

  const summary = await summaryRes.json();

  if (summary.type === 'disambiguation') {
    throw new Error('Page d’homonymie');
  }

  const tier = getRarityByViews(views);
  const originalUrl = summary.originalimage?.source || '';
  const thumbUrl = summary.thumbnail?.source || '';
  const isGif = isGifImageUrl(originalUrl) || isGifImageUrl(thumbUrl);

  // Si c'est un .gif, on privilégie l'originalimage pour conserver l'animation .gif fluide ;
  // sinon on utilise exclusivement la miniature (thumbnail) optimisée pour l'affichage web.
  const finalImage = isGif
    ? originalUrl || thumbUrl
    : thumbUrl || null;

  const sanitizedTitle = cleanCardTitle(summary.title || cleanTitle);
  const baseCard = {
    id: `wiki-${summary.pageid || summary.title}`,
    pageid: summary.pageid,
    title: sanitizedTitle,
    description: cleanWikiText(summary.description || ''),
    extract: fitSummaryToCard(summary.extract || '', 400),
    image: finalImage,
    imageContain: summary.title === 'Wikipédia',
    isGif,
    isShiny: isGif,
    views,
    rarity: tier.code,
    url:
      summary.content_urls?.desktop?.page ||
      `https://fr.wikipedia.org/wiki/${encoded}`,
  };

  return {
    ...baseCard,
    theme: detectCardTheme(baseCard),
  };
}

/**
 * Récupère une carte Wikipédia garantie avec une illustration .gif animé.
 * @returns {Promise<WikiCard|null>}
 */
export async function fetchRandomGifWikiCard() {
  const shuffled = [...WIKI_GIF_ARTICLES].sort(() => Math.random() - 0.5);
  for (const title of shuffled) {
    try {
      const card = await fetchWikiCardByTitle(title);
      if (card && card.extract && card.extract.length >= 40) {
        return {
          ...card,
          isGif: true,
          isShiny: true,
        };
      }
    } catch {
      // Essaie le suivant
    }
  }
  return null;
}

/**
 * Récupère en une seule requête MediaWiki un lot d'articles encyclopédiques aléatoires
 * incluant déjà leur extrait, description courte, image et URL officielle.
 * Permet d'accélérer drastiquement l'ouverture des boosters en évitant 16 requêtes REST unitaires.
 *
 * @param {number} [limit=16] - Nombre de pages aléatoires à demander
 * @returns {Promise<Array<Omit<WikiCard, 'views' | 'rarity'>>>} Cartes pré-assemblées (sans les vues)
 */
async function fetchRandomWikiCandidatesBatch(limit = 16) {
  try {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'random',
      grnnamespace: '0',
      grnfilterredir: 'nonredirects',
      grnlimit: String(limit),
      prop: 'extracts|pageimages|description|info|pageprops',
      exintro: '1',
      explaintext: '1',
      exLimit: 'max',
      piprop: 'original|thumbnail',
      pithumbsize: '330',
      inprop: 'url',
      origin: '*',
    });

    const res = await fetchWithTimeout(
      `${WIKI_API_BASE}?${params.toString()}`,
      {},
      3500
    );
    if (!res.ok) return [];
    const data = await res.json();
    const pagesObj = data?.query?.pages;
    if (!pagesObj || typeof pagesObj !== 'object') return [];

    const candidates = [];
    for (const page of Object.values(pagesObj)) {
      if (!page || !page.title) continue;
      // Exclure les pages d'homonymie
      if (page.pageprops && 'disambiguation' in page.pageprops) continue;
      const rawExtract = String(page.extract || '').trim();
      if (rawExtract.length < 50) continue;

      const originalUrl = page.original?.source || '';
      const thumbUrl = page.thumbnail?.source || '';
      const isGif = isGifImageUrl(originalUrl) || isGifImageUrl(thumbUrl);
      // Utilise systématiquement la miniature redimensionnée (420px) hors fichiers .gif animés :
      // évite de télécharger des fichiers originaux de 5 à 20 Mo ou des TIFF/SVG non supportés par <img>.
      const finalImage = isGif
        ? originalUrl || thumbUrl
        : thumbUrl || null;

      const sanitizedTitle = cleanCardTitle(page.title);
      const encoded = encodeURIComponent(page.title.trim().replace(/ /g, '_'));
      const baseCard = {
        id: `wiki-${page.pageid || page.title}`,
        pageid: page.pageid,
        title: sanitizedTitle,
        description: cleanWikiText(page.description || ''),
        extract: fitSummaryToCard(rawExtract, 400),
        image: finalImage,
        imageContain: page.title === 'Wikipédia',
        isGif,
        isShiny: isGif,
        url: page.fullurl || `https://fr.wikipedia.org/wiki/${encoded}`,
      };

      candidates.push({
        ...baseCard,
        theme: detectCardTheme(baseCard),
      });
    }

    return candidates;
  } catch {
    return [];
  }
}

// Réservoir partagé en mémoire des articles aléatoires Wikipédia déjà récupérés :
// évite de jeter les ~12 articles excédentaires à chaque appel batch (alimente boosters + casino).
const MAX_CANDIDATE_POOL_SIZE = 42;
const LOW_WATER_POOL_SIZE = 10;
let candidateArticlesPool = [];
let poolReplenishPromise = null;

/**
 * Réapprovisionne le réservoir partagé d'articles Wikipédia sans dupliquer les requêtes concurrentes.
 * @param {number} [batchSize=20] - Nombre d'articles demandés à Wikipédia
 * @returns {Promise<void>}
 */
async function replenishCandidatePool(batchSize = 20) {
  if (poolReplenishPromise) {
    return poolReplenishPromise;
  }

  poolReplenishPromise = (async () => {
    try {
      const batch = await fetchRandomWikiCandidatesBatch(batchSize);
      if (!Array.isArray(batch) || batch.length === 0) return;

      const existingIds = new Set(candidateArticlesPool.map((c) => String(c.id)));
      const existingTitles = new Set(
        candidateArticlesPool.map((c) => c.title.trim().toLowerCase())
      );

      for (const item of batch) {
        if (candidateArticlesPool.length >= MAX_CANDIDATE_POOL_SIZE) break;
        const lowerTitle = item.title.trim().toLowerCase();
        if (existingIds.has(String(item.id)) || existingTitles.has(lowerTitle)) {
          continue;
        }
        existingIds.add(String(item.id));
        existingTitles.add(lowerTitle);
        candidateArticlesPool.push(item);
      }
    } finally {
      poolReplenishPromise = null;
    }
  })();

  return poolReplenishPromise;
}

/**
 * Préchauffe silencieusement le réservoir d'articles en tâche de fond (ex: ouverture du WikiSino).
 */
export function warmWikiCandidatePool() {
  if (candidateArticlesPool.length < LOW_WATER_POOL_SIZE && !poolReplenishPromise) {
    replenishCandidatePool(20).catch(() => {});
  }
}

/**
 * Pioche jusqu'à `needed` articles uniques depuis le réservoir partagé,
 * en le réapprovisionnant à la demande si le stock est insuffisant.
 *
 * @param {number} needed - Nombre d'articles souhaités
 * @param {Set<string>} [excludeLowerTitles=new Set()] - Titres en minuscules à exclure
 * @param {Set<string>} [excludeIds=new Set()] - Identifiants à exclure
 * @returns {Promise<Array<Omit<WikiCard, 'views' | 'rarity'>>>}
 */
async function drawCandidatesFromPool(
  needed,
  excludeLowerTitles = new Set(),
  excludeIds = new Set()
) {
  const picked = [];
  let attempts = 0;

  while (picked.length < needed && attempts < 4) {
    attempts++;
    if (candidateArticlesPool.length === 0) {
      await replenishCandidatePool(20);
    }

    const remainingPool = [];
    for (const candidate of candidateArticlesPool) {
      const lowerTitle = candidate.title.trim().toLowerCase();
      const idStr = String(candidate.id);
      if (
        picked.length < needed &&
        !excludeLowerTitles.has(lowerTitle) &&
        !excludeIds.has(idStr) &&
        !excludeIds.has(idStr.toLowerCase())
      ) {
        excludeLowerTitles.add(lowerTitle);
        excludeIds.add(idStr);
        picked.push(candidate);
      } else {
        remainingPool.push(candidate);
      }
    }
    candidateArticlesPool = remainingPool;

    if (picked.length < needed) {
      await replenishCandidatePool(20);
    }
  }

  // Maintien du réservoir chaud en arrière-plan pour l'action suivante
  if (candidateArticlesPool.length < LOW_WATER_POOL_SIZE) {
    warmWikiCandidatePool();
  }

  return picked;
}

/**
 * Récupère des titres 100 % aléatoires depuis l'espace encyclopédique de fr.wikipedia.org
 */
async function fetchPureRandomTitles(limit = 12) {
  try {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      list: 'random',
      rnnamespace: '0',
      rnfilterredir: 'nonredirects',
      rnlimit: String(limit),
      origin: '*',
    });

    const res = await fetchWithTimeout(
      `${WIKI_API_BASE}?${params.toString()}`,
      {},
      3500
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.query?.random || []).map((item) => item.title);
  } catch {
    return [];
  }
}

/**
 * Tire un paquet de cartes aléatoires sur Wikipédia FR triées par suspense croissant.
 * Garantit strictement `count` cartes (6 par défaut) ou lève une erreur si la connexion est coupée.
 *
 * @param {number} [count=6] - Nombre de cartes à tirer (par défaut: 6)
 * @param {BoosterPackOptions} [options={}] - Options de tirage (ex: isIconic)
 * @returns {Promise<WikiCard[]>} Liste des cartes du paquet triées
 */
export async function fetchBoosterPackCards(count = 6, options = {}) {
  const { isIconic = false, excludeCommon = false } = options;

  const baseCandidates = [];
  const seenIds = new Set();
  const seenTitles = new Set();

  // 1. Récupération instantanée depuis le réservoir partagé (1 seul appel MediaWiki alimente plusieurs boosters)
  const pooledCandidates = await drawCandidatesFromPool(
    count,
    seenTitles,
    seenIds
  );
  baseCandidates.push(...pooledCandidates);

  // 2. Fallback parallèle via REST summary si le lot MediaWiki n'a pas suffi à réunir les 6 cartes
  let fallbackAttempts = 0;
  while (baseCandidates.length < count && fallbackAttempts < 4) {
    fallbackAttempts++;
    const needed = count - baseCandidates.length;
    const randomTitles = await fetchPureRandomTitles(Math.max(10, needed * 3));
    const uniqueTitles = randomTitles.filter(
      (t) => !seenTitles.has(t.trim().toLowerCase())
    );
    const results = await Promise.all(
      uniqueTitles.slice(0, 10).map((t) =>
        fetchWikiCardByTitle(t).catch(() => null)
      )
    );
    for (const card of results) {
      if (baseCandidates.length >= count) break;
      if (
        card &&
        card.extract &&
        card.extract.length >= 50 &&
        !seenIds.has(card.id) &&
        !seenTitles.has(card.title.toLowerCase())
      ) {
        seenIds.add(card.id);
        seenTitles.add(card.title.toLowerCase());
        baseCandidates.push(card);
      }
    }
  }

  // 3. Dernier filet de secours avec les articles GIF / encyclopédiques réels si la connexion a perdu 1 ou 2 paquets
  if (baseCandidates.length > 0 && baseCandidates.length < count) {
    const emergencyTitles = [...WIKI_GIF_ARTICLES].sort(
      () => Math.random() - 0.5
    );
    const needed = count - baseCandidates.length;
    const emergencyResults = await Promise.all(
      emergencyTitles
        .filter((t) => !seenTitles.has(t.toLowerCase()))
        .slice(0, needed + 2)
        .map((t) => fetchWikiCardByTitle(t).catch(() => null))
    );
    for (const card of emergencyResults) {
      if (baseCandidates.length >= count) break;
      if (card && !seenIds.has(card.id)) {
        seenIds.add(card.id);
        baseCandidates.push(card);
      }
    }
  }

  if (baseCandidates.length < count) {
    throw new Error(
      `Connexion insuffisante : seulement ${baseCandidates.length}/${count} cartes récupérées.`
    );
  }

  const selectedSix = baseCandidates.slice(0, count);

  // 4. Récupération groupée en 1 seule requête batch des vues sur 30 jours pour les cartes retenues
  const titlesToFetchViews = selectedSix
    .filter((c) => !(typeof c.views === 'number' && c.rarity))
    .map((c) => c.title);

  const viewsByTitle =
    titlesToFetchViews.length > 0
      ? await fetchPageViewsBatch(titlesToFetchViews)
      : {};

  const cardsWithViews = selectedSix.map((card) => {
    if (typeof card.views === 'number' && card.rarity) {
      return card;
    }
    const views = Number(viewsByTitle[card.title] ?? 0);
    const tier = getRarityByViews(views);
    return {
      ...card,
      views,
      rarity: tier.code,
    };
  });

  const drawnCards = cardsWithViews.sort(
    (a, b) => (a.views || 0) - (b.views || 0)
  );

  if (isIconic && drawnCards.length > 0) {
    // Booster Iconique : Garantit strictement 1 ou 2 Légendaires (L) et le reste en Ultra Rare (UR) minimum
    const targetLegendaries = Math.min(
      drawnCards.length,
      Math.random() < 0.45 ? 2 : 1
    );
    const urCount = drawnCards.length - targetLegendaries;

    const promoted = drawnCards.map((card, idx) => {
      const shouldBeLegendary = idx >= urCount || (card.views || 0) >= 20000;
      if (shouldBeLegendary) {
        return {
          ...card,
          rarity: 'L',
          views:
            (card.views || 0) >= 20000
              ? card.views
              : getSimulatedViewsForTier('L', card.views),
        };
      }
      return {
        ...card,
        rarity: 'UR',
        views: getSimulatedViewsForTier('UR', card.views),
      };
    });

    return promoted.sort((a, b) => (a.views || 0) - (b.views || 0));
  }

  if (excludeCommon && drawnCards.length > 0) {
    // Booster d'Halloween : aucune carte Commune (C), toutes les cartes sont Peu Communes (PC) minimum
    const promotedNoCommon = drawnCards.map((card) => {
      if (card.rarity === 'C' || (card.views || 0) < 50) {
        return {
          ...card,
          rarity: 'PC',
          views: getSimulatedViewsForTier('PC', card.views),
        };
      }
      return card;
    });
    return promotedNoCommon.sort((a, b) => (a.views || 0) - (b.views || 0));
  }

  return drawnCards;
}

/**
 * Génère un nombre de vues réaliste compris dans la fourchette officielle d'une rareté donnée
 */
function getSimulatedViewsForTier(rarityCode, actualViews = 0) {
  const tier = getRarityByCode(rarityCode);
  const maxFinite = Number.isFinite(tier.maxViews) ? tier.maxViews : 85000;
  if (actualViews >= tier.minViews && actualViews <= maxFinite) {
    return actualViews;
  }
  const span = Math.max(20, maxFinite - tier.minViews);
  return tier.minViews + Math.floor(Math.random() * span);
}

/**
 * Tire une carte Wikipédia FR 100 % aléatoire correspondant exactement à la rareté cible.
 * Utilisé notamment par l'Upgrader de Cartes du WikiSino.
 * @param {'PC'|'R'|'SR'|'UR'|'L'} [targetRarityCode='PC'] - Rareté ciblée
 * @param {string|string[]} [excludeTitles=[]] - Titres ou IDs à exclure
 * @returns {Promise<WikiCard|null>}
 */
export async function fetchWikiCardByRarity(targetRarityCode = 'PC', excludeTitles = []) {
  const excludeLowerTitles = new Set(
    (Array.isArray(excludeTitles) ? excludeTitles : [excludeTitles])
      .map((t) => String(t || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const excludeIds = new Set(excludeLowerTitles);

  const [candidate] = await drawCandidatesFromPool(
    1,
    excludeLowerTitles,
    excludeIds
  );
  if (!candidate) return null;

  if (targetRarityCode !== 'C') {
    return {
      ...candidate,
      rarity: targetRarityCode,
      views: getSimulatedViewsForTier(targetRarityCode, 0),
    };
  }

  const views = await fetchPageViews30Days(candidate.title);
  return {
    ...candidate,
    rarity: targetRarityCode,
    views: getSimulatedViewsForTier(targetRarityCode, views),
  };
}

/**
 * Tire une carte Wikipédia FR variée pour le duel du jeu "Plus ou Moins".
 * @param {string|string[]} [excludeInput=[]] - Titres ou IDs à exclure du tirage
 * @param {number|null} [referenceViews=null] - Vues de la carte de référence
 * @param {string|null} [referenceRarity=null] - Rareté de la carte de référence
 * @param {number} [potentialGain=250] - Gain potentiel pour calibrage de difficulté
 * @returns {Promise<WikiCard>} Carte de duel générée
 */
export async function fetchRandomDuelCard(
  excludeInput = [],
  referenceViews = null,
  referenceRarity = null,
  potentialGain = 250
) {
  const excludeList = Array.isArray(excludeInput)
    ? excludeInput
    : [excludeInput].filter(Boolean);
  const excludeSet = new Set(
    excludeList.map((t) => String(t || '').trim().toLowerCase()).filter(Boolean)
  );

  const safePotentialGain =
    typeof potentialGain === 'number' && !Number.isNaN(potentialGain)
      ? potentialGain
      : 250;

  const allTiers = ['C', 'PC', 'R', 'SR', 'UR', 'L'];
  let pickedTier;

  // Détermination de la difficulté selon la valeur du gain potentiel :
  let closeDuelChance = 0.45;
  let exactSameRarityChance = 0.35;

  if (safePotentialGain < 150) {
    // Palier Découverte / Début de petite série : duels très accessibles
    closeDuelChance = 0.10;
    exactSameRarityChance = 0.15;
  } else if (safePotentialGain < 350) {
    // Palier Modéré
    closeDuelChance = 0.32;
    exactSameRarityChance = 0.25;
  } else if (safePotentialGain < 700) {
    // Palier Tendu (enjeux sérieux)
    closeDuelChance = 0.55;
    exactSameRarityChance = 0.45;
  } else if (safePotentialGain < 1500) {
    // Palier Redoutable (grosses séries ou grosses mises)
    closeDuelChance = 0.75;
    exactSameRarityChance = 0.65;
  } else {
    // Palier Jackpot / Boss (> 1 500 ₩ de gain potentiel)
    closeDuelChance = 0.88;
    exactSameRarityChance = 0.80;
  }

  const isCloseDuel =
    referenceRarity &&
    allTiers.includes(referenceRarity) &&
    Math.random() < closeDuelChance;

  if (isCloseDuel) {
    const refIdx = allTiers.indexOf(referenceRarity);
    let candidateIndices;

    if (Math.random() < exactSameRarityChance) {
      // Duel sur la même rareté exacte
      candidateIndices = [refIdx];
    } else {
      // Duel sur des raretés voisines (+/- 1 palier)
      candidateIndices = [];
      if (refIdx > 0) candidateIndices.push(refIdx - 1);
      candidateIndices.push(refIdx);
      if (refIdx < allTiers.length - 1) candidateIndices.push(refIdx + 1);
    }

    const pickedIdx =
      candidateIndices[Math.floor(Math.random() * candidateIndices.length)];
    pickedTier = allTiers[pickedIdx];
  } else if (
    referenceRarity &&
    allTiers.includes(referenceRarity) &&
    safePotentialGain < 150
  ) {
    // À faible gain potentiel (< 150 ₩), si ce n'est pas un duel serré,
    // on favorise un écart d'au moins 2 paliers pour rendre l'issue évidente
    const refIdx = allTiers.indexOf(referenceRarity);
    const distantTiers = allTiers.filter((_, idx) => Math.abs(idx - refIdx) >= 2);
    pickedTier =
      distantTiers.length > 0
        ? distantTiers[Math.floor(Math.random() * distantTiers.length)]
        : allTiers[Math.floor(Math.random() * allTiers.length)];
  } else {
    // Tirage varié standard parmi tous les paliers
    pickedTier = allTiers[Math.floor(Math.random() * allTiers.length)];
  }

  let card = null;

  // Tirage instantané depuis le réservoir partagé (évite 28 articles téléchargés par duel)
  const duelExcludeTitles = new Set(excludeSet);
  const duelExcludeIds = new Set(excludeSet);
  const [candidate] = await drawCandidatesFromPool(
    1,
    duelExcludeTitles,
    duelExcludeIds
  );
  if (candidate) {
    if (pickedTier && pickedTier !== 'C') {
      card = {
        ...candidate,
        rarity: pickedTier,
        views: getSimulatedViewsForTier(pickedTier, 0),
      };
    } else {
      const actualViews = await fetchPageViews30Days(candidate.title);
      const actualTier = getRarityByViews(actualViews);
      card = {
        ...candidate,
        rarity: actualTier.code,
        views: actualViews,
      };
    }
  }

  // Filet de secours pur aléatoire si besoin
  if (!card) {
    const fallbackTier = pickedTier === 'C' ? 'PC' : pickedTier;
    card = await fetchWikiCardByRarity(fallbackTier, excludeList);
  }

  // Double vérification anti-doublon absolue : si la carte correspond à une carte exclue, réessaye
  if (
    card &&
    (excludeSet.has(card.title.trim().toLowerCase()) ||
      excludeSet.has(String(card.id)))
  ) {
    const alternateTiers = allTiers.filter((t) => t !== pickedTier);
    for (const altTier of alternateTiers.sort(() => Math.random() - 0.5)) {
      const altCard = await fetchWikiCardByRarity(altTier, excludeList);
      if (
        altCard &&
        !excludeSet.has(altCard.title.trim().toLowerCase()) &&
        !excludeSet.has(String(altCard.id))
      ) {
        card = altCard;
        break;
      }
    }
  }

  // Garantit un nombre de vues distinct de la référence
  if (card && referenceViews !== null && card.views === referenceViews) {
    card = {
      ...card,
      views: card.views + (Math.random() < 0.5 ? 24 : -18),
    };
  }

  return card;
}


