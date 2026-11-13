/**
 * @file Rôle : Étagères personnalisables de collections (style Babelio, max 4 étagères × 6 cartes) sur le profil du joueur.
 * Dépendances : React, `lucide-react`, `../WikiCard`.
 * Effets de bord : Sélection d'un emplacement pour affectation, renommage, suppression d'étagère ou retrait de carte.
 */

import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, BookMarked } from 'lucide-react';
import WikiCard from '../WikiCard';

/**
 * Composant affichant les étagères de collection du joueur (1 à 4 étagères, 6 cartes max chacune).
 * @param {Object} props
 * @param {Array<Object>} props.shelves - Liste des étagères normalisées avec leurs 6 cartes résolues
 * @param {{ shelfId: string, slotIdx: number }|null} props.activeShowcaseSlot - Emplacement actif pour sélection
 * @param {Array<string>} [props.favorites=[]] - Liste des IDs favoris
 * @param {function(string): void} [props.onToggleFavorite] - Callback de bascule favori
 * @param {function(string, number): void} props.onSelectSlot - Sélection / bascule d'un emplacement
 * @param {function(string, number, React.MouseEvent): void} [props.onClearSlot] - Vidage d'un emplacement
 * @param {function(string, string): void} [props.onRenameShelf] - Renommage d'une étagère
 * @param {function(string): void} [props.onRemoveShelf] - Suppression d'une étagère
 * @returns {JSX.Element}
 */
export default function ProfileShowcase({
  shelves = [],
  activeShowcaseSlot,
  favorites = [],
  onToggleFavorite,
  onSelectSlot,
  onClearSlot,
  onRenameShelf,
  onRemoveShelf,
}) {
  const [editingShelfId, setEditingShelfId] = useState(null);
  const [draftName, setDraftName] = useState('');

  const startRename = (shelf) => {
    setEditingShelfId(shelf.id);
    setDraftName(shelf.name || '');
  };

  const commitRename = (shelfId) => {
    if (draftName.trim() && onRenameShelf) {
      onRenameShelf(shelfId, draftName);
    }
    setEditingShelfId(null);
  };

  return (
    <div className="space-y-6">
      {shelves.map((shelf) => {
        const isEditing = editingShelfId === shelf.id;

        return (
          <div
            key={shelf.id}
            className="bg-[#f8f9fa] dark:bg-[#14181f] border border-[#c8ccd1] dark:border-[#363e4a] rounded-[3px] p-3 sm:p-4"
          >
            {/* Barre d'en-tête de l'étagère */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3.5 border-b border-[#eaecf0] dark:border-[#272d36]">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <BookMarked className="w-4 h-4 text-[#3366cc] shrink-0" />
                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      commitRename(shelf.id);
                    }}
                    className="flex items-center gap-1.5 flex-1 max-w-[320px]"
                  >
                    <input
                      type="text"
                      value={draftName}
                      maxLength={45}
                      autoFocus
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setEditingShelfId(null);
                        }
                      }}
                      className="flex-1 h-[28px] px-2 text-[13px] font-bold bg-white dark:bg-[#1a202c] text-[#202122] dark:text-[#eaecf0] border border-[#3366cc] rounded-[2px] focus:outline-none"
                      placeholder="Nom de l'étagère..."
                    />
                    <button
                      type="submit"
                      className="p-1 text-[#177860] hover:bg-[#dff2eb] rounded-[2px] cursor-pointer"
                      title="Valider le nom"
                      aria-label="Valider le nom"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingShelfId(null)}
                      className="p-1 text-[#72777d] hover:bg-[#eaecf0] rounded-[2px] cursor-pointer"
                      title="Annuler"
                      aria-label="Annuler"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="wiki-serif text-[16px] sm:text-[17px] font-normal text-[#101418] dark:text-[#eaecf0] m-0 truncate">
                      {shelf.name}
                    </h3>
                    {onRenameShelf && (
                      <button
                        type="button"
                        onClick={() => startRename(shelf)}
                        className="p-1 text-[#72777d] hover:text-[#3366cc] dark:text-[#8b949e] dark:hover:text-[#6699ff] cursor-pointer transition-colors"
                        title="Renommer cette étagère"
                        aria-label={`Renommer ${shelf.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {shelves.length > 1 && onRemoveShelf && (
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onRemoveShelf(shelf.id)}
                    className="p-1 text-[#72777d] hover:text-[#bf3c2c] dark:text-[#8b949e] dark:hover:text-[#f87171] cursor-pointer transition-colors"
                    title="Supprimer cette étagère"
                    aria-label={`Supprimer ${shelf.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Rangée de 6 emplacements style étagère Babelio */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 justify-items-center pb-2">
              {[0, 1, 2, 3, 4, 5].map((slotIdx) => {
                const card = shelf.cards?.[slotIdx] || null;
                const isSlotActive =
                  activeShowcaseSlot?.shelfId === shelf.id &&
                  activeShowcaseSlot?.slotIdx === slotIdx;

                return (
                  <div
                    key={slotIdx}
                    className="w-full max-w-[230px] flex flex-col items-center relative group"
                  >
                    {card ? (
                      <div
                        className={`w-full rounded-[11px] sm:rounded-[14px] relative transition-all ${
                          isSlotActive ? 'ring-3 ring-[#3366cc]' : ''
                        }`}
                      >
                        <WikiCard
                          card={card}
                          compact={true}
                          isFavorite={favorites.includes(card.id)}
                          onToggleFavorite={onToggleFavorite}
                          onSelectCard={() => onSelectSlot(shelf.id, slotIdx)}
                        />
                        {onClearSlot && (
                          <button
                            type="button"
                            onClick={(e) => onClearSlot(shelf.id, slotIdx, e)}
                            className="absolute -top-2 -right-2 z-30 w-6 h-6 rounded-full bg-white dark:bg-[#1f2937] border border-[#c8ccd1] dark:border-[#4a5568] text-[#54595d] dark:text-[#eaecf0] hover:bg-[#ffe9e5] hover:text-[#bf3c2c] hover:border-[#f54739] shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                            title="Retirer de cette étagère"
                            aria-label="Retirer de cette étagère"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectSlot(shelf.id, slotIdx)}
                        className={`w-full aspect-[284/443] rounded-[14px] border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors ${
                          isSlotActive
                            ? 'border-[#3366cc] bg-[#eaf3ff]/50 dark:bg-[#1e2a3a]/60 text-[#3366cc] dark:text-[#6699ff]'
                            : 'border-[#c8ccd1] dark:border-[#363e4a] bg-white/70 dark:bg-[#12161c] hover:bg-white dark:hover:bg-[#1a202c] hover:border-[#72777d] text-[#54595d] dark:text-[#a2a9b1]'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center border mb-2 ${
                            isSlotActive
                              ? 'bg-[#3366cc] text-white border-[#3366cc]'
                              : 'bg-white dark:bg-[#1f2937] text-[#54595d] dark:text-[#a2a9b1] border-[#c8ccd1] dark:border-[#363e4a]'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                        </div>
                        <span className="text-[12px] font-bold leading-snug">
                          {isSlotActive
                            ? 'Choisir ci-dessous'
                            : 'Ajouter une carte'}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
