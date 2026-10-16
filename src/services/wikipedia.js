import { getRarityByViews } from '../config/rarities';

const WIKI_API_BASE = 'https://fr.wikipedia.org/w/api.php';
const WIKI_REST_SUMMARY = 'https://fr.wikipedia.org/api/rest_v1/page/summary';
const WIKIMEDIA_PAGEVIEWS =
  'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/user';

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
    const normalizedTitle = title.replace(/ /g, '_');
    const { start, end } = getPageviewsDateRange();
    const url = `${WIKIMEDIA_PAGEVIEWS}/${encodeURIComponent(
      normalizedTitle
    )}/daily/${start}/${end}`;

    const res = await fetch(url);
    if (!res.ok) return 0;

    const data = await res.json();
    if (!data?.items || !Array.isArray(data.items)) return 0;

    return data.items.reduce((sum, item) => sum + (item.views || 0), 0);
  } catch {
    return 0;
  }
}

/**
 * Récupère une carte complète à partir du titre d'une page Wikipédia FR
 * (Résumé officiel + Image miniature + Vues réelles sur 30 jours + Rareté calculée)
 */
export async function fetchWikiCardByTitle(title) {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const [summaryRes, views] = await Promise.all([
    fetch(`${WIKI_REST_SUMMARY}/${encoded}`),
    fetchPageViews30Days(title),
  ]);

  if (!summaryRes.ok) {
    throw new Error(`Impossible de charger la page Wikipédia "${title}"`);
  }

  const summary = await summaryRes.json();

  if (summary.type === 'disambiguation') {
    throw new Error('Page d’homonymie');
  }

  const tier = getRarityByViews(views);

  return {
    id: `wiki-${summary.pageid || summary.title}`,
    pageid: summary.pageid,
    title: summary.title,
    description: summary.description || '',
    extract: summary.extract || '',
    image: summary.thumbnail?.source || summary.originalimage?.source || null,
    imageContain: summary.title === 'Wikipédia',
    views,
    rarity: tier.code,
    url:
      summary.content_urls?.desktop?.page ||
      `https://fr.wikipedia.org/wiki/${encoded}`,
  };
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

    const res = await fetch(`${WIKI_API_BASE}?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.query?.random || []).map((item) => item.title);
  } catch {
    return [];
  }
}

/**
 * Tire un booster de 5 cartes 100 % aléatoires sur Wikipédia FR.
 * Ainsi la distribution des raretés suit la vraie rareté naturelle de Wikipédia :
 * - Commun (< 50 vues) et Peu Commun (>= 50 vues) sont majoritaires
 * - Rare (>= 250 vues) tombe de temps en temps
 * - Super Rare (>= 1 000), Ultra Rare (>= 5 000) et Légendaire (>= 20 000) sont de vraies pépites rares !
 * Les 5 cartes sont triées par nombre de vues croissant pour garder le suspense jusqu'à la 5e carte.
 */
export async function fetchBoosterPackCards(count = 5) {
  const randomTitles = await fetchPureRandomTitles(14);
  const validCards = [];

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
        item.value.extract.length >= 60
      ) {
        validCards.push(item.value);
        if (validCards.length === count) break;
      }
    }
  }

  // Tri du moins vu au plus vu pour révéler la meilleure carte en dernier (5/5)
  return validCards.sort((a, b) => (a.views || 0) - (b.views || 0));
}
