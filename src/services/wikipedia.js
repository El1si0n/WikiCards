import { getRarityByViews, getRarityByCode } from '../config/rarities';
import { detectCardTheme } from '../config/themes';

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

// Bassin d'articles Wikipédia FR emblématiques (Légendaires >= 20 000 vues) pour le Booster Iconique
const ICONIC_LEGENDARY_POOL = [
  'Système solaire',
  'Trou noir',
  'Révolution française',
  'Léonard de Vinci',
  'Albert Einstein',
  'Marie Curie',
  'Pyramide de Khéops',
  'Intelligence artificielle',
  'Mythologie grecque',
  'Empire romain',
  'Napoléon Ier',
  'Tour Eiffel',
  'Mont Éverest',
  'Voie lactée',
  'ADN',
  'Physique quantique',
  'Seconde Guerre mondiale',
  'Moyen Âge',
  'Renaissance',
  'Jules César',
  'Cléopâtre VII',
  'Isaac Newton',
  'Charles Darwin',
  'Nikola Tesla',
  'Alexandre le Grand',
  'Château de Versailles',
  'Musée du Louvre',
  'Wolfgang Amadeus Mozart',
  'Ludwig van Beethoven',
  'Vincent van Gogh',
  'Pablo Picasso',
  'Claude Monet',
  'Victor Hugo',
  'Molière',
  'Jules Verne',
  'Odyssée',
  'Lune',
  'Mars (planète)',
  'Jupiter (planète)',
  'Saturne (planète)',
  'Big Bang',
  'Relativité générale',
];

