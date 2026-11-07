/**
 * @file Rôle : Custom hook gérant la logique d'ouverture des sachets de cartes, préchargement, détection iconique et étapes d'animation.
 * Dépendances : React, `canvas-confetti`, `../services/wikipedia`, `../services/sound`, `../config/rarities`.
 * Effets de bord : Lecture/écriture localStorage pour booster iconique, audio procédural, confettis de rareté, requêtes Wikipédia.
 */

import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { fetchBoosterPackCards } from '../services/wikipedia';
import {
  BOOSTER_PRICE,
  ICONIC_BOOSTER_PRICE,
  ICONIC_PACK_CHANCE,
} from '../config/rarities';
import { soundManager } from '../services/sound';

const STORAGE_KEY_NEXT_BOOSTER_ICONIC = 'wikicards_next_booster_is_iconic_v1';

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

  const isIconicPack = isIconicRoll;
  const isFreeStandardPack = !isIconicPack && freeBoostersCount > 0;
  const activePrice = isIconicPack
    ? iconicBoosterPrice
    : isFreeStandardPack
    ? 0
    : boosterPrice;

  const packRef = useRef(null);
  const [glare, setGlare] = useState({ x: 50, y: 35, isHovered: false });

  const preloadedPackRef = useRef(null);
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

  const preloadNextBooster = async () => {
    if (isPreloadingRef.current || preloadedPackRef.current) return;
    isPreloadingRef.current = true;
    try {
      const cards = await fetchBoosterPackCards(6, { isIconic: false });
      if (cards && cards.length > 0) {
        preloadedPackRef.current = cards;
      }
    } catch {
      // Ignoré silencieusement
    } finally {
      isPreloadingRef.current = false;
    }
  };

  useEffect(() => {
    preloadNextBooster();
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
      typeof overrideIsIconic === 'boolean' ? overrideIsIconic : isIconicPack;
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

    let cards = null;
    if (!isPackIconic && preloadedPackRef.current) {
      cards = preloadedPackRef.current;
      preloadedPackRef.current = null;
    }

    if (!cards || cards.length === 0) {
      soundManager.playBoosterCharge();
      setIsFetching(true);
      try {
        cards = await fetchBoosterPackCards(6, { isIconic: isPackIconic });
      } catch {
        setErrorMsg('Impossible de joindre Wikipédia. Veuillez réessayer.');
        setIsFetching(false);
        updateStage('pack');
        isOpeningRef.current = false;
        setIsOpening(false);
        return;
      }
      setIsFetching(false);
    }

    if (!cards || cards.length === 0) {
      setErrorMsg('Aucun article récupéré. Veuillez réessayer.');
      updateStage('pack');
      isOpeningRef.current = false;
      setIsOpening(false);
      return;
    }

    if (isFree) {
      if (onUseFreeBooster) {
        onUseFreeBooster();
      }
    } else if (onSpendWikithunes && priceToPay > 0) {
      onSpendWikithunes(priceToPay);
    }

    const nextRolled = rollAndSaveNextBoosterIsIconic();
    setIsIconicRoll(nextRolled);

    const ownedSet = new Set(existingCardIds);
    const seenInPack = new Set();
    const annotatedCards = cards.map((c) => {
      const isNew = !ownedSet.has(c.id) && !seenInPack.has(c.id);
      seenInPack.add(c.id);
      return { ...c, isNew };
    });

    soundManager.playPackRip();

    setPackCards(annotatedCards);
    setCurrentCardIdx(0);
    updateStage('tearing');
    pendingCardsRef.current = annotatedCards;

    preloadNextBooster();

    if (tearTimerRef.current) {
      clearTimeout(tearTimerRef.current);
    }
    tearTimerRef.current = setTimeout(() => {
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
    handleOpenPack(nextIsIconic);
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
    setIsIconicRoll(getOrRollNextBoosterIsIconic());
    updateStage('pack');
    setPackCards([]);
    setCurrentCardIdx(0);
    preloadNextBooster();
  };

  const handleSkipIconicToStandard = () => {
    if (isOpeningRef.current || isFetching || stageRef.current !== 'pack') return;
    setErrorMsg(null);
    setIsIconicRoll(false);
    try {
      localStorage.setItem(STORAGE_KEY_NEXT_BOOSTER_ICONIC, 'false');
    } catch {
      // ignore
    }
  };

  const currentCard = packCards[currentCardIdx] || null;
  const nextCard =
    currentCardIdx < packCards.length - 1
      ? packCards[currentCardIdx + 1]
      : null;

  return {
    stage,
    setStage,
    packCards,
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
