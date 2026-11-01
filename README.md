# 🃏 WikiCards — Le Jeu de Cartes Wikipédia

Une application web immersive et communautaire qui transforme l'encyclopédie libre **Wikipédia** en un véritable **jeu de cartes à collectionner (TCG)**. Chaque carte représente un véritable article encyclopédique dont la rareté, les reflets et les finitions visuelles sont déterminés par son **audience réelle sur les 30 derniers jours**.

Conçue avec un respect méticuleux de l'identité visuelle de **Wikipédia (thème officiel Vector 2022)**, l'application associe l'élégance sobre de l'encyclopédie au plaisir d'ouvrir des boosters de cartes physiques, d'échanger avec ses amis, de parier au casino et de bâtir la collection ultime.

---

## 🌟 Points Forts & Concept

- 🌐 **100 % Direct Wikipédia** : Tirage d'articles réels en direct via l'API MediaWiki et calcul d'audience via l'API officielle Wikimedia Pageviews.
- 📈 **Rareté Fondée sur la Fréquentation Réelle** : Fini les statistiques de combat artificielles. La valeur d'une carte dépend du nombre réel de lecteurs du sujet sur les 30 derniers jours.
- 📦 **Simulation de Booster Ultra-Réaliste** : Sachet métallisé thermoscellé en 3D, animation de déchirure, ouverture carte par carte et suspense garanti.
- 🔊 **Moteur Sonore Procédural (Web Audio API)** : Effets sonores cristallins (froissement de sachet, glissement de carte, clics de roulette, fanfare) générés mathématiquement en temps réel sans télécharger de fichiers MP3.
- 🎰 **Le WikiSino (3 Mini-Jeux Intégrés)** :
  - **L'Upgrader** : Sacrifiez une carte pour tenter d'obtenir une carte de rareté supérieure via une jauge circulaire de probabilité.
  - **Le Plus ou Moins** : Devinez si l'article suivant a plus ou moins de visiteurs pour accumuler une série de multiplicateurs de Wikithunes.
  - **Le Quitte ou Double (1 à 8 cartes)** : Misez jusqu'à 8 cartes en même temps, chacune dotée de sa propre roue animée à décélération échelonnée pour tenter de doubler vos exemplaires.
- 🤝 **Multijoueur & Communauté** :
  - **Code Unique (`WIKI-XXXX`)** : Connexion instantanée sans mot de passe, sauvegarde persistante sur le serveur.
  - **Place de Marché d'Enchères** : Mettez vos cartes aux enchères sur 24h ou fixez un prix d'achat immédiat.
  - **Échanges de Cartes** : Proposez des échanges directs de cartes à n'importe quel joueur de la communauté.
- ♻️ **Économie & Recyclage** : Recyclez vos doublons contre des **Wikithunes (₩)** et récupérez un bonus quotidien de 250 ₩ par jour.
- 🌓 **Mode Clair par Défaut & Mode Sombre Synchronisé** : Thème clair fidèle à Wikipédia de base, avec mode sombre activable sauvegardé directement sur votre profil joueur.
- 🍓 **Prêt pour Docker, Coolify & Raspberry Pi** : Empreinte RAM ultra-légère (< 50 Mo), zéro dépendance native C/C++, déploiement en 1 clic.

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

> 💡 **Cartes GIF Métal (.gif)** : Les articles Wikipédia comportant une image animée GIF bénéficient d'un badge spécial et d'une valeur de recyclage triplée (`×3`).

---

## 🎮 Les Modes de Jeu & Fonctionnalités

### 1. 📦 L'Ouverture de Booster
- Sachet métallisé 3D interactif avec encoche *"Déchirer ici"*.
- Révélation progressive des 5 cartes dans l'ordre croissant de popularité pour réserver la meilleure carte à la fin.
- Préchargement intelligent du booster suivant pour un enchaînement fluide sans temps d'attente.

