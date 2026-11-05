// Rôle : Barre de navigation Vector 2022 et menu contextuel Outils (⋮) pour WikiCards.
// Dépendances : React, Lucide-react (Sun, Moon, Volume2, VolumeX, Eye, EyeOff, MoreVertical, Languages).
// Effets de bord : Déclenche les bascules d'onglets, de mode sombre, de son et de visibilité du barème.

import React from 'react';
import {
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  MoreVertical,
  Languages,
} from 'lucide-react';

/**
 * Barre d'onglets de navigation et menu déroulant Vector 2022.
 * @param {Object} props
 * @param {string} props.activeTab - Onglet actif
 * @param {Function} props.setActiveTab - Sélecteur d'onglet
 * @param {number} props.collectionCount - Nombre d'articles uniques dans le classeur
 * @param {boolean} props.isDarkMode - Statut du mode sombre
 * @param {Function} props.onToggleDarkMode - Bascule mode sombre
 * @param {boolean} props.isMuted - Statut muet du son
 * @param {Function} props.onToggleSound - Bascule son
 * @param {boolean} props.showRarityRules - Affichage du barème des raretés
 * @param {Function} props.onToggleShowRarityRules - Bascule barème
 * @param {boolean} props.isToolsMenuOpen - État d'ouverture du menu déroulant
 * @param {Function} props.setIsToolsMenuOpen - Déclencheur du menu déroulant
 * @param {React.RefObject} props.toolsDropdownRef - Référence pour clic extérieur
 * @returns {JSX.Element}
 */
