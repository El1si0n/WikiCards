/**
 * @file Rôle : Fonctions algorithmiques pures de nettoyage Unicode, assainissement et découpage textuel des cartes Wikipédia.
 * Dépendances : Aucune.
 * Effets de bord : Aucun (fonctions pures).
 */

// Expressions régulières de protection des abréviations françaises courantes
const ABBREVIATIONS = [
  { regex: /\bav\.\s+J\.-C\./giu, token: '___AV_JC___' },
  { regex: /\bapr\.\s+J\.-C\./giu, token: '___APR_JC___' },
  { regex: /\bJ\.-C\./giu, token: '___JC___' },
  { regex: /\b(M|Mme|Mlle|Dr|Prof|Pr|St|Ste|Mgr)\./giu, token: '$1___DOT___' },
  {
    regex:
      /\b(etc|vol|fasc|hab|art|al|cf|env|ref|réf|ex|ibid|op|cit|chap|col|éd|ed|sq|suiv|trad|fig)\./giu,
    token: '$1___DOT___',
  },
  { regex: /(\d+)\.(\d+)/gu, token: '$1___DECIMAL___$2' },
];

// Mots de liaison, articles, prépositions et syntagmes incomplets à ne JAMAIS laisser en fin de coupure
const DANGLING_WORDS_REGEX =
  /\s+(?:et|ou|mais|donc|or|ni|car|de|d'|du|des|le|la|les|l'|un|une|en|à|au|aux|dans|par|pour|sur|sous|avec|sans|vers|chez|entre|comme|qui|que|dont|où|ce|cet|cette|ces|son|sa|ses|leur|leurs|mon|ton|notre|votre|situé|située|situés|situées|né|née|nés|mort|morte|morts|sorti|sortie|sortis|fondé|fondée|fondés)$/iu;

/**
 * Nettoie les artefacts textuels Wikipédia et résidus d'encodage Unicode :
 * - Supprime les caractères de remplacement \uFFFD () et caractères de contrôle invalides
 * - Supprime les annotations éditoriales Wikipédia ([réf. nécessaire], [nécessaire], [Quoi ?], etc.)
 * - Supprime les prononciations phonétiques et balises de translittération
 * - Supprime les résidus de formules mathématiques LaTeX
 * - Supprime les parenthèses orphelines () ou résiduelles ( , )
 * - Normalise les espaces insécables et la ponctuation
 *
 * @param {string} [rawText=''] - Extrait textuel brut
 * @returns {string} Texte propre et assaini
 */
export function cleanWikiText(rawText = '') {
  if (typeof rawText !== 'string') return '';

  // 1. Remplacement des espaces insécables HTML et Unicode
  let text = rawText.replace(/\u00A0|&nbsp;/gu, ' ');

  // 2. Suppression stricte des caractères corrompus \uFFFD () et de contrôle invalides
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/gu, '');

  // 3. Suppression des annotations éditoriales Wikipédia
  text = text.replace(
    /\[\s*(?:réf\.|ref\.)?\s*(?:nécessaire|souhaitée|insuffisante)[^\]]*\]/giu,
    ''
  );
  text = text.replace(/\[\s*citation\s*nécessaire\s*\]/giu, '');
  text = text.replace(
    /\[\s*(?:Quoi\s*\?|quand\s*\?|qui\s*\?|où\s*\?|pas\s*clair)[^\]]*\]/giu,
    ''
  );
  text = text.replace(/\[\s*\d+\s*\]/gu, '');
  text = text.replace(/\b(?:réf\.\s*)?nécessaire\s*\]/giu, '');
  text = text.replace(/\[\s*(?:réf\.|ref\.)\s*\]/giu, '');

  // 4. Suppression des résidus de formules mathématiques LaTeX
  text = text.replace(/<math[\s\S]*?<\/math>/giu, '');
  text = text.replace(/\\\{\\displaystyle[\s\S]*?\\\\?\}/gu, '');
  text = text.replace(/\{\\displaystyle[^}]*\}/gu, '');
  text = text.replace(/\\text\{[^}]*\}/gu, '');

  // 5. Suppression des prononciations phonétiques API
  text = text.replace(
    /\(\s*(?:en\s+[\p{L}]+|prononc[eé]|en\s+grec|en\s+latin)[^)]*\)/giu,
    ''
  );
  text = text.replace(/\(\s*\/[^/]+\/\s*\)/gu, '');
  text = text.replace(/\[\s*\/[^/]+\/\s*\]/gu, '');
  text = text.replace(/\(\s*\[(?:API\s*:|ipa\s*:|\/)[^\]]+\]\s*\)/giu, '');
  text = text.replace(/\[\s*API\s*:[^\]]+\]/giu, '');

  // 6. Suppression en cascade des parenthèses ou crochets devenus vides
  let prev;
  do {
    prev = text;
    text = text.replace(/\(\s*[,;–—-]?\s*\)/gu, '');
    text = text.replace(/\[\s*[,;–—-]?\s*\]/gu, '');
  } while (text !== prev);

  // 7. Normalisation de la ponctuation et des espaces
  text = text.replace(/\s+([.,;:!?])/gu, '$1');
  text = text.replace(/\(\s*,\s*/gu, '(');
  text = text.replace(/\s*,\s*\)/gu, ')');
  text = text.replace(/,{2,}/gu, ',');
  text = text.replace(/\s*—\s*—\s*/gu, ' — ');
  text = text.replace(/\s*(?:\.\.\.|…)\s*$/gu, '.');
  text = text.replace(/\s+/gu, ' ');

  return text.trim();
}

