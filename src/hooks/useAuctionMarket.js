/**
 * @file Rôle : Custom hook gérant la logique d'état, le polling et les transactions du marché d'enchères.
 * Dépendances : React, `../services/userStorage`, `../services/sound`, `../config/rarities`.
 * Effets de bord : Polling périodique (8s), horloge 1s, lecture/écriture API marché.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  fetchMarketListings,
  createMarketListing,
  performMarketAction,
} from '../services/userStorage';
import { soundManager } from '../services/sound';
import { getCardRecycleValue } from '../config/rarities';

/**
 * Nettoie une chaîne numérique en supprimant les caractères non numériques et les zéros initiaux superflus.
 * @param {string|number|null} val - Valeur brute
 * @returns {string} Chaîne assainie
 */
export function sanitizeNumberInput(val) {
  let clean = String(val ?? '').replace(/[^0-9]/g, '');
  if (clean.length > 1 && clean.startsWith('0')) {
    clean = clean.replace(/^0+/, '');
  }
  return clean;
}

/**
 * Calcule et formate le compte à rebours de 24h d'une enchère.
 * @param {number|null} bidExpiresAt - Timestamp d'expiration
 * @param {string|null} highestBidderCode - Code du meilleur enchérisseur
 * @param {number} now - Horodatage courant
 * @returns {string} Temps restant formaté
 */
export function formatRemainingTime(bidExpiresAt, highestBidderCode, now) {
  if (!highestBidderCode || !bidExpiresAt) {
    return '24h après 1ère offre';
  }
  const expiry = Number(bidExpiresAt);
  if (isNaN(expiry)) {
    return '24h après 1ère offre';
  }
  const diff = expiry - now;
  if (diff <= 0) {
    return 'Délai écoulé';
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

/**
 * Hook personnalisé encapsulant toutes les données et actions du marché des enchères.
 * @param {Object} params
 * @param {string} params.userCode - Code du joueur courant
 * @param {Array<Object>} [params.collection=[]] - Collection du joueur
 * @param {Array<string>} [params.favorites=[]] - IDs des cartes favorites
 * @param {number} [params.wikithunes=0] - Solde de monnaie
 * @param {function(Object): void} params.onSyncAccountState - Synchronisation de l'état joueur
 * @returns {Object} État réactif et gestionnaires d'actions du marché
 */
export function useAuctionMarket({
  userCode,
  collection = [],
  favorites = [],
  _wikithunes = 0,
  onSyncAccountState,
}) {
  const [activeSubTab, setActiveSubTab] = useState('browse');
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rarityFilter, setRarityFilter] = useState('ALL');
  const [feedback, setFeedback] = useState(null);

  // Horloge en direct pour rafraîchir les comptes à rebours de 24h
  const [now, setNow] = useState(Date.now());
  const sellFormRef = useRef(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // État des enchères manuelles : { [listingId]: string }
  const [bidInputs, setBidInputs] = useState({});

  // État de mise en vente
  const [sellRarityFilter, setSellRarityFilter] = useState('C');
  const [selectedSellCardId, setSelectedSellCardId] = useState(null);
  const [startingBidInput, setStartingBidInput] = useState('50');
  const [buyoutPriceInput, setBuyoutPriceInput] = useState('150');
  const [isCreatingListing, setIsCreatingListing] = useState(false);

  const loadListings = async (silent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent) setIsLoading(true);
    try {
      const data = await fetchMarketListings();
      setListings(data);
    } finally {
      isFetchingRef.current = false;
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadListings(false);

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        loadListings(true);
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
        loadListings(true);
      }
    }, 8000);

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
        ? collection.find((c) => String(c.id) === String(selectedSellCardId)) || null
        : null,
    [selectedSellCardId, collection]
  );

  const handleSelectCardToSell = (card) => {
    if (!card) return;
    const isFavProtected = favorites.includes(card.id) && (card.count || 1) <= 1;
    if (isFavProtected) return;

    setSelectedSellCardId(card.id);
    const baseVal = getCardRecycleValue(card);
    setStartingBidInput(String(Math.max(15, Math.round(baseVal * 1.2))));
    setBuyoutPriceInput(String(Math.max(30, Math.round(baseVal * 2.5))));
    soundManager.playCardSlide();
    try {
      sellFormRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    } catch {
      sellFormRef.current?.scrollIntoView?.();
    }
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

  return {
    activeSubTab,
    setActiveSubTab,
    listings,
    activeListings,
    filteredBrowseListings,
    myListings,
    isLoading,
    rarityFilter,
    setRarityFilter,
    feedback,
    now,
    sellFormRef,
    bidInputs,
    setBidInputs,
    sellRarityFilter,
    setSellRarityFilter,
    selectedSellCard,
    selectedSellCardId,
    startingBidInput,
    setStartingBidInput,
    buyoutPriceInput,
    setBuyoutPriceInput,
    isCreatingListing,
    handleSelectCardToSell,
    handleCreateListing,
    handleMarketAction,
    loadListings,
  };
}
