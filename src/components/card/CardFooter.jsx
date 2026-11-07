/**
 * @file Rôle : Pied de carte TCG avec cartouche de statistique pour la fréquentation et bouton Wikipédia dépoli.
 * Dépendances : React, `lucide-react`.
 * Effets de bord : Ouvre l'article Wikipédia dans un nouvel onglet.
 */

import React from 'react';
import { Eye, ExternalLink } from 'lucide-react';

/**
 * Pied de carte TCG avec pilule de vues et bouton Wikipédia effet verre dépoli.
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
      : 'px-2.5 py-0.5 text-[10.5px]';

  return (
    <div
      className="wiki-card-footer relative z-10 shrink-0 pt-1.5 mt-auto flex items-center justify-between gap-1.5 border-t"
      style={{
        borderColor: isShiny
          ? 'rgba(15, 23, 42, 0.22)'
          : tier.dividerColor || 'rgba(0, 0, 0, 0.12)',
      }}
    >
      {/* 1. Pilule de statistique de fréquentation TCG */}
      <div
        className={`inline-flex items-center gap-1 font-bold shrink-0 px-2 py-0.5 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] border ${footerTextSize}`}
        style={{
          backgroundColor: isShiny
            ? 'rgba(255, 255, 255, 0.55)'
            : 'rgba(255, 255, 255, 0.42)',
          borderColor: isShiny
            ? 'rgba(15, 23, 42, 0.16)'
            : tier.dividerColor || 'rgba(0, 0, 0, 0.12)',
          color: isShiny ? '#0f172a' : tier.textColor,
        }}
        title={`Fréquentation de la page : ${formattedViews} vues (${tier.name})`}
      >
        <Eye className={`${footerIconSize} opacity-80 shrink-0`} />
        <span>{formattedViews} vues</span>
      </div>

      {/* 2. Bouton Wikipédia dépoli et translucide */}
      <a
        href={
          card.url ||
          `https://fr.wikipedia.org/wiki/${encodeURIComponent(card.title)}`
        }
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1 shrink-0 ${wikiBtnSize} rounded-full font-semibold backdrop-blur-xs transition-all hover:scale-[1.03] active:scale-[0.97] shadow-xs`}
        style={{
          backgroundColor: isShiny
            ? 'rgba(255, 255, 255, 0.68)'
            : 'rgba(255, 255, 255, 0.52)',
          color: isShiny ? '#0f172a' : tier.textColor,
          border: `1px solid ${
            isShiny
              ? 'rgba(15, 23, 42, 0.24)'
              : tier.dividerColor || 'rgba(0,0,0,0.14)'
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
        <ExternalLink className={`${footerIconSize} shrink-0 opacity-80`} />
      </a>
    </div>
  );
}
