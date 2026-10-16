# 🃏 WikiCards — Le Jeu de Cartes Wikipédia

Une application web moderne, minimaliste en **mode clair et glassmorphisme**, inspirée du concept de *wikimasters* mais repensée sans ses défauts (exit les points d'attaque/défense inutiles, focus sur la culture générale, l'élégance visuelle et le plaisir de collectionner).

---

## ✨ Fonctionnalités Clés

### 1. 🎴 Système de Cartes & Raretés
Chaque carte est générée à partir d'une véritable page **Wikipédia**. Sa rareté dépend directement du **nombre réel de visiteurs uniques sur les 30 derniers jours** (via l'API Wikimedia REST) :

| Badge | Nom Fun (Par défaut) | Nom Classique | Seuil de Vues (30j) | Style & Finition Visuelle |
| :---: | :--- | :--- | :--- | :--- |
| **C** | **Nul à chier** | Commun | `< 50 vues` | Style verre dépoli ardoise, badge neutre |
| **PC** | **Connu par sa daronne** | Peu Commun | `50 à 249 vues` | Teinte émeraude, lueur végétale douce |
| **R** | **Ça commence à causer** | Rare | `250 à 999 vues` | Verre saphir brillant, reflet métallisé |
| **SR** | **Banger Certifié** | Super Rare | `1 000 à 4 999 vues` | Foil holographique cosmique améthyste |
| **UR** | **Masterclass Absolue** | Ultra Rare | `5 000 à 19 999 vues` | Flamme rubis brillante, étincelles dorées |
| **L** | **Légende Vivante** | Légendaire | `20 000+ vues` | Dorure or 24 carats, arc-en-ciel prismatique, confettis |

> 🔄 **Toggle d'humour :** Un bouton dans la barre supérieure permet d'alterner à tout moment entre les **noms fun** et les **noms classiques**.

### 2. 🧠 Focus sur la Culture (Adieu les stats inutiles)
- ❌ **Supprimé :** Pas d'attaque, de défense ou de PV arbitraires.
- ✅ **Mis en avant :**
  - Image de qualité liée à l'article Wikipédia.
  - Résumé textuel riche et soigné pour développer sa culture générale.
  - Compteur de vues mensuelles réelles.
  - Bouton direct **"Wikipédia ↗"** pour consulter l'article complet.
  - Inclinaison 3D interactive au survol de la souris avec reflet dynamique.

### 3. 📦 Ouverture de Boosters Interactive
- Booster 3D métallisé avec animation d'ouverture et son de déchirement.
- Tirage de 5 cartes face cachée.
- Retournement carte par carte avec carillon sonore adapté à la rareté.
- Bouton *"Tout retourner"* disponible.
- Effet d'explosion de confettis pour les cartes *Ultra Rare* et *Légendaire*.
- Badge *"Nouvelle !"* ou compteur d'exemplaires (`x2`, `x3`) si déjà possédée.
- 2 modes d'ouverture au choix :
  - **Booster Équilibré (TCG)** : Expérience standard avec tirages aléatoires et carte rare/légendaire garantie dans le dernier slot.
  - **100% Aléatoire en Direct** : Interroge l'API `random/summary` de Wikipédia en temps réel avec calcul des vues en direct.

### 4. 📚 Zone "Classeur" (Collection)
- Vue d'ensemble de toutes les cartes débloquées.
- Statistiques de complétion (cartes uniques, exemplaires totaux, boosters ouverts).
- Filtres instantanés par rareté et favoris.
- Barre de recherche textuelle (titre et résumé).
- Tri avancé (rareté, vues mensuelles, date d'obtention, alphabétique).
- **Modal d'inspection approfondie** :
  - Admirez la carte en grand format 3D.
  - Lisez l'intégralité du résumé encyclopédique.
  - Bouton pour copier le résumé et le partager.
  - Navigation par flèches gauche/droite entre les cartes.

### 5. 💾 100% Local (Sans base de données)
- Sauvegarde automatique continue dans le `localStorage` du navigateur.
- Bouton d'export de votre classeur en fichier JSON (sauvegarde).
- Bouton d'import pour restaurer votre collection sur un autre appareil.
- Bouton de réinitialisation sécurisé avec confirmation.

---

## 🚀 Lancement Rapide

Le serveur de développement est actuellement lancé :
```powershell
# Pour relancer ultérieurement :
npx vite --port 5173
```
Accédez au site à l'adresse : **[http://localhost:5173](http://localhost:5173)**
