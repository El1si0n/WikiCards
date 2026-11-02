/**
 * Calcule le Score et la Note de joueur (Rang) à partir des données de profil et de statistiques.
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
  const upgradesWon = Number(stats.upgradesSuccessCount || 0);
  const bestStreak = Number(stats.highestStreakHigherLower || 0);
  const biggestWin = Number(stats.highestSingleWinCasino || 0);
  const casinoMoneyWon = Number(stats.casinoMoneyWon || 0);

  // Formule équilibrée du score global de joueur
  const score = Math.max(
    0,
    Math.round(
      unique * 15 +
        totalCards * 2 +
        legendaries * 800 +
        ultraRares * 250 +
        gifs * 40 +
        boostersOpened * 12 +
        upgradesWon * 40 +
        bestStreak * 70 +
        Math.min(1200, biggestWin * 0.1) +
        Math.min(1000, casinoMoneyWon * 0.05) +
        Math.min(500, wikithunes * 0.05)
    )
  );

  let rankGrade = 'D';
  let rankLabel = 'Novice';
  let rankColor = '#72777d';
  let badgeBg = '#f8f9fa';

  if (score >= 8000) {
    rankGrade = 'S+';
    rankLabel = 'Grand Maître';
    rankColor = '#b8860b';
    badgeBg = '#fff9db';
  } else if (score >= 4500) {
    rankGrade = 'S';
    rankLabel = 'Élite';
    rankColor = '#b32424';
    badgeBg = '#fee7e6';
  } else if (score >= 2500) {
    rankGrade = 'A';
    rankLabel = 'Expert';
    rankColor = '#6c3483';
    badgeBg = '#f3e8ff';
  } else if (score >= 1200) {
    rankGrade = 'B';
    rankLabel = 'Vétéran';
    rankColor = '#205493';
    badgeBg = '#eaf3ff';
  } else if (score >= 500) {
    rankGrade = 'C';
    rankLabel = 'Initié';
    rankColor = '#107c41';
    badgeBg = '#dcfce7';
  }

  return {
    score,
    rankGrade,
    rankLabel,
    rankColor,
    badgeBg,
  };
}