/**
 * Assainit le titre d'une carte Wikipédia (suppression des caractères corrompus \uFFFD et espaces superflus).
 *
 * @param {string} [rawTitle=''] - Titre brut
 * @returns {string} Titre propre
 */
export function cleanCardTitle(rawTitle = '') {
  if (typeof rawTitle !== 'string') return '';
  return rawTitle
    .replace(/\u00A0|&nbsp;/gu, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/gu, '')
    .replace(/\[\s*(?:réf\.|ref\.)?\s*nécessaire\s*\]/giu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

/**
 * Découpe intelligemment un extrait encyclopédique pour l'ajuster à un budget de caractères
 * en garantissant TOUJOURS une terminaison par une phrase ou proposition complète terminée par un point,
 * sans jamais afficher "..." ni couper au milieu d'un syntagme.
 *
 * @param {string} [rawText=''] - Extrait brut reçu de Wikipédia
 * @param {number} [maxCharsBudget=240] - Budget maximal de caractères alloué
 * @returns {string} Résumé harmonieux et complet terminé par un point
 */
export function fitSummaryToCard(rawText = '', maxCharsBudget = 240) {
  const cleaned = cleanWikiText(rawText);
  if (!cleaned) {
    return "Article encyclopédique référencé sur l'édition francophone de Wikipédia.";
  }

  // Si le texte propre tient déjà dans le budget et se termine par une ponctuation finale
  if (cleaned.length <= maxCharsBudget && /[.!?]$/u.test(cleaned)) {
    return cleaned;
  }

  // 1. Masquage des abréviations françaises courantes
  let masked = cleaned;
  ABBREVIATIONS.forEach(({ regex, token }) => {
    masked = masked.replace(regex, token);
  });

  // 2. Découpage par phrases
  const rawSentences = masked.match(/[^.!?…]+[.!?…]+(?:\s+|$)/gu) || [masked];
  const sentences = rawSentences
    .map((s) => {
      let unmasked = s;
      unmasked = unmasked.replace(/___AV_JC___/gu, 'av. J.-C.');
      unmasked = unmasked.replace(/___APR_JC___/gu, 'apr. J.-C.');
      unmasked = unmasked.replace(/___JC___/gu, 'J.-C.');
      unmasked = unmasked.replace(/___DOT___/gu, '.');
      unmasked = unmasked.replace(/___DECIMAL___/gu, '.');
      return unmasked.trim();
    })
    .filter(Boolean);

  // 3. Accumulation de phrases complètes tant que le total ne dépasse pas le budget
  let result = '';
  for (const sentence of sentences) {
    const candidate = result ? `${result} ${sentence}` : sentence;
    if (candidate.length <= maxCharsBudget) {
      result = candidate;
    } else {
      break;
    }
  }

  if (result) {
    if (!/[.!?]$/u.test(result)) {
      result = `${result}.`;
    }
    return result;
  }

  // 4. Si la toute première phrase dépasse le budget alloué (ex: phrase longue de 350 car.)
  const firstSentence = sentences[0] || cleaned;
  const sub = firstSentence.slice(0, maxCharsBudget);

  // Recherche de la dernière ponctuation logique (virgule, point-virgule, deux-points, parenthèse)
  const punctuationRegex = /[,;:)]/gu;
  let match;
  let bestPunctIndex = -1;
  const minSignificantLength = Math.max(35, maxCharsBudget * 0.35);

  while ((match = punctuationRegex.exec(sub)) !== null) {
    if (match.index >= minSignificantLength) {
      bestPunctIndex = match.index;
    }
  }

  let cutIndex = bestPunctIndex;
  if (cutIndex <= 0) {
    const lastSpace = sub.lastIndexOf(' ');
    cutIndex =
      lastSpace >= Math.max(30, maxCharsBudget * 0.4)
        ? lastSpace
        : maxCharsBudget;
  }

  let proposition = sub.slice(0, cutIndex).trim();

  // Nettoyage de la ponctuation terminale résiduelle
  proposition = proposition.replace(/[,;:–—-]+$/gu, '').trim();

  // Purge récursive des mots de liaison orphelins (ex: "et de la", "sorti en salles en", etc.)
  while (DANGLING_WORDS_REGEX.test(proposition)) {
    proposition = proposition.replace(DANGLING_WORDS_REGEX, '').trim();
    proposition = proposition.replace(/[,;:–—-]+$/gu, '').trim();
  }

  // Équilibrage des parenthèses ouvertes non refermées
  const openCount = (proposition.match(/\(/gu) || []).length;
  const closeCount = (proposition.match(/\)/gu) || []).length;
  if (openCount > closeCount) {
    proposition += ')'.repeat(openCount - closeCount);
  }

  // Terminaison obligatoire par un point
  if (!/[.!?]$/u.test(proposition)) {
    proposition = `${proposition}.`;
  }

  return proposition;
}

/**
 * Fonction historique de formatage conservée pour compatibilité ascendante.
 *
 * @param {string} [rawText=''] - Extrait brut
 * @param {number} [maxLength=320] - Longueur maximale
 * @returns {string}
 */
export function formatCompleteExtract(rawText = '', maxLength = 320) {
  return fitSummaryToCard(rawText, maxLength);
}
