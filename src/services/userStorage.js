const USER_CODE_STORAGE_KEY = 'wikicards_user_code_v1';
const USER_PROFILE_STORAGE_KEY = 'wikicards_user_profile_v1';
const USER_UPDATED_AT_STORAGE_KEY = 'wikicards_updated_at_v1';
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
        return {
          ...getDefaultProfile(cleanCode),
          ...rest,
          showcaseIds: Array.isArray(rest.showcaseIds)
            ? rest.showcaseIds.slice(0, 4)
            : [],
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
    };
  }
  return getDefaultProfile(cleanCode);
}

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

export function setStoredUpdatedAt(ts) {
  const validTs = Number(ts) || Date.now();
  try {
    localStorage.setItem(USER_UPDATED_AT_STORAGE_KEY, String(validTs));
  } catch {
    // ignore
  }
  return validTs;
}

// Compare deux états d'un même compte et détermine si `candidate` est plus récent / plus avancé que `baseline`
export function isAccountStateNewer(candidate, baseline) {
  if (!candidate) return false;
  if (!baseline) return true;

  const candDraws = Number(candidate.stats?.totalCardsDrawn || 0);
  const baseDraws = Number(baseline.stats?.totalCardsDrawn || 0);
  const candBoosters = Number(candidate.stats?.boostersOpened || 0);
  const baseBoosters = Number(baseline.stats?.boostersOpened || 0);

  if (candDraws !== baseDraws) {
    return candDraws > baseDraws;
  }
  if (candBoosters !== baseBoosters) {
    return candBoosters > baseBoosters;
  }

  const candTs = Number(candidate.updatedAt || candidate.clientUpdatedAt || 0);
  const baseTs = Number(baseline.updatedAt || baseline.clientUpdatedAt || 0);
  return candTs > baseTs;
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

// Interroge l'état du compte directement sur le serveur (sans cache)
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

// Synchronise les données complètes de l'utilisateur vers data/users/<CODE>.json
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

// Charge un compte utilisateur par son Code Unique depuis data/users/<CODE>.json
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
  return [];
}

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

