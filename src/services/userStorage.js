/**
 * @file Rôle : Gestion du stockage local, arbitrage des versions et synchronisation API des comptes joueurs.
 * Dépendances : localStorage natif, fetch API native.
 * Effets de bord : Lecture/écriture dans localStorage et requêtes réseau HTTP vers les routes /api/*.
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} username - Pseudonyme communautaire
 * @property {string} avatar - URL de l'image d'avatar
 * @property {string} bio - Courte biographie du profil
 * @property {string[]} showcaseIds - Jusqu'à 4 IDs de cartes en vitrine
 * @property {'light'|'dark'} themePreference - Thème d'interface favori
 */

/**
 * @typedef {Object} UserAccountStats
 * @property {number} boostersOpened - Total de boosters ouverts
 * @property {number} totalCardsDrawn - Total de cartes obtenues
 * @property {number} wonCards - Cartes gagnées aux mini-jeux
 * @property {number} lostCards - Cartes perdues aux mini-jeux
 * @property {number} lostMoneyCasino - Argent perdu aux jeux
 * @property {number} netCasinoGains - Gains bruts empochés
 * @property {number} recordStreak - Série record Plus ou Moins
 * @property {number} [duelVictories] - Victoires en duels
 * @property {number} [duelDefeats] - Défaites en duels
 */

/**
 * @typedef {Object} UserAccount
 * @property {string} code - Identifiant normalisé WIKI-XXXX
 * @property {UserProfile} profile - Profil public du joueur
 * @property {Array<Object>} collection - Inventaire des cartes
 * @property {number} wikithunes - Solde de monnaie
 * @property {number} [freeBoostersCount] - Boosters gratuits disponibles
 * @property {number} [lastFreeBoostersResetTime] - Horodatage de recharge
 * @property {string} [lastDailyClaimDate] - Date journalière YYYY-MM-DD
 * @property {UserAccountStats} stats - Statistiques de progression
 * @property {string[]} [favorites] - IDs des cartes favorites
 * @property {number} [createdAt] - Date de création du compte
 * @property {number} [updatedAt] - Date de dernière mise à jour
 */

const USER_CODE_STORAGE_KEY = 'wikicards_user_code_v1';
const USER_PROFILE_STORAGE_KEY = 'wikicards_user_profile_v1';
const USER_UPDATED_AT_STORAGE_KEY = 'wikicards_updated_at_v1';
const LOCAL_USERS_DIRECTORY_KEY = 'wikicards_local_users_dir_v1';

/**
 * Génère un code unique au format WIKI-XXXX (4 caractères alphanumériques non ambigus).
 * @returns {string} Nouveau code généré
 */
