import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { sheetsApiRouter } from './server/api/sheets.js';

// Load env vars
dotenv.config();

// Fixes for ESM file dir
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// API Routes
app.get('/api/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API is working in CSV Public Mode',
    env: {
      hasSheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      sheetIdPrefix: process.env.GOOGLE_SHEETS_SPREADSHEET_ID ? process.env.GOOGLE_SHEETS_SPREADSHEET_ID.substring(0, 5) + '...' : 'null'
    }
  });
});

app.use('/api/sheets', sheetsApiRouter);

// Função para configurar o middleware do Vite ou arquivos estáticos
async function setupFrontend() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Inicia o servidor se não estiver sendo importado (como no Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  setupFrontend().then(() => {
    const PORT = 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

export default app;
