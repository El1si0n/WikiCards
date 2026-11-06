/**
 * @file Rôle : Modale officielle de confirmation irréversible de suppression de compte joueur.
 * Dépendances : React, `lucide-react`.
 * Effets de bord : Déclenche la suppression définitive du compte joueur via `onConfirmDelete`.
 */

import React from 'react';
import { Trash2, X } from 'lucide-react';

/**
 * Modale de confirmation de suppression de compte.
 * @param {Object} props
 * @param {boolean} props.isOpen - Visibilité de la modale
 * @param {function(): void} props.onClose - Annulation / fermeture de la modale
 * @param {string} props.userCode - Identifiant unique du compte (WIKI-XXXX-XXXX)
 * @param {number} props.collectionLength - Nombre de cartes uniques possédées
 * @param {number} props.wikithunes - Solde de monnaie virtuelle
 * @param {boolean} props.isDeleting - État de suppression en cours
 * @param {string|null} props.deleteError - Message d'erreur éventuel
 * @param {function(): Promise<void>} props.onConfirmDelete - Action irréversible de suppression
 * @returns {JSX.Element|null}
 */
export default function ProfileDeleteModal({
  isOpen,
  onClose,
  userCode,
  collectionLength,
  wikithunes,
  isDeleting,
  deleteError,
  onConfirmDelete,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative bg-white dark:bg-[#181d24] border border-[#a2a9b1] dark:border-[#363e4a] rounded-[2px] shadow-2xl max-w-[420px] w-full p-4 text-left select-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        <div className="flex items-center justify-between border-b border-[#eaecf0] dark:border-[#272d36] pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-[#bf3c2c] dark:text-[#f87171]" />
            <h3
              id="delete-account-title"
              className="wiki-serif text-[17px] font-bold text-[#101418] dark:text-[#eaecf0] m-0"
            >
              Supprimer le compte
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-[#72777d] hover:text-[#202122] dark:text-[#a2a9b1] dark:hover:text-white cursor-pointer p-0.5 rounded-[2px] transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="p-2.5 bg-[#fff5f5] dark:bg-[#251515] border border-[#f54739]/40 dark:border-[#b32424]/50 rounded-[2px] text-[12.5px] text-[#bf3c2c] dark:text-[#f87171] leading-relaxed">
            <p className="font-bold m-0 mb-1">Attention : action irréversible</p>
            <p className="m-0 text-[#202122] dark:text-[#c8ccd1]">
              Toutes vos cartes ({collectionLength}), vos Wikithunes ({new Intl.NumberFormat('fr-FR').format(wikithunes)}&nbsp;₩) et vos données associées au code <span className="font-mono font-bold text-[#101418] dark:text-white">{userCode}</span> seront définitivement effacées.
            </p>
          </div>

          {deleteError && (
            <p className="text-[12px] text-[#bf3c2c] dark:text-[#f87171] font-semibold m-0">
              {deleteError}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#eaecf0] dark:border-[#272d36]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="wiki-casino-btn wiki-casino-btn--neutral !min-h-[32px] !h-[32px] !py-0 !px-3.5 !text-[12.5px]"
          >
            Annuler
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirmDelete}
            className="wiki-casino-btn wiki-casino-btn--danger !min-h-[32px] !h-[32px] !py-0 !px-3.5 !text-[12.5px] font-bold inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>
              {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
