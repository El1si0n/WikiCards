/**
 * Calcule le score d'accomplissement (en points) d'un joueur
 * à partir de sa collection réelle, de ses raretés, de ses ouvertures de boosters et de son solde.
 *
 * Règle d'or (Option A) :
 * Les mini-jeux de hasard (Quitte ou double, Plus ou Moins) ne génèrent PAS de points
 * artificiels ou redondants. Seules les vraies cartes conservées dans le classeur ou les ₩ réels
 * en banque influent naturellement sur la note.
 */
export function calculatePlayerScore(playerData = {}) {
  // Collection & raretés réelles
  const unique = Number(
    playerData.uniqueCardsCount ??
      playerData.uniqueCount ??
      (Array.isArray(playerData.collection) ? playerData.collection.length : 0)
  );

  const legendaries = Number(
    playerData.legendaryCount ??
      playerData.legendaries ??
      (Array.isArray(playerData.collection)
        ? playerData.collection.filter((c) => c.rarity === 'L').length
        : 0)
  );

  const ultraRares = Number(
    playerData.ultraRareCount ??
      playerData.ultraRares ??
      (Array.isArray(playerData.collection)
        ? playerData.collection.filter((c) => c.rarity === 'UR').length
        : 0)
  );

  const superRares = Number(
    playerData.superRareCount ??
      playerData.superRares ??
      (Array.isArray(playerData.collection)
        ? playerData.collection.filter((c) => c.rarity === 'SR').length
        : 0)
  );

  const wikithunes = Number(playerData.wikithunes || 0);

  // Progression : boosters ouverts (fidélité / découverte)
  const stats = playerData.stats || {};
  const boostersOpened = Number(stats.boostersOpened || 0);

  // Formule harmonisée et équilibrée (Option A) :
  // Légendaires (1000) + UR (300) + SR (60) + Uniques (15) + Boosters ouverts (10) + Solde liquide (1 pt / 50 ₩)
  const score = Math.max(
    0,
    Math.round(
      legendaries * 1000 +
        ultraRares * 300 +
        superRares * 60 +
        unique * 15 +
        boostersOpened * 10 +
        Math.floor(wikithunes / 50)
    )
  );

  return score;
}
