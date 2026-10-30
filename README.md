# 🃏 WikiCards — Le Jeu de Cartes Wikipédia

Une application web immersive qui transforme l'encyclopédie libre **Wikipédia** en un véritable **jeu de cartes à collectionner (TCG)**. Chaque carte représente une véritable page encyclopédique dont la rareté, les reflets et les finitions visuelles sont déterminés par son **audience réelle sur les 30 derniers jours**.

Conçue avec un profond respect de l'identité visuelle de **Wikipédia (thème Vector 2022)**, l'application associe l'élégance sobre de l'encyclopédie au plaisir addictif d'ouvrir des boosters de cartes physiques.

---

## 🌟 Points Forts & Concept

- 🌐 **100 % Direct Wikipédia** : Tirage d'articles réels en direct via l'API MediaWiki et calcul d'audience via l'API officielle Wikimedia Pageviews.
- 📈 **Rareté Fondée sur la Fréquentation Réelle** : Fini les statistiques de combat artificielles (PV, attaque, défense). La valeur d'une carte dépend du nombre réel de lecteurs du sujet.
- 📦 **Simulation de Booster Ultra-Réaliste** : Sachet métallisé thermoscellé en 3D, animation de déchirure, ouverture carte par carte et suspense garanti.
- 🔊 **Moteur Sonore Procédural (Web Audio API)** : Effets audio cristallins (froissement de sachet, glissement de carte, accords musicaux par rareté) générés en temps réel sans téléchargement de fichiers MP3.
- 🔑 **Code Unique & Sauvegarde Cloud Légère** : Connexion par Code Unique (`WIKI-XXXX`) sauvegardant votre profil, vos Wikithunes et votre collection.
- 🎰 **Le WikiSino & Marché Multijoueur** : Mini-jeux de casino (Roulette, Machine à sous, Quitte ou Double) et place de marché d'enchères entre joueurs.

---

## 🎴 Système de Raretés & Barème Wikimedia

La rareté est calculée automatiquement à partir de la somme consolidée des visiteurs uniques sur **30 jours glissants** (via l'API Wikimedia REST Metrics) :

| Rareté | Sigle | Vues mensuelles (30j) | Taux de tirage | Finition & Habillage visuel |
| :--- | :---: | :--- | :---: | :--- |
| **Commun** | `C` | Moins de 50 vues | **52 %** | Teinte émeraude douce, reflets pastel |
| **Peu Commun** | `PC` | De 50 à 249 vues | **30 %** | Dégradé azur saphir, lueur douce |
| **Rare** | `R` | De 250 à 999 vues | **12 %** | Améthyste violette, halo lumineux |
| **Super Rare** | `SR` | De 1 000 à 4 999 vues | **4,2 %** | Dégradé rubis rosé, premier niveau d'effet holographique (*foil*) |
| **Ultra Rare** | `UR` | De 5 000 à 19 999 vues | **1,5 %** | Cuivre et ambre ardent, étincelles et confettis au tirage |
| **Légendaire** | `L` | **20 000 vues et +** | **0,3 %** | Dorure or 24 carats, onde topographique solaire, éclat prismatique et pluie de confettis |

> 💡 **Le Saviez-vous ?** Les cartes d'un booster sont automatiquement révélées dans l'ordre croissant de popularité afin de réserver le meilleur tirage pour la 5ᵉ et dernière carte.

---

## ✨ Fonctionnalités Détaillées

### 1. 📦 Expérience d'Ouverture de Booster
- **Sachet 3D réaliste** : Texture thermo-scellée avec relief d'encoche *"Déchirer ici"*, dégradé bombé façon emballage physique et reflet lumineux au survol.
- **Déchirure interactive** : Animation de séparation du haut du sachet avec faisceau lumineux et bruit de déchirure métallisée.
- **Préchargement intelligent** : Le booster suivant est discrètement préchargé en arrière-plan pour un lancement instantané sans temps de chargement perceptible.
- **Révélation progressive** : Découverte carte par carte (avec son et confettis pour les cartes UR et Légendaires) ou bascule rapide vers la vue récapitulative.
- **Indicateurs de découverte** : Pastille *"Nouveau !"* pour les cartes inédites et compteur d'exemplaires (`×2`, `×3`...) pour les doublons.

### 2. 🎴 Anatomie des Cartes WikiCards
- **Photographie ou globe officiel** : Image d'illustration haute définition issue de Wikipédia, avec bascule automatique vers le globe Wikipédia en cas d'absence d'illustration.
- **Extrait encyclopédique soigné** : Formatage automatique assurant des phrases complètes (pas de coupure disgracieuse en plein mot) avec typographie ajustée.
- **Reflet 3D Tilt dynamique** : Inclinaison fluide selon la position du curseur et reflet spéculaire dynamique.
- **Reflets holographiques (Foil)** : Finition métallisée mouvante réservée aux rangs *Super Rare*, *Ultra Rare* et *Légendaire*.
- **Accès direct** : Bouton *"Lire sur Wikipédia ↗"* pour plonger directement au cœur de l'article encyclopédique.

### 3. 📚 Classeur & Gestion de la Collection
- **Grille adaptée** : Affichage optimisé à 4 cartes par ligne en format compact avec maintien de la perspective 3D.
- **Épinglage des Favoris** : Système de mise en favori (icône étoile). Les cartes favorites restent toujours épinglées en première position dans le classeur.
- **Filtres par rareté** : Boutons de filtrage rapide (Toutes, L, UR, SR, R, PC, C) avec compteur dynamique de cartes possédées pour chaque palier.
- **Recherche plein texte** : Intégrée au champ de recherche officiel du bandeau pour filtrer simultanément sur les titres et résumés.
- **Tris multiples** :
  - Rareté (de la plus rare à la plus commune)
  - Nombre de vues (décroissant ou croissant)
  - Date d'obtention (plus récentes d'abord)
  - Ordre alphabétique (A → Z)
  - Nombre d'exemplaires (doublons)
