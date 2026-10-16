import React from 'react';
import { Menu, Search } from 'lucide-react';

export default function WikiHeader({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  collectionCount = 0,
}) {
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && activeTab !== 'classeur') {
      setActiveTab('classeur');
    }
  };

  return (
    <div className="vector-header-container w-full bg-white">
      <header className="vector-header max-w-[1440px] mx-auto px-4 sm:px-6 min-h-[50px] py-[8px] flex items-center justify-between">
        {/* vector-header-start : Bouton menu + Logo officiel Wikipédia (50x50 + SVGs officiels) */}
        <div className="vector-header-start flex items-center shrink-0">
          <button
            type="button"
            onClick={() =>
              setActiveTab(activeTab === 'booster' ? 'classeur' : 'booster')
            }
            className="w-[34px] h-[34px] -ml-1.5 mr-2 flex items-center justify-center text-[#202122] hover:bg-[#f8f9fa] rounded-[2px] cursor-pointer"
            title="Menu principal"
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
              className="mw-logo-icon w-[50px] h-[50px] object-contain"
              src="https://fr.wikipedia.org/static/images/icons/wikipedia.png"
              alt=""
              aria-hidden="true"
              height="50"
              width="50"
            />
            <span className="mw-logo-container flex flex-col justify-center ml-[10px]">
              <img
                className="mw-logo-wordmark"
                alt="Wikipédia"
                src="https://fr.wikipedia.org/static/images/mobile/copyright/wikipedia-wordmark-fr.svg"
                style={{ width: '7.4375em', height: '1.125em' }}
              />
              <img
                className="mw-logo-tagline mt-[5px]"
                alt="l'encyclopédie libre"
                src="https://fr.wikipedia.org/static/images/mobile/copyright/wikipedia-tagline-fr.svg"
                width="120"
                height="13"
                style={{ width: '7.5em', height: '0.8125em' }}
              />
            </span>
          </button>
        </div>

        {/* vector-header-end : Barre de recherche alignée à gauche (juste après le logo) + Liens tout à droite */}
        <div className="vector-header-end flex-1 flex items-center justify-between ml-4 sm:ml-[38px]">
          {/* Barre de recherche officielle Codex (cdx-search-input) */}
          <div
            id="p-search"
            role="search"
            className="w-full max-w-[468px]"
          >
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center w-full"
            >
              <div className="relative flex-1 flex items-center">
                <Search className="w-[16px] h-[16px] text-[#72777d] absolute left-[9px] pointer-events-none stroke-[2]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim() && activeTab !== 'classeur') {
                      setActiveTab('classeur');
                    }
                  }}
                  placeholder="Rechercher sur Wikipédia"
                  aria-label="Rechercher sur Wikipédia"
                  className="w-full h-[32px] pl-[32px] pr-[8px] text-[14px] text-[#202122] placeholder-[#72777d] bg-white border border-[#a2a9b1] rounded-l-[2px] focus:border-[#3366cc] focus:outline-none focus:shadow-[inset_0_0_0_1px_#3366cc]"
                />
              </div>
              <button
                type="submit"
                className="h-[32px] px-[12px] bg-[#f8f9fa] hover:bg-white active:bg-[#eaecf0] text-[#202122] font-bold text-[14px] border border-l-0 border-[#a2a9b1] rounded-r-[2px] cursor-pointer transition-colors shrink-0"
              >
                Rechercher
              </button>
            </form>
          </div>

          {/* vector-user-links : Lien à droite en 12.5px bleu Wikipédia */}
          <nav
            className="hidden md:flex items-center gap-[14px] text-[12.5px] shrink-0 ml-4"
            aria-label="Outils personnels"
          >
            <a
              href="https://fr.wikipedia.org/wiki/Wikip%C3%A9dia:Accueil_principal"
              target="_blank"
              rel="noopener noreferrer"
              className="wiki-link"
            >
              Se connecter
            </a>
          </nav>
        </div>
      </header>
    </div>
  );
}