### 2. 📚 Le Classeur & La Gestion de Collection
- Grille responsive au format compact fidèle aux vignettes Wikipédia.
- **Mode Recyclage** : Sélectionnez vos doublons pour les convertir en Wikithunes. Les cartes uniques et les favoris sont automatiquement protégés contre le recyclage accidentel.
- **Système de Favoris** : Vos cartes marquées d'une étoile restent épinglées en tête de classeur.
- **Filtres & Tris** : Par rareté (L, UR, SR, R, PC, C), par thématiques encyclopédiques (Histoire, Sciences, Géographie, etc.), par nombre de vues, ordre alphabétique, cartes GIF ou doublons.

### 3. 🎰 Le WikiSino
- **L'Upgrader** : Tentez d'élever une carte d'un rang de rareté (Commun → Peu Commun → Rare → Super Rare → Ultra Rare). Une jauge circulaire indique précisément les chances de réussite.
- **Le Plus ou Moins** : Choisissez votre mise (50 ₩, 100 ₩, 250 ₩, 500 ₩) et devinez si la carte masquée compte plus ou moins de visiteurs que la précédente pour faire grimper vos gains.
- **Le Quitte ou Double** : Sélectionnez de 1 à 8 cartes d'une même rareté. Chaque carte bénéficie de sa propre roue indépendante avec arrêt échelonné et résultat sans spoiler.

### 4. 🏛️ Le Marché aux Enchères & Échanges
- Créez des ventes aux enchères d'une durée de 24h avec prix de départ et option d'achat immédiat.
- Proposez des échanges de cartes d'égal à égal à vos amis grâce à leur identifiant `WIKI-XXXX`.

### 5. 👤 Profil Joueur & Personnalisation
- **Photo de profil dynamique** : Choisissez comme avatar l'illustration de n'importe quelle carte présente dans votre classeur.
- **Vitrine** : Exposez jusqu'à 4 de vos plus belles cartes en vedette sur votre profil public.
- **Suppression de compte intégrée** : Modal officiel conforme aux règles de confirmation Wikipédia pour réinitialiser ses données en toute autonomie.

---

## 🛠️ Stack Technique

