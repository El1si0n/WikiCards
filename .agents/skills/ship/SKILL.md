---
name: ship
description: Vérifie le code (oxlint + build), contrôle la JSDoc et crée automatiquement un commit Git local propre prêt à être pushé dans GitHub Desktop.
---

# Skill : ship — Validation Qualité & Auto-Commit Git Local

Ce skill automatise la boucle de clôture après chaque modification de code pour WikiCards : validation statique, compilation, intégrité documentaire et création d'un commit Git local sécurisé sans push distant.

## Instructions d'exécution

### 1. Localisation du binaire Git embarqué par GitHub Desktop
Exécuter la résolution dynamique dans PowerShell pour cibler la version active de GitHub Desktop :
```powershell
$gitExe = (Resolve-Path "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe" | Select-Object -Last 1).Path
```

### 2. Inspection de l'état du dépôt
Vérifier les modifications en cours et les fichiers non suivis :
```powershell
& $gitExe status
```

### 3. Contrôle documentaire & Nettoyage de `data/`
- Vérifier que chaque fichier JavaScript/JSX créé ou modifié dispose de son en-tête de 3 lignes conforme à `GEMINI.md` :
  ```javascript
  /**
   * @file Rôle : ...
   * Dépendances : ...
   * Effets de bord : ...
   */
  ```
- Vérifier que les fonctions exportées et composants disposent de leur JSDoc `@param`, `@returns` ou `@typedef`.
- S'assurer qu'aucun fichier temporaire `.tmp` ne traîne dans `data/` et qu'aucun compte joueur de test (`WIKI-TEST-*`) n'est présent dans `data/users/`.

### 4. Validation statique et compilation de production
Exécuter impérativement les deux commandes de contrôle. Les deux doivent être strictement vertes :
```powershell
cmd /c npx oxlint
cmd /c npm run build
```
En cas d'erreur ou d'échec de compilation, corriger immédiatement avant de poursuivre.

### 5. Auto-Commit local
Indexer et créer le commit local avec un message conventionnel clair en français :
```powershell
& $gitExe add -A
& $gitExe commit -m "<type>: <description claire en français>"
```
*Exemples de types conventionnels :*
- `feat:` Nouvelle fonctionnalité (ex: `feat: ajout du filtre par thème`)
- `fix:` Correction d'un bug (ex: `fix: découpage complet des phrases dans WikiCard`)
- `refactor:` Refactorisation sans altération fonctionnelle (ex: `refactor: modularisation de server/`)
- `docs:` Documentation ou contrats d'architecture (ex: `docs: mise à jour de GEMINI.md`)

> [!IMPORTANT]
> **Ne JAMAIS faire de `git push`**. L'utilisateur conserve le contrôle exclusif de l'envoi vers le dépôt distant en cliquant sur le bouton « Push » dans l'interface GitHub Desktop.

### 6. Confirmation utilisateur
Indiquer à l'utilisateur :
- Le hash et le message du commit créé.
- Le statut des contrôles (`oxlint: 0 erreur`, `build: succès`).
- Qu'il peut cliquer sur **« Push »** dans GitHub Desktop pour synchroniser avec GitHub.
