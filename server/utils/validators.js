/**
 * @file Rôle : Fonctions pures de validation et sanitization pour les données API du backend.
 * Dépendances : Aucune.
 * Effets de bord : Aucun (fonctions pures).
 */

/**
 * Nettoie et normalise un code de compte joueur (ex: "WIKI-ABCD-1234").
 * @param {string} code - Code brut entré
 * @returns {string} Code assaini en majuscules alphanumériques avec tirets
 */
export function sanitizeCode(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
}

/**
 * Vérifie si un code joueur est valide (non vide et longueur acceptable).
 * @param {string} code - Code à vérifier
 * @returns {boolean} Vrai si le code est syntaxiquement valide
 */
export function isValidUserCode(code) {
  const clean = sanitizeCode(code);
  return clean.length >= 3 && clean.length <= 32;
}

/**
 * Vérifie si un montant de Wikithunes (₩) est un entier positif ou nul valide.
 * @param {unknown} amount - Montant à vérifier
 * @returns {boolean} Vrai si le montant est un entier fini non-négatif
 */
export function isValidWikithuneAmount(amount) {
  return (
    typeof amount === 'number' &&
    Number.isFinite(amount) &&
    amount >= 0 &&
    Math.floor(amount) === amount
  );
}

/**
 * Vérifie si un objet carte présente les champs minimaux obligatoires (id, title, rarity).
 * @param {unknown} card - Carte à vérifier
 * @returns {boolean} Vrai si l'objet est une carte valide
 */
export function isValidCard(card) {
  return Boolean(
    card &&
    typeof card === 'object' &&
    typeof card.id === 'string' &&
    card.id.trim().length > 0 &&
    typeof card.title === 'string'
  );
}
