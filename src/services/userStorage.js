const USER_CODE_STORAGE_KEY = 'wikicards_user_code_v1';
const USER_PROFILE_STORAGE_KEY = 'wikicards_user_profile_v1';
const LOCAL_USERS_DIRECTORY_KEY = 'wikicards_local_users_dir_v1';

// Génère un code unique au format WIKI-XXXX (4 caractères non ambigus, ex : WIKI-4GU5)
export function generateUniqueUserCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const block = Array.from(
    { length: 4 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `WIKI-${block}`;
}

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

export function isValidUserCode(code) {
  return /^WIKI-[A-Z0-9]{4}(-[A-Z0-9]{4})?$/.test(normalizeUserCode(code));
}

// Récupère le code stocké localement sans en créer un nouveau automatiquement
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

// Supprime le code utilisateur stocké (déconnexion)
export function clearStoredUserCode() {
  try {
    localStorage.removeItem(USER_CODE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

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

export function setStoredUserCode(code) {
  const clean = normalizeUserCode(code);
  try {
    localStorage.setItem(USER_CODE_STORAGE_KEY, clean);
  } catch {
    // ignore
  }
  return clean;
}

export function getDefaultProfile(code) {
  const suffix = String(code || 'WIKI-0000-0000').slice(-4);
  return {
    username: `Wikipédien-${suffix}`,
    avatar: 'https://fr.wikipedia.org/static/images/icons/wikipedia.png',
    bio: 'Contributeur et collectionneur d’articles sur Wikipédia FR.',
    showcaseIds: [], // Jusqu'à 4 IDs de cartes exposées en vitrine
  };
}

export function loadLocalProfile(code) {
  try {
    const saved = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          ...getDefaultProfile(code),
          ...parsed,
          showcaseIds: Array.isArray(parsed.showcaseIds)
            ? parsed.showcaseIds.slice(0, 4)
            : [],
        };
      }
    }
  } catch {
    // ignore
  }
  return getDefaultProfile(code);
}

export function saveLocalProfile(profile) {
  try {
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

// Sauvegarde de secours dans localStorage au cas où l'utilisateur ouvre le build statique sans serveur
function saveToLocalDirectoryFallback(code, payload) {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_DIRECTORY_KEY);
    const dir = raw ? JSON.parse(raw) : {};
    dir[code] = {
      ...payload,
      code,
      updatedAt: Date.now(),
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

// Synchronise les données complètes de l'utilisateur vers data/users/<CODE>.json
export async function syncUserAccountToServer(code, data) {
  const cleanCode = normalizeUserCode(code);
  if (!isValidUserCode(cleanCode)) return null;

  saveToLocalDirectoryFallback(cleanCode, data);

  try {
    const res = await fetch(`/api/users/${encodeURIComponent(cleanCode)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: cleanCode,
        ...data,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.user || null;
  } catch {
    return null;
  }
}

// Charge un compte utilisateur par son Code Unique depuis data/users/<CODE>.json
export async function fetchUserAccountByCode(code) {
  const cleanCode = normalizeUserCode(code);
  if (!isValidUserCode(cleanCode)) {
    throw new Error(
      'Format de code invalide. Exemple attendu : WIKI-4GU5'
    );
  }

  try {
    const res = await fetch(`/api/users/${encodeURIComponent(cleanCode)}`);
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
export async function fetchAllUsersDirectory() {
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const json = await res.json();
      if (json.ok && Array.isArray(json.users)) {
        return json.users;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export async function fetchUserTrades(userCode) {
  try {
    const res = await fetch(
      `/api/trades?code=${encodeURIComponent(normalizeUserCode(userCode))}`
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
  return [];
}

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
export async function fetchMarketListings() {
  try {
    const res = await fetch('/api/market');
    if (res.ok) {
      const json = await res.json();
      if (json.ok && Array.isArray(json.listings)) {
        return json.listings;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

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

