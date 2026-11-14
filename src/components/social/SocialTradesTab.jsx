/**
 * @file Rôle : Onglet de gestion des propositions d'échange de cartes (offres reçues et envoyées).
 * Dépendances : React, `lucide-react`, `../WikiCard`.
 * Effets de bord : Déclenche l'acceptation, le refus ou l'annulation d'un échange via `handleTradeAction`.
 */

import React from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import WikiCard from '../WikiCard';

/**
 * Sous-composant listant les offres d'échange actives ou passées du joueur.
 * @param {Object} props
 * @param {Array<Object>} props.trades - Liste des échanges concernant le joueur
 * @param {boolean} [props.isLoadingTrades=false] - Indicateur de chargement initial des échanges
 * @param {string|null} props.tradeActionError - Message d'erreur éventuel lors d'une action
 * @param {string} props.userCode - Code WIKI du compte joueur local
 * @param {function(string, 'accept'|'decline'|'cancel'): Promise<void>} props.handleTradeAction - Action sur un échange
 */
export default function SocialTradesTab({
  trades,
  isLoadingTrades = false,
  tradeActionError,
  userCode,
  handleTradeAction,
}) {
  return (
    <div className="space-y-4">
      {tradeActionError && (
        <div className="p-3 bg-[#ffe9e5] border border-[#f54739] text-[#bf3c2c] rounded-[2px] text-[13px] font-medium">
          {tradeActionError}
        </div>
      )}

      {trades.length > 0 ? (
        <div className="space-y-3">
          {trades.map((trade) => {
            const isIncoming = trade.toCode === userCode;
            const isPending = trade.status === 'pending';

            return (
              <div
                key={trade.id}
                className="bg-[#f8f9fa] border border-[#c8ccd1] rounded-[2px] p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eaecf0] pb-2">
                  <div className="flex items-center gap-2 text-[13.5px]">
                    <span className="font-bold text-[#202122]">
                      {isIncoming
                        ? `Offre reçue de ${trade.fromUsername}`
                        : `Offre envoyée à ${trade.toUsername}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[12.5px] font-semibold ${
                        trade.status === 'accepted'
                          ? 'text-[#177860]'
                          : trade.status === 'declined' ||
                            trade.status === 'cancelled'
                          ? 'text-[#bf3c2c]'
                          : 'text-[#3366cc]'
                      }`}
                    >
                      {trade.status === 'accepted'
                        ? 'Accepté'
                        : trade.status === 'declined'
                        ? 'Refusé'
                        : trade.status === 'cancelled'
                        ? 'Annulé'
                        : 'En attente'}
                    </span>

                    {isPending && isIncoming && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleTradeAction(trade.id, 'accept')
                          }
                          className="wiki-casino-btn wiki-casino-btn--success !min-h-[30px] !py-1 !px-3 !text-[12px]"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accepter</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleTradeAction(trade.id, 'decline')
                          }
                          className="wiki-casino-btn wiki-casino-btn--danger !min-h-[30px] !py-1 !px-3 !text-[12px]"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Refuser</span>
                        </button>
                      </>
                    )}

                    {isPending && !isIncoming && (
                      <button
                        type="button"
                        onClick={() =>
                          handleTradeAction(trade.id, 'cancel')
                        }
                        className="wiki-casino-btn wiki-casino-btn--neutral !min-h-[30px] !py-1 !px-3 !text-[12px]"
                      >
                        <span>Annuler l'offre</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-[#eaecf0] rounded-[2px] p-3">
                    <span className="block text-[11.5px] font-bold text-[#54595d] uppercase mb-2">
                      {isIncoming
                        ? `${trade.fromUsername} propose :`
                        : 'Vous proposez :'}
                    </span>
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 justify-items-center">
                      {(trade.offeredCards || []).map((item, i) => (
                        <div key={i} className="w-full max-w-[284px]">
                          <WikiCard
                            card={item.card}
                            compact={true}
                            duplicateCount={item.qty || 1}
                          />
                        </div>
                      ))}
                      {(trade.offeredCards || []).length === 0 && (
                        <span className="text-[12px] text-[#72777d]">
                          Aucune carte (don)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-[#eaecf0] rounded-[2px] p-3">
                    <span className="block text-[11.5px] font-bold text-[#54595d] uppercase mb-2">
                      {isIncoming
                        ? 'En échange de vos cartes :'
                        : `Demandé à ${trade.toUsername} :`}
                    </span>
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 justify-items-center">
                      {(trade.requestedCards || []).map((item, i) => (
                        <div key={i} className="w-full max-w-[284px]">
                          <WikiCard
                            card={item.card}
                            compact={true}
                            duplicateCount={item.qty || 1}
                          />
                        </div>
                      ))}
                      {(trade.requestedCards || []).length === 0 && (
                        <span className="text-[12px] text-[#72777d]">
                          Aucune carte (cadeau)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : isLoadingTrades ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-center bg-[#f8f9fa] dark:bg-[#161a20] border border-[#eaecf0] dark:border-[#2d3542] rounded-[2px]">
          <Loader2 className="w-5 h-5 animate-spin text-[#3366cc]" />
          <p className="text-[13.5px] font-medium text-[#54595d] dark:text-[#a2a9b1] m-0">
            Chargement des propositions d'échange...
          </p>
        </div>
      ) : (
        <div className="py-12 text-center bg-[#f8f9fa] dark:bg-[#161a20] border border-[#eaecf0] dark:border-[#2d3542] rounded-[2px]">
          <p className="text-[14px] text-[#54595d] dark:text-[#a2a9b1] m-0">
            Aucune proposition d'échange pour le moment. Cliquez sur un joueur dans l'onglet Joueurs pour lui proposer un échange !
          </p>
        </div>
      )}
    </div>
  );
}
