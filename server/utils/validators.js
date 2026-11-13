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

/**
 * Assainit et valide la charge utile d'un compte utilisateur reçue par l'API.
 * Protège le stockage contre l'injection de payloads corrompus ou géants sans entraver les gains légitimes.
 *
 * @param {Record<string, any>} payload - Données brutes soumises par le client
 * @param {Record<string, any>} [existingUser={}] - Données actuelles du joueur si disponibles
 * @returns {Record<string, any>} Données assainies et sécurisées
 */
export function sanitizeUserPayload(payload, existingUser = {}) {
  if (!payload || typeof payload !== 'object') {
    return existingUser;
  }

  const sanitized = { ...payload };

  // 1. Wikithunes : borné à [0, 10_000_000], immunisé contre NaN et Infinity
  if (typeof payload.wikithunes === 'number') {
    if (!Number.isFinite(payload.wikithunes) || Number.isNaN(payload.wikithunes)) {
      sanitized.wikithunes = Number(existingUser.wikithunes) || 0;
    } else {
      sanitized.wikithunes = Math.max(
        0,
        Math.min(10_000_000, Math.floor(payload.wikithunes))
      );
    }
  } else if (existingUser.wikithunes !== undefined) {
    sanitized.wikithunes = Math.max(
      0,
      Math.min(10_000_000, Math.floor(Number(existingUser.wikithunes) || 0))
    );
  }

  // 2. Collection de cartes : count borné [1, 9999], extract tronqué proprement à 450 car max
  if (Array.isArray(payload.collection)) {
    sanitized.collection = payload.collection
      .filter((card) => isValidCard(card))
      .map((card) => {
        const count = Math.max(
          1,
          Math.min(9999, Math.floor(Number(card.count) || 1))
        );
        const extract = typeof card.extract === 'string'
          ? card.extract.slice(0, 450)
          : '';
        const description = typeof card.description === 'string'
          ? card.description.slice(0, 300)
          : '';

        return {
          ...card,
          id: String(card.id),
          count,
          extract,
          description,
        };
      });
  }

  // 3. Profil public : limitation des longueurs textuelles et normalisation des étagères
  if (payload.profile && typeof payload.profile === 'object') {
    const rawShowcaseIds = Array.isArray(payload.profile.showcaseIds)
      ? payload.profile.showcaseIds
          .slice(0, 5)
          .map((id) => (id && id !== 'null' ? String(id) : null))
      : [];

    let rawShelves = Array.isArray(payload.profile.shelves) && payload.profile.shelves.length > 0
      ? payload.profile.shelves
      : null;

    if (!rawShelves && Array.isArray(existingUser.profile?.shelves) && existingUser.profile.shelves.length > 0 && payload.profile.shelves === undefined) {
      rawShelves = existingUser.profile.shelves;
    }

    const sanitizedShelves = (rawShelves || [
      {
        id: 'shelf-1',
        name: 'Vitrine du collectionneur',
        cardIds: rawShowcaseIds,
      },
    ])
      .slice(0, 4)
      .map((shelf, idx) => {
        const rawIds = Array.isArray(shelf?.cardIds) ? shelf.cardIds : [];
        const cardIds = Array.from({ length: 5 }, (_, i) => {
          const val = rawIds[i];
          return val && val !== 'null' ? String(val) : null;
        });
        const fallbackName =
          idx === 0 ? 'Vitrine du collectionneur' : `Étagère ${idx + 1}`;
        const cleanName = String(shelf?.name || '').trim().slice(0, 45);
        return {
          id: String(shelf?.id || `shelf-${idx + 1}`).slice(0, 40),
          name: cleanName || fallbackName,
          cardIds,
        };
      });

    sanitized.profile = {
      ...payload.profile,
      username: String(payload.profile.username || 'Wikipédien').slice(0, 40),
      bio: String(payload.profile.bio || '').slice(0, 500),
      avatar: String(payload.profile.avatar || '').slice(0, 500),
      showcaseIds:
        rawShowcaseIds.length > 0
          ? rawShowcaseIds
          : sanitizedShelves[0].cardIds.filter(Boolean).slice(0, 5),
      shelves: sanitizedShelves,
    };
  }

  // 4. Statistiques de jeu : préservation intégrale et validation des types
  if (payload.stats && typeof payload.stats === 'object') {
    const rawStats = payload.stats;
    sanitized.stats = {
      boostersOpened: Math.max(0, Math.floor(Number(rawStats.boostersOpened) || 0)),
      totalCardsDrawn: Math.max(0, Math.floor(Number(rawStats.totalCardsDrawn) || 0)),
      wonCards: Math.max(0, Math.floor(Number(rawStats.wonCards) || 0)),
      lostCards: Math.max(0, Math.floor(Number(rawStats.lostCards) || 0)),
      lostMoneyCasino: Math.max(0, Math.floor(Number(rawStats.lostMoneyCasino) || 0)),
      netCasinoGains: Math.max(0, Math.floor(Number(rawStats.netCasinoGains) || 0)),
      recordStreak: Math.max(0, Math.floor(Number(rawStats.recordStreak) || 0)),
      duelVictories: Math.max(0, Math.floor(Number(rawStats.duelVictories) || 0)),
      duelDefeats: Math.max(0, Math.floor(Number(rawStats.duelDefeats) || 0)),
    };
  }

  // 5. Favoris
  if (Array.isArray(payload.favorites)) {
    sanitized.favorites = payload.favorites.map(String).slice(0, 500);
  }

  // 6. Boosters gratuits
  if (payload.freeBoostersCount !== undefined) {
    sanitized.freeBoostersCount = Math.max(
      0,
      Math.min(50, Math.floor(Number(payload.freeBoostersCount) || 0))
    );
  }

  return sanitized;
}