export function generateUniqueUserCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const block = Array.from(
    { length: 4 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `WIKI-${block}`;
}

/**
 * Nettoie et normalise la casse et les tirets d'un code utilisateur.
 * @param {string} input - Chaîne brute saisie ou reçue
 * @returns {string} Code normalisé
 */
export function normalizeUserCode(input) {
  const raw = String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (raw.startsWith('WIKI')) {
    const rest = raw.slice(4);
    if (rest.length === 4) {
      return `WIKI-${rest}`;
    }
    if (rest.length === 8) {
      return `WIKI-${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
    }
  }
  if (raw.length === 4) {
    return `WIKI-${raw}`;
  }
  if (raw.length === 8) {
    return `WIKI-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  }
  return String(input || '')
    .trim()
    .toUpperCase();
}

/**
 * Vérifie si un code correspond au format officiel attendu (WIKI-XXXX ou WIKI-XXXX-XXXX).
 * @param {string} code - Code à valider
 * @returns {boolean} Vrai si le format est valide
 */
export function isValidUserCode(code) {
  return /^WIKI-[A-Z0-9]{4}(-[A-Z0-9]{4})?$/.test(normalizeUserCode(code));
}

/**
 * Récupère le code stocké localement sans en créer un nouveau automatiquement.
 * @returns {string|null} Code utilisateur stocké ou null
 */
export function getStoredUserCode() {
  try {
    const saved = localStorage.getItem(USER_CODE_STORAGE_KEY);
    if (saved && isValidUserCode(saved)) {
      return normalizeUserCode(saved);
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Supprime le code utilisateur stocké (déconnexion locale).
 * @returns {void}
 */
export function clearStoredUserCode() {
  try {
    localStorage.removeItem(USER_CODE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Récupère le code existant ou en initialise un nouveau immédiatement en localStorage.
 * @returns {string} Code utilisateur garanti
 */
export function getOrCreateUserCode() {
  const existing = getStoredUserCode();
  if (existing) return existing;
  const freshCode = generateUniqueUserCode();
  try {
    localStorage.setItem(USER_CODE_STORAGE_KEY, freshCode);
  } catch {
    // ignore
  }
  return freshCode;
}

/**
 * Enregistre explicitement un code utilisateur dans le stockage local.
 * @param {string} code - Code à persister
 * @returns {string} Code normalisé enregistré
 */
export function setStoredUserCode(code) {
  const clean = normalizeUserCode(code);
  try {
    localStorage.setItem(USER_CODE_STORAGE_KEY, clean);
  } catch {
    // ignore
  }
  return clean;
}

/** Nombre maximal d'étagères personnalisables par profil */
export const MAX_PROFILE_SHELVES = 4;

/** Nombre maximal de cartes par étagère */
export const MAX_CARDS_PER_SHELF = 6;

/**
 * @typedef {Object} ProfileShelf
 * @property {string} id - Identifiant unique de l'étagère
 * @property {string} name - Nom personnalisable de l'étagère
 * @property {Array<string|null>} cardIds - Tableau de 6 emplacements (ID de carte ou null)
 */

/**
 * Normalise les étagères d'un profil (rétrocompatible avec l'ancienne vitrine `showcaseIds`).
 * @param {Object|null} profile - Profil brut du joueur
 * @returns {Array<ProfileShelf>} Liste de 1 à 4 étagères normalisées à 5 emplacements
 */
export function normalizeProfileShelves(profile) {
  if (Array.isArray(profile?.shelves) && profile.shelves.length > 0) {
    return profile.shelves.slice(0, MAX_PROFILE_SHELVES).map((shelf, idx) => {
      const rawCardIds = Array.isArray(shelf?.cardIds) ? shelf.cardIds : [];
      const cardIds = Array.from({ length: MAX_CARDS_PER_SHELF }, (_, i) => {
        const val = rawCardIds[i];
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
  }

  const legacy = Array.isArray(profile?.showcaseIds) ? profile.showcaseIds : [];
  return [
    {
      id: 'shelf-1',
      name: 'Vitrine du collectionneur',
      cardIds: Array.from({ length: MAX_CARDS_PER_SHELF }, (_, i) => {
        const val = legacy[i];
        return val && val !== 'null' ? String(val) : null;
      }),
    },
  ];
}

/**
 * Construit un objet de profil par défaut pour un compte.
 * @param {string} code - Code utilisateur associé
 * @returns {UserProfile} Objet profil initial
 */
export function getDefaultProfile(code) {
  const suffix = String(code || 'WIKI-0000-0000').slice(-4);
  return {
    username: `Wikipédien-${suffix}`,
    avatar: 'https://fr.wikipedia.org/static/images/icons/wikipedia.png',
    bio: 'Contributeur et collectionneur d’articles sur Wikipédia FR.',
    showcaseIds: [], // Rétrocompatibilité avec les anciennes vitrines
    shelves: [
      {
        id: 'shelf-1',
        name: 'Vitrine du collectionneur',
        cardIds: [null, null, null, null, null],
      },
    ],
    themePreference: 'light', // Mode clair par défaut
  };
}

/**
 * Charge le profil utilisateur local associé à un code.
 * @param {string} code - Code utilisateur
 * @returns {UserProfile} Objet profil résolu
 */
export function loadLocalProfile(code) {
  const cleanCode = normalizeUserCode(code);
  try {
    const saved = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        parsed &&
        typeof parsed === 'object' &&
        (!parsed._code || normalizeUserCode(parsed._code) === cleanCode) &&
        !String(parsed.username || '').endsWith('-0000')
      ) {
        const { _code, ...rest } = parsed;
        const normalizedShelves = normalizeProfileShelves(rest);
        return {
          ...getDefaultProfile(cleanCode),
          ...rest,
          showcaseIds: Array.isArray(rest.showcaseIds)
            ? rest.showcaseIds.slice(0, MAX_CARDS_PER_SHELF).map((id) =>
                id && id !== 'null' ? String(id) : null
              )
            : [],
          shelves: normalizedShelves,
        };
      }
    }
  } catch {
    // ignore
  }
  const fallback = loadFromLocalDirectoryFallback(cleanCode);
  if (fallback?.profile) {
    return {
      ...getDefaultProfile(cleanCode),
      ...fallback.profile,
      shelves: normalizeProfileShelves(fallback.profile),
    };
  }
  return getDefaultProfile(cleanCode);
}

/**
 * Sauvegarde localement le profil d'un joueur.
 * @param {UserProfile} profile - Objet profil à persister
 * @param {string} [code] - Code du compte concerné
 * @returns {void}
 */
export function saveLocalProfile(profile, code) {
  if (!profile) return;
  const cleanCode = code ? normalizeUserCode(code) : getStoredUserCode();
  if (!cleanCode || cleanCode === 'WIKI-0000') return;
  try {
    localStorage.setItem(
      USER_PROFILE_STORAGE_KEY,
      JSON.stringify({ ...profile, _code: cleanCode })
    );
  } catch {
    // ignore
  }
}

/**
 * Récupère le dernier horodatage de synchronisation connu d'un compte.
 * @param {string} code - Code utilisateur
 * @param {Array<Object>} [collection=[]] - Collection pour recherche de fallback
 * @returns {number} Timestamp ms du dernier changement
 */
export function getStoredUpdatedAt(code, collection = []) {
  try {
    const saved = Number(localStorage.getItem(USER_UPDATED_AT_STORAGE_KEY) || 0);
    if (saved > 0) return saved;
  } catch {
    // ignore
  }
  // Fallback : date d'obtention de la dernière carte tirée dans le classeur
  if (Array.isArray(collection) && collection.length > 0) {
    const maxCardTs = collection.reduce(
      (max, c) => Math.max(max, Number(c?.obtainedAt || 0)),
      0
    );
    if (maxCardTs > 0) return maxCardTs;
  }
  const cleanCode = normalizeUserCode(code);
  const fallback = loadFromLocalDirectoryFallback(cleanCode);
  return Number(fallback?.updatedAt || 0);
}

/**
 * Enregistre le timestamp de dernière modification dans le stockage local.
 * @param {number|string} ts - Horodatage ms
 * @returns {number} Horodatage valide enregistré
 */
export function setStoredUpdatedAt(ts) {
  const validTs = Number(ts) || Date.now();
  try {
    localStorage.setItem(USER_UPDATED_AT_STORAGE_KEY, String(validTs));
  } catch {
    // ignore
  }
  return validTs;
}

/**
 * Compare deux états d'un compte et détermine si candidate est plus récent ou avancé que baseline.
 * @param {UserAccount|null} candidate - Sauvegarde candidate à évaluer
 * @param {UserAccount|null} baseline - Sauvegarde de référence
 * @returns {boolean} Vrai si candidate doit primer
 */
export function isAccountStateNewer(candidate, baseline) {
  if (!candidate) return false;
  if (!baseline) return true;

  const candBoosters = Number(candidate.stats?.boostersOpened || 0);
  const baseBoosters = Number(baseline.stats?.boostersOpened || 0);
  const candDraws = Number(candidate.stats?.totalCardsDrawn || 0);
  const baseDraws = Number(baseline.stats?.totalCardsDrawn || 0);

  const candTs = Number(candidate.updatedAt || candidate.clientUpdatedAt || 0);
  const baseTs = Number(baseline.updatedAt || baseline.clientUpdatedAt || 0);

  // 1. Si candidate a strictement plus de boosters ouverts ET un horodatage >= au baseline
  if (candBoosters > baseBoosters && candTs >= baseTs) {
    return true;
  }
  if (baseBoosters > candBoosters && baseTs >= candTs) {
    return false;
  }

  // 2. Si candidate a strictement plus de tirages ET un horodatage >= au baseline
  if (candDraws > baseDraws && candTs >= baseTs) {
    return true;
  }
  if (baseDraws > candDraws && baseTs >= candTs) {
    return false;
  }

  // 3. Si l'un des deux a un horodatage strictement plus récent, le plus récent l'emporte
  // (permet les suppressions et sacrifices légitimes de cartes lors des upgrades, quitte ou double ou recyclage)
  if (candTs > 0 && baseTs > 0 && candTs !== baseTs) {
    return candTs > baseTs;
  }

  // 4. Si les horodatages sont identiques ou nuls, comparer le nombre de cartes ou tirages
  const candColLen = Array.isArray(candidate.collection)
    ? candidate.collection.length
    : 0;
  const baseColLen = Array.isArray(baseline.collection)
    ? baseline.collection.length
    : 0;
  if (candColLen !== baseColLen) {
    return candColLen > baseColLen;
  }

  return candDraws > baseDraws;
}

// Sauvegarde de secours dans localStorage au cas où l'utilisateur ouvre le build statique sans serveur
function saveToLocalDirectoryFallback(code, payload, timestamp) {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_DIRECTORY_KEY);
    const dir = raw ? JSON.parse(raw) : {};
    dir[code] = {
      ...payload,
      code,
      updatedAt: timestamp || payload?.clientUpdatedAt || payload?.updatedAt || Date.now(),
    };
    localStorage.setItem(LOCAL_USERS_DIRECTORY_KEY, JSON.stringify(dir));
  } catch {
    // ignore quota
  }
}

function loadFromLocalDirectoryFallback(code) {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_DIRECTORY_KEY);
    if (!raw) return null;
    const dir = JSON.parse(raw);
    return dir[code] || null;
  } catch {
    return null;
  }
}

/**
 * Interroge l'état du compte directement sur le serveur (/api/users/:code).
 * @param {string} code - Code d'identification
 * @returns {Promise<{ status: 'ok'|'not_found'|'invalid'|'error'|'offline', user: UserAccount|null }>}
 */
export async function fetchServerUserAccount(code) {
  const cleanCode = normalizeUserCode(code);
  if (!isValidUserCode(cleanCode)) {
    return { status: 'invalid', user: null };
  }
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(cleanCode)}`, {
      cache: 'no-store',
    });
    if (res.status === 404) {
      return { status: 'not_found', user: null };
    }
    if (res.ok) {
      const json = await res.json();
      if (json.ok && json.user) {
        return { status: 'ok', user: json.user };
      }
    }
    return { status: 'error', user: null };
  } catch {
    return { status: 'offline', user: null };
  }
}

/**
 * Synchronise l'état complet du joueur vers le serveur avec protection anti-écrasement.
 * @param {string} code - Code utilisateur
 * @param {Partial<UserAccount>} data - Données à synchroniser
 * @param {{ forceOverwrite?: boolean }} [options={}] - Options de synchronisation
 * @returns {Promise<{ user: UserAccount|null, serverIsNewer: boolean }|null>}
 */
export async function syncUserAccountToServer(code, data, options = {}) {
  const cleanCode = normalizeUserCode(code);
  if (!isValidUserCode(cleanCode)) return null;

  const clientUpdatedAt =
    Number(data?.clientUpdatedAt || data?.updatedAt) ||
    getStoredUpdatedAt(cleanCode, data?.collection) ||
    Date.now();

  saveToLocalDirectoryFallback(cleanCode, data, clientUpdatedAt);

  try {
    const res = await fetch(`/api/users/${encodeURIComponent(cleanCode)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        code: cleanCode,
        ...data,
        clientUpdatedAt,
        forceOverwrite: Boolean(options.forceOverwrite),
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.user) {
      saveToLocalDirectoryFallback(cleanCode, json.user, json.user.updatedAt);
    }
    return {
      user: json.user || null,
      serverIsNewer: Boolean(json.serverIsNewer),
    };
  } catch {
    return null;
  }
}

/**
 * Charge un compte utilisateur par son code unique depuis l'API ou le fallback local.
 * @param {string} code - Code du compte à charger
 * @returns {Promise<UserAccount>}
 */
export async function fetchUserAccountByCode(code) {
  const cleanCode = normalizeUserCode(code);
  if (!isValidUserCode(cleanCode)) {
    throw new Error(
      'Format de code invalide. Exemple attendu : WIKI-4GU5'
    );
  }

  try {
    const res = await fetch(`/api/users/${encodeURIComponent(cleanCode)}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      if (json.ok && json.user) {
        return json.user;
      }
    }
  } catch {
    // fallback localStorage
  }

  const fallback = loadFromLocalDirectoryFallback(cleanCode);
  if (fallback) return fallback;

  throw new Error(`Aucun compte trouvé pour le code ${cleanCode}.`);
}

// =====================================================================
// API COMMUNAUTÉ / SOCIAL & ÉCHANGES (/api/users & /api/trades)
// =====================================================================

/**
 * Récupère l'annuaire public de l'ensemble des joueurs enregistrés.
 * @returns {Promise<Array<{ code: string, profile: UserProfile, stats: UserAccountStats, collectionLength: number }>>}
 */
export async function fetchAllUsersDirectory() {
  try {
    const res = await fetch('/api/users', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.ok && Array.isArray(json.users)) {
        return json.users;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Récupère la liste des propositions d'échanges actives ou passées d'un joueur.
 * @param {string} userCode - Code du joueur
 * @returns {Promise<Array<Object>|null>} Liste des échanges
 */
export async function fetchUserTrades(userCode) {
  try {
    const res = await fetch(
      `/api/trades?code=${encodeURIComponent(normalizeUserCode(userCode))}`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const json = await res.json();
      if (json.ok && Array.isArray(json.trades)) {
        return json.trades;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Propose une nouvelle offre d'échange de cartes à un joueur tiers.
 * @param {Object} params
 * @param {string} params.fromCode - Code de l'émetteur
 * @param {string} params.toCode - Code du destinataire
 * @param {Array<Object>} params.offeredCards - Cartes proposées
 * @param {Array<Object>} params.requestedCards - Cartes demandées
 * @returns {Promise<Object>} Échange créé
 */
export async function createTradeOffer({
  fromCode,
  toCode,
  offeredCards,
  requestedCards,
}) {
  const res = await fetch('/api/trades', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromCode: normalizeUserCode(fromCode),
      toCode: normalizeUserCode(toCode),
      offeredCards,
      requestedCards,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) {
    throw new Error(json.error || "Impossible d'envoyer l'offre d'échange.");
  }
  return json.trade;
}

/**
 * Répond à une offre d'échange reçue ou annule une offre émise.
 * @param {string} tradeId - Identifiant de l'échange
 * @param {'accept'|'decline'|'cancel'} action - Action à exécuter
 * @returns {Promise<Object>} Réponse du serveur
 */
export async function respondToTradeOffer(tradeId, action) {
  // action: 'accept' | 'decline' | 'cancel'
  const res = await fetch(
    `/api/trades/${encodeURIComponent(tradeId)}/${action}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  const json = await res.json();
  if (!res.ok || !json.ok) {
    throw new Error(json.error || "Impossible de traiter l'offre d'échange.");
  }
  return json;
}

// =====================================================================
// API MARCHÉ AUX ENCHÈRES (/api/market)
// =====================================================================

/**
 * Récupère l'ensemble des annonces d'enchères et de ventes directes actives.
 * @returns {Promise<Array<Object>>} Liste des annonces du marché
 */
export async function fetchMarketListings() {
  try {
    const res = await fetch('/api/market', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.ok && Array.isArray(json.listings)) {
        return json.listings;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Met une carte de sa collection en vente sur la salle des marchés.
 * @param {Object} params
 * @param {string} params.sellerCode - Code du vendeur
 * @param {string} params.cardId - Identifiant de la carte mise en vente
 * @param {number} params.startingBid - Prix de mise à prix de départ
 * @param {number} params.buyoutPrice - Prix d'achat immédiat direct
 * @returns {Promise<Object>} Résultat de la publication
 */
export async function createMarketListing({
  sellerCode,
  cardId,
  startingBid,
  buyoutPrice,
}) {
  const res = await fetch('/api/market', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sellerCode: normalizeUserCode(sellerCode),
      cardId,
      startingBid,
      buyoutPrice,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) {
    throw new Error(json.error || 'Impossible de mettre la carte en vente.');
  }
  return json;
}

/**
 * Exécute une opération sur une annonce du marché (enchérir, acheter, annuler).
 * @param {string} listingId - Identifiant de l'annonce
 * @param {'buy'|'bid'|'cancel'|'accept_bid'} action - Type d'action
 * @param {Object} [payload={}] - Paramètres additionnels (ex: userCode, bidAmount)
 * @returns {Promise<Object>} Résultat de l'action
 */
export async function performMarketAction(listingId, action, payload = {}) {
  // action: 'buy' | 'bid' | 'cancel' | 'accept_bid'
  const res = await fetch(
    `/api/market/${encodeURIComponent(listingId)}/${action}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  const json = await res.json();
  if (!res.ok || !json.ok) {
    throw new Error(json.error || 'Action sur le marché impossible.');
  }
  return json;
}

// =====================================================================
// SUPPRESSION DÉFINITIVE DU COMPTE (/api/users/:code)
// =====================================================================

/**
 * Supprime définitivement un compte joueur côté serveur et nettoie le stockage local.
 * @param {string} code - Code du compte à supprimer
 * @returns {Promise<boolean>} Vrai après suppression
 */
export async function deleteUserAccount(code) {
  const cleanCode = normalizeUserCode(code);
  if (!isValidUserCode(cleanCode)) {
    throw new Error('Code utilisateur invalide');
  }

  // 1. Suppression sur le serveur
  try {
    await fetch(`/api/users/${encodeURIComponent(cleanCode)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
  } catch (err) {
    console.warn('[deleteUserAccount] Serveur non joignable:', err);
  }

  // 2. Nettoyage de l'annuaire local de secours
  try {
    const raw = localStorage.getItem(LOCAL_USERS_DIRECTORY_KEY);
    if (raw) {
      const dir = JSON.parse(raw);
      if (dir[cleanCode]) {
        delete dir[cleanCode];
        localStorage.setItem(LOCAL_USERS_DIRECTORY_KEY, JSON.stringify(dir));
      }
    }
  } catch {
    // ignore
  }

  // 3. Suppression des clés locales liées à l'identification
  try {
    localStorage.removeItem(USER_CODE_STORAGE_KEY);
    localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
    localStorage.removeItem(USER_UPDATED_AT_STORAGE_KEY);
  } catch {
    // ignore
  }

  return true;
}


