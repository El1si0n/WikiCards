/**
 * Calcule la note cachée (score d'accomplissement) d'un joueur
 * à partir de sa collection, de ses raretés et de ses statistiques de jeu.
 */
export function calculatePlayerScore(playerData = {}) {
  // Collection & raretés
  const unique = Number(
    playerData.uniqueCardsCount ||
      (Array.isArray(playerData.collection) ? playerData.collection.length : 0)
  );
  const totalCards = Number(
    playerData.totalCardsCount ||
      (Array.isArray(playerData.collection)
        ? playerData.collection.reduce((s, c) => s + (c.count || 1), 0)
        : 0)
  );
  const legendaries = Number(
    playerData.legendaryCount ||
      (Array.isArray(playerData.collection)
        ? playerData.collection.filter((c) => c.rarity === 'L').length
        : 0)
  );
  const ultraRares = Number(
    playerData.ultraRareCount ||
      (Array.isArray(playerData.collection)
        ? playerData.collection.filter((c) => c.rarity === 'UR').length
        : 0)
  );
  const gifs = Number(
    playerData.gifCount ||
      (Array.isArray(playerData.collection)
        ? playerData.collection.filter(
            (c) =>
              c.isFoil ||
              (typeof c.image === 'string' &&
                c.image.toLowerCase().includes('.gif'))
          ).length
        : 0)
  );
  const wikithunes = Number(playerData.wikithunes || 0);

  // Statistiques de jeu & casino
  const stats = playerData.stats || {};
  const boostersOpened = Number(stats.boostersOpened || 0);
  const recordStreak = Number(
    stats.recordStreak || stats.highestStreakHigherLower || 0
  );
  const netCasinoGains = Number(
    stats.netCasinoGains || stats.casinoMoneyWon || 0
  );

  // Formule équilibrée de la note cachée
  const score = Math.max(
    0,
    Math.round(
      unique * 15 +
        totalCards * 2 +
        legendaries * 800 +
        ultraRares * 250 +
        gifs * 40 +
        boostersOpened * 10 +
        recordStreak * 80 +
        Math.max(0, Math.floor(netCasinoGains * 0.1)) +
        Math.min(500, wikithunes * 0.05)
    )
  );

  return {
    score,
  };
}
