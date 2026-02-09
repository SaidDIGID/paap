# 🚀 Guide de Déploiement PAAP Frontend

## Installation Rapide

### 1. Cloner et Installer

```bash
cd paap-frontend
npm install
```

### 2. Vérifier le Backend

Assurez-vous que votre backend est en cours d'exécution:

```bash
# Dans le dossier backend
npm start
# Le backend devrait être sur http://localhost:7005
```

### 3. Lancer le Frontend

```bash
npm start
```

L'application sera disponible sur **http://localhost:4200**

## 🔧 Configuration

### Modifier l'URL de l'API

Éditez `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://votre-api-url:port'
};
```

## 📦 Build Production

```bash
# Build optimisé
npm run build

# Les fichiers seront dans dist/paap-frontend/
```

### Déploiement sur un serveur web

```bash
# Servir les fichiers statiques avec nginx, Apache, etc.
# Exemple avec un serveur HTTP simple:
npx http-server dist/paap-frontend -p 8080
```

## 🐳 Docker (Optionnel)

Créez un `Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist/paap-frontend /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Créez un `nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:7005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Build et run:

```bash
docker build -t paap-frontend .
docker run -p 8080:80 paap-frontend
```

## 🌐 Déploiement Cloud

### Vercel

```bash
npm i -g vercel
vercel
```

### Netlify

```bash
npm i -g netlify-cli
netlify deploy
```

### Firebase Hosting

```bash
npm i -g firebase-tools
firebase init hosting
firebase deploy
```

## 🔑 Variables d'Environnement

Pour la production, créez `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://votre-api-production.com'
};
```

## 🧪 Tests

```bash
# Tests unitaires
npm test

# Tests e2e (si configurés)
npm run e2e
```

## 📊 Monitoring

Pour la production, considérez:
- Google Analytics
- Sentry pour le tracking d'erreurs
- LogRocket pour les sessions utilisateur

## 🔒 Sécurité

- ✅ Toujours utiliser HTTPS en production
- ✅ Configurer CORS correctement sur le backend
- ✅ Ne jamais exposer les tokens dans le code
- ✅ Utiliser des variables d'environnement
- ✅ Activer CSP (Content Security Policy)

## 🎯 Checklist Pré-Production

- [ ] Build de production testé
- [ ] Variables d'environnement configurées
- [ ] API backend accessible
- [ ] HTTPS activé
- [ ] CORS configuré
- [ ] Monitoring en place
- [ ] Tests passés
- [ ] Documentation à jour

## 🆘 Dépannage

### Le backend n'est pas accessible
```bash
# Vérifier que le backend tourne
curl http://localhost:7005/health

# Vérifier les CORS
# Ajouter dans votre backend Express:
app.use(cors({
  origin: 'http://localhost:4200'
}));
```

### Erreur de build
```bash
# Nettoyer le cache
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Port 4200 déjà utilisé
```bash
# Utiliser un autre port
ng serve --port 4300
```

## 📞 Support

Pour toute question ou problème:
1. Vérifier la console du navigateur
2. Vérifier les logs du backend
3. Consulter la documentation Angular
4. Ouvrir une issue sur GitHub

---

Bon déploiement ! 🚀
