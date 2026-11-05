// Rôle : Orchestrateur racine de l'application WikiCards (routage par onglets, hooks de compte et layout Vector 2022).
// Dépendances : React, usePlayerAccount, useNotifications, useAppPreferences, sous-composants d'interface.
// Effets de bord : Synchronise l'état global avec le localStorage et le backend via les hooks dédiés.

import React, { useState } from 'react';
import { usePlayerAccount } from './hooks/usePlayerAccount';
import { useNotifications } from './hooks/useNotifications';
import { useAppPreferences } from './hooks/useAppPreferences';
import AuthGateway from './components/AuthGateway';
import WikiHeader from './components/WikiHeader';
import NavigationTabs from './components/NavigationTabs';
import DailyRewardBanner from './components/DailyRewardBanner';
import AppTabContent from './components/AppTabContent';
import WikiFooter from './components/WikiFooter';

/**
 * Composant racine de l'application WikiCards.
 * @returns {React.ReactElement}
 */
export default function App() {
  const [activeTab, setActiveTab] = useState('booster');
  const [searchQuery, setSearchQuery] = useState('');

  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      const saved = localStorage.getItem('wikicards_read_notifs_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [dismissedNotifIds, setDismissedNotifIds] = useState(() => {
    try {
      const saved = localStorage.getItem('wikicards_dismissed_notifs_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const {
    isDarkMode,
    setIsDarkMode,
    handleToggleDarkMode,
    isMuted,
    handleToggleSound,
    showRarityRules,
    handleToggleShowRarityRules,
    isToolsMenuOpen,
    setIsToolsMenuOpen,
    toolsDropdownRef,
  } = useAppPreferences();

  const account = usePlayerAccount({
    onHydrateDarkMode: setIsDarkMode,
    readNotifIds,
    dismissedNotifIds,
    onHydrateNotifIds: ({ read, dismissed }) => {
      if (Array.isArray(read)) {
        setReadNotifIds((prev) => Array.from(new Set([...prev, ...read])));
      }
      if (Array.isArray(dismissed)) {
        setDismissedNotifIds((prev) => Array.from(new Set([...prev, ...dismissed])));
      }
    },
  });

  const {
    notifications,
    handleMarkAllNotifsRead,
    handleMarkNotifRead,
    handleDismissNotification,
    handleClearAllNotifications,
    handleSelectNotification,
  } = useNotifications({
    userCode: account.userCode,
    isDailyRewardAvailable: account.isDailyRewardAvailable,
    todayKey: account.todayKey,
    freeBoostersCount: account.freeBoostersCount,
    lastFreeBoostersResetTime: account.lastFreeBoostersResetTime,
    setActiveTab,
    readNotifIds,
    setReadNotifIds,
    dismissedNotifIds,
    setDismissedNotifIds,
  });

  if (!account.userCode) {
    return <AuthGateway onLoginSuccess={account.handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-white text-[#202122] flex flex-col font-sans">
      <WikiHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        wikithunes={account.wikithunes}
        userProfile={account.userProfile}
        playerScore={account.playerScore}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        notifications={notifications}
        readNotificationIds={readNotifIds}
        onMarkAllNotifsRead={handleMarkAllNotifsRead}
        onSelectNotification={handleSelectNotification}
        onMarkNotifRead={handleMarkNotifRead}
        onDismissNotification={handleDismissNotification}
        onClearAllNotifications={handleClearAllNotifications}
      />

      {/* mw-page-container : Conteneur officiel Vector 2022 */}
      <div className="mw-page-container flex-1 w-full max-w-[1440px] mx-auto px-2.5 sm:px-[44px] pt-[12px] sm:pt-[18px] pb-[60px] sm:pb-[82px]">
        <div className="mw-content-container">
          <main id="content" className="mw-body">
            <NavigationTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              collectionCount={account.collection.length}
              isDarkMode={isDarkMode}
              onToggleDarkMode={handleToggleDarkMode}
              isMuted={isMuted}
              onToggleSound={handleToggleSound}
              showRarityRules={showRarityRules}
              onToggleShowRarityRules={handleToggleShowRarityRules}
              isToolsMenuOpen={isToolsMenuOpen}
              setIsToolsMenuOpen={setIsToolsMenuOpen}
              toolsDropdownRef={toolsDropdownRef}
            />

            <div id="bodyContent" className="vector-body">
              <div id="mw-content-text" className="mw-body-content">
                <div id="accueil_2017_en-tete" className="mb-[16px]">
                  <div id="accueil_2017_bandeau" className="flex flex-col md:flex-row flex-wrap items-start md:items-center justify-between gap-4">
                    <div id="accueil_2017_bloc-titre" className="pl-0 sm:ml-[14rem] mb-1 sm:mb-[1rem] text-left">
                      <h2>Wikicards</h2>
                      <p>L'encyclopédie libre que vous pouvez collectionner</p>
                    </div>
                  </div>
                </div>

                <DailyRewardBanner
                  dailyRewardToast={account.dailyRewardToast}
                  onDismissToast={() => account.setDailyRewardToast(null)}
                  isDailyRewardAvailable={account.isDailyRewardAvailable}
                  onClaimDailyReward={account.handleClaimDailyReward}
                />

                <AppTabContent
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  showRarityRules={showRarityRules}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  account={account}
                />
              </div>
            </div>
          </main>
        </div>

        <WikiFooter />
      </div>
    </div>
  );
}
