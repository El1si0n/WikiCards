import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  CheckCheck,
  Clock,
  Trash2,
  X,
} from 'lucide-react';
import WikithuneIcon from './WikithuneIcon';

const ALL_TABS = [
  'booster',
  'classeur',
  'wikisino',
  'social',
  'market',
  'profile',
];

export default function WikiHeader({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  wikithunes = 0,
  userProfile,
  playerScore = 0,
  isDarkMode = false,
  onToggleDarkMode,
  notifications = [],
  readNotificationIds = [],
  onMarkAllNotifsRead,
  onSelectNotification,
  onMarkNotifRead,
  onDismissNotification,
  onClearAllNotifications,
}) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifDropdownRef = useRef(null);

  // Fermeture du dropdown notifications au clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(e.target)
      ) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && activeTab !== 'classeur') {
      setActiveTab('classeur');
    }
  };

  // Balaye cycliquement l'ensemble des onglets de navigation
  const handleCycleTabs = () => {
    const currentIndex = ALL_TABS.indexOf(activeTab);
    const nextIndex =
      currentIndex >= 0 ? (currentIndex + 1) % ALL_TABS.length : 0;
    setActiveTab(ALL_TABS[nextIndex]);
  };

  const unreadNotifs = notifications.filter(
    (n) => !readNotificationIds.includes(n.id) && !n.isAutoRead
  );
  const unreadCount = unreadNotifs.length;

  return (
    <div className="vector-header-container w-full bg-white">
      <header className="mw-header max-w-[1440px] mx-auto px-2 sm:px-[44px] min-h-[50px] py-[6px] sm:py-[8px] flex items-center justify-between gap-[8px] sm:gap-[16px]">
        {/* vector-header-start : Bouton menu cyclique + Logo officiel Wikipédia */}
        <div className="vector-header-start flex items-center gap-[8px] sm:gap-[20px] shrink-0">
          <button
            type="button"
            onClick={handleCycleTabs}
            className="w-[32px] h-[32px] -ml-[2px] sm:-ml-[6px] flex items-center justify-center text-[#202122] hover:bg-[#eaecf0] active:bg-[#dadde3] rounded-[2px] cursor-pointer transition-colors"
            title="Changer de menu (balayer les onglets)"
            aria-label="Menu principal"
          >
            <Menu className="w-[20px] h-[20px] stroke-[1.8]" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('booster')}
            className="mw-logo flex items-center text-left cursor-pointer"
          >
            <img
              className="mw-logo-icon w-[34px] h-[34px] sm:w-[50px] sm:h-[50px] object-contain mr-[6px] sm:mr-[10px]"
              src="https://fr.wikipedia.org/static/images/icons/wikipedia.png"
              alt=""
              aria-hidden="true"
              height="50"
              width="50"
            />
            <span className="mw-logo-container hidden sm:flex flex-col justify-center">
              <img
                className="mw-logo-wordmark block mx-auto"
                alt="Wikipédia"
                src="https://fr.wikipedia.org/static/images/mobile/copyright/wikipedia-wordmark-fr.svg"
                style={{ width: '7.4375em', height: '1.125em' }}
              />
              <img
                className="mw-logo-tagline block mx-auto mt-[5px]"
                alt="l'encyclopédie libre"
                src="https://fr.wikipedia.org/static/images/mobile/copyright/wikipedia-tagline-fr.svg"
                width="120"
                height="13"
                style={{ width: '7.5em', height: '0.8125em' }}
              />
            </span>
          </button>
        </div>

        {/* vector-header-end : Barre de recherche Codex + Outils personnels à droite */}
        <div className="vector-header-end flex-1 flex items-center justify-end sm:justify-between ml-1 sm:ml-[24px] gap-2">
          {/* Barre de recherche Codex (compressible sur mobile) */}
          <div
            id="p-search"
            role="search"
            className="vector-search-box flex-1 max-w-[160px] xs:max-w-[220px] sm:max-w-[500px]"
          >
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center w-full"
            >
              <div className="relative flex-1 flex items-center">
                <Search className="w-[15px] h-[15px] sm:w-[18px] sm:h-[18px] text-[#72777d] absolute left-[7px] sm:left-[9px] pointer-events-none stroke-[2]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim() && activeTab !== 'classeur') {
                      setActiveTab('classeur');
                    }
                  }}
                  placeholder="Rechercher..."
                  aria-label="Rechercher sur Wikipédia"
                  className="w-full h-[32px] pl-[26px] sm:pl-[34px] pr-[6px] text-[12px] sm:text-[14px] text-[#202122] placeholder-[#72777d] bg-white border border-[#a2a9b1] hover:border-[#72777d] rounded-l-[2px] focus:border-[#3366cc] focus:outline-none focus:shadow-[inset_0_0_0_1px_#3366cc] transition-colors"
                />
              </div>
              <button
                type="submit"
                className="h-[32px] px-2 sm:px-[11px] bg-[#f8f9fa] hover:bg-[#eaecf0] active:bg-[#dadde3] text-[#202122] font-bold text-[12px] sm:text-[14px] border border-l-0 border-[#a2a9b1] hover:border-[#72777d] rounded-r-[2px] cursor-pointer transition-colors shrink-0"
                title="Lancer la recherche"
              >
                <span className="hidden md:inline">Rechercher</span>
                <Search className="w-3.5 h-3.5 md:hidden" />
              </button>
            </form>
          </div>

          {/* vector-user-links : Solde de Wikithunes + Cloche Notifications + Profil */}
          <nav
            className="vector-user-links flex items-center gap-[6px] sm:gap-[10px] text-[13px] sm:text-[14px] shrink-0"
            aria-label="Outils personnels"
          >
            {/* Solde Wikifeet */}
            <div
              className="h-[32px] px-[6px] sm:px-[10px] bg-[#f8f9fa] rounded-[2px] inline-flex items-center gap-1 sm:gap-1.5 text-[#202122] font-bold text-[12px] sm:text-[14px]"
              title="Votre solde de Wikifeet"
            >
              <span>{new Intl.NumberFormat('fr-FR').format(wikithunes)}</span>
              <WikithuneIcon className="w-[14px] h-[14px] sm:w-[15px] sm:h-[15px] text-[#3366cc]" />
            </div>

            {/* Onglet Cloche de Notifications */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                type="button"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                className={`w-[32px] h-[32px] rounded-[2px] border flex items-center justify-center cursor-pointer transition-colors relative ${
                  isNotifOpen
                    ? 'bg-[#eaf3ff] border-[#3366cc] text-[#3366cc]'
                    : 'bg-[#f8f9fa] hover:bg-[#eaecf0] border-[#a2a9b1] text-[#202122]'
                }`}
                title="Notifications & alertes"
                aria-label="Notifications"
              >
                <Bell className="w-[16px] h-[16px] stroke-[1.8]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 min-w-[17px] h-[17px] bg-[#bf3c2c] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Popover / Panneau de notifications */}
              {isNotifOpen && (
                <div className="absolute right-0 top-[38px] w-[calc(100vw-24px)] sm:w-[320px] max-w-[320px] bg-white border border-[#a2a9b1] rounded-[2px] shadow-lg z-50 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#f8f9fa] border-b border-[#eaecf0]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[12px] text-[#202122]">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10.5px] font-semibold text-[#54595d]">
                          ({unreadCount} nouvelle{unreadCount > 1 ? 's' : ''})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && onMarkAllNotifsRead && (
                        <button
                          type="button"
                          onClick={onMarkAllNotifsRead}
                          className="text-[11px] text-[#3366cc] hover:underline cursor-pointer font-medium inline-flex items-center gap-1"
                          title="Marquer toutes les notifications comme lues"
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>Tout marquer</span>
                        </button>
                      )}
                      {notifications.length > 0 && onClearAllNotifications && (
                        <button
                          type="button"
                          onClick={onClearAllNotifications}
                          className="text-[11px] text-[#72777d] hover:text-[#ba0000] hover:underline cursor-pointer font-medium inline-flex items-center gap-0.5"
                          title="Effacer toutes les notifications"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>Effacer</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-[320px] overflow-y-auto divide-y divide-[#eaecf0]">
                    {notifications.length === 0 ? (
                      <div className="py-6 px-4 text-center text-[#72777d] text-[12px]">
                        Aucune notification pour le moment.
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const isRead =
                          readNotificationIds.includes(notif.id) ||
                          Boolean(notif.isAutoRead);
                        return (
                          <div
                            key={notif.id}
                            onMouseEnter={() => {
                              if (!isRead && onMarkNotifRead) {
                                onMarkNotifRead(notif.id);
                              }
                            }}
                            onClick={() => {
                              if (onSelectNotification) {
                                onSelectNotification(notif);
                              }
                              setIsNotifOpen(false);
                            }}
                            className={`group relative px-3 py-2 cursor-pointer transition-colors ${
                              isRead
                                ? 'bg-white hover:bg-[#f8f9fa]'
                                : 'bg-[#eaf3ff]/40 hover:bg-[#eaf3ff]'
                            }`}
                          >
                            <div className="w-full pr-4">
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`text-[11.5px] truncate leading-tight ${
                                    isRead
                                      ? 'font-medium text-[#202122]'
                                      : 'font-bold text-[#101418]'
                                  }`}
                                >
                                  {notif.title}
                                </span>
                                {!isRead && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#3366cc] shrink-0" />
                                )}
                              </div>
                              <p className="text-[10.5px] text-[#54595d] m-0 mt-0.5 line-clamp-2 leading-[1.35]">
                                {notif.message}
                              </p>
                              {notif.time && (
                                <div className="flex items-center gap-1 text-[9.5px] text-[#72777d] mt-1">
                                  <Clock className="w-2.5 h-2.5 text-[#a2a9b1] shrink-0" />
                                  <span>{notif.time}</span>
                                </div>
                              )}
                            </div>

                            {/* Bouton de suppression individuelle (✕) */}
                            {onDismissNotification && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDismissNotification(notif.id);
                                }}
                                className="absolute top-2 right-1.5 w-4 h-4 flex items-center justify-center text-[#a2a9b1] hover:text-[#ba0000] hover:bg-[#eaecf0] rounded-[2px] transition-colors"
                                title="Supprimer cette notification"
                                aria-label="Supprimer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profil Utilisateur (icône seule sur mobile, avec pseudo sur écran plus large) */}
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`h-[32px] px-[6px] sm:px-[10px] rounded-[2px] border inline-flex items-center gap-1.5 sm:gap-2 text-[13.5px] font-medium cursor-pointer transition-colors ${
                activeTab === 'profile'
                  ? 'bg-[#eaf3ff] border-[#3366cc] text-[#3366cc] font-bold'
                  : 'bg-[#f8f9fa] hover:bg-[#eaecf0] border-[#a2a9b1] text-[#202122]'
              }`}
              title="Ouvrir votre page utilisateur et votre code unique"
            >
              <img
                src={
                  userProfile?.avatar ||
                  'https://fr.wikipedia.org/static/images/icons/wikipedia.png'
                }
                alt=""
                className="w-[18px] h-[18px] rounded-[1px] object-cover shrink-0"
              />
              <span className="hidden sm:inline max-w-[110px] truncate">
                {userProfile?.username || 'Mon profil'}
              </span>
            </button>
          </nav>
        </div>
      </header>
    </div>
  );
}