- **Tableau de bord statistique** : Suivi en direct du nombre d'articles uniques, du total d'exemplaires collectés et du nombre de boosters ouverts.

### 4. 🔊 Moteur Sonore Procédural (Web Audio API)
- Aucun fichier MP3 externe n'est téléchargé.
- Synthèse par oscillateurs et modulation de bruits blancs filtrés :
  - Froissement et déchirement de l'emballage métallisé.
  - Glissement et frottement des cartes papier.
  - Carillons et accords harmoniques modulés selon la rareté révélée.
  - Fanfare de synthèse au récapitulatif du booster.
- Contrôle muet / son activé persistant, accessible dans le menu déroulant *Outils* (⋮).

### 5. 💾 Stockage 100 % Local & Sans Serveur
- Sauvegarde continue dans le `localStorage` de votre navigateur (cartes, doublons, favoris, statistiques).
- **Export JSON** : Exportez votre classeur pour sécuriser votre collection ou la partager.
- **Import JSON** : Restaurez instantanément vos cartes sur un autre navigateur ou appareil.
- **Réinitialisation sécurisée** : Double confirmation pour éviter toute perte accidentelle de données.

---

## 🛠️ Stack Technique

| Domaine | Technologies |
| :--- | :--- |
| **Framework & UI** | [React 19](https://react.dev/) + [Vite 8](https://vite.dev/) |
| **Styles & Design** | [Tailwind CSS v4](https://tailwindcss.com/) + Charte officielle Vector 2022 (MediaWiki) |
| **Animations & 3D** | [Framer Motion](https://www.framer.com/motion/) + CSS 3D Transforms |
| **Effets Particules** | [Canvas Confetti](https://github.com/catdad/canvas-confetti) |
| **Icônes** | [Lucide React](https://lucide.dev/) |
| **Audio** | Web Audio API native (synthèse procédurale) |
| **APIs Externes** | API MediaWiki (`action=query&list=random`) + Wikimedia REST API (`/page/summary` & `/metrics/pageviews`) |
| **Qualité de code** | [Oxlint](https://oxc.rs/) |

---

## 📁 Architecture du Projet

```text
WikiCards/
├── data/                   # Données multijoueur (marché, échanges, utilisateurs)
├── server/
│   └── apiHandler.js       # Logique API REST (/api/users, /api/trades, /api/market)
├── src/
│   ├── components/
│   │   ├── AuthGateway.jsx     # Écran de connexion / création par Code Unique
│   │   ├── BoosterOpening.jsx  # Booster 3D, déchirure et tirage animé
│   │   ├── WikiCard.jsx        # Carte (tilt 3D, reflets foil, badge de rareté)
│   │   ├── WikiHeader.jsx      # En-tête officiel Vector 2022
│   │   ├── WikiSino.jsx        # Casino (Roulette, Machine à sous, Quitte ou double)
│   │   ├── SocialHub.jsx       # Réseau communautaire et propositions d'échanges
│   │   ├── AuctionMarket.jsx   # Place de marché et système d'enchères
│   │   └── UserProfile.jsx     # Profil joueur, vitrine de collection et statistiques
│   ├── config/
│   │   ├── rarities.js     # Paliers de rareté, taux de tirage, économie
│   │   └── themes.js       # Détection thématique des articles (Histoire, Sciences...)
│   ├── services/
│   │   ├── sound.js        # Moteur sonore Web Audio API
│   │   ├── userStorage.js  # Gestion des comptes, profil et synchronisation API
│   │   └── wikipedia.js    # Client API MediaWiki et Wikimedia Pageviews
│   ├── App.jsx             # Orchestration globale
│   ├── index.css           # Styles Vector 2022 et Tailwind CSS v4
│   └── main.jsx            # Point d'entrée React
├── server.js               # Serveur HTTP Node.js autonome pour la production
├── vite.config.js          # Configuration Vite (dev server & build)
└── README.md
```

---

## 🚀 Installation & Démarrage

### Prérequis
- [Node.js](https://nodejs.org/) (version 18 ou supérieure)
- Un gestionnaire de paquets (`npm`, `pnpm` ou `yarn`)

### 1. Installation des dépendances
```bash
npm install
```

### 2. Lancer en mode développement (Vite)
```bash
npm run dev
```
Par défaut, l'application est accessible sur : **[http://localhost:5173](http://localhost:5173)**.

### 3. Lancer en production (Serveur complet Frontend + API Multijoueur)
```bash
# 1. Compiler le bundle de production
npm run build

# 2. Démarrer le serveur Node de production
npm start
```
L'application démarre sur **[http://localhost:3000](http://localhost:3000)** (ou sur le port spécifié par la variable d'environnement `PORT`).

---

## 🌐 Déploiement & Hébergement

### Option A : Hébergement avec serveur (Render, Railway, VPS, Raspberry Pi)
Permet de profiter de toutes les fonctionnalités, y compris le **multijoueur** (marché d'enchères et échanges de cartes entre joueurs différents) :
- **Render (Gratuit)** : Créez un nouveau *Web Service*, connectez votre dépôt GitHub.
  - *Build Command* : `npm run build`
  - *Start Command* : `npm start`
- **Railway / Fly.io / VPS / Raspberry Pi** : Cloner le dépôt et exécuter `npm install && npm run build && npm start`.

### Option B : Hébergement statique (GitHub Pages, Vercel, Netlify)
Permet d'héberger le frontend gratuitement :
- *Build Command* : `npm run build`
- *Output Directory* : `dist`
- Les fonctionnalités solo (boosters, classeur, WikiSino, bourse quotidienne) fonctionnent directement avec l'API publique de Wikipédia et le stockage local de votre navigateur.

---

## 📜 Droits d'Auteur & Mentions Légales

- **Contenus encyclopédiques** : Les textes, extraits et photographies proviennent des contributeurs de [Wikipédia](https://fr.wikipedia.org) et sont disponibles sous licences libres ([Creative Commons BY-SA](https://creativecommons.org/licenses/by-sa/4.0/) et [GFDL](https://www.gnu.org/licenses/fdl-1.3.html)).
- **Marque Wikipédia** : WIKIPEDIA et les logos associés sont des marques déposées de la [Wikimedia Foundation](https://wikimediafoundation.org/). WikiCards est un projet indépendant à but récréatif et éducatif, non affilié à la Wikimedia Foundation.
