/**
 * @file Rôle : Custom hook gérant la logique d'ouverture des sachets de cartes, préchargement, détection iconique et étapes d'animation.
 * Dépendances : React, `canvas-confetti`, `../services/wikipedia`, `../services/sound`, `../config/rarities`.
 * Effets de bord : Lecture/écriture localStorage pour booster iconique, audio procédural, confettis de rareté, requêtes Wikipédia.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { fetchBoosterPackCards } from '../services/wikipedia';
import {
  BOOSTER_PRICE,
  ICONIC_BOOSTER_PRICE,
  BOOSTER_TYPES,
  getBoosterTypeConfig,
  rollNextBoosterType,
  RARITY_ORDER,
  RARITIES,
} from '../config/rarities';
import { soundManager } from '../services/sound';

const STORAGE_KEY_NEXT_BOOSTER_TYPE = 'wikicards_next_booster_type_v2';
const STORAGE_KEY_PRELOADED_PACK = 'wikicards_preloaded_booster_pack_v2';

// Cache global de module : persiste entre les changements d'onglets (Classeur, Casino, Marché, Social -> Accueil)
// et démarre dès l'import du module pour que le 1er booster soit déjà prêt au clic.
let globalPreloadedPack = null;
let globalPreloadPromise = null;
let globalIsPreloading = false;
let globalForceNextFakeOut = false;

/**
 * Permet au Debug Menu local de forcer un Fake-Out sur le prochain booster ouvert.
 * @param {boolean} [value=true] - Vrai pour forcer le Fake-Out
 */
export function setDebugForceNextFakeOut(value = true) {
  globalForceNextFakeOut = Boolean(value);
}

/**
 * Précharge en mémoire les illustrations d'un lot de cartes afin que leur affichage
 * lors de l'ouverture du booster soit instantané sans clignotement réseau.
 * @param {Array<Object>} cards - Cartes dont les images doivent être mises en cache navigateur
 */
function preloadCardImages(cards) {
  if (typeof window === 'undefined' || !Array.isArray(cards)) return;
  for (const card of cards) {
    if (card?.image && typeof card.image === 'string') {
      try {
        const img = new window.Image();
        img.decoding = 'async';
        img.src = card.image;
      } catch {
        // ignore
      }
    }
  }
}

function normalizeBoosterTypeId(rawType) {
  if (typeof rawType === 'boolean') {
    return rawType ? 'iconic' : 'standard';
  }
  if (typeof rawType === 'string' && BOOSTER_TYPES[rawType]) {
    return rawType;
  }
  return 'standard';
}

function loadPersistedPreloadedPack() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRELOADED_PACK);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const typeId = normalizeBoosterTypeId(parsed?.boosterType);
    const cfg = getBoosterTypeConfig(typeId);
    if (
      parsed &&
      Array.isArray(parsed.cards) &&
      parsed.cards.length >= cfg.cardCount &&
      parsed.cards.every((c) => c && c.id && c.title)
    ) {
      const pack = {
        boosterType: typeId,
        cards: parsed.cards.slice(0, cfg.cardCount),
      };
      preloadCardImages(pack.cards);
      return pack;
    }
  } catch {
    // ignore
  }
  return null;
}

function savePersistedPreloadedPack(pack) {
  if (typeof window === 'undefined') return;
  try {
    if (!pack || !Array.isArray(pack.cards) || pack.cards.length === 0) {
      localStorage.removeItem(STORAGE_KEY_PRELOADED_PACK);
    } else {
      const typeId = normalizeBoosterTypeId(pack.boosterType);
      const cfg = getBoosterTypeConfig(typeId);
      localStorage.setItem(
        STORAGE_KEY_PRELOADED_PACK,
        JSON.stringify({
          boosterType: typeId,
          cards: pack.cards.slice(0, cfg.cardCount),
        })
      );
    }
  } catch {
    // ignore
  }
}

