import React, { useState, useEffect, useMemo } from 'react';
import WikiCard from './WikiCard';
import WikithuneIcon from './WikithuneIcon';
import { RARITY_TIERS, getCardRecycleValue } from '../config/rarities';
import {
  fetchMarketListings,
  createMarketListing,
  performMarketAction,
} from '../services/userStorage';
import { soundManager } from '../services/sound';
import {
  Gavel,
  ShoppingBag,
  Tag,
  Check,
  X,
  Clock,
} from 'lucide-react';

function sanitizeNumberInput(val) {
  let clean = String(val ?? '').replace(/[^0-9]/g, '');
  if (clean.length > 1 && clean.startsWith('0')) {
    clean = clean.replace(/^0+/, '');
  }
  return clean;
}

function formatRemainingTime(bidExpiresAt, highestBidderCode, now) {
  if (!highestBidderCode || !bidExpiresAt) {
    return '24h après 1ère offre';
  }
  const diff = Number(bidExpiresAt) - now;
  if (diff <= 0) {
    return 'Délai écoulé';
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

export default function AuctionMarket({
  userCode,
  collection,
  favorites,
  wikithunes,
  onSyncAccountState,
}) {
  // Navigation interne : 'browse' (Enchères en cours) | 'sell' (Mettre une carte en vente) | 'my_listings' (Mes ventes)
  const [activeSubTab, setActiveSubTab] = useState('browse');

  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rarityFilter, setRarityFilter] = useState('ALL');
  const [feedback, setFeedback] = useState(null);

  // Horloge en direct pour rafraîchir les comptes à rebours de 24h
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // État pour enchérir sur une annonce : { [listingId]: string }
  const [bidInputs, setBidInputs] = useState({});

  // État pour mettre une carte en vente (chaînes pour une saisie fluide sans 0 parasite)
  const [sellRarityFilter, setSellRarityFilter] = useState('C');
  const [selectedSellCardId, setSelectedSellCardId] = useState(null);
  const [startingBidInput, setStartingBidInput] = useState('50');
  const [buyoutPriceInput, setBuyoutPriceInput] = useState('150');
  const [isCreatingListing, setIsCreatingListing] = useState(false);

  const loadListings = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await fetchMarketListings();
      setListings(data);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Synchronisation automatique en arrière-plan : au montage, au changement d'onglet, au focus et toutes les 8s
  useEffect(() => {
    loadListings(false);

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        loadListings(true);
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    const interval = setInterval(() => loadListings(true), 8000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      clearInterval(interval);
    };
  }, [userCode, activeSubTab]);

  const activeListings = useMemo(
    () => listings.filter((l) => l.status === 'active'),
    [listings]
  );

  const filteredBrowseListings = useMemo(() => {
    return activeListings.filter((l) =>
      rarityFilter === 'ALL' ? true : l.card?.rarity === rarityFilter
    );
  }, [activeListings, rarityFilter]);

  const myListings = useMemo(
    () => listings.filter((l) => l.sellerCode === userCode),
    [listings, userCode]
  );

  const selectedSellCard = useMemo(
    () =>
      selectedSellCardId
        ? collection.find((c) => String(c.id) === String(selectedSellCardId)) ||
          null
        : null,
    [selectedSellCardId, collection]
  );

  const handleSelectCardToSell = (card) => {
    if (!card) return;
    const isFavProtected =
      favorites.includes(card.id) && (card.count || 1) <= 1;
    if (isFavProtected) return;

    setSelectedSellCardId(card.id);
    const baseVal = getCardRecycleValue(card);
    setStartingBidInput(String(Math.max(15, Math.round(baseVal * 1.2))));
    setBuyoutPriceInput(String(Math.max(30, Math.round(baseVal * 2.5))));
    soundManager.playCardSlide();
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    if (!selectedSellCard || isCreatingListing) return;

    const startVal = Math.max(5, Number(startingBidInput) || 5);
    const buyoutVal = Math.max(startVal, Number(buyoutPriceInput) || startVal);

    setIsCreatingListing(true);
    setFeedback(null);
    try {
      const res = await createMarketListing({
        sellerCode: userCode,
        cardId: selectedSellCard.id,
        startingBid: startVal,
        buyoutPrice: buyoutVal,
      });

      if (res.updatedUser) {
        onSyncAccountState(res.updatedUser);
      }
      setSelectedSellCardId(null);
      soundManager.playCardSlide();
      setFeedback({
        type: 'success',
        message: `Votre carte « ${selectedSellCard.title} » est maintenant en vente sur le marché !`,
      });
      await loadListings();
      setActiveSubTab('browse');
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erreur lors de la mise en vente.',
      });
    } finally {
      setIsCreatingListing(false);
    }
  };

  const handleMarketAction = async (listingId, action, extra = {}) => {
    setFeedback(null);
    try {
      const res = await performMarketAction(listingId, action, {
        userCode,
        ...extra,
      });
      if (res.updatedUser && res.updatedUser.code === userCode) {
        onSyncAccountState(res.updatedUser);
      }
      if (action === 'buy' || action === 'accept_bid') {
        soundManager.playSummaryFanfare();
      } else {
        soundManager.playCardSlide();
      }
      await loadListings();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Action impossible sur cette annonce.',
      });
    }
  };

  return (
    <div className="space-y-5">
      <section className="accueil_2017_cadre">
        {/* En-tête avec sous-onglets Vector 2022 */}
        <div className="wiki-cadre-header flex flex-wrap items-center justify-between gap-4">
          <h2 className="wiki-smallcaps m-0">
            {activeSubTab === 'browse'
              ? 'Hôtel des ventes & Enchères'
              : activeSubTab === 'sell'
              ? 'Mettre une carte aux enchères'
              : 'Mes ventes & enchères'}
          </h2>

          <div className="flex items-center gap-5 text-[14px]">
            <button
              type="button"
              onClick={() => setActiveSubTab('browse')}
              className={`vector-tab-link ${
                activeSubTab === 'browse' ? 'selected' : ''
              }`}
            >
              Enchères en cours ({activeListings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('sell')}
              className={`vector-tab-link ${
                activeSubTab === 'sell' ? 'selected' : ''
              }`}
            >
              Mettre en vente
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('my_listings')}
              className={`vector-tab-link ${
                activeSubTab === 'my_listings' ? 'selected' : ''
              }`}
            >
              Mes annonces ({myListings.filter((l) => l.status === 'active').length})
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`mb-4 p-3 rounded-[2px] border text-[13px] font-medium ${
              feedback.type === 'success'
                ? 'bg-[#dff2eb] border-[#099979] text-[#177860]'
                : 'bg-[#ffe9e5] border-[#f54739] text-[#bf3c2c]'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* =====================================================================
            ONGLET 1 : PARCOURIR LES ENCHÈRES EN COURS
        ===================================================================== */}
        {activeSubTab === 'browse' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#eaecf0]">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRarityFilter('ALL')}
                  className={`px-2.5 py-1 text-[12px] rounded-[2px] border cursor-pointer transition-colors ${
                    rarityFilter === 'ALL'
                      ? 'bg-[#202122] text-white border-[#202122] font-semibold'
                      : 'bg-[#f8f9fa] text-[#202122] border-[#a2a9b1] hover:bg-white'
                  }`}
                >
                  Toutes ({activeListings.length})
                </button>
                {[...RARITY_TIERS].reverse().map((tier) => {
                  const cnt = activeListings.filter(
                    (l) => l.card?.rarity === tier.code
                  ).length;
                  return (
                    <button
                      key={tier.code}
                      type="button"
                      onClick={() => setRarityFilter(tier.code)}
                      className={`px-2.5 py-1 text-[12px] rounded-[2px] border cursor-pointer transition-all flex items-center gap-1.5 ${
                        rarityFilter === tier.code
                          ? 'ring-2 ring-[#3366cc] font-bold bg-white border-[#3366cc]'
                          : 'bg-[#f8f9fa] hover:bg-white border-[#c8ccd1]'
                      }`}
                    >
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: tier.borderColor }}
                      />
                      <span>
                        {tier.code} ({cnt})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredBrowseListings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 justify-items-center">
                {filteredBrowseListings.map((listing) => {
                  const isMine = listing.sellerCode === userCode;
                  const minNextBid = listing.highestBidderCode
                    ? listing.currentBid + 10
                    : listing.startingBid;
                  const currentBidInputStr = bidInputs[listing.id];
                  const bidVal =
                    currentBidInputStr !== undefined && currentBidInputStr !== ''
                      ? Number(currentBidInputStr)
                      : minNextBid;

                  return (
                    <div
                      key={listing.id}
                      className="w-full max-w-[288px] bg-[#f8f9fa] border border-[#c8ccd1] rounded-[2px] p-3 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-center justify-between text-[11.5px] text-[#54595d] border-b border-[#eaecf0] pb-1.5">
                        <span className="truncate">
                          Vendeur :{' '}
                          <strong className="text-[#202122]">
                            {listing.sellerUsername}
                          </strong>
                        </span>
                        {isMine && (
                          <span className="px-1.5 py-0.2 bg-[#eaf3ff] text-[#3366cc] border border-[#3366cc] rounded-[2px] text-[10.5px] font-bold">
                            Votre vente
                          </span>
                        )}
                      </div>

                      <div className="flex justify-center">
                        <div className="w-full max-w-[272px]">
                          <WikiCard card={listing.card} compact={true} />
                        </div>
                      </div>

                      <div className="bg-white border border-[#eaecf0] rounded-[2px] p-2.5 space-y-1.5 text-[12px]">
                        <div className="flex items-center justify-between">
                          <span className="text-[#54595d]">
                            {listing.highestBidderCode
                              ? `Meilleure offre (${listing.highestBidderUsername})`
                              : 'Mise à prix'}
                          </span>
                          <span className="font-extrabold text-[#202122] inline-flex items-center gap-1">
                            <span>
                              {new Intl.NumberFormat('fr-FR').format(
                                listing.currentBid
                              )}
                            </span>
                            <WikithuneIcon className="w-3.5 h-3.5 text-[#3366cc]" />
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[#54595d]">Achat immédiat</span>
                          <span className="font-extrabold text-[#177860] inline-flex items-center gap-1">
                            <span>
                              {new Intl.NumberFormat('fr-FR').format(
                                listing.buyoutPrice
                              )}
                            </span>
                            <WikithuneIcon className="w-3.5 h-3.5 text-[#177860]" />
                          </span>
                        </div>

                        {/* Compte à rebours de 24h lancé dès la 1ère enchère */}
                        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#eaecf0]">
                          <span className="text-[#54595d] inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#3366cc]" />
                            <span>Fin d'enchère :</span>
                          </span>
                          <span
                            className={`font-mono font-bold ${
                              listing.highestBidderCode
                                ? 'text-[#3366cc]'
                                : 'text-[#72777d]'
                            }`}
                          >
                            {formatRemainingTime(
                              listing.bidExpiresAt,
                              listing.highestBidderCode,
                              now
                            )}
                          </span>
                        </div>
                      </div>

                      {!isMine ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder={String(minNextBid)}
                              value={
                                currentBidInputStr !== undefined
                                  ? currentBidInputStr
                                  : minNextBid
                              }
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const clean = sanitizeNumberInput(e.target.value);
                                setBidInputs((prev) => ({
                                  ...prev,
                                  [listing.id]: clean,
                                }));
                              }}
                              onBlur={() => {
                                if (
                                  !currentBidInputStr ||
                                  Number(currentBidInputStr) < minNextBid
                                ) {
                                  setBidInputs((prev) => ({
                                    ...prev,
                                    [listing.id]: String(minNextBid),
                                  }));
                                }
                              }}
                              className="w-full h-[32px] px-2 text-[12.5px] font-bold bg-white border border-[#a2a9b1] rounded-[2px] focus:border-[#3366cc] focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={wikithunes < bidVal}
                              onClick={() =>
                                handleMarketAction(listing.id, 'bid', {
                                  bidAmount: bidVal,
                                })
                              }
                              className="wiki-casino-btn wiki-casino-btn--subtle !min-h-[32px] !py-1 !px-2.5 !text-[12px] shrink-0"
                            >
                              <Gavel className="w-3.5 h-3.5" />
                              <span>Enchérir</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={wikithunes < listing.buyoutPrice}
                            onClick={() =>
                              handleMarketAction(listing.id, 'buy')
                            }
                            className="wiki-casino-btn wiki-casino-btn--success w-full !min-h-[34px] !py-1 !text-[12.5px]"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>
                              Acheter ({listing.buyoutPrice} ₩)
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {listing.highestBidderCode && (
                            <button
                              type="button"
                              onClick={() =>
                                handleMarketAction(listing.id, 'accept_bid')
                              }
                              className="wiki-casino-btn wiki-casino-btn--success w-full !min-h-[32px] !py-1 !text-[12px]"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>
                                Accepter l'offre ({listing.currentBid} ₩)
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleMarketAction(listing.id, 'cancel')
                            }
                            className="wiki-casino-btn wiki-casino-btn--neutral w-full !min-h-[32px] !py-1 !text-[12px]"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Retirer de la vente</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px]">
                <p className="text-[14px] text-[#54595d] m-0">
                  Aucune carte en vente actuellement. Cliquez sur « Mettre en vente » pour publier la première enchère !
                </p>
              </div>
            )}
          </div>
        ) : activeSubTab === 'sell' ? (
          /* =====================================================================
             ONGLET 2 : METTRE UNE CARTE DE SON CLASSEUR AUX ENCHÈRES
          ===================================================================== */
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Aperçu de la carte choisie + Formulaire de prix */}
              <div className="lg:col-span-4 bg-[#f8f9fa] border border-[#c8ccd1] rounded-[2px] p-4 flex flex-col items-center gap-4">
                <div className="w-full border-b border-[#eaecf0] pb-2">
                  <span className="text-[13px] font-bold text-[#202122] uppercase tracking-wider">
                    Carte à mettre en vente
                  </span>
                </div>

                {selectedSellCard ? (
                  <>
                    <div className="w-full max-w-[272px]">
                      <WikiCard card={selectedSellCard} compact={true} />
                    </div>

                    <form
                      onSubmit={handleCreateListing}
                      className="w-full space-y-3 pt-2 border-t border-[#eaecf0]"
                    >
                      <div>
                        <label className="block text-[12px] font-bold text-[#202122] mb-1">
                          Prix de départ (enchère minimale en ₩)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Ex : 50"
                          value={startingBidInput}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            setStartingBidInput(sanitizeNumberInput(e.target.value))
                          }
                          onBlur={() => {
                            if (!startingBidInput || Number(startingBidInput) < 5) {
                              setStartingBidInput('5');
                            }
                          }}
                          className="w-full h-[34px] px-2.5 text-[13.5px] font-bold bg-white border border-[#a2a9b1] rounded-[2px] focus:border-[#3366cc] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[12px] font-bold text-[#202122] mb-1">
                          Prix d'achat immédiat (₩)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Ex : 150"
                          value={buyoutPriceInput}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            setBuyoutPriceInput(sanitizeNumberInput(e.target.value))
                          }
                          onBlur={() => {
                            const minBuyout = Math.max(10, Number(startingBidInput) || 5);
                            if (!buyoutPriceInput || Number(buyoutPriceInput) < minBuyout) {
                              setBuyoutPriceInput(String(minBuyout));
                            }
                          }}
                          className="w-full h-[34px] px-2.5 text-[13.5px] font-bold bg-white border border-[#a2a9b1] rounded-[2px] focus:border-[#3366cc] focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isCreatingListing}
                        className="wiki-casino-btn wiki-casino-btn--primary w-full"
                      >
                        <Tag className="w-4 h-4" />
                        <span>
                          {isCreatingListing
                            ? 'Publication...'
                            : "Publier l'annonce sur le marché"}
                        </span>
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="w-full max-w-[272px] h-[446px] rounded-[14px] border-2 border-dashed border-[#c8ccd1] bg-white flex items-center justify-center p-6 text-center text-[13px] text-[#54595d]">
                    Sélectionnez une carte dans votre classeur à droite pour fixer son prix de départ et son prix d'achat immédiat.
                  </div>
                )}
              </div>

              {/* Sélection de la carte dans le classeur (une seule rareté à la fois) */}
              <div className="lg:col-span-8 bg-white border border-[#c8ccd1] rounded-[2px] p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eaecf0] pb-3">
                  <span className="text-[13px] font-bold text-[#202122] uppercase tracking-wider">
                    Choisissez une carte de votre classeur
                  </span>

                  <div className="flex flex-wrap gap-1.5">
                    {[...RARITY_TIERS].reverse().map((tier) => {
                      const cnt = collection.filter(
                        (c) => c.rarity === tier.code
                      ).length;
                      return (
                        <button
                          key={tier.code}
                          type="button"
                          onClick={() => setSellRarityFilter(tier.code)}
                          className={`px-2.5 py-1 text-[12px] rounded-[2px] border cursor-pointer transition-all flex items-center gap-1.5 ${
                            sellRarityFilter === tier.code
                              ? 'ring-2 ring-[#3366cc] font-bold bg-white border-[#3366cc]'
                              : 'bg-[#f8f9fa] hover:bg-white border-[#c8ccd1]'
                          }`}
                        >
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: tier.borderColor }}
                          />
                          <span>
                            {tier.code} ({cnt})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 justify-items-center max-h-[620px] overflow-y-auto p-1">
                  {collection
                    .filter((c) => c.rarity === sellRarityFilter)
                    .map((card) => {
                      const isFavProtected =
                        favorites.includes(card.id) && (card.count || 1) <= 1;
                      const isSelected = selectedSellCardId === card.id;
                      return (
                        <WikiCard
                          key={card.id}
                          card={card}
                          mini={true}
                          duplicateCount={card.count || 1}
                          isFavorite={favorites.includes(card.id)}
                          isSelected={isSelected}
                          isDisabledSelection={isFavProtected}
                          selectionBadgeText={
                            isFavProtected
                              ? '★ Protégée'
                              : isSelected
                              ? 'Sélectionnée'
                              : 'Vendre'
                          }
                          onSelectCard={() => handleSelectCardToSell(card)}
                        />
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* =====================================================================
             ONGLET 3 : HISTORIQUE DE MES ANNONCES
          ===================================================================== */
          <div className="space-y-3">
            {myListings.length > 0 ? (
              myListings.map((listing) => (
                <div
                  key={listing.id}
                  className="bg-[#f8f9fa] border border-[#c8ccd1] rounded-[2px] p-3.5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[14px] text-[#202122]">
                      {listing.card?.title} ({listing.card?.rarity})
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[11.5px] font-bold rounded-[2px] border ${
                        listing.status === 'sold'
                          ? 'bg-[#dff2eb] border-[#099979] text-[#177860]'
                          : listing.status === 'cancelled'
                          ? 'bg-[#ffe9e5] border-[#f54739] text-[#bf3c2c]'
                          : 'bg-[#eaf3ff] border-[#3366cc] text-[#3366cc]'
                      }`}
                    >
                      {listing.status === 'sold'
                        ? `Vendue (${listing.finalPrice} ₩ à ${listing.buyerUsername})`
                        : listing.status === 'cancelled'
                        ? 'Retirée'
                        : listing.highestBidderCode
                        ? `Enchère de 24h en cours (${listing.currentBid} ₩ par ${listing.highestBidderUsername} • Fin dans ${formatRemainingTime(listing.bidExpiresAt, listing.highestBidderCode, now)})`
                        : `En attente de 1ère offre (Mise à prix : ${listing.startingBid} ₩ / Achat : ${listing.buyoutPrice} ₩)`}
                    </span>
                  </div>

                  {listing.status === 'active' && (
                    <div className="flex items-center gap-2">
                      {listing.highestBidderCode && (
                        <button
                          type="button"
                          onClick={() =>
                            handleMarketAction(listing.id, 'accept_bid')
                          }
                          className="wiki-casino-btn wiki-casino-btn--success !min-h-[30px] !py-1 !px-3 !text-[12px]"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            Accepter l'enchère ({listing.currentBid} ₩)
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          handleMarketAction(listing.id, 'cancel')
                        }
                        className="wiki-casino-btn wiki-casino-btn--neutral !min-h-[30px] !py-1 !px-3 !text-[12px]"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Retirer</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-12 text-center bg-[#f8f9fa] border border-[#eaecf0] rounded-[2px]">
                <p className="text-[14px] text-[#54595d] m-0">
                  Vous n'avez pas encore publié d'annonce sur le marché.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
