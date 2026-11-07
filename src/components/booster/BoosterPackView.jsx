/**
 * @file Rôle : Vue 3D du sachet de booster fermé et animation de déchirure physique du pack avec halo de la plus haute rareté.
 * Dépendances : React, `framer-motion`, `lucide-react`, `../WikithuneIcon`, `../../config/rarities`.
 * Effets de bord : Déclenche l'ouverture du booster au clic.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import WikithuneIcon from '../WikithuneIcon';
import { getBoosterOpeningLight } from '../../config/rarities';

/**
 * Vue interactive de présentation et de déchirure du sachet de booster.
 * @param {Object} props
 * @param {string} props.stage - Étape actuelle ('pack' ou 'tearing')
 * @param {Array<Object>} [props.packCards=[]] - Cartes du booster déterminant la couleur de l'effet de lumière
 * @param {boolean} props.isIconicPack - Indique si le booster est iconique
 * @param {number} props.activePrice - Prix effectif à payer en Wikithunes
 * @param {number} props.freeBoostersCount - Nombre de boosters gratuits disponibles
 * @param {number} props.boosterPrice - Prix standard du booster
 * @param {React.RefObject} props.packRef - Référence DOM du sachet pour l'effet de reflet
 * @param {Object} props.glare - Coordonnées et état de survol du reflet
 * @param {function(React.MouseEvent): void} props.handlePackMouseMove - Gestionnaire du déplacement souris
 * @param {function(): void} props.handlePackMouseLeave - Gestionnaire de sortie de souris
 * @param {function(): void} props.handleOpenPack - Callback d'ouverture du booster
 * @param {function(): void} props.handleSkipIconicToStandard - Callback pour forcer un booster normal
 * @param {boolean} props.isFetching - Indicateur de chargement réseau
 * @param {boolean} [props.isOpening=false] - Indicateur d'ouverture en cours
 * @param {string|null} props.errorMsg - Message d'erreur éventuel
 */
