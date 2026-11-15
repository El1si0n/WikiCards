/**
 * @file Rôle : Vue 3D du sachet de booster fermé et animation de déchirure physique du pack.
 * Dépendances : React, `framer-motion`, `lucide-react`, `../WikithuneIcon`, `./PackDecorations`.
 * Effets de bord : Déclenche l'ouverture du booster au clic.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import WikithuneIcon from '../WikithuneIcon';
import { PackBodyDecoration, PackMedallionDecoration } from './PackDecorations';

/**
 * Vue interactive de présentation et de déchirure du sachet de booster.
 * @param {Object} props
 * @param {string} props.stage - Étape actuelle ('pack' ou 'tearing')
 * @param {boolean} props.isIconicPack - Indique si le booster est iconique
 * @param {string} [props.highestRarityKey='C'] - Code de rareté la plus élevée contenue dans le booster
 * @param {Object|null} [props.highestRarityConfig=null] - Configuration de la rareté la plus élevée
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
const PACK_THEMES = {
  standard: {
    halo: null,
    borderClass: 'border-[#b5bcc4]',
    sealBg:
      'linear-gradient(90deg, #d8dde3 0%, #f5f7f9 18%, #ffffff 50%, #f5f7f9 82%, #d8dde3 100%)',
    sealStripes:
      'repeating-linear-gradient(90deg, rgba(114,119,125,0.28) 0px, rgba(114,119,125,0.28) 2px, rgba(255,255,255,0.85) 2px, rgba(255,255,255,0.85) 5px)',
    tearTextClass: 'text-[#54595d]',
    bodyBg:
      'linear-gradient(90deg, #dfe5ec 0%, #f4f7fb 12%, #ffffff 32%, #f8fbff 50%, #ffffff 68%, #f4f7fb 88%, #dfe5ec 100%)',
    bodyShadow: `
      inset 22px 0 28px -14px rgba(32, 33, 34, 0.14),
      inset -22px 0 28px -14px rgba(32, 33, 34, 0.16),
      inset 0 18px 22px -12px rgba(255, 255, 255, 0.95),
      inset 0 -18px 24px -12px rgba(32, 33, 34, 0.10),
      0 20px 38px -12px rgba(32, 33, 34, 0.22),
      0 4px 10px rgba(32, 33, 34, 0.08)
    `,
    innerFrameShadow:
      '0 0 0 1px rgba(255,255,255,0.85), 0 4px 16px rgba(32,33,34,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
    innerFrameBg:
      'linear-gradient(180deg, rgba(234,243,255,0.45) 0%, rgba(255,255,255,0.2) 50%, rgba(221,236,249,0.5) 100%)',
    wave1: 'rgba(221, 236, 249, 0.45)',
    wave2: 'rgba(167, 215, 249, 0.35)',
    headerBorderClass: 'border-[#a7d7f9]',
    invertWordmark: false,
    medallionBorderClass: 'border-[#c8ccd1]',
    medallionBg:
      'radial-gradient(circle at 40% 35%, #ffffff 0%, #eef5fb 70%, #ddecf9 100%)',
    medallionShadow:
      '0 10px 24px -6px rgba(51, 102, 204, 0.18), inset 0 2px 4px rgba(255, 255, 255, 1)',
    badgeClass: 'bg-[#3366cc] text-white',
    subtitleClass: 'text-[#54595d]',
  },
  iconic: {
    halo: 'radial-gradient(circle, #ffea5a 0%, #f0b429 55%, transparent 100%)',
    borderClass: 'border-[#d4a11d]',
    sealBg:
      'linear-gradient(90deg, #e5c878 0%, #fff6d6 20%, #ffffff 50%, #fff6d6 80%, #e5c878 100%)',
    sealStripes:
      'repeating-linear-gradient(90deg, rgba(180,130,20,0.28) 0px, rgba(180,130,20,0.28) 2px, rgba(255,255,255,0.85) 2px, rgba(255,255,255,0.85) 5px)',
    tearTextClass: 'text-[#6e4f00]',
    bodyBg:
      'linear-gradient(90deg, #ead59b 0%, #fbf3dc 12%, #ffffff 32%, #fffdf5 50%, #ffffff 68%, #fbf3dc 88%, #ead59b 100%)',
    bodyShadow: `
      inset 22px 0 28px -14px rgba(140, 95, 10, 0.18),
      inset -22px 0 28px -14px rgba(140, 95, 10, 0.20),
      inset 0 18px 22px -12px rgba(255, 255, 255, 0.95),
      inset 0 -18px 24px -12px rgba(140, 95, 10, 0.14),
      0 20px 42px -10px rgba(212, 161, 29, 0.35),
      0 4px 12px rgba(32, 33, 34, 0.10)
    `,
    innerFrameShadow:
      '0 0 0 1px rgba(255,240,180,0.9), 0 4px 16px rgba(180,130,20,0.12), inset 0 1px 0 rgba(255,255,255,0.95)',
    innerFrameBg:
      'linear-gradient(180deg, rgba(255,238,165,0.45) 0%, rgba(255,255,255,0.25) 50%, rgba(246,220,107,0.42) 100%)',
    wave1: 'rgba(255, 228, 130, 0.42)',
    wave2: 'rgba(235, 190, 75, 0.35)',
    headerBorderClass: 'border-[#deb226]',
    invertWordmark: false,
    medallionBorderClass: 'border-[#d4a11d]',
    medallionBg:
      'radial-gradient(circle at 40% 35%, #ffffff 0%, #fff8dc 65%, #f6dc6b 100%)',
    medallionShadow:
      '0 10px 26px -4px rgba(212, 161, 29, 0.38), inset 0 2px 4px rgba(255, 255, 255, 1)',
    badgeClass:
      'bg-gradient-to-r from-[#b37e08] via-[#d4a11d] to-[#9a6b05] text-white',
    subtitleClass: 'text-[#6e4f00]',
  },
  christmas: {
    halo: 'radial-gradient(circle, rgba(220, 38, 38, 0.45) 0%, rgba(234, 179, 8, 0.25) 55%, transparent 100%)',
    borderClass: 'border-[#e5c158]',
    sealBg:
      'linear-gradient(90deg, #d4af37 0%, #fff8dc 22%, #ffffff 50%, #fff8dc 78%, #d4af37 100%)',
    sealStripes:
      'repeating-linear-gradient(90deg, rgba(153,27,27,0.25) 0px, rgba(153,27,27,0.25) 2px, rgba(255,255,255,0.9) 2px, rgba(255,255,255,0.9) 5px)',
    tearTextClass: 'text-[#7f1d1d]',
    bodyBg:
      'linear-gradient(90deg, #6b0f1a 0%, #8f1d2c 14%, #b91c1c 35%, #dc2626 50%, #b91c1c 65%, #8f1d2c 86%, #6b0f1a 100%)',
    bodyShadow: `
      inset 22px 0 28px -14px rgba(45, 5, 10, 0.45),
      inset -22px 0 28px -14px rgba(45, 5, 10, 0.45),
      inset 0 18px 22px -12px rgba(255, 240, 200, 0.5),
      inset 0 -18px 24px -12px rgba(45, 5, 10, 0.4),
      0 20px 42px -10px rgba(185, 28, 28, 0.42),
      0 4px 12px rgba(32, 33, 34, 0.16)
    `,
    innerFrameShadow:
      '0 0 0 1.5px rgba(253,224,71,0.75), 0 4px 16px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.65)',
    innerFrameBg:
      'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(254,240,138,0.08) 50%, rgba(127,29,29,0.35) 100%)',
    wave1: 'rgba(254, 240, 138, 0.18)',
    wave2: 'rgba(255, 255, 255, 0.16)',
    headerBorderClass: 'border-[#fde047]/60',
    invertWordmark: true,
    medallionBorderClass: 'border-[#fde047]',
    medallionBg:
      'radial-gradient(circle at 40% 35%, #ffffff 0%, #fffbeb 65%, #fde68a 100%)',
    medallionShadow:
      '0 10px 26px -4px rgba(0, 0, 0, 0.45), 0 0 18px rgba(253, 224, 71, 0.4), inset 0 2px 4px rgba(255, 255, 255, 1)',
    badgeClass:
      'bg-gradient-to-r from-[#991b1b] via-[#b91c1c] to-[#7f1d1d] text-[#fef08a] border border-[#fde047]/70',
    subtitleClass: 'text-[#fef9c3]',
  },
  halloween: {
    halo: 'radial-gradient(circle, rgba(249, 115, 22, 0.42) 0%, rgba(147, 51, 234, 0.35) 55%, transparent 100%)',
    borderClass: 'border-[#f97316]',
    sealBg:
      'linear-gradient(90deg, #3b0764 0%, #7e22ce 22%, #f97316 50%, #7e22ce 78%, #3b0764 100%)',
    sealStripes:
      'repeating-linear-gradient(90deg, rgba(15,10,28,0.48) 0px, rgba(15,10,28,0.48) 2px, rgba(251,146,60,0.45) 2px, rgba(251,146,60,0.45) 5px)',
    tearTextClass: 'text-[#ffedd5]',
    bodyBg:
      'linear-gradient(90deg, #0d0914 0%, #1a1025 15%, #2e1065 36%, #3b0764 50%, #2e1065 64%, #1a1025 85%, #0d0914 100%)',
    bodyShadow: `
      inset 22px 0 28px -14px rgba(0, 0, 0, 0.65),
      inset -22px 0 28px -14px rgba(0, 0, 0, 0.65),
      inset 0 18px 22px -12px rgba(249, 115, 22, 0.35),
      inset 0 -18px 24px -12px rgba(147, 51, 234, 0.4),
      0 20px 42px -10px rgba(147, 51, 234, 0.48),
      0 4px 14px rgba(249, 115, 22, 0.25)
    `,
    innerFrameShadow:
      '0 0 0 1.5px rgba(249,115,22,0.65), 0 4px 18px rgba(147,51,234,0.35), inset 0 1px 0 rgba(251,146,60,0.4)',
    innerFrameBg:
      'linear-gradient(180deg, rgba(147,51,234,0.22) 0%, rgba(249,115,22,0.12) 50%, rgba(15,10,25,0.5) 100%)',
    wave1: 'rgba(249, 115, 22, 0.22)',
    wave2: 'rgba(168, 85, 247, 0.25)',
    headerBorderClass: 'border-[#f97316]/60',
    invertWordmark: true,
    medallionBorderClass: 'border-[#f97316]',
    medallionBg:
      'radial-gradient(circle at 40% 35%, #fff7ed 0%, #fed7aa 62%, #fb923c 100%)',
    medallionShadow:
      '0 10px 28px -4px rgba(249, 115, 22, 0.48), 0 0 20px rgba(168, 85, 247, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.9)',
    badgeClass:
      'bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#9333ea] text-white border border-[#fdba74]/60',
    subtitleClass: 'text-[#fed7aa]',
  },
  summer: {
    halo: 'radial-gradient(circle, rgba(56, 189, 248, 0.42) 0%, rgba(250, 204, 21, 0.32) 55%, transparent 100%)',
    borderClass: 'border-[#eab308]',
    sealBg:
      'linear-gradient(90deg, #facc15 0%, #fef08a 22%, #ffffff 50%, #fef08a 78%, #facc15 100%)',
    sealStripes:
      'repeating-linear-gradient(90deg, rgba(14,165,233,0.28) 0px, rgba(14,165,233,0.28) 2px, rgba(255,255,255,0.85) 2px, rgba(255,255,255,0.85) 5px)',
    tearTextClass: 'text-[#0369a1]',
    bodyBg:
      'linear-gradient(180deg, #bae6fd 0%, #e0f2fe 26%, #ffffff 52%, #fef9c3 78%, #fde047 100%)',
    bodyShadow: `
      inset 22px 0 28px -14px rgba(2, 132, 199, 0.2),
      inset -22px 0 28px -14px rgba(2, 132, 199, 0.2),
      inset 0 18px 22px -12px rgba(255, 255, 255, 0.95),
      inset 0 -18px 24px -12px rgba(202, 138, 4, 0.22),
      0 20px 42px -10px rgba(14, 165, 233, 0.32),
      0 4px 12px rgba(32, 33, 34, 0.10)
    `,
    innerFrameShadow:
      '0 0 0 1px rgba(250,204,21,0.8), 0 4px 16px rgba(14,165,233,0.14), inset 0 1px 0 rgba(255,255,255,0.95)',
    innerFrameBg:
      'linear-gradient(180deg, rgba(56,189,248,0.25) 0%, rgba(255,255,255,0.3) 50%, rgba(253,224,71,0.35) 100%)',
    wave1: 'rgba(56, 189, 248, 0.35)',
    wave2: 'rgba(250, 204, 21, 0.38)',
    headerBorderClass: 'border-[#38bdf8]',
    invertWordmark: false,
    medallionBorderClass: 'border-[#eab308]',
    medallionBg:
      'radial-gradient(circle at 40% 35%, #ffffff 0%, #e0f2fe 62%, #fef08a 100%)',
    medallionShadow:
      '0 10px 26px -4px rgba(14, 165, 233, 0.32), inset 0 2px 4px rgba(255, 255, 255, 1)',
    badgeClass:
      'bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#eab308] text-white',
    subtitleClass: 'text-[#0c4a6e]',
  },
  spring: {
    halo: 'radial-gradient(circle, rgba(244, 114, 182, 0.35) 0%, rgba(52, 211, 153, 0.32) 55%, transparent 100%)',
    borderClass: 'border-[#d4a11d]',
    sealBg:
      'linear-gradient(90deg, #f9a8d4 0%, #fce7f3 22%, #ffffff 50%, #d1fae5 78%, #6ee7b7 100%)',
    sealStripes:
      'repeating-linear-gradient(90deg, rgba(212,161,29,0.28) 0px, rgba(212,161,29,0.28) 2px, rgba(255,255,255,0.88) 2px, rgba(255,255,255,0.88) 5px)',
    tearTextClass: 'text-[#065f46]',
    bodyBg:
      'linear-gradient(155deg, #fce7f3 0%, #fdf2f8 25%, #ffffff 50%, #ecfdf5 75%, #a7f3d0 100%)',
    bodyShadow: `
      inset 22px 0 28px -14px rgba(219, 39, 119, 0.15),
      inset -22px 0 28px -14px rgba(16, 185, 129, 0.18),
      inset 0 18px 22px -12px rgba(255, 255, 255, 0.95),
      inset 0 -18px 24px -12px rgba(212, 161, 29, 0.16),
      0 20px 42px -10px rgba(16, 185, 129, 0.28),
      0 4px 12px rgba(236, 72, 153, 0.15)
    `,
    innerFrameShadow:
      '0 0 0 1.5px rgba(234,179,8,0.65), 0 4px 16px rgba(16,185,129,0.12), inset 0 1px 0 rgba(255,255,255,0.95)',
    innerFrameBg:
      'linear-gradient(180deg, rgba(251,207,232,0.4) 0%, rgba(255,255,255,0.3) 50%, rgba(167,243,208,0.42) 100%)',
    wave1: 'rgba(244, 114, 182, 0.28)',
    wave2: 'rgba(52, 211, 153, 0.3)',
    headerBorderClass: 'border-[#f472b6]/60',
    invertWordmark: false,
    medallionBorderClass: 'border-[#d4a11d]',
    medallionBg:
      'radial-gradient(circle at 40% 35%, #ffffff 0%, #fdf2f8 62%, #d1fae5 100%)',
    medallionShadow:
      '0 10px 26px -4px rgba(236, 72, 153, 0.28), inset 0 2px 4px rgba(255, 255, 255, 1)',
    badgeClass:
      'bg-gradient-to-r from-[#059669] via-[#10b981] to-[#db2777] text-white',
    subtitleClass: 'text-[#065f46]',
  },
};

export default function BoosterPackView({
  stage,
  boosterType = 'standard',
  boosterConfig = null,
  isIconicPack,
  highestRarityKey = 'C',
  highestRarityConfig = null,
  isFakeOutShock = false,
  fakeOutState = null,
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
  const visualKey =
    boosterType === 'free_surprise'
      ? 'standard'
      : PACK_THEMES[boosterType]
      ? boosterType
      : isIconicPack
      ? 'iconic'
      : 'standard';
  const packTheme = PACK_THEMES[visualKey] || PACK_THEMES.standard;
  const badgeLabel =
    boosterConfig?.badgeLabel ||
    (isIconicPack ? 'Booster Iconique' : 'Booster');
  const cardCount = boosterConfig?.cardCount || 6;
  const isSpecialPack = Boolean(boosterConfig?.isSpecial || isIconicPack);

  // Lueur de Walkout personnalisée selon la plus haute rareté contenue dans le booster
  const walkout = highestRarityConfig?.walkout || {
    beam: 'linear-gradient(to top, rgba(191, 227, 255, 0.75) 0%, rgba(96, 165, 250, 0.42) 22%, rgba(51, 102, 204, 0.15) 55%, transparent 100%)',
    ray: 'conic-gradient(from 295deg at 50% 108%, transparent 0deg, rgba(147, 197, 253, 0.45) 14deg, transparent 26deg, rgba(224, 242, 254, 0.6) 42deg, transparent 54deg, rgba(96, 165, 250, 0.65) 65deg, transparent 76deg, rgba(224, 242, 254, 0.6) 88deg, transparent 100deg, rgba(147, 197, 253, 0.45) 114deg, transparent 130deg)',
    crackLine: 'linear-gradient(90deg, rgba(96,165,250,0.25) 0%, rgba(255,255,255,0.85) 25%, #eff6ff 50%, rgba(255,255,255,0.85) 75%, rgba(96,165,250,0.25) 100%)',
    shadow: '0 -1px 7px 1px rgba(59, 130, 246, 0.65)',
    tearBarBg: '#3366cc',
    tearBarShadow: '0 0 14px #3366cc',
  };

  return (
    <motion.div
      key="booster-pack-front"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px] py-10 px-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[600px]"
    >
      {/* Halo subtil pour booster iconique ou saisonnier */}
      {packTheme.halo && (
        <div
          className="absolute w-96 h-96 rounded-full pointer-events-none blur-3xl opacity-35"
          style={{
            background: packTheme.halo,
          }}
        />
      )}

      {/* Onde de choc lumineuse lors d'un Fake-Out gacha */}
      {stage === 'tearing' && isFakeOutShock && (
        <>
          <motion.div
            key="fakeout-screen-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.72, 0.25, 0] }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="absolute inset-0 pointer-events-none z-30"
            style={{
              background:
                highestRarityKey === 'L'
                  ? 'radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 234, 90, 0.78) 38%, rgba(222, 178, 38, 0.35) 68%, transparent 100%)'
                  : highestRarityKey === 'UR'
                  ? 'radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.92) 0%, rgba(255, 208, 138, 0.75) 38%, rgba(232, 131, 28, 0.32) 68%, transparent 100%)'
                  : 'radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.9) 0%, rgba(247, 190, 219, 0.72) 38%, rgba(220, 109, 163, 0.3) 68%, transparent 100%)',
            }}
          />
          <motion.div
            key="fakeout-shockwave-ring"
            initial={{ opacity: 0.95, scale: 0.3 }}
            animate={{ opacity: 0, scale: 2.35 }}
            transition={{ duration: 0.68, ease: 'easeOut' }}
            className="absolute w-64 h-64 rounded-full pointer-events-none z-20"
            style={{
              top: '150px',
              border: `3px solid ${
                highestRarityKey === 'L'
                  ? '#ffea5a'
                  : highestRarityKey === 'UR'
                  ? '#f7a440'
                  : '#ea8eba'
              }`,
              boxShadow: `0 0 28px ${
                highestRarityKey === 'L'
                  ? '#deb226'
                  : highestRarityKey === 'UR'
                  ? '#e8831c'
                  : '#d15892'
              }`,
            }}
          />
        </>
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
          initial={{ y: 0, scale: 1, opacity: 1 }}
          animate={
            stage === 'tearing'
              ? isFakeOutShock
                ? {
                    x: [0, -11, 11, -8, 8, -4, 4, 0],
                    y: [-6, -12, -8, 115],
                    rotate: [0, -2.5, 2.5, -1.5, 1.5, 0],
                    scale: [1.02, 1.09, 1.05, 0.95],
                    opacity: [1, 1, 1, 0],
                  }
                : fakeOutState
                ? {
                    y: [0, -6, -6],
                    scale: [1, 1.02, 1.02],
                    opacity: [1, 1, 1],
                  }
                : {
                    y: [0, -6, 110],
                    scale: [1, 1.03, 0.95],
                    opacity: [1, 1, 0],
                  }
              : {
                  x: 0,
                  y: glare.isHovered ? -4 : 0,
                  rotate: 0,
                  scale: 1,
                  opacity: 1,
                }
          }
          transition={
            stage === 'tearing'
              ? {
                  duration: isFakeOutShock ? 0.9 : fakeOutState ? 0.42 : 0.82,
                  ease: 'easeInOut',
                }
              : { duration: 0.25 }
          }
          className="relative w-[284px] flex flex-col items-center"
        >
          {/* Effet de lumière Walkout Glow interne lors de la déchirure */}
          {stage === 'tearing' && (
            <motion.div
              key={isFakeOutShock ? 'walkout-shock' : 'walkout-normal'}
              initial={
                isFakeOutShock
                  ? { opacity: 0.9, scaleY: 0.75, scaleX: 0.92 }
                  : { opacity: 0, scaleY: 0.08, scaleX: 1 }
              }
              animate={{
                opacity: isFakeOutShock
                  ? [1, 1, 0.9, 0]
                  : highestRarityKey === 'L'
                  ? [0, 0.95, 0.82, 0]
                  : highestRarityKey === 'UR'
                  ? [0, 0.8, 0.65, 0]
                  : fakeOutState
                  ? [0, 0.72, 0.75]
                  : [0, 0.62, 0.48, 0],
                scaleY: isFakeOutShock
                  ? [0.8, 1.32, 1.18, 1.25]
                  : fakeOutState
                  ? [0.08, 0.85, 0.9]
                  : [0.08, 0.9, 1, 1.05],
                scaleX: isFakeOutShock ? [0.95, 1.12, 1.04, 1] : 1,
              }}
              transition={{
                duration: isFakeOutShock ? 0.88 : fakeOutState ? 0.4 : 0.8,
                ease: 'easeOut',
              }}
              className="absolute inset-x-0 pointer-events-none z-10 overflow-visible"
              style={{
                top: isFakeOutShock ? '-68px' : '-55px',
                height:
                  highestRarityKey === 'L' || isFakeOutShock ? '118px' : '92px',
                transformOrigin: '50% 100%',
              }}
            >
              <div
                className="absolute inset-x-[2px] bottom-0 h-full transition-all duration-150"
                style={{
                  clipPath: 'polygon(0% 0%, 100% 0%, 98% 100%, 2% 100%)',
                  background: walkout.beam,
                  filter:
                    highestRarityKey === 'L' || isFakeOutShock
                      ? 'blur(5px)'
                      : 'blur(4px)',
                }}
              />
              <div
                className="absolute -inset-x-[12px] bottom-0 h-full transition-all duration-150"
                style={{
                  background: walkout.ray,
                  WebkitMaskImage:
                    'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 45%, transparent 95%)',
                  maskImage:
                    'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 45%, transparent 95%)',
                  filter: 'blur(2px)',
                }}
              />
              <div
                className="absolute inset-x-[2px] bottom-[1px] h-[3.5px] rounded-full transition-all duration-150"
                style={{
                  background: walkout.crackLine,
                  boxShadow: walkout.shadow,
                }}
              />
              {/* Éclairs de rupture lors d'un Fake-Out */}
              {isFakeOutShock && (
                <motion.svg
                  initial={{ opacity: 1, scale: 0.85 }}
                  animate={{ opacity: [1, 1, 0], scale: [0.9, 1.18, 1.25] }}
                  transition={{ duration: 0.48, ease: 'easeOut' }}
                  viewBox="0 0 284 110"
                  className="absolute inset-x-0 bottom-0 w-full h-[110px] pointer-events-none overflow-visible"
                >
                  <path
                    d="M142 108 L128 74 L148 64 L122 22 M142 108 L164 78 L150 62 L182 26 M92 108 L76 76 L90 58 L64 30 M194 108 L210 78 L196 60 L222 32"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      filter: `drop-shadow(0 0 8px ${
                        highestRarityKey === 'L'
                          ? '#ffea5a'
                          : highestRarityKey === 'UR'
                          ? '#f7a440'
                          : '#ea8eba'
                      })`,
                    }}
                  />
                </motion.svg>
              )}
              {/* Particules et éclats jaillissants pour UR, L ou Fake-Out */}
              {(highestRarityKey === 'UR' ||
                highestRarityKey === 'L' ||
                isFakeOutShock) && (
                <div className="absolute inset-x-0 bottom-0 flex justify-around pointer-events-none">
                  {(isFakeOutShock
                    ? [-42, -28, -14, 0, 14, 28, 42]
                    : [-24, -12, 0, 12, 24]
                  ).map((offset, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 0, scale: 0.5 }}
                      animate={{
                        opacity: [0, 1, 0],
                        y: [-8, -56 - (i % 4) * 12],
                        x: [0, offset],
                        scale: [0.5, isFakeOutShock ? 1.55 : 1.3, 0.2],
                      }}
                      transition={{
                        duration: 0.72,
                        delay: i * 0.03,
                        ease: 'easeOut',
                      }}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          highestRarityKey === 'L'
                            ? '#ffea5a'
                            : highestRarityKey === 'UR'
                            ? '#ffd08a'
                            : '#fbd0e5',
                        boxShadow: `0 0 8px ${
                          highestRarityKey === 'L'
                            ? '#deb226'
                            : highestRarityKey === 'UR'
                            ? '#e8831c'
                            : '#e074a8'
                        }`,
                      }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Soudure supérieure */}
          <motion.div
            initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
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
            className={`w-full h-[36px] rounded-t-[8px] relative z-30 flex flex-col justify-between overflow-hidden border border-b-0 ${packTheme.borderClass}`}
            style={{
              background: packTheme.sealBg,
              boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.9)',
            }}
          >
            <div
              className="w-full h-[15px]"
              style={{
                backgroundImage: packTheme.sealStripes,
              }}
            />
            <div
              className={`w-full px-3 pb-1 flex items-center justify-between text-[10px] font-bold tracking-wider uppercase ${packTheme.tearTextClass}`}
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
                  backgroundColor: walkout.tearBarBg,
                  boxShadow: walkout.tearBarShadow,
                }}
              />
            )}
          </motion.div>

          {/* Corps du sachet */}
          <div
            className={`w-full h-[386px] relative z-20 overflow-hidden flex flex-col items-center justify-between px-6 py-6 border ${packTheme.borderClass}`}
            style={{
              background: packTheme.bodyBg,
              boxShadow: packTheme.bodyShadow,
            }}
          >
            <div
              className="absolute inset-x-[22px] inset-y-[18px] rounded-[14px] pointer-events-none"
              style={{
                boxShadow: packTheme.innerFrameShadow,
                background: packTheme.innerFrameBg,
              }}
            />

            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
              viewBox="0 0 300 400"
              preserveAspectRatio="none"
            >
              <path
                d="M-30,85 C70,40 190,130 330,75 L330,400 L-30,400 Z"
                fill={packTheme.wave1}
              />
              <path
                d="M-30,275 C90,225 210,310 330,260 L330,400 L-30,400 Z"
                fill={packTheme.wave2}
              />
            </svg>

            {/* Motifs saisonniers répartis sur le sachet (flocons, étoiles mystiques, fleurs et feuilles) */}
            <PackBodyDecoration visualKey={visualKey} />

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
              className={`relative z-10 w-full flex flex-col items-center border-b pb-3 pt-1 ${packTheme.headerBorderClass}`}
            >
              <img
                alt="Wikipédia"
                src="https://fr.wikipedia.org/static/images/mobile/copyright/wikipedia-wordmark-fr.svg"
                className={`h-[22px] w-auto object-contain ${
                  packTheme.invertWordmark ? 'brightness-0 invert' : ''
                }`}
              />
              <img
                alt="l'encyclopédie libre"
                src="https://fr.wikipedia.org/static/images/mobile/copyright/wikipedia-tagline-fr.svg"
                className={`h-[13px] w-auto object-contain mt-1 opacity-85 ${
                  packTheme.invertWordmark ? 'brightness-0 invert' : ''
                }`}
              />
            </div>

            <div className="relative z-10 my-2 flex items-center justify-center">
              <PackMedallionDecoration visualKey={visualKey} layer="back" />
              <div
                className={`w-[148px] h-[148px] rounded-full flex items-center justify-center p-4 border relative ${packTheme.medallionBorderClass}`}
                style={{
                  background: packTheme.medallionBg,
                  boxShadow: packTheme.medallionShadow,
                }}
              >
                <img
                  src="https://fr.wikipedia.org/static/images/icons/wikipedia.png"
                  alt="Globe Wikipédia"
                  className="w-full h-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.18)]"
                />
              </div>
              <PackMedallionDecoration visualKey={visualKey} layer="front" />
            </div>

            <div className="relative z-10 w-full flex flex-col items-center text-center">
              <div
                className={`px-3.5 py-1 rounded-[3px] text-[11.5px] font-bold tracking-wider uppercase shadow-2xs inline-flex items-center gap-1.5 ${packTheme.badgeClass}`}
              >
                <span>
                  {badgeLabel} • {activePrice}
                </span>
                <WikithuneIcon className="w-[13px] h-[13px]" />
              </div>
              <div
                className={`wiki-serif text-[13px] mt-1.5 ${packTheme.subtitleClass}`}
              >
                Articles aléatoires de Wikipédia
              </div>
            </div>
          </div>

          {/* Soudure inférieure */}
          <div
            className={`w-full h-[22px] rounded-b-[8px] relative z-20 overflow-hidden border border-t-0 ${packTheme.borderClass}`}
            style={{
              background: packTheme.sealBg,
            }}
          >
            <div
              className="w-full h-full"
              style={{
                backgroundImage: packTheme.sealStripes,
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
            <span>Tirage des {cardCount} pages sur Wikipédia...</span>
          </div>
        ) : stage === 'tearing' ? (
          <div className="inline-flex items-center gap-2 text-[13px] font-medium text-[#3366cc]">
            <span>Ouverture du booster en cours...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[13px] text-[#54595d]">
              Cliquez sur le booster pour l'ouvrir et découvrir vos {cardCount} cartes
              {boosterConfig?.copiesPerCard > 1
                ? ` en double (${cardCount * boosterConfig.copiesPerCard} cartes)`
                : ''}
            </span>
            {isSpecialPack && (
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