| Domaine | Technologies |
| :--- | :--- |
| **Framework & UI** | [React 19](https://react.dev/) + [Vite 8](https://vite.dev/) |
| **Styles & Design** | [Tailwind CSS v4](https://tailwindcss.com/) + Charte officielle Vector 2022 (MediaWiki) |
| **Animations & 3D** | [Framer Motion](https://www.framer.com/motion/) + CSS 3D Transforms |
| **Effets Particules** | [Canvas Confetti](https://github.com/catdad/canvas-confetti) |
| **Icônes** | [Lucide React](https://lucide.dev/) |
| **Audio** | Web Audio API native (synthèse procédurale 100 % synthétique) |
| **Serveur Backend** | Serveur HTTP natif Node.js (zéro dépendance lourde) |
| **Stockage & Base** | Fichiers JSON locaux structurés (facilement montables en volume Docker) |
| **APIs Externes** | API MediaWiki (`action=query&list=random`) + Wikimedia REST API (`/page/summary` & `/metrics/pageviews`) |

---

## 📁 Architecture du Projet

```text
WikiCards/
├── data/                       # Stockage persistant (utilisateurs, marché, échanges)
│   └── users/                  # Fichiers JSON des comptes (ex: WIKI-4GU5.json)
├── server/
│   └── apiHandler.js           # API REST (/api/users, /api/trades, /api/market)
├── src/
│   ├── components/
│   │   ├── AuthGateway.jsx     # Écran de connexion / création par Code Unique
│   │   ├── BoosterOpening.jsx  # Booster 3D, déchirure et tirage animé
│   │   ├── WikiCard.jsx        # Carte (tilt 3D, reflets foil, badge de rareté)
│   │   ├── WikiHeader.jsx      # En-tête officiel Vector 2022
│   │   ├── WikiSino.jsx        # Hub du Casino et jeu de l'Upgrader
│   │   ├── HigherLowerGame.jsx # Jeu du Plus ou Moins (séries de cotes)
│   │   ├── DoubleOrNothingGame.jsx # Quitte ou Double (multi-roues 1 à 8 cartes)
│   │   ├── SocialHub.jsx       # Réseau communautaire et propositions d'échanges
│   │   ├── AuctionMarket.jsx   # Place de marché et système d'enchères
│   │   ├── UserProfile.jsx     # Profil joueur, vitrine et gestion du compte
│   │   └── WikithuneIcon.jsx   # Symbole de la monnaie virtuelle (₩)
│   ├── config/
│   │   ├── rarities.js         # Paliers de rareté, taux de tirage, économie
│   │   └── themes.js           # Détection thématique des articles (Histoire, Sciences...)
│   ├── services/
│   │   ├── sound.js            # Moteur sonore Web Audio API
│   │   ├── userStorage.js      # Synchronisation compte et stockage local
│   │   └── wikipedia.js        # Client API MediaWiki et Wikimedia Pageviews
│   ├── App.jsx                 # Orchestration globale
│   ├── index.css               # Styles Vector 2022 et Tailwind CSS v4
│   └── main.jsx                # Point d'entrée React
├── Dockerfile                  # Image Docker multi-stage (ARM64 & AMD64)
├── .dockerignore               # Fichiers exclus du build Docker
├── server.js                   # Serveur HTTP Node.js de production (SPA + API)
├── vite.config.js              # Configuration Vite
├── package.json
└── README.md
```

---

## 🚀 Installation & Démarrage en Local

### Prérequis
- [Node.js](https://nodejs.org/) (version 18 ou supérieure)
- `npm` (ou `pnpm` / `yarn`)

### 1. Installation des dépendances
```bash
npm install
```

### 2. Lancer en mode développement (Vite)
```bash
npm run dev
```
Accès par défaut sur : **[http://localhost:5173](http://localhost:5173)**.

### 3. Lancer en mode production (Serveur complet Frontend + API)
```bash
# 1. Compiler le bundle
npm run build

# 2. Démarrer le serveur HTTP autonome
npm start
```
Accès par défaut sur : **[http://localhost:3000](http://localhost:3000)**.

---

## 🍓 Déploiement avec Coolify / Docker (Raspberry Pi & Serveur Privé)

Le projet intègre un [`Dockerfile`](./Dockerfile) optimisé en multi-stage basé sur `node:20-alpine`. Il compile nativement sur architecture **ARM64** (Raspberry Pi 3, 4, 5) et **x86_64** (PC/Serveur Cloud), sans nécessiter de compilation C/C++ ni `node-gyp`.

### Déploiement en 1 clic sur Coolify

1. Dans **Coolify**, cliquez sur **+ Create New Resource** → **Git Repository**.
2. Renseignez l'URL de votre dépôt GitHub public.
3. Type de build : **Dockerfile** (détecté automatiquement).
4. Port exposé : `3000`.

### ⚠️ Point Clé : Le Volume Persistant (Pour ne jamais perdre les données)

Lors des mises à jour ou des redéploiements, le container Docker est recréé. Pour préserver les cartes, les comptes et les enchères de vos joueurs :

1. Dans les réglages de votre application Coolify, allez dans l'onglet **Storages** (ou **Persistent Volumes**).
2. Ajoutez un nouveau montage :
   - **Destination Path** : `/app/data`
   - **Source / Volume Name** : `wikicards-data`
3. Cliquez sur **Deploy** !

Toutes les données de vos joueurs seront ainsi conservées en toute sécurité sur votre Raspberry Pi ou serveur hôte.

---

### Déploiement manuel avec Docker CLI

```bash
# Construire l'image Docker
docker build -t wikicards .

# Lancer le container avec volume persistant
docker run -d \
  -p 3000:3000 \
  -v wikicards_data:/app/data \
  --name wikicards \
  --restart unless-stopped \
  wikicards
```

---

## 📜 Droits d'Auteur & Mentions Légales

- **Contenus encyclopédiques** : Les textes, extraits et photographies proviennent des contributeurs de [Wikipédia](https://fr.wikipedia.org) et sont disponibles sous licences libres ([Creative Commons BY-SA](https://creativecommons.org/licenses/by-sa/4.0/) et [GFDL](https://www.gnu.org/licenses/fdl-1.3.html)).
- **Marque Wikipédia** : WIKIPEDIA et les logos associés sont des marques déposées de la [Wikimedia Foundation](https://wikimediafoundation.org/). WikiCards est un projet indépendant à but récréatif et éducatif, non affilié à la Wikimedia Foundation.