export default function NavigationTabs({
  activeTab,
  setActiveTab,
  collectionCount = 0,
  isDarkMode,
  onToggleDarkMode,
  isMuted,
  onToggleSound,
  showRarityRules,
  onToggleShowRarityRules,
  isToolsMenuOpen,
  setIsToolsMenuOpen,
  toolsDropdownRef,
}) {
  return (
    <>
      <header className="mw-body-header vector-page-titlebar pb-[2px] flex items-center justify-between gap-2">
        <h1
          id="firstHeading"
          className="firstHeading mw-first-heading wiki-serif text-[22px] sm:text-[28.8px] font-normal text-[#101418] leading-[1.375] m-0 p-0 truncate"
        >
          {activeTab === 'profile' ? 'Utilisateur' : 'Bienvenue sur WikiCards'}
        </h1>

        <div className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 text-[12px] sm:text-[14px] font-bold text-[#3366cc] rounded-[2px] select-none shrink-0">
          <Languages className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] stroke-[2]" />
          <span>Wikipédia&nbsp;FR</span>
        </div>
      </header>

      <div className="vector-page-toolbar mb-[16px] relative z-20">
        <div className="vector-page-toolbar-container flex items-center justify-between min-h-[35px] relative">
          <div
            id="left-navigation"
            className="flex items-center gap-[12px] sm:gap-[16px] overflow-x-auto whitespace-nowrap scrollbar-none pb-1 sm:pb-0 flex-1 min-w-0 pr-1"
          >
            <button
              type="button"
              onClick={() => setActiveTab('booster')}
              className={`vector-tab-link shrink-0 ${activeTab === 'booster' ? 'selected' : ''}`}
            >
              Accueil
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('classeur')}
              className={`vector-tab-link shrink-0 ${activeTab === 'classeur' ? 'selected' : ''}`}
            >
              Classeur ({collectionCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('wikisino')}
              className={`vector-tab-link shrink-0 ${activeTab === 'wikisino' ? 'selected' : ''}`}
            >
              WikiSino
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('social')}
              className={`vector-tab-link shrink-0 ${activeTab === 'social' ? 'selected' : ''}`}
            >
              Social
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('market')}
              className={`vector-tab-link shrink-0 ${activeTab === 'market' ? 'selected' : ''}`}
            >
              Marché
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`vector-tab-link shrink-0 ${activeTab === 'profile' ? 'selected' : ''}`}
            >
              Profil
            </button>
          </div>

          <div id="right-navigation" className="flex items-center gap-[8px] sm:gap-[16px] shrink-0 ml-2">
            <span className="vector-tab-link selected hidden xs:inline-flex">Lire</span>
            <a
              href="https://fr.wikipedia.org/wiki/Sp%C3%A9cial:Page_au_hasard"
              target="_blank"
              rel="noopener noreferrer"
              className="vector-tab-link hidden md:inline-flex"
            >
              Ouvrir une page au hasard
            </a>

            <div ref={toolsDropdownRef} id="vector-page-tools-dropdown" className="vector-dropdown relative">
              <button
                type="button"
                onClick={() => setIsToolsMenuOpen((prev) => !prev)}
                className={`w-[32px] h-[32px] text-[#202122] hover:bg-[#eaecf0] active:bg-[#dadde3] rounded-[2px] cursor-pointer flex items-center justify-center transition-colors ${
                  isToolsMenuOpen ? 'bg-[#dadde3]' : ''
                }`}
                title="Outils"
                aria-label="Outils"
                aria-expanded={isToolsMenuOpen}
              >
                <MoreVertical className="w-[16px] h-[16px]" />
              </button>

              {isToolsMenuOpen && (
                <div className="vector-dropdown-content absolute right-0 top-full mt-1 w-[240px] bg-white dark:bg-[#1f2328] border border-[#a2a9b1] dark:border-[#444c56] rounded-[2px] shadow-[0_4px_12px_rgba(0,0,0,0.2)] py-[14px] px-[16px] z-50 text-[14px] leading-[1.4]">
                  <div id="vector-page-tools-unpinned-container" className="vector-unpinned-container">
                    <div id="vector-page-tools" className="vector-page-tools vector-pinnable-element">
                      <div className="vector-pinnable-header flex items-center justify-between border-b border-[#eaecf0] dark:border-[#373e47] pb-[6px] mb-[6px]">
                        <div className="vector-pinnable-header-label font-bold text-[#202122] dark:text-[#f0f6fc] text-[14px]">
                          Outils
                        </div>
                      </div>

                      <div id="p-tb" className="vector-menu mw-portlet mw-portlet-tb">
                        <div className="vector-menu-heading text-[14px] text-[#54595d] dark:text-[#8b949e] border-b border-[#eaecf0] dark:border-[#373e47] py-[6px] mb-[6px]">
                          Général
                        </div>
                        <div className="vector-menu-content">
                          <ul className="vector-menu-content-list list-none m-0 p-0 space-y-0.5">
                            <li className="mw-list-item">
                              <button
                                type="button"
                                onClick={onToggleDarkMode}
                                className="w-full text-left py-[6px] text-[#3366cc] hover:text-[#3056a9] hover:underline cursor-pointer inline-flex items-center gap-1.5 text-[14px]"
                              >
                                {isDarkMode ? (
                                  <>
                                    <Sun className="w-[14px] h-[14px] text-[#3366cc]" />
                                    <span>Mode clair</span>
                                  </>
                                ) : (
                                  <>
                                    <Moon className="w-[14px] h-[14px]" />
                                    <span>Mode sombre</span>
                                  </>
                                )}
                              </button>
                            </li>
                            <li className="mw-list-item">
                              <button
                                type="button"
                                onClick={onToggleSound}
                                className="w-full text-left py-[6px] text-[#3366cc] hover:text-[#3056a9] hover:underline cursor-pointer inline-flex items-center gap-1.5 text-[14px]"
                                title={isMuted ? 'Activer les effets sonores' : 'Couper les effets sonores'}
                              >
                                {isMuted ? (
                                  <>
                                    <VolumeX className="w-[14px] h-[14px] text-[#72777d]" />
                                    <span>Son coupé</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="w-[14px] h-[14px]" />
                                    <span>Son activé</span>
                                  </>
                                )}
                              </button>
                            </li>
                            <li className="mw-list-item">
                              <button
                                type="button"
                                onClick={onToggleShowRarityRules}
                                className="w-full text-left py-[6px] text-[#3366cc] hover:text-[#3056a9] hover:underline cursor-pointer inline-flex items-center gap-1.5 text-[14px]"
                              >
                                {showRarityRules ? (
                                  <>
                                    <EyeOff className="w-[14px] h-[14px]" />
                                    <span>Masquer le barème</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-[14px] h-[14px]" />
                                    <span>Voir le barème</span>
                                  </>
                                )}
                              </button>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
