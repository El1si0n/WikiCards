/**
 * @file Rôle : Pied de carte style Wikipédia Vector avec fréquentation posée à plat et bouton Wikipédia aux angles nets.
 * Dépendances : React, `lucide-react`.
 * Effets de bord : Ouvre l'article Wikipédia dans un nouvel onglet.
 */

import React from 'react';
import { Eye, ExternalLink } from 'lucide-react';

/**
 * Pied de carte sobre fidèle à l'esthétique Wikipédia Vector.
 * @param {Object} props
 * @param {Object} props.card - Données de la carte
 * @param {Object} props.tier - Palier de rareté
 * @param {boolean} props.isShiny - Indique si la carte est GIF Métal
 * @param {'small'|'medium'|'large'} props.sizeTier - Palier responsive
 * @param {string} props.formattedViews - Nombre de vues formaté
 */
export default function CardFooter({
  card,
  tier,
  isShiny,
  sizeTier,
  formattedViews,
}) {
  const footerTextSize =
    sizeTier === 'small'
      ? 'text-[9.5px]'
      : sizeTier === 'medium'
      ? 'text-[10.5px]'
      : 'text-[11.5px]';

  const footerIconSize =
    sizeTier === 'small' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  const wikiBtnSize =
    sizeTier === 'small'
      ? 'px-1.5 py-0.5 text-[9px]'
      : sizeTier === 'medium'
      ? 'px-2 py-0.5 text-[10px]'
      : 'px-2 py-0.5 text-[10.5px]';

  return (
    <div
      className="wiki-card-footer relative z-10 shrink-0 pt-1 mt-0.5 flex items-center justify-between gap-1 border-t"
      style={{
        borderColor: isShiny
          ? 'rgba(15, 23, 42, 0.22)'
          : tier.dividerColor || 'rgba(0, 0, 0, 0.16)',
      }}
    >
      {/* 1. Compteur de vues posé à plat (sans pilule) */}
      <div
        className={`flex items-center gap-1 font-bold shrink-0 ${footerTextSize}`}
        style={{ color: isShiny ? '#0f172a' : tier.textColor }}
        title={`Fréquentation de la page : ${formattedViews} vues (${tier.name})`}
      >
        <Eye className={`${footerIconSize} opacity-80 shrink-0`} />
        <span>{formattedViews} vues</span>
      </div>

      {/* 2. Bouton Wikipédia rectangulaire aux angles nets */}
      <a
        href={
          card.url ||
          `https://fr.wikipedia.org/wiki/${encodeURIComponent(card.title)}`
        }
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1 shrink-0 ${wikiBtnSize} rounded-[3px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]`}
        style={{
          backgroundColor: isShiny
            ? 'rgba(255, 255, 255, 0.68)'
            : 'rgba(255, 255, 255, 0.54)',
          color: isShiny ? '#0f172a' : tier.textColor,
          border: `1px solid ${
            isShiny
              ? 'rgba(15, 23, 42, 0.24)'
              : tier.dividerColor || 'rgba(0, 0, 0, 0.16)'
          }`,
        }}
        title="Consulter l'article officiel sur Wikipédia (nouvel onglet)"
      >
        <span className={sizeTier === 'small' ? 'hidden' : 'inline'}>
          Wikipédia
        </span>
        <span className={sizeTier === 'small' ? 'inline' : 'hidden'}>
          Wiki
        </span>
        <ExternalLink className={`${footerIconSize} shrink-0`} />
      </a>
    </div>
  );
}
