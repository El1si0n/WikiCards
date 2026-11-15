/**
 * @file Rôle : Panneau flottant de débogage et de test rapide exclusivement actif en environnement local.
 * Dépendances : React, `lucide-react`, `../config/rarities`, `../hooks/useBoosterOpening`.
 * Effets de bord : Émet des événements personnalisés pour forcer l'apparition des boosters et créditer le compte local.
 */

import React, { useState } from 'react';
import { Wrench, X, Sparkles, Coins, Package } from 'lucide-react';
import {
  BOOSTER_TYPES,
  isLocalDevEnvironment,
} from '../config/rarities';
import { setDebugForceNextFakeOut } from '../hooks/useBoosterOpening';

const DEBUG_BOOSTER_BUTTONS = [
  {
    id: 'standard',
    emoji: '📦',
    title: 'Standard',
    detail: `6 cartes • ${BOOSTER_TYPES.standard.price} ₩`,
  },
  {
    id: 'free_surprise',
    emoji: '🎁',
    title: 'Booster Offert (5%)',
    detail: '6 cartes • 0 ₩',
  },
  {
    id: 'iconic',
    emoji: '👑',
    title: 'Booster Iconique',
    detail: `6 cartes UR/L • ${BOOSTER_TYPES.iconic.price} ₩`,
  },
  {
    id: 'christmas',
    emoji: '🎄',
    title: 'Noël / Givré',
    detail: `8 cartes • ${BOOSTER_TYPES.christmas.price} ₩`,
  },
  {
    id: 'halloween',
    emoji: '🎃',
    title: 'Halloween / Nocturne',
    detail: `4 cartes sans C • ${BOOSTER_TYPES.halloween.price} ₩`,
  },
  {
    id: 'summer',
    emoji: '☀️',
    title: 'Estival / Odyssée',
    detail: `6 cartes • ${BOOSTER_TYPES.summer.price} ₩`,
  },
  {
    id: 'spring',
    emoji: '🌸',
    title: 'Printemps / Pâques',
    detail: `6 cartes ×2 (12) • ${BOOSTER_TYPES.spring.price} ₩`,
  },
];

/**
 * Menu de débogage local permettant de faire spawn n'importe quel booster et de tester les fonctionnalités.
 * Strictement inactif hors environnement local (localhost / 127.0.0.1 / dev).
 *
 * @param {Object} props
 * @param {function(string): void} [props.onSelectBoosterTab] - Callback pour basculer sur l'onglet booster
 * @param {function(number): void} [props.onAddWikithunes] - Callback pour créditer des Wikifeet de test
 */
export default function LocalDebugMenu({
  onSelectBoosterTab,
  onAddWikithunes,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [forceFakeOutArmed, setForceFakeOutArmed] = useState(false);

  if (!isLocalDevEnvironment()) {
    return null;
  }

  const handleSpawnBooster = (boosterType) => {
    if (onSelectBoosterTab) {
      onSelectBoosterTab('booster');
    }
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('wikicards:debug-spawn-booster', {
          detail: { boosterType },
        })
      );
    }, 30);
  };

  const handleToggleForceFakeOut = () => {
    const next = !forceFakeOutArmed;
    setForceFakeOutArmed(next);
    setDebugForceNextFakeOut(next);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans select-none">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#202122] hover:bg-[#3366cc] text-white text-[12px] font-bold rounded-[3px] shadow-lg border border-white/20 cursor-pointer transition-colors"
          title="Ouvrir le menu de test local"
        >
          <Wrench className="w-3.5 h-3.5 text-[#ffea5a]" />
          <span>Debug Local</span>
        </button>
      ) : (
        <div className="w-[300px] bg-white dark:bg-[#15191e] border border-[#a2a9b1] dark:border-[#3a4047] rounded-[3px] shadow-2xl overflow-hidden text-[#202122] dark:text-[#eaecf0]">
          <div className="px-3 py-2 bg-[#202122] text-white flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider">
              <Wrench className="w-3.5 h-3.5 text-[#ffea5a]" />
              <span>Debug Menu (Local)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-white/75 hover:text-white cursor-pointer p-0.5"
              aria-label="Fermer le menu debug"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-2.5 max-h-[75vh] overflow-y-auto">
            <div className="text-[11px] font-bold text-[#54595d] dark:text-[#a2a9b1] uppercase tracking-wider flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-[#3366cc]" />
              <span>Faire spawn un booster</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {DEBUG_BOOSTER_BUTTONS.map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => handleSpawnBooster(btn.id)}
                  className="w-full px-2.5 py-1.5 text-left bg-[#f8f9fa] dark:bg-[#1e242b] hover:bg-[#eaf3ff] dark:hover:bg-[#263140] border border-[#c8ccd1] dark:border-[#323942] rounded-[2px] flex items-center justify-between gap-2 cursor-pointer transition-colors"
                >
                  <span className="text-[12px] font-bold flex items-center gap-1.5">
                    <span>{btn.emoji}</span>
                    <span>{btn.title}</span>
                  </span>
                  <span className="text-[10.5px] font-medium text-[#54595d] dark:text-[#a2a9b1] shrink-0">
                    {btn.detail}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-[#eaecf0] dark:border-[#2a3038] space-y-1.5">
              <div className="text-[11px] font-bold text-[#54595d] dark:text-[#a2a9b1] uppercase tracking-wider">
                Outils rapides
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onAddWikithunes && onAddWikithunes(5000)}
                  className="px-2 py-1.5 bg-[#eaf3ff] hover:bg-[#d5e7ff] text-[#3366cc] border border-[#3366cc]/40 rounded-[2px] text-[11.5px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>+5 000 ₩</span>
                </button>
                <button
                  type="button"
                  onClick={handleToggleForceFakeOut}
                  className={`px-2 py-1.5 rounded-[2px] text-[11.5px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer border transition-colors ${
                    forceFakeOutArmed
                      ? 'bg-[#fef08a] text-[#713f12] border-[#eab308]'
                      : 'bg-[#f8f9fa] dark:bg-[#1e242b] text-[#202122] dark:text-[#eaecf0] border-[#c8ccd1] dark:border-[#323942]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{forceFakeOutArmed ? 'Fake-Out ON' : 'Fake-Out 1x'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
