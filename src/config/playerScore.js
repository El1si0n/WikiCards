/**
 * Calcule le score d'accomplissement (en points) d'un joueur
 * à partir des 12 statistiques visibles sur son profil :
 *
 * 1. Articles uniques
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
 *   Si vous doublez 4 cartes et perdez 4 cartes, le bilan est neutre (4 - 4 = 0) et le score ne bouge pas.
 * - Le Casino Plus ou Moins se base sur le BILAN FINANCIER NET (Gains casino - Argent perdu).
 *   Jouer à perte en boucle ne permet plus de farmer des points artificiels.
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

  // 6. Rareté Légendaire (L)
  const legendaries = Number(
    playerData.legendaryCount ??
      playerData.legendaries ??
      (Array.isArray(playerData.collection)
        ? playerData.collection.filter((c) => c.rarity === 'L').length
        : 0)
  );

  // 7. Rareté Ultra Rare (UR)
  const ultraRares = Number(
    playerData.ultraRareCount ??
      playerData.ultraRares ??
      (Array.isArray(playerData.collection)
        ? playerData.collection.filter((c) => c.rarity === 'UR').length
        : 0)
  );

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

  // Formule harmonisée et équilibrée intégrant l'ensemble des 12 statistiques :
  const score = Math.max(
    0,
    Math.round(
      // Raretés majeures & prestige visuel
      legendaries * 1000 +
        ultraRares * 300 +
        gifCards * 50 +

        // Collection & volume du classeur
        unique * 15 +
        totalCards * 2 +

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
