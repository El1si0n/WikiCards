# Étape 1 : Construction du frontend avec Vite
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Étape 2 : Image de production ultra-légère (idéale pour Raspberry Pi / Coolify)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data

# Installation exclusive des dépendances nécessaires à l'exécution
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copie des fichiers compilés et du serveur API
COPY --from=builder /app/dist ./dist
COPY server.js ./
COPY server ./server

# Dossier pour les données persistantes (comptes, cartes, marché, échanges)
RUN mkdir -p /app/data/users

# Déclaration du volume pour la persistance des données sur Coolify / Docker
VOLUME /app/data

EXPOSE 3000

CMD ["node", "server.js"]
