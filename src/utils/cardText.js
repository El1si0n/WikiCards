/**
 * @file Rôle : Fonctions algorithmiques pures de formatage et de découpage textuel pour les cartes encyclopédiques.
 * Dépendances : Aucune.
 * Effets de bord : Aucun (fonctions pures).
 */

/**
 * Formate l'extrait Wikipédia pour garantir uniquement des phrases complètes
 * (jamais de texte coupé au milieu d'un mot ou d'une phrase avec "...")
 * tout en remplissant élégamment l'espace disponible de la carte sans déborder.
 *
 * @param {string} [rawText=''] - Extrait brut reçu de l'API Wikipédia
 * @param {number} [maxLength=320] - Longueur cible maximale en caractères
 * @returns {string} Extrait propre composé exclusivement de phrases complètes
 */
export function formatCompleteExtract(rawText = '', maxLength = 320) {
  const cleaned = rawText.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return "Article encyclopédique référencé sur l'édition francophone de Wikipédia.";
  }

  // Si le texte complet tient déjà dans maxLength, on le retourne directement
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Protection des abréviations françaises courantes pour éviter les faux découpages de phrases
  const ABBREVS = [
    { regex: /\bav\.\s+J\.-C\./gi, token: '___AV_JC___' },
    { regex: /\bJ\.-C\./gi, token: '___JC___' },
    { regex: /\b(etc|vol|fasc|hab|art|al|cf|env|ref|ex)\./gi, token: '$1___DOT___' },
    { regex: /\b(M|Mme|Mlle|Dr|Prof|St|Ste)\./gi, token: '$1___DOT___' },
    { regex: /(\d+)\.(\d+)/g, token: '$1___DECIMAL___$2' },
  ];

  let masked = cleaned;
  ABBREVS.forEach(({ regex, token }) => {
    masked = masked.replace(regex, token);
  });

  const rawSentences = masked.match(/[^.!?…]+[.!?…]+(?:\s+|$)/g) || [masked];
  const sentences = rawSentences
    .map((s) => {
      let unmasked = s;
      unmasked = unmasked.replace(/___AV_JC___/g, 'av. J.-C.');
      unmasked = unmasked.replace(/___JC___/g, 'J.-C.');
      unmasked = unmasked.replace(/___DOT___/g, '.');
      unmasked = unmasked.replace(/___DECIMAL___/g, '.');
      return unmasked.trim();
    })
    .filter(Boolean);

  let result = '';
  for (const sentence of sentences) {
    const candidate = result ? `${result} ${sentence}` : sentence;
    if (candidate.length <= maxLength) {
      result = candidate;
    } else {
      break;
    }
  }

  // Si la toute première phrase dépasse légèrement maxLength (jusqu'à 420 chars),
  // on la conserve ENTIÈRE pour respecter la règle de coupure stricte en fin de phrase.
  if (!result && sentences.length > 0) {
    if (sentences[0].length <= 420) {
      return sentences[0];
    }
    // Cas exceptionnel d'une phrase monstre sans ponctuation de plus de 420 caractères
    const sub = sentences[0].slice(0, maxLength - 1);
    const lastComma = sub.lastIndexOf(',');
    const lastSpace = sub.lastIndexOf(' ');
    const cutIndex = lastComma > maxLength * 0.65 ? lastComma : lastSpace;
    return `${sub.slice(0, cutIndex).trim()}.`;
  }

  return result.trim();
}
