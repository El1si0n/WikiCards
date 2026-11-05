/**
 * @file Rôle : Gestion des préférences d'interface (mode sombre, sourdine audio, affichage barème, menu Outils).
 * Dépendances : `../services/sound`, localStorage, React (`useState`, `useEffect`, `useRef`).
 * Effets de bord : Modification de la classe 'dark' sur le documentElement et persistance localStorage.
 */

import { useState, useEffect, useRef } from 'react';
import { soundManager } from '../services/sound';

const STORAGE_KEYS = {
  DARK_MODE: 'wikicards_dark_mode_v1',
  SHOW_RARITY_RULES: 'wikicards_show_rarity_rules_v1',
};

/**
 * Hook personnalisé gérant les préférences d'affichage et d'accessibilité de l'application.
 * @returns {Object} États et gestionnaires d'actions pour le thème, le son et le menu Outils
 */
export function useAppPreferences() {
  const [showRarityRules, setShowRarityRules] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SHOW_RARITY_RULES);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.SHOW_RARITY_RULES,
        JSON.stringify(showRarityRules)
      );
    } catch {
      // ignore
    }
  }, [showRarityRules]);

  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => soundManager.isMuted());
  const toolsDropdownRef = useRef(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return false;
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.DARK_MODE,
        JSON.stringify(isDarkMode)
      );
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {
      // ignore
    }
  }, [isDarkMode]);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleToggleSound = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      soundManager.playBoosterCharge();
    }
  };

  const handleToggleShowRarityRules = () => {
    setShowRarityRules((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        toolsDropdownRef.current &&
        !toolsDropdownRef.current.contains(e.target)
      ) {
        setIsToolsMenuOpen(false);
      }
    };
    if (isToolsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isToolsMenuOpen]);

  return {
    isDarkMode,
    setIsDarkMode,
    handleToggleDarkMode,
    isMuted,
    handleToggleSound,
    showRarityRules,
    setShowRarityRules,
    handleToggleShowRarityRules,
    isToolsMenuOpen,
    setIsToolsMenuOpen,
    toolsDropdownRef,
  };
}