function getOrRollNextBoosterType() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_NEXT_BOOSTER_TYPE);
    if (saved && BOOSTER_TYPES[saved]) {
      return saved;
    }
  } catch {
    // ignore
  }
  const rolled = rollNextBoosterType();
  try {
    localStorage.setItem(STORAGE_KEY_NEXT_BOOSTER_TYPE, rolled);
  } catch {
    // ignore
  }
  return rolled;
}

function rollAndSaveNextBoosterType() {
  const rolled = rollNextBoosterType();
  try {
    localStorage.setItem(STORAGE_KEY_NEXT_BOOSTER_TYPE, rolled);
  } catch {
    // ignore
  }
  return rolled;
}

/**
 * Assure qu'un booster est toujours préchargé en mémoire et dans localStorage,
 * quelle que soit la page ou l'onglet visité par le joueur.
 * @param {string|boolean} [targetType] - Identifiant du type de booster à préparer
 * @returns {Promise<Array<Object>|null>} Les cartes préchargées
 */
export function ensureBoosterPreloaded(
  targetType = getOrRollNextBoosterType()
) {
  const desiredType = normalizeBoosterTypeId(targetType);
  const cfg = getBoosterTypeConfig(desiredType);

  if (!globalPreloadedPack) {
    const restored = loadPersistedPreloadedPack();
    if (restored && restored.boosterType === desiredType) {
      globalPreloadedPack = restored;
    }
  }

  if (
    globalPreloadedPack &&
    globalPreloadedPack.boosterType === desiredType &&
    Array.isArray(globalPreloadedPack.cards) &&
    globalPreloadedPack.cards.length >= cfg.cardCount
  ) {
    preloadCardImages(globalPreloadedPack.cards);
    return Promise.resolve(globalPreloadedPack.cards);
  }

  if (
    globalIsPreloading &&
    globalPreloadPromise &&
    globalPreloadPromise.boosterType === desiredType
  ) {
    return globalPreloadPromise.promise;
  }

  globalIsPreloading = true;
  const promise = (async () => {
    try {
      const cards = await fetchBoosterPackCards(cfg.cardCount, {
        isIconic: cfg.isIconic,
        excludeCommon: cfg.excludeCommon,
      });
      if (Array.isArray(cards) && cards.length >= cfg.cardCount) {
        const slicedCards = cards.slice(0, cfg.cardCount);
        preloadCardImages(slicedCards);
        const pack = {
          boosterType: desiredType,
          cards: slicedCards,
        };
        globalPreloadedPack = pack;
        savePersistedPreloadedPack(pack);
        return pack.cards;
      }
    } catch {
      // Ignoré silencieusement en arrière-plan
    } finally {
      globalIsPreloading = false;
      globalPreloadPromise = null;
    }
    return null;
  })();

  globalPreloadPromise = { boosterType: desiredType, promise };
  return promise;
}

// Lancement immédiat dès le chargement du script (même sur l'écran de connexion ou un autre onglet)
if (typeof window !== 'undefined') {
  ensureBoosterPreloaded();
}

/**
 * Hook d'ouverture de booster de cartes Wikipédia.
 * @param {Object} params
 * @param {function(Array<Object>): void} [params.onCardsOpened] - Callback de réception des 6 cartes tirées
 * @param {Array<string>} [params.existingCardIds=[]] - IDs des cartes possédées pour détection "Nouveau"
 * @param {number} [params.wikithunes=0] - Solde de monnaie
 * @param {number} [params.boosterPrice=BOOSTER_PRICE] - Prix du booster standard (200₩)
 * @param {number} [params.iconicBoosterPrice=ICONIC_BOOSTER_PRICE] - Prix du booster iconique (500₩)
 * @param {number} [params.freeBoostersCount=0] - Nombre de boosters gratuits disponibles
 * @param {function(number): boolean} params.onSpendWikithunes - Callback de débit monétaire
 * @param {function(): void} [params.onUseFreeBooster] - Callback de consommation de booster gratuit
 * @returns {Object} État réactif et gestionnaires d'actions du booster
 */
