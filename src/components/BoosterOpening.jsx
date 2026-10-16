import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import WikiCard from './WikiCard';
import { fetchBoosterPackCards } from '../services/wikipedia';
import { getRarityByCode, RARITY_TIERS } from '../config/rarities';
import { soundManager } from '../services/sound';
import {
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Loader2,
} from 'lucide-react';

export default function BoosterOpening({
  onCardsOpened,
  existingCardIds = [],
  favorites = [],
  onToggleFavorite,
  onGoToClasseur,
}) {
  // 'pack' | 'tearing' | 'card_by_card' | 'summary'
  const [stage, setStage] = useState('pack');
  const [packCards, setPackCards] = useState([]);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Reflet lumineux doux au survol (le booster reste bien de face au repos)
  const packRef = useRef(null);
  const [glare, setGlare] = useState({ x: 50, y: 35, isHovered: false });

  // Préchargement silencieux du prochain booster en arrière-plan
  const preloadedPackRef = useRef(null);
  const isPreloadingRef = useRef(false);

  const preloadNextBooster = async () => {
    if (isPreloadingRef.current || preloadedPackRef.current) return;
    isPreloadingRef.current = true;
    try {
      const cards = await fetchBoosterPackCards(5);
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
    if (card.rarity === 'L' || card.rarity === 'UR') {
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

  const handleOpenPack = async () => {
    if (stage !== 'pack' || isFetching) return;
    setErrorMsg(null);

    let cards = preloadedPackRef.current;
    preloadedPackRef.current = null;

    if (!cards || cards.length === 0) {
      soundManager.playBoosterCharge();
      setIsFetching(true);
      try {
        cards = await fetchBoosterPackCards(5);
      } catch {
        setErrorMsg("Impossible de joindre Wikipédia. Veuillez réessayer.");
        setIsFetching(false);
        return;
      }
      setIsFetching(false);
    }

    if (!cards || cards.length === 0) {
      setErrorMsg("Aucun article récupéré. Veuillez réessayer.");
      return;
    }

    // Marque les cartes qui ne sont pas encore dans le classeur comme "isNew"
    const ownedSet = new Set(existingCardIds);
    const seenInPack = new Set();
    const annotatedCards = cards.map((c) => {
      const isNew = !ownedSet.has(c.id) && !seenInPack.has(c.id);
      seenInPack.add(c.id);
      return { ...c, isNew };
    });

    // Son de déchirure du sachet métallisé
    soundManager.playPackRip();

    setPackCards(annotatedCards);
    setCurrentCardIdx(0);
    setStage('tearing');

    // Précharge déjà le booster suivant
    preloadNextBooster();

    setTimeout(() => {
      setStage('card_by_card');
      if (onCardsOpened) {
        onCardsOpened(annotatedCards);
      }
      soundManager.playRarityReveal(annotatedCards[0]?.rarity);
      triggerCardConfettiIfRare(annotatedCards[0]);
    }, 850);
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
      setStage('summary');
    }
  };

  const handleSkipToSummary = () => {
    soundManager.playSummaryFanfare();
    setStage('summary');
  };

  const handleResetToNewPack = () => {
    soundManager.playBoosterCharge();
    setStage('pack');
    setPackCards([]);
    setCurrentCardIdx(0);
    preloadNextBooster();
  };

  const currentCard = packCards[currentCardIdx];
  const nextCard =
    currentCardIdx < packCards.length - 1
      ? packCards[currentCardIdx + 1]
      : null;
  const currentCardTier = currentCard
    ? getRarityByCode(currentCard.rarity)
    : RARITY_TIERS[0];

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {/* =====================================================================
            ÉTAPE A & B : LE BOOSTER VU DE FACE DANS LA DA WIKIPÉDIA
            (Effet sachet scellé bombé / coussiné autour des cartes)
        ===================================================================== */}
        {(stage === 'pack' || stage === 'tearing') && (
          <motion.div
            key="booster-pack-front"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] py-10 px-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[600px]"
          >
            {/* Le Sachet de Booster bien de face */}
            <div
              ref={packRef}
              onMouseMove={handlePackMouseMove}
              onMouseLeave={handlePackMouseLeave}
              onClick={handleOpenPack}
              className="relative cursor-pointer select-none z-10 flex flex-col items-center"
            >
              {/* Conteneur animé du sachet complet */}
              <motion.div
                animate={
                  stage === 'tearing'
                    ? {
                        y: [0, -6, 110],
                        scale: [1, 1.03, 0.95],
                        opacity: [1, 1, 0],
                      }
                    : {
                        y: glare.isHovered ? -4 : 0,
                      }
                }
                transition={
                  stage === 'tearing'
                    ? { duration: 0.82, ease: 'easeInOut' }
                    : { duration: 0.25 }
                }
                className="relative w-[284px] flex flex-col items-center"
              >
                {/* 1. SOUDURE SUPÉRIEURE DU SACHET (qui se déchire horizontalement) */}
                <motion.div
                  animate={
                    stage === 'tearing'
                      ? {
                          y: -65,
                          x: 45,
                          rotate: 12,
                          opacity: 0,
                        }
                      : { y: 0, x: 0, rotate: 0, opacity: 1 }
                  }
                  transition={{ duration: 0.42, ease: 'easeIn' }}
                  className="w-full h-[36px] rounded-t-[8px] relative z-30 flex flex-col justify-between overflow-hidden border border-b-0 border-[#b5bcc4]"
                  style={{
                    background:
                      'linear-gradient(90deg, #d8dde3 0%, #f5f7f9 18%, #ffffff 50%, #f5f7f9 82%, #d8dde3 100%)',
                    boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.9)',
                  }}
                >
                  {/* Stries de thermosoudure verticales */}
                  <div
                    className="w-full h-[15px]"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(90deg, rgba(114,119,125,0.28) 0px, rgba(114,119,125,0.28) 2px, rgba(255,255,255,0.85) 2px, rgba(255,255,255,0.85) 5px)',
                    }}
                  />

                  {/* Ligne d'encoche de déchirure */}
                  <div className="w-full px-3 pb-1 flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-[#54595d]">
                    <span>▸</span>
                    <span>Déchirer ici</span>
                    <span>◂</span>
                  </div>

                  {/* Trait de coupe lumineux au moment du clic */}
                  {stage === 'tearing' && (
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.24 }}
                      className="absolute bottom-0 left-0 h-[3px] bg-[#3366cc] shadow-[0_0_10px_#3366cc]"
                    />
                  )}
                </motion.div>

                {/* 2. CORPS BOMBÉ DU SACHET (Pillow Pack dans la DA Wikipédia) */}
                <div
                  className="w-full h-[386px] relative z-20 overflow-hidden flex flex-col items-center justify-between px-6 py-6 border border-[#b5bcc4]"
                  style={{
                    /* Dégradé cylindrique imitant le volume bombé d'un sachet scellé vu de face */
                    background:
                      'linear-gradient(90deg, #dfe5ec 0%, #f4f7fb 12%, #ffffff 32%, #f8fbff 50%, #ffffff 68%, #f4f7fb 88%, #dfe5ec 100%)',
                    boxShadow: `
                      inset 22px 0 28px -14px rgba(32, 33, 34, 0.14),
                      inset -22px 0 28px -14px rgba(32, 33, 34, 0.16),
                      inset 0 18px 22px -12px rgba(255, 255, 255, 0.95),
                      inset 0 -18px 24px -12px rgba(32, 33, 34, 0.10),
                      0 20px 38px -12px rgba(32, 33, 34, 0.22),
                      0 4px 10px rgba(32, 33, 34, 0.08)
                    `,
                  }}
                >
                  {/* Empreinte en relief des 5 cartes devinées sous l'emballage */}
                  <div
                    className="absolute inset-x-[22px] inset-y-[18px] rounded-[14px] pointer-events-none"
                    style={{
                      boxShadow:
                        '0 0 0 1px rgba(255,255,255,0.85), 0 4px 16px rgba(32,33,34,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
                      background:
                        'linear-gradient(180deg, rgba(234,243,255,0.45) 0%, rgba(255,255,255,0.2) 50%, rgba(221,236,249,0.5) 100%)',
                    }}
                  />

                  {/* Ondes topographiques subtiles identiques aux cartes et au bandeau Wikipédia */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none opacity-55"
                    viewBox="0 0 300 400"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M-30,85 C70,40 190,130 330,75 L330,400 L-30,400 Z"
                      fill="rgba(221, 236, 249, 0.45)"
                    />
                    <path
                      d="M-30,275 C90,225 210,310 330,260 L330,400 L-30,400 Z"
                      fill="rgba(167, 215, 249, 0.35)"
                    />
                  </svg>

                  {/* Plis de tension réalistes dans les 4 coins du sachet bombé */}
                  <div
                    className="absolute top-0 left-0 w-12 h-12 pointer-events-none opacity-40"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(162,169,177,0.5) 0%, transparent 65%)',
                    }}
                  />
                  <div
                    className="absolute top-0 right-0 w-12 h-12 pointer-events-none opacity-40"
                    style={{
                      background:
                        'linear-gradient(225deg, rgba(162,169,177,0.5) 0%, transparent 65%)',
                    }}
                  />

                  {/* Reflet spéculaire plastique/aluminium suivant la souris */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                    style={{
                      opacity: glare.isHovered ? 0.9 : 0.45,
                      background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.25) 35%, transparent 68%)`,
                    }}
                  />

                  {/* En-tête officiel Wikipédia (avec les vrais SVGs Vector 2022) */}
                  <div className="relative z-10 w-full flex flex-col items-center border-b border-[#a7d7f9] pb-3 pt-1">
                    <img
                      alt="Wikipédia"
                      src="https://fr.wikipedia.org/static/images/mobile/copyright/wikipedia-wordmark-fr.svg"
                      className="h-[22px] w-auto object-contain"
                    />
                    <img
                      alt="l'encyclopédie libre"
                      src="https://fr.wikipedia.org/static/images/mobile/copyright/wikipedia-tagline-fr.svg"
                      className="h-[13px] w-auto object-contain mt-1 opacity-85"
                    />
                  </div>

                  {/* Médaillon central avec le Globe Wikipédia */}
                  <div className="relative z-10 my-2 flex items-center justify-center">
                    <div
                      className="w-[148px] h-[148px] rounded-full flex items-center justify-center p-4 border border-[#c8ccd1] relative"
                      style={{
                        background:
                          'radial-gradient(circle at 40% 35%, #ffffff 0%, #eef5fb 70%, #ddecf9 100%)',
                        boxShadow:
                          '0 10px 24px -6px rgba(51, 102, 204, 0.18), inset 0 2px 4px rgba(255, 255, 255, 1)',
                      }}
                    >
                      <img
                        src="https://fr.wikipedia.org/static/images/icons/wikipedia.png"
                        alt="Globe Wikipédia"
                        className="w-full h-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.18)]"
                      />
                    </div>
                  </div>

                  {/* Pied du sachet */}
                  <div className="relative z-10 w-full flex flex-col items-center text-center">
                    <div className="px-3.5 py-1 rounded-[3px] bg-[#3366cc] text-white text-[11.5px] font-bold tracking-wider uppercase shadow-2xs">
                      Booster • 5 Cartes
                    </div>
                    <div className="wiki-serif text-[13px] text-[#54595d] mt-1.5">
                      Articles aléatoires de Wikipédia
                    </div>
                  </div>
                </div>

                {/* 3. SOUDURE INFÉRIEURE DU SACHET */}
                <div
                  className="w-full h-[22px] rounded-b-[8px] relative z-20 overflow-hidden border border-t-0 border-[#b5bcc4]"
                  style={{
                    background:
                      'linear-gradient(90deg, #d8dde3 0%, #f5f7f9 18%, #ffffff 50%, #f5f7f9 82%, #d8dde3 100%)',
                  }}
                >
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(90deg, rgba(114,119,125,0.28) 0px, rgba(114,119,125,0.28) 2px, rgba(255,255,255,0.85) 2px, rgba(255,255,255,0.85) 5px)',
                    }}
                  />
                </div>
              </motion.div>
            </div>

            {/* Texte d'instruction sous le sachet (avec plus d'espace au-dessus) */}
            <div className="mt-9 flex flex-col items-center gap-2 z-10">
              {isFetching ? (
                <div className="inline-flex items-center gap-2 text-[13px] font-medium text-[#3366cc]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Tirage des 5 pages sur Wikipédia...</span>
                </div>
              ) : (
                <span className="text-[13px] text-[#54595d]">
                  Cliquez sur le booster pour l'ouvrir et découvrir vos 5 cartes
                </span>
              )}

              {errorMsg && (
                <div className="mt-2 text-[12.5px] text-[#b32424] bg-[#fee7e6] border border-[#f8b3b0] px-3 py-1 rounded-[2px]">
                  {errorMsg}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* =====================================================================
            ÉTAPE C : DÉCOUVERTE CARTE PAR CARTE (1/5 -> 5/5)
            Un clic sur la carte passe directement à la suivante !
        ===================================================================== */}
        {stage === 'card_by_card' && currentCard && (
          <motion.div
            key="booster-card-by-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] py-8 px-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[600px]"
          >
            {/* Halo subtil aux couleurs de la rareté de la carte affichée */}
            <div
              className="absolute w-80 h-80 rounded-full pointer-events-none blur-3xl opacity-25 transition-colors duration-500"
              style={{ backgroundColor: currentCardTier.borderColor }}
            />

            {/* Indicateur d'étape minimaliste en haut */}
            <div className="relative z-10 flex items-center gap-3 mb-5">
              <span className="text-[13px] font-bold text-[#202122]">
                Carte {currentCardIdx + 1} sur {packCards.length}
              </span>
              <div className="flex items-center gap-1.5">
                {packCards.map((c, idx) => (
                  <span
                    key={c.id}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentCardIdx
                        ? 'w-6 bg-[#3366cc]'
                        : idx < currentCardIdx
                        ? 'w-2 bg-[#72777d]'
                        : 'w-2 bg-[#c8ccd1]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Pile de cartes : la vraie carte suivante est visible légèrement derrière et remonte quand on clique sur la carte */}
            <div className="relative z-10 flex items-center justify-center w-full max-w-[360px] min-h-[515px]">
              {/* La vraie PROCHAINE carte (derrière la carte actuelle) */}
              {nextCard && (
                <motion.div
                  key={`next-${nextCard.id}`}
                  initial={{ scale: 0.88, y: 24, x: 14, rotate: 2.5, opacity: 0 }}
                  animate={{ scale: 0.93, y: 14, x: 16, rotate: 2.5, opacity: 0.65 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-x-0 mx-auto pointer-events-none select-none z-10 brightness-95"
                >
                  <WikiCard card={nextCard} />
                </motion.div>
              )}

              {/* La carte ACTUELLE au premier plan (cliquable pour passer à la suivante) */}
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={currentCard.id}
                  onClick={handleNextCard}
                  title="Cliquez sur la carte pour passer à la suivante"
                  initial={{
                    opacity: 0,
                    scale: 0.93,
                    y: 14,
                    x: 16,
                    rotate: 2.5,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    x: 0,
                    rotate: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: -140,
                    y: -10,
                    rotate: -8,
                    scale: 0.92,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 240,
                    damping: 24,
                  }}
                  className="relative z-20 w-full cursor-pointer"
                >
                  <WikiCard
                    card={currentCard}
                    isFavorite={favorites.includes(currentCard.id)}
                    onToggleFavorite={onToggleFavorite}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bouton pour passer à la carte suivante ou au résumé final */}
            <div className="relative z-10 mt-6 flex items-center gap-4">
              <button
                type="button"
                onClick={handleNextCard}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3366cc] hover:bg-[#447ff5] active:bg-[#2a4b8d] text-white font-bold text-[14px] rounded-[2px] cursor-pointer transition-colors shadow-xs"
              >
                <span>
                  {currentCardIdx < packCards.length - 1
                    ? `Carte suivante (${currentCardIdx + 2}/${packCards.length})`
                    : 'Voir le résumé des 5 cartes'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {currentCardIdx < packCards.length - 1 && (
                <button
                  type="button"
                  onClick={handleSkipToSummary}
                  className="wiki-link text-[12.5px]"
                >
                  Tout afficher
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* =====================================================================
            ÉTAPE D : LE RÉSUMÉ DES 5 CARTES OBTENUES
        ===================================================================== */}
        {stage === 'summary' && (
          <motion.div
            key="booster-summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col"
          >
            {/* Grille récapitulative des 5 cartes obtenues */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center py-2">
              {packCards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                  className="w-full flex justify-center"
                >
                  <WikiCard
                    card={card}
                    isFavorite={favorites.includes(card.id)}
                    onToggleFavorite={onToggleFavorite}
                  />
                </motion.div>
              ))}
            </div>

            {/* Pied d'action sobre sous le résumé */}
            <div className="mt-6 pt-4 border-t border-[#eaecf0] flex flex-wrap items-center justify-between gap-3">
              <span className="text-[13px] text-[#54595d]">
                Ces 5 cartes ont été ajoutées à votre classeur.
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onGoToClasseur}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#f8f9fa] hover:bg-white text-[#202122] font-bold text-[13px] border border-[#a2a9b1] rounded-[2px] cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-[#3366cc]" />
                  <span>Voir mon classeur</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToNewPack}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#3366cc] hover:bg-[#447ff5] text-white font-bold text-[13px] rounded-[2px] cursor-pointer"
                >
                  <span>Terminer</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
