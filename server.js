import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApiRequest } from './server/apiHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Empêche le processus de crasher en cas d'erreur asynchrone non interceptée
process.on('uncaughtException', (err) => {
  console.error('[WikiCards Server] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[WikiCards Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const server = http.createServer(async (req, res) => {
  // 1. Healthcheck Render & Coolify
  if (
    req.url === '/healthz' ||
    req.url === '/ping' ||
    req.url === '/health'
  ) {
    if (!res.headersSent) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('OK');
    }
    return;
  }

  // 2. API routes (/api/*)
  if (req.url && req.url.startsWith('/api/')) {
    try {
      await handleApiRequest(req, res);
    } catch (apiErr) {
      console.error('[WikiCards API Error]:', apiErr);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, error: 'Erreur serveur API' }));
      }
    }
    // Ne JAMAIS poursuivre l'exécution vers les fichiers statiques ou le fallback SPA pour une route API
    return;
  }

  // Sécurité headersSent avant traitement des fichiers statiques
  if (res.headersSent) return;

  // 3. Fichiers statiques depuis dist/
  if (!fs.existsSync(DIST_DIR)) {
    if (!res.headersSent) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(
        '<h1>WikiCards en cours d\'initialisation</h1><p>Veuillez d\'abord lancer <code>npm run build</code> avant de démarrer le serveur.</p>'
      );
    }
    return;
  }

  try {
    if (res.headersSent) return;

    const parsedUrl = new URL(
      req.url || '/',
      `http://${req.headers.host || 'localhost'}`
    );
    let reqPath = decodeURIComponent(parsedUrl.pathname);
    if (reqPath === '/') reqPath = '/index.html';

    let filePath = path.join(DIST_DIR, reqPath);
    if (!filePath.startsWith(DIST_DIR)) {
      if (!res.headersSent) {
        res.statusCode = 403;
        res.end('Accès interdit');
      }
      return;
    }

    // Si le fichier physique existe, on le sert
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      if (res.headersSent) return;
      const ext = path.extname(filePath).toLowerCase();
      res.setHeader(
        'Content-Type',
        MIME_TYPES[ext] || 'application/octet-stream'
      );
      // Cache-Control optimisé pour les assets hashés par Vite
      if (reqPath.startsWith('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      const stream = fs.createReadStream(filePath);
      stream.on('error', (streamErr) => {
        console.error('[WikiCards Stream Error]:', streamErr);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end('Erreur de lecture du fichier');
        }
      });
      stream.pipe(res);
      return;
    }

    // Si c'est une requête d'asset statique (.js, .css, .png, etc.) manquante, on renvoie 404
    // (et JAMAIS index.html qui ferait crasher les imports dynamiques JS)
    const hasFileExt = path.extname(reqPath).length > 0;
    if (hasFileExt) {
      if (!res.headersSent) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Fichier introuvable');
      }
      return;
    }

    // SPA Fallback : pour toute navigation d'URL (ex: /wikisino, /profil), on sert index.html
    const indexPath = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        const stream = fs.createReadStream(indexPath);
        stream.on('error', (streamErr) => {
          console.error('[WikiCards Stream Error index.html]:', streamErr);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end('Erreur de chargement');
          }
        });
        stream.pipe(res);
      }
      return;
    }

    if (!res.headersSent) {
      res.statusCode = 404;
      res.end('Fichier non trouvé');
    }
  } catch (err) {
    console.error('[WikiCards Request Error]:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end(`Erreur serveur: ${err?.message || 'Erreur inconnue'}`);
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`🃏 WikiCards est en ligne sur http://${HOST}:${PORT}`);
});
