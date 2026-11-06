/**
 * @file Rôle : Tiroir de sélection d'avatar pour le joueur parmi les illustrations de ses cartes possédées.
 * Dépendances : React, `lucide-react`.
 * Effets de bord : Déclenche la sélection d'avatar.
 */

import React from 'react';
import { X } from 'lucide-react';

/**
 * Composant de sélection d'avatar parmi les cartes de la collection.
 * @param {Object} props
 * @param {boolean} props.isOpen - Visibilité du panneau
 * @param {function(): void} props.onClose - Fermeture du panneau
 * @param {Array<Object>} props.cardAvatars - Liste des cartes illustrées disponibles
 * @param {string} [props.currentAvatar] - URL de l'avatar actuellement sélectionné
 * @param {function(Object): void} props.onSelectCardAvatar - Callback de sélection d'une illustration
 */
export default function ProfileAvatarPicker({
  isOpen,
  onClose,
  cardAvatars = [],
  currentAvatar = '',
  onSelectCardAvatar,
}) {
  if (!isOpen) return null;

  return (
    <div className="bg-[#f8f9fa] border border-[#c8ccd1] rounded-[2px] p-3 space-y-2.5">
      <div className="flex items-center justify-between border-b border-[#eaecf0] pb-1.5">
        <span className="text-[12.5px] font-bold text-[#202122]">
          Choisir l'illustration d'une de vos cartes comme photo de profil
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-[#54595d] hover:text-[#202122] cursor-pointer"
          aria-label="Fermer la sélection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {cardAvatars.length > 0 ? (
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-[240px] overflow-y-auto pr-1">
          {cardAvatars.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectCardAvatar(item)}
              className={`aspect-square rounded-[2px] border overflow-hidden bg-white cursor-pointer transition-all ${
                currentAvatar === item.url
                  ? 'border-[#3366cc] ring-2 ring-[#3366cc]'
                  : 'border-[#c8ccd1] hover:border-[#72777d]'
              }`}
              title={item.title}
            >
              <img
                src={item.url}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[12.5px] text-[#54595d] m-0 py-2">
          Vous n'avez pas encore de carte illustrée dans votre classeur. Ouvrez un booster pour débloquer des photos de profil !
        </p>
      )}
    </div>
  );
}