// Bassin d'articles Wikipédia FR populaires (Ultra Rares : 5 000 à 19 999 vues) pour le Booster Iconique
const ICONIC_ULTRA_RARE_POOL = [
  'Iliade',
  'Galilée (savant)',
  'Socrate',
  'Platon',
  'Aristote',
  'Guerre de Cent Ans',
  'Chute de Constantinople',
  'Empire byzantin',
  'Civilisation maya',
  'Empire inca',
  'Machu Picchu',
  'Colisée',
  'Parthénon',
  'Taj Mahal',
  'Grande Muraille',
  'Pétra',
  'Angkor Vat',
  'Mont Saint-Michel',
  'Aurore polaire',
  'Supernova',
  'Nébuleuse',
  'Exoplanète',
  'Tectonique des plaques',
  'Photosynthèse',
  'Tableau périodique des éléments',
  'Nombre d\'or',
  'Suite de Fibonacci',
  'Théorème de Pythagore',
  'Machine de Turing',
  'Alan Turing',
  'Ada Lovelace',
  'Rosalind Franklin',
  'Louis Pasteur',
  'Antoine Lavoisier',
  'Blaise Pascal',
  'René Descartes',
  'Voltaire',
  'Jean-Jacques Rousseau',
  'Montesquieu',
  'Denis Diderot',
  'Homère',
  'William Shakespeare',
  'Dante Alighieri',
  'Miguel de Cervantes',
  'Frédéric Chopin',
  'Antonio Vivaldi',
  'Jean-Sébastien Bach',
  'Michel-Ange',
  'Raphaël (peintre)',
  'Rembrandt',
  'Salvador Dalí',
  'Frida Kahlo',
  'Hokusai',
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
 * Récupère le nombre réel de visiteurs sur 30 jours via l'API officielle Wikimedia Pageviews
 */
export async function fetchPageViews30Days(title) {
  try {
    const normalizedTitle = title.trim().replace(/ /g, '_');
    const { start, end } = getPageviewsDateRange();
    const url = `${WIKIMEDIA_PAGEVIEWS}/${encodeURIComponent(
      normalizedTitle
    )}/daily/${start}/${end}`;

    const res = await fetchWithTimeout(url, {}, 3500);
    if (!res.ok) return 0;

    const data = await res.json();
    if (!data?.items || !Array.isArray(data.items)) return 0;

    return data.items.reduce((sum, item) => sum + (item.views || 0), 0);
  } catch {
    return 0;
  }
}

/**
 * Vérifie si l'URL d'image Wikipédia correspond à un fichier .gif
 */
export function isGifImageUrl(url = '') {
  if (!url) return false;
  return /\.gif(\?|$|\/)/i.test(url);
}

/**
 * Récupère une carte complète à partir du titre d'une page Wikipédia FR
 * (Résumé officiel + Image miniature ou .gif animé + Vues réelles sur 30 jours + Rareté + Thème + détection GIF)
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

  // Si c'est un .gif, on privilégie l'originalimage pour conserver l'animation .gif fluide
  const finalImage = isGif
    ? originalUrl || thumbUrl
    : thumbUrl || originalUrl || null;

  const baseCard = {
    id: `wiki-${summary.pageid || summary.title}`,
    pageid: summary.pageid,
    title: summary.title,
    description: summary.description || '',
    extract: summary.extract || '',
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
 * Récupère une carte Wikipédia garantie avec une image .gif
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
      4000
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.query?.random || []).map((item) => item.title);
  } catch {
    return [];
  }
}

/**
 * Tire un booster de 5 cartes sur Wikipédia FR.
 * - Mode standard (isIconic = false) : tirage aléatoire naturel sur Wikipédia FR (~7 % de chance qu'une page .gif s'y glisse).
 * - Mode Booster Iconique (isIconic = true) : garantit strictement MINIMUM 1 Légendaire (L) et MAXIMUM 2 Légendaires (L).
 * Les 5 cartes sont triées par nombre de vues croissant pour garder le suspense jusqu'à la 5e carte.
 */
export async function fetchBoosterPackCards(count = 5, options = {}) {
  const { isIconic = false } = options;

  if (isIconic) {
    // Booster Iconique : Garantit strictement 1 ou 2 Légendaires (L) et le reste en Ultra Rare (UR) minimum
    const targetLegendaries = Math.random() < 0.45 ? 2 : 1;
    const legendaryCards = [];
    const ultraRareCards = [];

    // 1. Récupère les 1 ou 2 cartes Légendaires garanties (L : >= 20 000 vues)
    const shuffledLegendaryTitles = [...ICONIC_LEGENDARY_POOL].sort(
      () => Math.random() - 0.5
    );
    const legBatch = await Promise.allSettled(
      shuffledLegendaryTitles
        .slice(0, 6)
        .map((title) => fetchWikiCardByTitle(title))
    );

    for (const item of legBatch) {
      if (
        item.status === 'fulfilled' &&
        item.value &&
        item.value.extract &&
        item.value.extract.length >= 60
      ) {
        const card = item.value;
        const ensuredViews =
          card.views >= 20000
            ? card.views
            : 21500 + Math.floor(Math.random() * 25000);
        legendaryCards.push({
          ...card,
          views: ensuredViews,
          rarity: 'L',
        });
        if (legendaryCards.length === targetLegendaries) break;
      }
    }

    // 2. Complète le reste du paquet exclusivement avec des cartes Ultra Rares (UR : 5 000 à 19 999 vues)
    const shuffledUrTitles = [...ICONIC_ULTRA_RARE_POOL].sort(
      () => Math.random() - 0.5
    );
    for (
      let i = 0;
      i < shuffledUrTitles.length &&
      legendaryCards.length + ultraRareCards.length < count;
      i += 5
    ) {
      const batch = shuffledUrTitles.slice(i, i + 5);
      const settled = await Promise.allSettled(
        batch.map((title) => fetchWikiCardByTitle(title))
      );

      for (const item of settled) {
        if (
          item.status === 'fulfilled' &&
          item.value &&
          item.value.extract &&
          item.value.extract.length >= 60 &&
          !legendaryCards.some((c) => c.id === item.value.id) &&
          !ultraRareCards.some((c) => c.id === item.value.id)
        ) {
          const card = item.value;
          const ensuredUrViews =
            card.views >= 5000 && card.views < 20000
              ? card.views
              : 6200 + Math.floor(Math.random() * 12500);
          ultraRareCards.push({
            ...card,
            views: ensuredUrViews,
            rarity: 'UR',
          });
          if (legendaryCards.length + ultraRareCards.length >= count) break;
        }
      }
    }

    const finalPack = [...ultraRareCards, ...legendaryCards].slice(0, count);
    return finalPack.sort((a, b) => (a.views || 0) - (b.views || 0));
  }

  // Mode Booster Standard : tirage 100 % naturel sur Wikipédia FR.
  // Une carte devient "GIF Métal" uniquement si son illustration Wikipédia s'avère naturellement être un .gif animé.
  const validCards = [];
  const randomTitles = await fetchPureRandomTitles(14);
  for (
    let i = 0;
    i < randomTitles.length && validCards.length < count;
    i += 4
  ) {
    const batch = randomTitles.slice(i, i + 4);
    const settled = await Promise.allSettled(
      batch.map((title) => fetchWikiCardByTitle(title))
    );

    for (const item of settled) {
      if (
        item.status === 'fulfilled' &&
        item.value &&
        item.value.extract &&
        item.value.extract.length >= 60 &&
        !validCards.some((c) => c.id === item.value.id)
      ) {
        validCards.push(item.value);
        if (validCards.length === count) break;
      }
    }
  }

  // Filet de sécurité anti-lenteur : complète avec le bassin Wikipédia vérifié si besoin
  if (validCards.length < count) {
    const fallbackList = [
      ...(RARITY_FALLBACK_POOLS.SR || []),
      ...(RARITY_FALLBACK_POOLS.R || []),
      ...(RARITY_FALLBACK_POOLS.PC || []),
    ].sort(() => Math.random() - 0.5);

    for (const title of fallbackList) {
      if (validCards.length >= count) break;
      try {
        const card = await fetchWikiCardByTitle(title);
        if (card && !validCards.some((c) => c.id === card.id)) {
          validCards.push(card);
        }
      } catch {
        // continue
      }
    }
  }

  return validCards.slice(0, count).sort((a, b) => (a.views || 0) - (b.views || 0));
}

// Bassin d'articles Wikipédia FR pour garantir un tirage rapide par palier de rareté dans le WikiSino
const RARITY_FALLBACK_POOLS = {
  L: ICONIC_LEGENDARY_POOL,
  UR: ICONIC_ULTRA_RARE_POOL,
  SR: [
    'Astéroïde',
    'Éclipse solaire',
    'Volcan',
    'Tsunami',
    'uroboros',
    'Mythologie nordique',
    'Chevaliers de la Table ronde',
    ' Guerre de Troie',
    'Pharaon',
    'Hiéroglyphe égyptien',
    'Samouraï',
    'Viking',
    'Alchimie',
    'Boussole',
    'Imprimerie',
    'Machine à vapeur',
    'Télégraphe',
    ' Cinématographe',
    'Antibiotique',
    'ADN polymérase',
    'Neurone',
    'Système immunitaire',
    'Effet de serre',
    'Récif corallien',
    'Forêt amazonienne',
    'Antarctique',
    'Fosse des Mariannes',
    'Aurore boréale',
  ],
  R: [
    'Astrolabe',
    'Cadran solaire',
    'Sextant',
    'Horloge astronomique',
    'Enluminure',
    'Parchemin',
    'Papyrus',
    'Pierre de Rosette',
    'Bibliothèque d\'Alexandrie',
    'Phare d\'Alexandrie',
    'Jardins suspendus de Babylone',
    'Colosse de Rhodes',
    'Temple d\'Artémis à Éphèse',
    'Mausolée d\'Halicarnasse',
    'Statue chryséléphantine de Zeus à Olympie',
    'Route de la soie',
    'Caravelle (navire)',
    'Galion',
    'Dirigeable',
    'Montgolfière',
    'Locomotive à vapeur',
    'Phonographe',
    'Daguerréotype',
    'Lanterne magique',
  ],
  PC: [
    'Clepsydre',
    'Sablier',
    'Abaque (calcul)',
    'Boulier',
    'Règle à calcul',
    'Pascaline',
    'Sphère armillaire',
    'Planétaire',
    'Nocturlabe',
    'Bâton de Jacob',
    'Gnomon',
    'Méridienne',
    'Anémomètre',
    'Baromètre',
    'Hygromètre',
    'Sismographe',
    'Galvanomètre',
    'Électroscope',
    'Bouteille de Leyde',
    'Pile de Volta',
  ],
};

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
 * Tire une carte Wikipédia FR réelle correspondant exactement à la rareté cible (PC, R, SR, UR, L)
 * Utilisé notamment par l'Upgrader de Cartes du WikiSino.
 */
export async function fetchWikiCardByRarity(targetRarityCode = 'PC', excludeTitles = []) {
  const pool = RARITY_FALLBACK_POOLS[targetRarityCode] || [];
  const excludeSet = new Set(
    (Array.isArray(excludeTitles) ? excludeTitles : [excludeTitles])
      .map((t) => String(t || '').trim().toLowerCase())
      .filter(Boolean)
  );

  // 1. Pour UR et L (ou 50 % du temps sur SR/R/PC), pioche dans le bassin thématique dédié ou aléatoire
  if (targetRarityCode === 'L' || targetRarityCode === 'UR' || Math.random() < 0.55) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    for (const rawTitle of shuffled.slice(0, 8)) {
      if (excludeSet.has(rawTitle.trim().toLowerCase())) continue;
      try {
        const card = await fetchWikiCardByTitle(rawTitle.trim());
        if (
          card &&
          card.extract &&
          card.extract.length >= 50 &&
          !excludeSet.has(card.title.trim().toLowerCase()) &&
          !excludeSet.has(String(card.id))
        ) {
          return {
            ...card,
            rarity: targetRarityCode,
            views: getSimulatedViewsForTier(targetRarityCode, card.views),
          };
        }
      } catch {
        // Continue
      }
    }
  }

  // 2. Sinon (ou en secours), tire un article encyclopédique aléatoire sur Wikipédia FR et l'ajuste au palier gagné
  const randomTitles = await fetchPureRandomTitles(10);
  for (const title of randomTitles) {
    if (excludeSet.has(title.trim().toLowerCase())) continue;
    try {
      const card = await fetchWikiCardByTitle(title);
      if (
        card &&
        card.extract &&
        card.extract.length >= 50 &&
        !excludeSet.has(card.title.trim().toLowerCase()) &&
        !excludeSet.has(String(card.id))
      ) {
        return {
          ...card,
          rarity: targetRarityCode,
          views: getSimulatedViewsForTier(targetRarityCode, card.views),
        };
      }
    } catch {
      // Continue
    }
  }

  // 3. Dernier recours garanti depuis le pool
  for (const rawTitle of pool) {
    if (excludeSet.has(rawTitle.trim().toLowerCase())) continue;
    try {
      const card = await fetchWikiCardByTitle(rawTitle.trim());
      if (card && !excludeSet.has(card.title.trim().toLowerCase())) {
        return {
          ...card,
          rarity: targetRarityCode,
          views: getSimulatedViewsForTier(targetRarityCode, card.views),
        };
      }
    } catch {
      // Continue
    }
  }

  return null;
}

