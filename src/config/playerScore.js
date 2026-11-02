/**
 * Calcule le score d'accomplissement (en points) d'un joueur
 * à partir de sa collection, de ses raretés et de ses statistiques de jeu.
 */
export function calculatePlayerScore(playerData = {}) {
  // Collection & raretés
  const unique = Number(
    playerData.uniqueCardsCount ??
      (Array.isArray(playerData.collection) ? playerData.collection.length : 0)
  );
  const legendaries = Number(
    playerData.legendaryCount ??
      (Array.isArray(playerData.collection)
        ? playerData.collection.filter((c) => c.rarity === 'L').length
        : 0)
  );
  const ultraRares = Number(
    playerData.ultraRareCount ??
      (Array.isArray(playerData.collection)
        ? playerData.collection.filter((c) => c.rarity === 'UR').length
        : 0)
  );
  const wikithunes = Number(playerData.wikithunes || 0);

  // Statistiques de jeu & casino
  const stats = playerData.stats || {};
  const boostersOpened = Number(stats.boostersOpened || 0);
  const wonCards = Number(stats.wonCards || 0);
  const netCasinoGains = Number(stats.netCasinoGains || 0);

  // Formule harmonisée du score d'accomplissement :
  // Légendaires (1000) + UR (300) + Uniques (15) + Cartes gagnées (30) + Boosters (10) + Gains casino (1/10) + Richesse
  const score = Math.max(
    0,
    Math.round(
      legendaries * 1000 +
        ultraRares * 300 +
        unique * 15 +
        wonCards * 30 +
        boostersOpened * 10 +
        Math.max(0, Math.floor(netCasinoGains / 10)) +
        Math.floor(wikithunes / 50)
    )
  );

  return score;
}