export default function BoosterPackView({
  stage,
  packCards = [],
  isIconicPack,
  activePrice,
  freeBoostersCount,
  boosterPrice,
  packRef,
  glare,
  handlePackMouseMove,
  handlePackMouseLeave,
  handleOpenPack,
  handleSkipIconicToStandard,
  isFetching,
  isOpening = false,
  errorMsg,
}) {
  const isLocked = stage !== 'pack' || isOpening || isFetching;
  const openingLight = getBoosterOpeningLight(packCards, isIconicPack);

  return (
    <motion.div
      key="booster-pack-front"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] py-10 px-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[600px]"
    >
      {/* Halo doré subtil au repos pour booster iconique */}
      {isIconicPack && stage === 'pack' && (
        <div
          className="absolute w-96 h-96 rounded-full pointer-events-none blur-3xl opacity-35"
          style={{
            background:
              'radial-gradient(circle, #ffea5a 0%, #f0b429 55%, transparent 100%)',
          }}
        />
      )}

      {/* Halo de lumière lors de la déchirure (couleur de la plus haute rareté) */}
      {stage === 'tearing' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.7, 0.45, 0], scale: [0.8, 1.25, 1.45] }}
          transition={{ duration: 0.82, ease: 'easeOut' }}
          className="absolute w-[440px] h-[440px] rounded-full pointer-events-none blur-3xl"
          style={{
            background: openingLight.ambientGlow,
          }}
        />
      )}

      {/* Sachet de booster bien de face */}
      <div
        ref={packRef}
        onMouseMove={!isLocked ? handlePackMouseMove : undefined}
        onMouseLeave={!isLocked ? handlePackMouseLeave : undefined}
        onClick={!isLocked ? () => handleOpenPack() : undefined}
        onKeyDown={(e) => {
          if (!isLocked && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleOpenPack();
          }
        }}
        role="button"
        tabIndex={!isLocked ? 0 : -1}
        aria-disabled={isLocked}
        className={`relative select-none z-10 flex flex-col items-center outline-none ${
          !isLocked ? 'cursor-pointer' : 'cursor-default pointer-events-none'
        }`}
      >
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
          {/* Effet de lumière interne lors de la déchirure */}
          {stage === 'tearing' && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0.08 }}
              animate={{
                opacity: [0, 0.58, 0.45, 0],
                scaleY: [0.08, 0.85, 0.96, 1],
              }}
              transition={{ duration: 0.78, ease: 'easeOut' }}
              className="absolute inset-x-0 pointer-events-none z-10 overflow-visible"
              style={{
                top: '-50px',
                height: '88px',
                transformOrigin: '50% 100%',
              }}
            >
              <div
                className="absolute inset-x-[4px] bottom-0 h-full"
                style={{
                  clipPath: 'polygon(0% 0%, 100% 0%, 98% 100%, 2% 100%)',
                  background: openingLight.beamGradient,
                  filter: 'blur(4px)',
                }}
              />
              <div
                className="absolute -inset-x-[8px] bottom-0 h-full"
                style={{
                  background: openingLight.conicRays,
                  WebkitMaskImage:
                    'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 45%, transparent 94%)',
                  maskImage:
                    'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 45%, transparent 94%)',
                  filter: 'blur(2px)',
                }}
              />
              <div
                className="absolute inset-x-[4px] bottom-[1px] h-[3px] rounded-full"
                style={{
                  background: openingLight.slitGradient,
                  boxShadow: openingLight.slitShadow,
                }}
              />
            </motion.div>
          )}

          {/* Soudure supérieure */}
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
            className={`w-full h-[36px] rounded-t-[8px] relative z-30 flex flex-col justify-between overflow-hidden border border-b-0 ${
              isIconicPack ? 'border-[#d4a11d]' : 'border-[#b5bcc4]'
            }`}
            style={{
              background: isIconicPack
                ? 'linear-gradient(90deg, #e5c878 0%, #fff6d6 20%, #ffffff 50%, #fff6d6 80%, #e5c878 100%)'
                : 'linear-gradient(90deg, #d8dde3 0%, #f5f7f9 18%, #ffffff 50%, #f5f7f9 82%, #d8dde3 100%)',
              boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.9)',
            }}
          >
            <div
              className="w-full h-[15px]"
              style={{
                backgroundImage: isIconicPack
                  ? 'repeating-linear-gradient(90deg, rgba(180,130,20,0.28) 0px, rgba(180,130,20,0.28) 2px, rgba(255,255,255,0.85) 2px, rgba(255,255,255,0.85) 5px)'
                  : 'repeating-linear-gradient(90deg, rgba(114,119,125,0.28) 0px, rgba(114,119,125,0.28) 2px, rgba(255,255,255,0.85) 2px, rgba(255,255,255,0.85) 5px)',
              }}
            />
            <div
              className={`w-full px-3 pb-1 flex items-center justify-between text-[10px] font-bold tracking-wider uppercase ${
                isIconicPack ? 'text-[#6e4f00]' : 'text-[#54595d]'
              }`}
            >
              <span>▸</span>
              <span>Déchirer ici</span>
              <span>◂</span>
            </div>

            {stage === 'tearing' && (
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.24 }}
                className="absolute bottom-0 left-0 h-[3px]"
                style={{
                  backgroundColor: openingLight.tearLineColor,
                  boxShadow: openingLight.tearLineShadow,
                }}
              />
            )}
          </motion.div>

          {/* Corps du sachet */}
          <div
            className={`w-full h-[386px] relative z-20 overflow-hidden flex flex-col items-center justify-between px-6 py-6 border ${
              isIconicPack ? 'border-[#d4a11d]' : 'border-[#b5bcc4]'
            }`}
            style={{
              background: isIconicPack
                ? 'linear-gradient(90deg, #ead59b 0%, #fbf3dc 12%, #ffffff 32%, #fffdf5 50%, #ffffff 68%, #fbf3dc 88%, #ead59b 100%)'
                : 'linear-gradient(90deg, #dfe5ec 0%, #f4f7fb 12%, #ffffff 32%, #f8fbff 50%, #ffffff 68%, #f4f7fb 88%, #dfe5ec 100%)',
              boxShadow: isIconicPack
                ? `
                  inset 22px 0 28px -14px rgba(140, 95, 10, 0.18),
                  inset -22px 0 28px -14px rgba(140, 95, 10, 0.20),
                  inset 0 18px 22px -12px rgba(255, 255, 255, 0.95),
                  inset 0 -18px 24px -12px rgba(140, 95, 10, 0.14),
                  0 20px 42px -10px rgba(212, 161, 29, 0.35),
                  0 4px 12px rgba(32, 33, 34, 0.10)
                `
                : `
                  inset 22px 0 28px -14px rgba(32, 33, 34, 0.14),
                  inset -22px 0 28px -14px rgba(32, 33, 34, 0.16),
                  inset 0 18px 22px -12px rgba(255, 255, 255, 0.95),
                  inset 0 -18px 24px -12px rgba(32, 33, 34, 0.10),
                  0 20px 38px -12px rgba(32, 33, 34, 0.22),
                  0 4px 10px rgba(32, 33, 34, 0.08)
                `,
            }}
          >
            <div
              className="absolute inset-x-[22px] inset-y-[18px] rounded-[14px] pointer-events-none"
              style={{
                boxShadow: isIconicPack
                  ? '0 0 0 1px rgba(255,240,180,0.9), 0 4px 16px rgba(180,130,20,0.12), inset 0 1px 0 rgba(255,255,255,0.95)'
                  : '0 0 0 1px rgba(255,255,255,0.85), 0 4px 16px rgba(32,33,34,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
                background: isIconicPack
                  ? 'linear-gradient(180deg, rgba(255,238,165,0.45) 0%, rgba(255,255,255,0.25) 50%, rgba(246,220,107,0.42) 100%)'
                  : 'linear-gradient(180deg, rgba(234,243,255,0.45) 0%, rgba(255,255,255,0.2) 50%, rgba(221,236,249,0.5) 100%)',
              }}
            />

            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
              viewBox="0 0 300 400"
              preserveAspectRatio="none"
            >
              <path
                d="M-30,85 C70,40 190,130 330,75 L330,400 L-30,400 Z"
                fill={
                  isIconicPack
                    ? 'rgba(255, 228, 130, 0.42)'
                    : 'rgba(221, 236, 249, 0.45)'
                }
              />
              <path
                d="M-30,275 C90,225 210,310 330,260 L330,400 L-30,400 Z"
                fill={
                  isIconicPack
                    ? 'rgba(235, 190, 75, 0.35)'
                    : 'rgba(167, 215, 249, 0.35)'
                }
              />
            </svg>

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

            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300"
              style={{
                opacity: glare.isHovered ? 0.9 : 0.45,
                background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.25) 35%, transparent 68%)`,
              }}
            />

            <div
              className={`relative z-10 w-full flex flex-col items-center border-b pb-3 pt-1 ${
                isIconicPack ? 'border-[#deb226]' : 'border-[#a7d7f9]'
              }`}
            >
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

            <div className="relative z-10 my-2 flex items-center justify-center">
              <div
                className={`w-[148px] h-[148px] rounded-full flex items-center justify-center p-4 border relative ${
                  isIconicPack ? 'border-[#d4a11d]' : 'border-[#c8ccd1]'
                }`}
                style={{
                  background: isIconicPack
                    ? 'radial-gradient(circle at 40% 35%, #ffffff 0%, #fff8dc 65%, #f6dc6b 100%)'
                    : 'radial-gradient(circle at 40% 35%, #ffffff 0%, #eef5fb 70%, #ddecf9 100%)',
                  boxShadow: isIconicPack
                    ? '0 10px 26px -4px rgba(212, 161, 29, 0.38), inset 0 2px 4px rgba(255, 255, 255, 1)'
                    : '0 10px 24px -6px rgba(51, 102, 204, 0.18), inset 0 2px 4px rgba(255, 255, 255, 1)',
                }}
              >
                <img
                  src="https://fr.wikipedia.org/static/images/icons/wikipedia.png"
                  alt="Globe Wikipédia"
                  className="w-full h-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.18)]"
                />
              </div>
            </div>

            <div className="relative z-10 w-full flex flex-col items-center text-center">
              <div
                className={`px-3.5 py-1 rounded-[3px] text-[11.5px] font-bold tracking-wider uppercase shadow-2xs inline-flex items-center gap-1.5 ${
                  isIconicPack
                    ? 'bg-gradient-to-r from-[#b37e08] via-[#d4a11d] to-[#9a6b05] text-white'
                    : 'bg-[#3366cc] text-white'
                }`}
              >
                <span>
                  {isIconicPack ? 'Booster Iconique' : 'Booster'} • {activePrice}
                </span>
                <WikithuneIcon className="w-[13px] h-[13px]" />
              </div>
              <div
                className={`wiki-serif text-[13px] mt-1.5 ${
                  isIconicPack ? 'text-[#6e4f00]' : 'text-[#54595d]'
                }`}
              >
                Articles aléatoires de Wikipédia
              </div>
            </div>
          </div>

          {/* Soudure inférieure */}
          <div
            className={`w-full h-[22px] rounded-b-[8px] relative z-20 overflow-hidden border border-t-0 ${
              isIconicPack ? 'border-[#d4a11d]' : 'border-[#b5bcc4]'
            }`}
            style={{
              background: isIconicPack
                ? 'linear-gradient(90deg, #e5c878 0%, #fff6d6 20%, #ffffff 50%, #fff6d6 80%, #e5c878 100%)'
                : 'linear-gradient(90deg, #d8dde3 0%, #f5f7f9 18%, #ffffff 50%, #f5f7f9 82%, #d8dde3 100%)',
            }}
          >
            <div
              className="w-full h-full"
              style={{
                backgroundImage: isIconicPack
                  ? 'repeating-linear-gradient(90deg, rgba(180,130,20,0.28) 0px, rgba(180,130,20,0.28) 2px, rgba(255,255,255,0.85) 2px, rgba(255,255,255,0.85) 5px)'
                  : 'repeating-linear-gradient(90deg, rgba(114,119,125,0.28) 0px, rgba(114,119,125,0.28) 2px, rgba(255,255,255,0.85) 2px, rgba(255,255,255,0.85) 5px)',
              }}
            />
          </div>
        </motion.div>
      </div>

      {/* Texte d'instruction sous le sachet */}
      <div className="mt-9 flex flex-col items-center gap-2 z-10 text-center">
        {isFetching || (isOpening && stage === 'pack') ? (
          <div className="inline-flex items-center gap-2 text-[13px] font-medium text-[#3366cc]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Tirage des 6 pages sur Wikipédia...</span>
          </div>
        ) : stage === 'tearing' ? (
          <div className="inline-flex items-center gap-2 text-[13px] font-medium text-[#3366cc]">
            <span>Ouverture du booster en cours...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[13px] text-[#54595d]">
              Cliquez sur le booster pour l'ouvrir et découvrir vos 6 cartes
            </span>
            {isIconicPack && (
              <button
                type="button"
                onClick={handleSkipIconicToStandard}
                disabled={isLocked}
                className="wiki-link text-[12px] disabled:opacity-50 disabled:pointer-events-none"
              >
                Passer au booster standard ({freeBoostersCount > 0 ? 0 : boosterPrice} ₩)
              </button>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="mt-1 text-[12.5px] text-[#b32424] bg-[#fee7e6] border border-[#f8b3b0] px-3 py-1.5 rounded-[2px] text-center font-bold">
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