/**
 * Tire une carte Wikipédia FR variée pour le jeu "Plus ou Moins" (Étape 9.2)
 * - Garantit strictement qu'aucune carte identique à la carte de référence (ou déjà vue) ne peut être tirée.
 * - Rend le jeu plus subtil et intéressant : 45 % du temps, sélectionne une rareté identique ou voisine
 *   (+/- 1 palier) pour des duels équilibrés qui demandent une vraie réflexion sur la notoriété respective.
 */
export async function fetchRandomDuelCard(
  excludeInput = [],
  referenceViews = null,
  referenceRarity = null
) {
  const excludeList = Array.isArray(excludeInput)
    ? excludeInput
    : [excludeInput].filter(Boolean);
  const excludeSet = new Set(
    excludeList.map((t) => String(t || '').trim().toLowerCase()).filter(Boolean)
  );

  const allTiers = ['C', 'PC', 'R', 'SR', 'UR', 'L'];
  let pickedTier;

  // Ajustement de difficulté (un peu plus dur) :
  // ~45 % du temps, on choisit la même rareté ou une rareté voisine (+/- 1 palier)
  // pour que l'écart de vues soit plus serré et stimulant
  if (referenceRarity && allTiers.includes(referenceRarity) && Math.random() < 0.45) {
    const refIdx = allTiers.indexOf(referenceRarity);
    const adjacentIndices = [refIdx];
    if (refIdx > 0) adjacentIndices.push(refIdx - 1);
    if (refIdx < allTiers.length - 1) adjacentIndices.push(refIdx + 1);
    const pickedIdx =
      adjacentIndices[Math.floor(Math.random() * adjacentIndices.length)];
    pickedTier = allTiers[pickedIdx];
  } else {
    // 55 % du temps, tirage varié parmi tous les paliers
    pickedTier = allTiers[Math.floor(Math.random() * allTiers.length)];
  }

  let card = null;
  if (pickedTier === 'C') {
    const randomTitles = await fetchPureRandomTitles(10);
    for (const title of randomTitles) {
      if (excludeSet.has(title.trim().toLowerCase())) continue;
      try {
        const fetched = await fetchWikiCardByTitle(title);
        if (
          fetched &&
          fetched.extract &&
          fetched.extract.length >= 45 &&
          !excludeSet.has(fetched.title.trim().toLowerCase()) &&
          !excludeSet.has(String(fetched.id))
        ) {
          card = fetched;
          break;
        }
      } catch {
        // Continue
      }
    }
  }

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


