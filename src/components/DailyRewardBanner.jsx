/**
 * @file Rôle : Bannière d'alerte et notification toast pour la bourse de recherche quotidienne.
 * Dépendances : `lucide-react`, `../config/rarities`, React.
 * Effets de bord : Déclenche la réclamation de la bourse quotidienne.
 */

import React from 'react';
import { Gift, Check, X } from 'lucide-react';
import { DAILY_REWARD_AMOUNT } from '../config/rarities';

/**
 * Composant affichant l'annonce de bourse journalière et les notifications toast de confirmation.
 * @param {Object} props
 * @param {string|null} props.dailyRewardToast - Message toast éventuel
 * @param {Function} props.onDismissToast - Fermeture du toast
 * @param {boolean} props.isDailyRewardAvailable - Disponibilité de la bourse
 * @param {Function} props.onClaimDailyReward - Action de réclamer la bourse
 * @returns {JSX.Element|null}
 */
export default function DailyRewardBanner({
  dailyRewardToast,
  onDismissToast,
  isDailyRewardAvailable,
  onClaimDailyReward,
}) {
  return (
    <>
      {/* Notification toast de la Bourse Quotidienne */}
      {dailyRewardToast && (
        <div className="mb-4 bg-[#dff2eb] border border-[#099979] text-[#177860] font-medium rounded-[2px] p-3 flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{dailyRewardToast}</span>
          </div>
          <button
            type="button"
            onClick={onDismissToast}
            className="text-[#177860] hover:text-[#103828] cursor-pointer"
            title="Fermer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bannière d'annonce Bourse de recherche quotidienne (si disponible) */}
      {isDailyRewardAvailable && (
        <div className="mb-4 bg-[#eaf3ff] border border-[#3366cc] rounded-[2px] p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px]">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-[2px] bg-[#3366cc] text-white flex items-center justify-center shrink-0">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-[#101418] font-bold">
                Bourse de recherche quotidienne disponible !
              </strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onClaimDailyReward}
            className="wiki-casino-btn wiki-casino-btn--primary !min-h-[32px] !py-1 !px-3.5 text-[12.5px] font-bold shrink-0 inline-flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Réclamer +{DAILY_REWARD_AMOUNT} ₩</span>
          </button>
        </div>
      )}
    </>
  );
}
