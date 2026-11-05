# Spécifications et Architecture du Projet WikiCards

Ce document sert de référence technique et de contrat d'architecture permanent pour tout agent ou développeur intervenant sur le projet WikiCards.

---

## 1. Architecture du projet

Le projet est une application web de collection de cartes basée sur les articles réels de Wikipédia en français. L'architecture sépare rigoureusement la configuration statique, les services asynchrones, les fonctions utilitaires pures, les composants d'interface et le serveur backend autonome.

### `src/config/`
Contient l'ensemble des constantes économiques, seuils d'attribution, classifications et règles de calcul statiques :
- [`playerScore.js`](file:///c:/Users/elisi/Documents/Projet/WikiCards/src/config/playerScore.js) : Pondération mathématique et calcul du score d'accomplissement global du joueur basé sur ses statistiques (articles uniques, volume, raretés, bilans nets).
- [`rarities.js`](file:///c:/Users/elisi/Documents/Projet/WikiCards/src/config/rarities.js) : Définition des 6 échelons de rareté (`C`, `PC`, `R`, `SR`, `UR`, `L`), seuils de visiteurs mensuels, probabilités de tirage, prix des boosters et valeurs de recyclage.
- [`themes.js`](file:///c:/Users/elisi/Documents/Projet/WikiCards/src/config/themes.js) : Classification encyclopédique inspirée des grands portails Wikipédia et heuristique d'affectation automatique d'un thème à un article.

### `src/services/`
Gère les interactions asynchrones avec l'extérieur, les périphériques natifs du navigateur et la persistance :
- [`wikipedia.js`](file:///c:/Users/elisi/Documents/Projet/WikiCards/src/services/wikipedia.js) : Client d'interrogation de l'API REST officielle de Wikipédia FR (`/api/rest_v1/page/summary`), tirage de titres aléatoires, requêtes Wikimedia Pageviews et sélection de cartes pour les mini-jeux.
- [`sound.js`](file:///c:/Users/elisi/Documents/Projet/WikiCards/src/services/sound.js) : Moteur audio procédural temps réel reposant exclusivement sur la Web Audio API (synthétiseur d'ondes et générateur de bruit blanc) sans aucun fichier audio externe.
- [`userStorage.js`](file:///c:/Users/elisi/Documents/Projet/WikiCards/src/services/userStorage.js) : Gestion de la persistance locale (`localStorage`), génération des codes identifiants de compte (`WIKI-XXXX-XXXX`), arbitrage des versions conflictuelles (protection anti-écrasement) et passerelle cliente vers l'API serveur `/api/*`.

### `src/utils/`
Regroupe les fonctions algorithmiques pures et la manipulation de données :
- [`statsHistory.js`](file:///c:/Users/elisi/Documents/Projet/WikiCards/src/utils/statsHistory.js) : Enregistrement des instantanés (`snapshots`) horodatés de progression, cloisonnement par compte utilisateur et génération dynamique des courbes boursières et séries temporelles (`1J`, `1S`, `1M`, `TOUT`).

### `src/components/`
Composants d'interface React (Tailwind CSS, Lucide Icons, Framer Motion) :
- `BoosterOpening.jsx` : Ouverture interactive de sachet 3D et découverte séquentielle des 6 cartes d'un booster.
- `Classeur.jsx` : Consultation, filtrage multi-critères, tri et gestion des cartes possédées.
- `WikiSino.jsx`, `DoubleOrNothingGame.jsx`, `HigherLowerGame.jsx` : Mini-jeux de casino (Upgrader de rareté, Quitte ou Double, Plus ou Moins).
- `AuctionMarket.jsx` : Salle des marchés (ventes directes et enchères en temps réel).
- `SocialHub.jsx`, `TradeModal.jsx` : Annuaire des joueurs, consultation des profils pairs et échanges asynchrones de cartes.
- `UserProfile.jsx`, `StatsHistoryModal.jsx` : Visualisation détaillée des statistiques du joueur, vitrine de cartes et graphiques historiques.
- `WikiCard.jsx` : Rendu visuel normalisé d'une carte (284 × 443 px) avec badge de rareté, hologramme et animation GIF.

### `server/apiHandler.js`
Contrôleur HTTP autonome Node.js sans framework lourd, exécuté directement par Vite en développement et par le serveur Node de production :
- `/api/users` : Annuaire global et synchronisation bidirectionnelle des comptes joueurs (`data/users/*.json`).
- `/api/trades` : Création, acceptation, refus et annulation d'échanges de cartes entre joueurs (`data/trades.json`).
- `/api/market` : Publication d'annonces, enchères avec compte à rebours de 24h, achat immédiat et résolution d'expiration (`data/market.json`).
- `/api/pageviews` : Proxy cache vers l'API Wikimedia Pageviews pour sécuriser les requêtes et masquer les erreurs 404 du navigateur.
- `/api/health` : Endpoint de contrôle de santé du conteneur.

---

## 2. Schémas de données principaux

### 2.1. Objet `Card`
Représente une carte encyclopédique dans le jeu (générée depuis Wikipédia ou stockée dans un classeur) :
```typescript
interface Card {
  id: string;              // Identifiant unique préfixé, ex: "wiki-12345" ou "wiki-Titre_Page"
  pageid?: number;         // PageID officiel de l'article sur Wikipédia
  title: string;           // Titre exact de l'article encyclopédique
  description: string;     // Description courte officielle (chapeau Wikipédia)
  extract: string;         // Extrait textuel d'introduction de l'article
  image: string | null;    // URL de l'illustration principale ou du .gif animé
  imageContain?: boolean;  // Indique si l'image doit s'afficher avec object-contain (ex: logo Wikipédia)
  isGif: boolean;          // Vrai si l'image source est un fichier .gif animé
  isShiny: boolean;        // Vrai si la carte possède le statut holographique / GIF Métal
  views: number;           // Nombre réel de visiteurs sur les 30 derniers jours
  rarity: 'C' | 'PC' | 'R' | 'SR' | 'UR' | 'L'; // Échelon de rareté calculé
  url: string;             // Lien direct vers la page Wikipédia officielle
  theme: string;           // Code thématique calculé (ex: "SCIENCE", "HISTOIRE", "SOCIETE")
  count?: number;          // Nombre d'exemplaires possédés dans le classeur (défaut: 1)
  obtainedAt?: number;     // Horodatage UNIX (ms) de l'obtention de cet exemplaire
}
```

### 2.2. Objet `User` (Compte Joueur)
Structure complète du compte persistée côté serveur (`data/users/<CODE>.json`) et synchronisée côté client :
```typescript
interface UserAccount {
  code: string;            // Code unique du compte, format normalisé "WIKI-XXXX-XXXX"
  profile: {
    username: string;      // Pseudonyme visible par la communauté
    avatar: string;        // URL de l'avatar du profil
    bio: string;           // Biographie du joueur
    showcaseIds: string[]; // Maximum 4 IDs de cartes exposées en vitrine
    themePreference: 'light' | 'dark'; // Préférence de thème d'affichage
  };
  collection: Card[];      // Liste des cartes uniques avec leur champ count et obtainedAt
  wikithunes: number;      // Solde de monnaie virtuelle (₩)
  freeBoostersCount: number; // Nombre de boosters gratuits disponibles (recharge périodique)
  lastFreeBoostersResetTime: number; // Timestamp ms de la dernière recharge de boosters
  lastDailyClaimDate: string; // Date de dernière récolte journalière au format "YYYY-MM-DD"
  stats: {
    boostersOpened: number;   // Nombre total de boosters ouverts
    totalCardsDrawn: number;  // Nombre total de cartes tirées depuis la création
    wonCards: number;         // Cartes gagnées via mini-jeux (Upgrades & Quitte ou Double)
    lostCards: number;        // Cartes perdues via mini-jeux
    lostMoneyCasino: number;  // Argent total misé/perdu aux jeux de casino
    netCasinoGains: number;   // Gains bruts empochés au casino
    recordStreak: number;     // Plus longue série de victoires d'affilée au Plus ou Moins
    duelVictories?: number;   // Victoires en duels
    duelDefeats?: number;     // Défaites en duels
  };
  favorites: string[];     // Liste des IDs de cartes marquées comme favorites
  createdAt: number;       // Horodatage ms de création initiale du compte
  updatedAt: number;       // Horodatage ms de dernière mise à jour
}
```

### 2.3. Objet `MarketListing` (Annonce du Marché)
Entrée stockée dans le registre central `data/market.json` :
```typescript
interface MarketListing {
  id: string;              // Identifiant unique préfixé, ex: "MKT-1730000000000-ABCD"
  sellerCode: string;      // Code de compte du vendeur
  sellerUsername: string;  // Pseudonyme du vendeur au moment de la publication
  sellerAvatar: string;    // Avatar du vendeur
  card: Card;              // Carte mise en vente (avec count = 1)
  startingBid: number;     // Prix de mise à prix de départ (₩)
  currentBid: number;      // Enchère la plus haute actuelle (₩)
  highestBidderCode: string | null;     // Code du joueur ayant placé la meilleure enchère
  highestBidderUsername: string | null; // Pseudonyme du meilleur enchérisseur
  bidExpiresAt: number | null;          // Timestamp d'expiration (24h après la 1ère enchère)
  buyoutPrice: number;     // Prix d'achat immédiat direct (₩)
  status: 'active' | 'sold' | 'cancelled'; // Statut de la transaction
  createdAt: number;       // Horodatage ms de création de l'annonce
}
```

### 2.4. Objet `Trade` (Offre d'Échange)
Entrée stockée dans le registre central `data/trades.json` :
```typescript
interface Trade {
  id: string;              // Identifiant unique préfixé, ex: "TRD-1730000000000-ABCD"
  fromCode: string;        // Code de l'initiateur de l'offre
  fromUsername: string;    // Pseudonyme de l'initiateur
  fromAvatar: string;      // Avatar de l'initiateur
  toCode: string;          // Code du destinataire de l'offre
  toUsername: string;      // Pseudonyme du destinataire
  toAvatar: string;        // Avatar du destinataire
  offeredCards: Card[];    // Cartes offertes par l'initiateur
  requestedCards: Card[];  // Cartes réclamées au destinataire
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'; // État de la proposition
  createdAt: number;       // Horodatage ms de proposition
}
```

---

## 3. Règles d'or (Invariants stricts)

Tout intervenant, qu'il s'agisse d'une IA ou d'un humain, doit respecter sans exception les trois règles fondamentales suivantes :

### Règle 1 : Non-régression et préservation des fonctionnalités existantes
- Lors de l'ajout d'une fonctionnalité ou de la correction d'une anomalie, **il est formellement interdit de modifier ou d'altérer un comportement fonctionnel existant**, sauf demande explicite de l'utilisateur.
- Toutes les pages, modales, animations sonores et flux d'interface (achat de booster, affichage du classeur, casino, marché, échanges) doivent rester opérationnels et conformes aux styles établis.

### Règle 2 : Intégrité et synchronisation stricte de l'état joueur
- Toute mutation modifiant l'inventaire des cartes, le solde en Wikithunes, les favoris ou les statistiques doit impérativement respecter la parité entre la persistance locale ([`userStorage.js`](file:///c:/Users/elisi/Documents/Projet/WikiCards/src/services/userStorage.js)) et le serveur ([`apiHandler.js`](file:///c:/Users/elisi/Documents/Projet/WikiCards/server/apiHandler.js)).
- La protection anti-écrasement (`isAccountStateNewer` / vérification des timestamps et des tirages totaux) ne doit jamais être contournée afin d'empêcher qu'un appareil obsolète n'écrase une session plus récente.

### Règle 3 : Modularité et dimensionnement équilibré des composants (Cible 250-350 lignes)
- **Les composants React (`.jsx`) visent une cible souple de 250 à 350 lignes.**
- Le découpage doit toujours se faire par **onglet ou bloc logique cohérent** (sous-vues, modales, formulaires dédiés) afin d'éviter toute sur-fragmentation artificielle qui nuirait à la lisibilité.
- Les custom hooks (`src/hooks/`), utilitaires et services peuvent dépasser cette limite lorsqu'ils encapsulent un domaine métier complet, des effets de bord asynchrones ou la gestion d'état d'un sous-système.
- La logique de calcul pure doit être déportée dans `src/utils/` ou `src/config/`.

---

## 4. Workflow de Validation & Auto-Commit Git

À la fin de **CHAQUE** modification ou fonctionnalité demandée par l'utilisateur, respecter obligatoirement le protocole suivant :

1. **Intégrité documentaire** : Vérifier que tous les fichiers créés ou modifiés possèdent leur en-tête de 3 lignes (`Rôle`, `Dépendances`, `Effets de bord`) et leurs annotations JSDoc à jour.
2. **Contrôle statique (`oxlint`)** : Exécuter obligatoirement `cmd /c npx oxlint` (doit retourner **0 erreur**).
3. **Compilation de production (`build`)** : Exécuter obligatoirement `cmd /c npm run build` (doit compiler avec succès).
4. **Intégrité du stockage local** : Vérifier qu'aucun fichier temporaire (`.tmp`) ni aucune donnée ou compte de test parasite ne subsiste dans `data/users/` ou `data/`.
5. **Auto-commit Git local** :
   - Si et seulement si `oxlint` et `build` sont 100% verts, localiser le binaire Git de GitHub Desktop :
     `$gitExe = (Resolve-Path "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe" | Select-Object -Last 1).Path`
   - Exécuter automatiquement :
     `& $gitExe add -A`
     `& $gitExe commit -m "<type>: <description claire en français>"` (ex: `feat: ...`, `fix: ...`, `refactor: ...`).
6. **Contrôle utilisateur sur le Push** :
   - **Ne JAMAIS exécuter `git push`** en ligne de commande.
   - L'utilisateur conserve le contrôle exclusif de la synchronisation distante en cliquant sur « Push » dans GitHub Desktop.

