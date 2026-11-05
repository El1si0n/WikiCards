// Rôle : Pied de page officiel Wikipédia Vector 2022 avec mentions de licence Creative Commons.
// Dépendances : React.
// Effets de bord : Aucun (composant de présentation pur).

import React from 'react';

/**
 * Pied de page officiel Wikipédia Vector 2022.
 * @returns {React.ReactElement}
 */
export default function WikiFooter() {
  return (
    <div className="mw-footer-container pt-[50px]">
      <footer id="footer" className="mw-footer border-t border-[#a2a9b1] py-[12px] text-[12px] text-[#202122] leading-[1.4]">
        <ul id="footer-info" className="list-none m-0 p-0">
          <li id="footer-info-copyright">
            <a
              href="https://fr.wikipedia.org/wiki/Wikip%C3%A9dia:Citation_et_r%C3%A9utilisation_du_contenu_de_Wikip%C3%A9dia"
              target="_blank"
              rel="noopener noreferrer"
              className="wiki-link"
            >
              Droit d'auteur
            </a>
            &nbsp;: les textes et illustrations des cartes proviennent de{' '}
            <a
              href="https://fr.wikipedia.org"
              target="_blank"
              rel="noopener noreferrer"
              className="wiki-link"
            >
              Wikipédia en français
            </a>{' '}
            et sont disponibles sous{' '}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="wiki-link"
            >
              licence Creative Commons attribution, partage dans les mêmes conditions
            </a>
            .
          </li>
        </ul>
      </footer>
    </div>
  );
}
