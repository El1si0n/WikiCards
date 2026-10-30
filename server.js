import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApiRequest } from './server/apiHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 3000;

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
  // 1. API routes (/api/users, /api/trades, /api/market)
  if (
    req.url &&
    (req.url.startsWith('/api/users') ||
      req.url.startsWith('/api/trades') ||
      req.url.startsWith('/api/market'))
  ) {
    const handled = await handleApiRequest(req, res);
    if (handled) return;
  }

  // 2. Fichiers statiques depuis dist/
  if (!fs.existsSync(DIST_DIR)) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(
      '<h1>WikiCards en cours d\'initialisation</h1><p>Veuillez d\'abord lancer <code>npm run build</code> avant de démarrer le serveur.</p>'
    );
    return;
  }

  try {
    const parsedUrl = new URL(
      req.url || '/',
      `http://${req.headers.host || 'localhost'}`
    );
    let reqPath = decodeURIComponent(parsedUrl.pathname);
    if (reqPath === '/') reqPath = '/index.html';

    let filePath = path.join(DIST_DIR, reqPath);
    if (!filePath.startsWith(DIST_DIR)) {
      res.statusCode = 403;
      res.end('Accès interdit');
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.setHeader(
        'Content-Type',
        MIME_TYPES[ext] || 'application/octet-stream'
      );
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // SPA Fallback : redirige vers index.html pour le routage client
    const indexPath = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      fs.createReadStream(indexPath).pipe(res);
      return;
    }

    res.statusCode = 404;
    res.end('Fichier non trouvé');
  } catch (err) {
    res.statusCode = 500;
    res.end(`Erreur serveur: ${err?.message || 'Erreur inconnue'}`);
  }
});

server.listen(PORT, () => {
  console.log(`🃏 WikiCards est en ligne sur http://localhost:${PORT}`);
});
