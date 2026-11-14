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
  ICONIC_PACK_CHANCE,
  RARITY_ORDER,
  RARITIES,
} from '../config/rarities';
import { soundManager } from '../services/sound';

const STORAGE_KEY_NEXT_BOOSTER_ICONIC = 'wikicards_next_booster_is_iconic_v1';

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

function getOrRollNextBoosterIsIconic() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_NEXT_BOOSTER_ICONIC);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch {
    // ignore
  }
  const rolled = Math.random() < ICONIC_PACK_CHANCE;
  try {
    localStorage.setItem(STORAGE_KEY_NEXT_BOOSTER_ICONIC, String(rolled));
  } catch {
    // ignore
  }
  return rolled;
}

function rollAndSaveNextBoosterIsIconic() {
  const rolled = Math.random() < ICONIC_PACK_CHANCE;
  try {
    localStorage.setItem(STORAGE_KEY_NEXT_BOOSTER_ICONIC, String(rolled));
  } catch {
    // ignore
  }
  return rolled;
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

  const [isIconicRoll, setIsIconicRoll] = useState(() =>
    getOrRollNextBoosterIsIconic()
  );
  // Instantané visuel figé dès le clic d'ouverture jusqu'à la fin de l'animation de déchirure ('tearing')
  const [lockedPackState, setLockedPackState] = useState(null);

  const liveIsIconicPack = isIconicRoll;
  const liveIsFreeStandardPack = !liveIsIconicPack && freeBoostersCount > 0;
  const liveActivePrice = liveIsIconicPack
    ? iconicBoosterPrice
    : liveIsFreeStandardPack
    ? 0
    : boosterPrice;

  const isPackVisualLocked = Boolean(
    lockedPackState && (isOpening || isFetching || stage === 'tearing')
  );
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
  const [glare, setGlare] = useState({ x: 50, y: 35, isHovered: false });

  const preloadedPackRef = useRef(null);
  const preloadPromiseRef = useRef(null);
  const isPreloadingRef = useRef(false);
  const tearTimerRef = useRef(null);
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

  const preloadNextBooster = async (
    targetIsIconic = getOrRollNextBoosterIsIconic()
  ) => {
    const desiredIconic = Boolean(targetIsIconic);
    if (
      preloadedPackRef.current &&
      preloadedPackRef.current.isIconic === desiredIconic &&
      Array.isArray(preloadedPackRef.current.cards) &&
      preloadedPackRef.current.cards.length >= 6
    ) {
      return preloadedPackRef.current.cards;
    }
    if (
      isPreloadingRef.current &&
      preloadPromiseRef.current &&
      preloadPromiseRef.current.isIconic === desiredIconic
    ) {
      return preloadPromiseRef.current.promise;
    }
    isPreloadingRef.current = true;
    const promise = (async () => {
      try {
        const cards = await fetchBoosterPackCards(6, { isIconic: desiredIconic });
        if (Array.isArray(cards) && cards.length >= 6) {
          const sixCards = cards.slice(0, 6);
          preloadCardImages(sixCards);
          preloadedPackRef.current = {
            isIconic: desiredIconic,
            cards: sixCards,
          };
          return preloadedPackRef.current.cards;
        }
      } catch {
        // Ignoré silencieusement en arrière-plan
      } finally {
        isPreloadingRef.current = false;
        preloadPromiseRef.current = null;
      }
      return null;
    })();
    preloadPromiseRef.current = { isIconic: desiredIconic, promise };
    return promise;
  };

  useEffect(() => {
    preloadNextBooster(isIconicRoll);
    return () => {
      if (tearTimerRef.current) {
        clearTimeout(tearTimerRef.current);
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

  const triggerCardConfettiIfRare = (card) => {
    if (!card) return;
    if (card.isShiny) {
      confetti({
        particleCount: 55,
        spread: 70,
        origin: { y: 0.55 },
        colors: ['#ff6ec4', '#7873f5', '#4adede', '#fff677'],
      });
    } else if (card.rarity === 'L' || card.rarity === 'UR') {
      confetti({
        particleCount: card.rarity === 'L' ? 65 : 35,
        spread: 65,
        origin: { y: 0.55 },
        colors:
          card.rarity === 'L'
            ? ['#ffea5a', '#deb226', '#ffffff']
            : ['#ffa73b', '#ffe2b0', '#ffffff'],
      });
    }
  };

  const handleOpenPack = async (overrideIsIconic = null) => {
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

    const isPackIconic =
      typeof overrideIsIconic === 'boolean' ? overrideIsIconic : liveIsIconicPack;
    setIsIconicRoll(isPackIconic);
    const isFree = !isPackIconic && freeBoostersCount > 0;
    const priceToPay = isFree
      ? 0
      : isPackIconic
      ? iconicBoosterPrice
      : boosterPrice;

    if (wikithunes < priceToPay) {
      soundManager.playErrorSound();
      updateStage('pack');
      setErrorMsg("Vous n'avez pas assez de Wikithunes");
      isOpeningRef.current = false;
      setIsOpening(false);
      return;
    }

    // Verrouille l'apparence exacte du sachet en cours d'ouverture (type et prix affiché)
    // afin que le débit du booster gratuit ou le tirage du prochain booster ne modifie pas le sachet pendant 'tearing'
    setLockedPackState({
      isIconic: isPackIconic,
      isFree,
      price: priceToPay,
    });

    let cards = null;
    if (
      preloadedPackRef.current &&
      preloadedPackRef.current.isIconic === isPackIconic &&
      Array.isArray(preloadedPackRef.current.cards) &&
      preloadedPackRef.current.cards.length >= 6
    ) {
      cards = preloadedPackRef.current.cards.slice(0, 6);
      preloadedPackRef.current = null;
    } else if (
      isPreloadingRef.current &&
      preloadPromiseRef.current &&
      preloadPromiseRef.current.isIconic === isPackIconic
    ) {
      soundManager.playBoosterCharge();
      setIsFetching(true);
      try {
        const awaited = await preloadPromiseRef.current.promise;
        if (Array.isArray(awaited) && awaited.length >= 6) {
          cards = awaited.slice(0, 6);
          preloadedPackRef.current = null;
        }
      } catch {
        // On tentera un tirage direct ci-dessous
      }
      setIsFetching(false);
    }

    if (!cards || cards.length < 6) {
      soundManager.playBoosterCharge();
      setIsFetching(true);
      try {
        cards = await fetchBoosterPackCards(6, { isIconic: isPackIconic });
      } catch {
        setErrorMsg(
          'Connexion instable : impossible de récupérer les 6 cartes sur Wikipédia. Aucun booster débité, veuillez réessayer.'
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

    if (!Array.isArray(cards) || cards.length < 6) {
      setErrorMsg(
        'Connexion instable : moins de 6 articles ont pu être chargés. Aucun booster débité, veuillez réessayer.'
      );
      setLockedPackState(null);
      updateStage('pack');
      isOpeningRef.current = false;
      setIsOpening(false);
      return;
    }

    const validSixCards = cards.slice(0, 6);
    preloadCardImages(validSixCards);

    if (isFree) {
      if (onUseFreeBooster) {
        onUseFreeBooster();
      }
    } else if (onSpendWikithunes && priceToPay > 0) {
      onSpendWikithunes(priceToPay);
    }

    // Sauvegarde le tirage du prochain booster en localStorage sans écraser
    // le type visuel ni le prix du booster actuellement en cours d'animation ('tearing').
    const nextRolled = rollAndSaveNextBoosterIsIconic();

    const ownedSet = new Set(existingCardIds);
    const seenInPack = new Set();
    const annotatedCards = validSixCards.map((c) => {
      const isNew = !ownedSet.has(c.id) && !seenInPack.has(c.id);
      seenInPack.add(c.id);
      return { ...c, isNew };
    });

    soundManager.playPackRip();

    setPackCards(annotatedCards);
    setCurrentCardIdx(0);
    updateStage('tearing');
    pendingCardsRef.current = annotatedCards;

    preloadNextBooster(nextRolled);

    if (tearTimerRef.current) {
      clearTimeout(tearTimerRef.current);
    }
    tearTimerRef.current = setTimeout(() => {
      setLockedPackState(null);
      updateStage('card_by_card');
      if (onCardsOpenedRef.current && pendingCardsRef.current) {
        onCardsOpenedRef.current(pendingCardsRef.current);
        pendingCardsRef.current = null;
      }
      soundManager.playRarityReveal(annotatedCards[0]?.rarity);
      triggerCardConfettiIfRare(annotatedCards[0]);
      isOpeningRef.current = false;
      setIsOpening(false);
    }, 850);
  };

  const handleReopenBooster = () => {
    if (isOpeningRef.current || isFetching) return;
    const nextIsIconic = getOrRollNextBoosterIsIconic();
    setIsIconicRoll(nextIsIconic);
    if (nextIsIconic) {
      // Affiche le sachet doré Iconique pour que le joueur voie son apparition
      // et puisse choisir de l'ouvrir ou de le passer au booster standard.
      soundManager.playBoosterCharge();
      updateStage('pack');
      setPackCards([]);
      setCurrentCardIdx(0);
      preloadNextBooster(true);
      return;
    }
    handleOpenPack(false);
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
    const nextIsIconic = getOrRollNextBoosterIsIconic();
    setIsIconicRoll(nextIsIconic);
    updateStage('pack');
    setPackCards([]);
    setCurrentCardIdx(0);
    preloadNextBooster(nextIsIconic);
  };

  const handleSkipIconicToStandard = () => {
    if (isOpeningRef.current || isFetching || stageRef.current !== 'pack') return;
    setErrorMsg(null);
    setLockedPackState(null);
    setIsIconicRoll(false);
    try {
      localStorage.setItem(STORAGE_KEY_NEXT_BOOSTER_ICONIC, 'false');
    } catch {
      // ignore
    }
    preloadedPackRef.current = null;
    preloadPromiseRef.current = null;
    preloadNextBooster(false);
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

  const highestRarityConfig =
    RARITIES[highestRarityKey] || RARITIES.C;

  return {
    stage,
    setStage,
    packCards,
    highestRarityKey,
    highestRarityConfig,
    currentCardIdx,
    isFetching,
    isOpening,
    errorMsg,
    isIconicPack,
    isFreeStandardPack,
    activePrice,
    packRef,
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