export default function useBoosterOpening({
  onCardsOpened,
  existingCardIds = [],
  wikithunes = 0,
  boosterPrice = BOOSTER_PRICE,
  iconicBoosterPrice = ICONIC_BOOSTER_PRICE,
  freeBoostersCount = 0,
  onSpendWikithunes,
  onUseFreeBooster,
}) {
  const [stage, setStage] = useState('pack');
  const [packCards, setPackCards] = useState([]);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  // Animation "Fake-Out" lors du Walkout : { fakeRarityKey, trueRarityKey, phase: 'disguised' | 'shock' }
  const [fakeOutState, setFakeOutState] = useState(null);

  const [boosterTypeRoll, setBoosterTypeRoll] = useState(() =>
    getOrRollNextBoosterType()
  );
  // Instantané visuel figé dès le clic d'ouverture jusqu'à la fin de l'animation de déchirure ('tearing')
  const [lockedPackState, setLockedPackState] = useState(null);
  const [openedBoosterType, setOpenedBoosterType] = useState('standard');

  const liveBoosterConfig = getBoosterTypeConfig(boosterTypeRoll);
  const liveIsIconicPack = liveBoosterConfig.isIconic;
  const liveUsesFreeCharge =
    liveBoosterConfig.canUseFreeBooster && freeBoostersCount > 0;
  const liveIsFreeStandardPack =
    liveUsesFreeCharge || liveBoosterConfig.id === 'free_surprise';
  const liveActivePrice = liveUsesFreeCharge
    ? 0
    : liveBoosterConfig.id === 'iconic'
    ? iconicBoosterPrice
    : liveBoosterConfig.id === 'standard'
    ? boosterPrice
    : liveBoosterConfig.price;

  const isPackVisualLocked = Boolean(
    lockedPackState && (isOpening || isFetching || stage === 'tearing')
  );
  const activeBoosterType = isPackVisualLocked
    ? lockedPackState.boosterType
    : liveBoosterConfig.id;
  const activeBoosterConfig = getBoosterTypeConfig(activeBoosterType);
  const isIconicPack = isPackVisualLocked
    ? lockedPackState.isIconic
    : liveIsIconicPack;
  const isFreeStandardPack = isPackVisualLocked
    ? lockedPackState.isFree
    : liveIsFreeStandardPack;
  const activePrice = isPackVisualLocked
    ? lockedPackState.price
    : liveActivePrice;

  const packRef = useRef(null);
  const revealCardRef = useRef(null);
  const [glare, setGlare] = useState({ x: 50, y: 35, isHovered: false });

  const tearTimerRef = useRef(null);
  const fakeOutTimerRef = useRef(null);
  const isOpeningRef = useRef(false);
  const stageRef = useRef(stage);
  const pendingCardsRef = useRef(null);
  const onCardsOpenedRef = useRef(onCardsOpened);

  useEffect(() => {
    onCardsOpenedRef.current = onCardsOpened;
  }, [onCardsOpened]);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  const updateStage = (newStage) => {
    stageRef.current = newStage;
    setStage(newStage);
  };

  const preloadNextBooster = (
    targetType = getOrRollNextBoosterType()
  ) => ensureBoosterPreloaded(targetType);

  useEffect(() => {
    preloadNextBooster(boosterTypeRoll);
    const keepWarmInterval = setInterval(() => {
      if (!globalPreloadedPack && !globalIsPreloading) {
        preloadNextBooster(getOrRollNextBoosterType());
      }
    }, 5000);

    // Écouteur d'événement personnalisé pour permettre au Debug Menu local de faire spawn un booster précis
    const handleDebugSpawnBooster = (event) => {
      const requestedType = normalizeBoosterTypeId(event?.detail?.boosterType);
      if (isOpeningRef.current) return;
      soundManager.playBoosterCharge();
      setErrorMsg(null);
      setLockedPackState(null);
      setBoosterTypeRoll(requestedType);
      try {
        localStorage.setItem(STORAGE_KEY_NEXT_BOOSTER_TYPE, requestedType);
      } catch {
        // ignore
      }
      globalPreloadedPack = null;
      globalPreloadPromise = null;
      savePersistedPreloadedPack(null);
      updateStage('pack');
      setPackCards([]);
      setCurrentCardIdx(0);
      preloadNextBooster(requestedType);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(
        'wikicards:debug-spawn-booster',
        handleDebugSpawnBooster
      );
    }

    return () => {
      clearInterval(keepWarmInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener(
          'wikicards:debug-spawn-booster',
          handleDebugSpawnBooster
        );
      }
      if (tearTimerRef.current) {
        clearTimeout(tearTimerRef.current);
      }
      if (fakeOutTimerRef.current) {
        clearTimeout(fakeOutTimerRef.current);
      }
      if (pendingCardsRef.current && onCardsOpenedRef.current) {
        onCardsOpenedRef.current(pendingCardsRef.current);
        pendingCardsRef.current = null;
      }
      isOpeningRef.current = false;
    };
  }, []);

  const handlePackMouseMove = (e) => {
    if (!packRef.current || stage !== 'pack') return;
    const rect = packRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setGlare({ x, y, isHovered: true });
  };

  const handlePackMouseLeave = () => {
    setGlare({ x: 50, y: 35, isHovered: false });
  };

  const lastPackCenterRef = useRef(null);

  const capturePackCenter = () => {
    if (typeof window === 'undefined') return;
    const el = revealCardRef.current || packRef.current;
    if (el && typeof el.getBoundingClientRect === 'function') {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && window.innerWidth > 0 && window.innerHeight > 0) {
        lastPackCenterRef.current = {
          x: Math.min(0.95, Math.max(0.05, (rect.left + rect.width / 2) / window.innerWidth)),
          y: Math.min(0.95, Math.max(0.05, (rect.top + rect.height / 2) / window.innerHeight)),
        };
      }
    }
  };

  const getConfettiOrigin = () => {
    if (typeof window === 'undefined') return { x: 0.5, y: 0.55 };
    const targetEl = revealCardRef.current || packRef.current;
    if (targetEl && typeof targetEl.getBoundingClientRect === 'function') {
      const rect = targetEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && window.innerWidth > 0 && window.innerHeight > 0) {
        const x = Math.min(0.95, Math.max(0.05, (rect.left + rect.width / 2) / window.innerWidth));
        const y = Math.min(0.95, Math.max(0.05, (rect.top + rect.height / 2) / window.innerHeight));
        return { x, y };
      }
    }
    return lastPackCenterRef.current || { x: 0.5, y: 0.55 };
  };

  const triggerCardConfettiIfRare = (card) => {
    if (!card) return;
    const fire = () => {
      const origin = getConfettiOrigin();
      if (card.isShiny) {
        confetti({
          particleCount: 55,
          spread: 70,
          origin,
          colors: ['#ff6ec4', '#7873f5', '#4adede', '#fff677'],
        });
      } else if (card.rarity === 'L' || card.rarity === 'UR') {
        confetti({
          particleCount: card.rarity === 'L' ? 65 : 35,
          spread: 65,
          origin,
          colors:
            card.rarity === 'L'
              ? ['#ffea5a', '#deb226', '#ffffff']
              : ['#ffa73b', '#ffe2b0', '#ffffff'],
        });
      }
    };
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(fire);
    } else {
      fire();
    }
  };

  const handleOpenPack = async (overrideType = null) => {
    // Sécurité stricte : bloque tout double-clic ou tentative d'ouverture concurrente
    if (
      isOpeningRef.current ||
      isFetching ||
      (stageRef.current !== 'pack' && stageRef.current !== 'summary')
    ) {
      return;
    }
    isOpeningRef.current = true;
    setIsOpening(true);
    setErrorMsg(null);
    capturePackCenter();

    const chosenType =
      overrideType !== null && overrideType !== undefined
        ? normalizeBoosterTypeId(overrideType)
        : liveBoosterConfig.id;
    const packConfig = getBoosterTypeConfig(chosenType);
    const targetCardCount = packConfig.cardCount || 6;

    setBoosterTypeRoll(chosenType);
    setOpenedBoosterType(chosenType);

    const usesFreeBoosterCharge =
      packConfig.canUseFreeBooster && freeBoostersCount > 0;
    const priceToPay = usesFreeBoosterCharge
      ? 0
      : chosenType === 'iconic'
      ? iconicBoosterPrice
      : chosenType === 'standard'
      ? boosterPrice
      : packConfig.price;

    if (wikithunes < priceToPay) {
      soundManager.playErrorSound();
      updateStage('pack');
      setErrorMsg("Vous n'avez pas assez de Wikifeet");
      isOpeningRef.current = false;
      setIsOpening(false);
      return;
    }

    // Verrouille l'apparence exacte du sachet en cours d'ouverture (type et prix affiché)
    // afin que le débit du booster gratuit ou le tirage du prochain booster ne modifie pas le sachet pendant 'tearing'
    setLockedPackState({
      boosterType: chosenType,
      isIconic: packConfig.isIconic,
      isFree: usesFreeBoosterCharge || chosenType === 'free_surprise',
      price: priceToPay,
    });

    if (!globalPreloadedPack) {
      const restored = loadPersistedPreloadedPack();
      if (restored && restored.boosterType === chosenType) {
        globalPreloadedPack = restored;
      }
    }

    let cards = null;
    if (
      globalPreloadedPack &&
      globalPreloadedPack.boosterType === chosenType &&
      Array.isArray(globalPreloadedPack.cards) &&
      globalPreloadedPack.cards.length >= targetCardCount
    ) {
      cards = globalPreloadedPack.cards.slice(0, targetCardCount);
      globalPreloadedPack = null;
      savePersistedPreloadedPack(null);
    } else if (
      globalIsPreloading &&
      globalPreloadPromise &&
      globalPreloadPromise.boosterType === chosenType
    ) {
      soundManager.playBoosterCharge();
      setIsFetching(true);
      try {
        const awaited = await globalPreloadPromise.promise;
        if (Array.isArray(awaited) && awaited.length >= targetCardCount) {
          cards = awaited.slice(0, targetCardCount);
          globalPreloadedPack = null;
          savePersistedPreloadedPack(null);
        }
      } catch {
        // On tentera un tirage direct ci-dessous
      }
      setIsFetching(false);
    }

    if (!cards || cards.length < targetCardCount) {
      soundManager.playBoosterCharge();
      setIsFetching(true);
      try {
        cards = await fetchBoosterPackCards(targetCardCount, {
          isIconic: packConfig.isIconic,
          excludeCommon: packConfig.excludeCommon,
        });
      } catch {
        setErrorMsg(
          `Connexion instable : impossible de récupérer les ${targetCardCount} cartes sur Wikipédia. Aucun booster débité, veuillez réessayer.`
        );
        setIsFetching(false);
        setLockedPackState(null);
        updateStage('pack');
        isOpeningRef.current = false;
        setIsOpening(false);
        return;
      }
      setIsFetching(false);
    }

    if (!Array.isArray(cards) || cards.length < targetCardCount) {
      setErrorMsg(
        `Connexion instable : moins de ${targetCardCount} articles ont pu être chargés. Aucun booster débité, veuillez réessayer.`
      );
      setLockedPackState(null);
      updateStage('pack');
      isOpeningRef.current = false;
      setIsOpening(false);
      return;
    }

    const validPackCards = cards.slice(0, targetCardCount);
    preloadCardImages(validPackCards);

    if (usesFreeBoosterCharge) {
      if (onUseFreeBooster) {
        onUseFreeBooster();
      }
    } else if (onSpendWikithunes && priceToPay > 0) {
      onSpendWikithunes(priceToPay);
    }

    // Sauvegarde le tirage du prochain booster en localStorage sans écraser
    // le type visuel ni le prix du booster actuellement en cours d'animation ('tearing').
    const nextRolled = rollAndSaveNextBoosterType();

    const copiesPerCard = packConfig.copiesPerCard || 1;
    const ownedSet = new Set(existingCardIds);
    const seenInPack = new Set();
    const annotatedCards = validPackCards.map((c) => {
      const isNew = !ownedSet.has(c.id) && !seenInPack.has(c.id);
      seenInPack.add(c.id);
      return { ...c, isNew, packCopyCount: copiesPerCard };
    });

    // Pour le classeur, si copiesPerCard === 2 (Booster de Printemps), chaque carte est ajoutée en double (12 cartes)
    const cardsForCollection =
      copiesPerCard > 1
        ? annotatedCards.flatMap((c) =>
            Array.from({ length: copiesPerCard }, () => ({ ...c }))
          )
        : annotatedCards;

    // Détection de la plus haute rareté réelle du booster pour préparer un éventuel "Fake-Out"
    const packHighestRarity = annotatedCards.reduce((highest, card) => {
      const code = card?.rarity || 'C';
      const rank = RARITY_ORDER[code] || 1;
      const highestRank = RARITY_ORDER[highest] || 1;
      return rank > highestRank ? code : highest;
    }, 'C');

    const forcedFakeOut = globalForceNextFakeOut;
    if (forcedFakeOut) {
      globalForceNextFakeOut = false;
    }

    // Déclenche une animation "Fake-Out" gacha si le booster contient une UR, une L ou une SR (ou si forcé en debug)
    const shouldFakeOut = forcedFakeOut
      ? packHighestRarity !== 'C'
      : packHighestRarity === 'L'
      ? Math.random() < 0.65
      : packHighestRarity === 'UR'
      ? Math.random() < 0.55
      : packHighestRarity === 'SR'
      ? Math.random() < 0.3
      : false;

    const fakeDisguises =
      packHighestRarity === 'SR' || packHighestRarity === 'PC'
        ? ['C']
        : packHighestRarity === 'R'
        ? ['C', 'PC']
        : ['C', 'PC', 'R'];
    const chosenFakeRarity = shouldFakeOut
      ? fakeDisguises[Math.floor(Math.random() * fakeDisguises.length)]
      : null;

    if (fakeOutTimerRef.current) {
      clearTimeout(fakeOutTimerRef.current);
      fakeOutTimerRef.current = null;
    }

    if (shouldFakeOut && chosenFakeRarity) {
      setFakeOutState({
        fakeRarityKey: chosenFakeRarity,
        trueRarityKey: packHighestRarity,
        phase: 'disguised',
      });
      fakeOutTimerRef.current = setTimeout(() => {
        soundManager.playFakeOutShock(packHighestRarity);
        setFakeOutState({
          fakeRarityKey: chosenFakeRarity,
          trueRarityKey: packHighestRarity,
          phase: 'shock',
        });
      }, 360);
    } else {
      setFakeOutState(null);
    }

    soundManager.playPackRip();

    setPackCards(annotatedCards);
    setCurrentCardIdx(0);
    updateStage('tearing');
    pendingCardsRef.current = cardsForCollection;

    preloadNextBooster(nextRolled);

    if (tearTimerRef.current) {
      clearTimeout(tearTimerRef.current);
    }
    const tearDurationMs = shouldFakeOut ? 1280 : 850;
    tearTimerRef.current = setTimeout(() => {
      setLockedPackState(null);
      setFakeOutState(null);
      updateStage('card_by_card');
      if (onCardsOpenedRef.current && pendingCardsRef.current) {
        onCardsOpenedRef.current(pendingCardsRef.current);
        pendingCardsRef.current = null;
      }
      soundManager.playRarityReveal(annotatedCards[0]?.rarity);
      triggerCardConfettiIfRare(annotatedCards[0]);
      isOpeningRef.current = false;
      setIsOpening(false);
    }, tearDurationMs);
  };

  const handleReopenBooster = () => {
    if (isOpeningRef.current || isFetching) return;
    const nextType = getOrRollNextBoosterType();
    setBoosterTypeRoll(nextType);
    const nextCfg = getBoosterTypeConfig(nextType);
    if (nextCfg.isSpecial || nextType === 'free_surprise') {
      // Affiche le sachet spécial/saisonnier/offert pour que le joueur voie son apparition
      // et puisse choisir de l'ouvrir ou de le passer au booster standard.
      soundManager.playBoosterCharge();
      updateStage('pack');
      setPackCards([]);
      setCurrentCardIdx(0);
      preloadNextBooster(nextType);
      return;
    }
    handleOpenPack('standard');
  };

  const handleNextCard = () => {
    if (currentCardIdx < packCards.length - 1) {
      const nextIdx = currentCardIdx + 1;
      soundManager.playCardSlide();
      soundManager.playRarityReveal(packCards[nextIdx]?.rarity);
      setCurrentCardIdx(nextIdx);
      triggerCardConfettiIfRare(packCards[nextIdx]);
    } else {
      soundManager.playCardSlide();
      soundManager.playSummaryFanfare();
      updateStage('summary');
    }
  };

  const handleSkipToSummary = () => {
    soundManager.playSummaryFanfare();
    updateStage('summary');
  };

  const handleResetToNewPack = () => {
    if (isOpeningRef.current || isFetching) return;
    soundManager.playBoosterCharge();
    setLockedPackState(null);
    const nextType = getOrRollNextBoosterType();
    setBoosterTypeRoll(nextType);
    updateStage('pack');
    setPackCards([]);
    setCurrentCardIdx(0);
    preloadNextBooster(nextType);
  };

  const handleSkipIconicToStandard = () => {
    if (isOpeningRef.current || isFetching || stageRef.current !== 'pack') return;
    setErrorMsg(null);
    setLockedPackState(null);
    setBoosterTypeRoll('standard');
    try {
      localStorage.setItem(STORAGE_KEY_NEXT_BOOSTER_TYPE, 'standard');
    } catch {
      // ignore
    }
    globalPreloadedPack = null;
    globalPreloadPromise = null;
    savePersistedPreloadedPack(null);
    preloadNextBooster('standard');
  };

  const currentCard = packCards[currentCardIdx] || null;
  const nextCard =
    currentCardIdx < packCards.length - 1
      ? packCards[currentCardIdx + 1]
      : null;

  // Calcul dynamique de la plus haute rareté pour l'effet "Walkout Glow" à la déchirure
  const highestRarityKey = useMemo(() => {
    if (!packCards || packCards.length === 0) return 'C';
    return packCards.reduce((highest, card) => {
      const code = card?.rarity || 'C';
      const rank = RARITY_ORDER[code] || 1;
      const highestRank = RARITY_ORDER[highest] || 1;
      return rank > highestRank ? code : highest;
    }, 'C');
  }, [packCards]);

  // Rareté actuellement affichée par la lueur du Walkout (prend en compte le déguisement initial du Fake-Out)
  const displayedRarityKey =
    fakeOutState?.phase === 'disguised'
      ? fakeOutState.fakeRarityKey
      : highestRarityKey;

  const highestRarityConfig =
    RARITIES[displayedRarityKey] || RARITIES.C;
  const isFakeOutShock = fakeOutState?.phase === 'shock';

  return {
    stage,
    setStage,
    packCards,
    highestRarityKey: displayedRarityKey,
    highestRarityConfig,
    isFakeOutShock,
    fakeOutState,
    currentCardIdx,
    isFetching,
    isOpening,
    errorMsg,
    boosterType: activeBoosterType,
    boosterConfig: activeBoosterConfig,
    openedBoosterConfig: getBoosterTypeConfig(openedBoosterType),
    isIconicPack,
    isFreeStandardPack,
    activePrice,
    packRef,
    revealCardRef,
    glare,
    handlePackMouseMove,
    handlePackMouseLeave,
    handleOpenPack,
    handleReopenBooster,
    handleNextCard,
    handleSkipToSummary,
    handleResetToNewPack,
    handleSkipIconicToStandard,
    currentCard,
    nextCard,
  };
}
