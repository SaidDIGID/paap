# PAAP Frontend - Pipeline As A Product

Interface Angular moderne pour créer et gérer des pipelines CI/CD pour GitHub Actions et GitLab CI.

## 🚀 Fonctionnalités

- ✅ Sélection du provider (GitHub Actions / GitLab CI)
- ✅ Navigation et sélection des steps disponibles
- ✅ Gestion des versions des steps
- ✅ Construction visuelle du pipeline avec drag & drop
- ✅ Prévisualisation du pipeline YAML généré
- ✅ Export direct vers GitHub/GitLab avec création de PR/MR
- ✅ Téléchargement local du fichier de pipeline
- ✅ Interface responsive et moderne

## 📋 Prérequis

- Node.js 18+ et npm
- Backend API tournant sur `http://localhost:7005`

## 🛠️ Installation

```bash
# Installer les dépendances
npm install
```

## 🏃 Lancement

```bash
# Démarrer le serveur de développement
npm start

# L'application sera accessible sur http://localhost:4200
```

## 📦 Build

```bash
# Build pour la production
npm run build

# Les fichiers seront générés dans le dossier dist/
```

## 🎯 Utilisation

### 1. Sélectionner le Provider
Choisissez entre GitHub Actions ou GitLab CI selon votre plateforme.

### 2. Ajouter des Steps
- Sélectionnez un step dans la liste déroulante
- Choisissez la version
- Cliquez sur "Add Step to Pipeline"
- Répétez pour ajouter plusieurs steps

### 3. Organiser les Steps
- Utilisez les flèches ↑↓ pour réorganiser l'ordre
- Utilisez 🗑️ pour supprimer un step

### 4. Générer le Pipeline
- Cliquez sur "🚀 Generate Pipeline"
- Le YAML sera affiché dans le panneau de prévisualisation

### 5. Exporter
**Option A: Téléchargement**
- Cliquez sur "💾 Download" pour télécharger le fichier YAML

**Option B: Export direct**
- Cliquez sur "📤 Export"
- Renseignez vos credentials:
  - **GitHub**: Token + Owner + Repository Name
  - **GitLab**: Token + Project ID
- Configurez les options (branch, message, PR/MR)
- Cliquez sur "Export"

## 🔌 Configuration API

L'URL de l'API backend est configurée dans:
- `src/environments/environment.ts` (développement)
- `src/environments/environment.prod.ts` (production)

Par défaut: `http://localhost:7005`

## 🏗️ Structure du Projet

```
paap-frontend/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   └── pipeline-builder/        # Composant principal
│   │   ├── services/
│   │   │   ├── api.service.ts           # Communication avec l'API
│   │   │   └── pipeline-state.service.ts # Gestion de l'état
│   │   ├── app.component.*              # Composant racine
│   │   ├── app.config.ts                # Configuration Angular
│   │   └── app.routes.ts                # Routing
│   ├── environments/                     # Configuration environnements
│   ├── index.html
│   ├── main.ts
│   └── styles.scss
├── angular.json
├── package.json
└── tsconfig.json
```

## 🎨 Design

- **Framework CSS**: Custom SCSS avec design moderne
- **Palette de couleurs**: Gradient violet/rose
- **Responsive**: Adapté mobile et desktop
- **Animations**: Transitions fluides et micro-interactions

## 🔧 Technologies

- **Angular 17** (Standalone Components)
- **RxJS** pour la gestion réactive
- **TypeScript** strict mode
- **SCSS** pour les styles
- **HttpClient** pour les appels API

## 📝 API Backend Utilisées

- `GET /health` - Health check
- `GET /steps` - Liste des steps
- `GET /steps/:id/versions` - Versions d'un step
- `GET /steps/:id/:version` - Détails d'un step
- `POST /pipeline/render` - Génération du pipeline
- `POST /pipeline/export` - Export vers GitHub/GitLab

## 🐛 Debugging

Si le backend n'est pas accessible:
- Vérifiez que le backend tourne sur le port 7005
- Regardez le status de connexion dans le header (Connected/Disconnected)
- Ouvrez la console du navigateur pour voir les erreurs

## 🔐 Sécurité

⚠️ **Important**: Ne commitez jamais vos tokens d'accès!
- Les tokens sont utilisés uniquement côté client
- Aucun token n'est stocké
- Utilisez des tokens avec les permissions minimales nécessaires

## 📄 License

MIT

## 👨‍💻 Développement

Pour contribuer:
1. Fork le projet
2. Créez une branche feature
3. Commitez vos changements
4. Pushez sur la branche
5. Ouvrez une Pull Request

---

Développé avec ❤️ pour simplifier la création de pipelines CI/CD
