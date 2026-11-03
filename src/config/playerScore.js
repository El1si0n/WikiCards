/**
 * Configuration des points par rareté (Échelle ~4x par palier supérieur) :
 *
 * 1 Commune (C) = 5 pts
 * 1 Peu Commune (PC) = 20 pts (4.0x)  -> vaut exactement 4 Communes
 * 1 Rare (R) = 80 pts (4.0x)         -> vaut exactement 4 Peu Communes
 * 1 Super Rare (SR) = 300 pts (3.75x) -> vaut ~3.75 Rares
 * 1 Ultra Rare (UR) = 1 100 pts (3.67x) -> vaut ~3.67 Super Rares
 * 1 Légendaire (L) = 4 000 pts (3.64x)  -> vaut ~3.64 Ultra Rares
 *
 * Cette échelle rend l'upgrade (N -> N+1) véritablement rentable et valorisant :
 * fusionner 4 cartes d'un rang inférieur conserve ou améliore immédiatement le score de rareté !
 */
export const RARITY_SCORE_WEIGHTS = {
  C: 5,
  PC: 20,
  R: 80,
  SR: 300,
  UR: 1100,
  L: 4000,
};

/**
 * Calcule le score d'accomplissement (en points) d'un joueur
 * à partir des 12 statistiques visibles sur son profil :
 *
 * 1. Articles uniques (diversité Wikipédia)
 * 2. Total de cartes (exemplaires physiques)
 * 3. Solde actuel (Wikithunes)
 * 4. Valeur du classeur (valeur marchande / recyclage)
 * 5. Boosters ouverts (fidélité / activité)
 * 6. Légendaires (L)
 * 7. Ultra Rares (UR)
 * 8. Cartes GIF (Métal / Shiny)
 * 9. Argent perdu au jeu (Plus ou Moins & Upgrades)
 * 10. Cartes perdues (Upgrades & Quitte ou Double)
 * 11. Cartes gagnées (Upgrades & Quitte ou Double)
 * 12. Gains casino (bénéfices nets réels empochés)
 *
 * Règle d'or anti-triche & anti-exploit :
 * - Le Quitte ou Double et les Upgrades se basent sur le BILAN NET DE CARTES (Gagnées - Perdues).
 * - Le Casino Plus ou Moins se base sur le BILAN FINANCIER NET (Gains casino - Argent perdu).
 */
export function calculatePlayerScore(playerData = {}) {
  // 1. Articles uniques
  const unique = Number(
    playerData.uniqueCardsCount ??
      playerData.uniqueCount ??
      (Array.isArray(playerData.collection) ? playerData.collection.length : 0)
  );

  // 2. Total de cartes (volume total d'exemplaires dans le classeur)
  const totalCards = Number(
    playerData.totalCardsCount ??
      playerData.totalCards ??
      (Array.isArray(playerData.collection)
        ? playerData.collection.reduce((sum, c) => sum + (c.count || 1), 0)
        : unique)
  );

  // 3. Solde actuel en Wikithunes
  const wikithunes = Number(playerData.wikithunes || 0);

  // 4. Valeur marchande estimée du classeur (recyclage)
  const collectionValue = Number(
    playerData.collectionValue ??
      playerData.collectionTotalValue ??
      playerData.totalVal ??
      (Array.isArray(playerData.collection)
        ? playerData.collection.reduce((sum, c) => {
            const baseMap = { C: 10, PC: 35, R: 125, SR: 420, UR: 710, L: 2100 };
            const base = baseMap[c.rarity] || 10;
            const mult = c.isShiny ? 3 : 1;
            return sum + base * mult * (c.count || 1);
          }, 0)
        : 0)
  );

  // 5. Progression : Boosters ouverts
  const stats = playerData.stats || {};
  const boostersOpened = Number(stats.boostersOpened || 0);

  // 6. Points de Rareté (~4x par palier supérieur)
  let rarityPoints = 0;
  if (Array.isArray(playerData.collection) && playerData.collection.length > 0) {
    rarityPoints = playerData.collection.reduce((sum, c) => {
      const code = c?.rarity || 'C';
      const weight = RARITY_SCORE_WEIGHTS[code] || RARITY_SCORE_WEIGHTS.C;
      const copies = Number(c?.count || 1);
      return sum + weight * copies;
    }, 0);
  } else {
    const lCount = Number(playerData.legendaryCount || 0);
    const urCount = Number(playerData.ultraRareCount || 0);
    const srCount = Number(playerData.superRareCount || 0);
    const rCount = Number(playerData.rareCount || 0);
    const pcCount = Number(playerData.uncommonCount || 0);
    const cCount = Number(playerData.commonCount || 0);
    rarityPoints =
      lCount * RARITY_SCORE_WEIGHTS.L +
      urCount * RARITY_SCORE_WEIGHTS.UR +
      srCount * RARITY_SCORE_WEIGHTS.SR +
      rCount * RARITY_SCORE_WEIGHTS.R +
      pcCount * RARITY_SCORE_WEIGHTS.PC +
      cCount * RARITY_SCORE_WEIGHTS.C;
  }

  // 8. Cartes GIF / Métal (holographiques ou animées)
  const gifCards = Number(
    playerData.gifCount ??
      playerData.gifCardsCount ??
      playerData.gifs ??
      (Array.isArray(playerData.collection)
        ? playerData.collection.filter((c) =>
            Boolean(c.isShiny || c.isGif || /\.gif(\?|$|\/)/i.test(c.image || ''))
          ).length
        : 0)
  );

  // 9. Argent perdu au jeu (Casino + Upgrades)
  const lostMoneyCasino = Number(stats.lostMoneyCasino || 0);

  // 10. Cartes perdues (Upgrades + Quitte ou Double)
  const lostCards = Number(stats.lostCards || 0);

  // 11. Cartes gagnées (Upgrades + Quitte ou Double)
  const wonCards = Number(stats.wonCards || 0);

  // 12. Gains casino (bénéfices nets réels empochés au Plus ou Moins)
  const netCasinoGains = Number(stats.netCasinoGains || 0);

  // Bilan net des cartes au jeu (anti-exploit : ne récompense que le gain net réel de cartes)
  const netWonCards = Math.max(0, wonCards - lostCards);

  // Bilan financier net du jeu (anti-exploit : ne récompense que les bénéfices nets réels)
  const netCasinoMoney = Math.max(0, netCasinoGains - lostMoneyCasino);

  // Formule harmonisée et équilibrée :
  const score = Math.max(
    0,
    Math.round(
      // Raretés (échelle exponentielle ~4x)
      rarityPoints +

        // Cartes GIF / Métal (prestige esthétique)
        gifCards * 50 +

        // Diversité de l'encyclopédie (articles uniques)
        unique * 10 +

        // Volume d'exemplaires dans le classeur
        totalCards * 1 +

        // Économie & patrimoine
        Math.floor(wikithunes / 50) +
        Math.floor(collectionValue / 100) +

        // Activité & fidélité
        boostersOpened * 10 +

        // Exploits & prouesses au jeu (bilans nets réels uniquement)
        netWonCards * 15 +
        Math.floor(netCasinoMoney / 50)
    )
  );

  return score;
}
