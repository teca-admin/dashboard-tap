// Função robusta para converter CSV em array de arrays, lidando com campos entre aspas
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentCell += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentCell);
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (currentCell !== '' || currentLine.length > 0) {
        currentLine.push(currentCell);
        lines.push(currentLine);
        currentCell = '';
        currentLine = [];
      }
      if (char === '\r' && nextChar === '\n') i++;
    } else {
      currentCell += char;
    }
  }

  if (currentCell !== '' || currentLine.length > 0) {
    currentLine.push(currentCell);
    lines.push(currentLine);
  }

  return lines;
}

let cache: { data: any[], timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 segundos
let activeFetchPromise: Promise<any[]> | null = null;

export async function fetchRawData() {
  const now = Date.now();
  if (cache && (now - cache.timestamp < CACHE_TTL)) {
    return cache.data;
  }

  if (activeFetchPromise) {
    return activeFetchPromise;
  }

  activeFetchPromise = (async () => {
    try {
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
      if (!spreadsheetId) {
        throw new Error('Variável de ambiente GOOGLE_SHEETS_SPREADSHEET_ID não configurada.');
      }

      // Usando o endpoint de visualização que permite exportar CSV de uma aba específica pelo nome
      // A planilha precisa estar com acesso "Qualquer pessoa com o link"
      const sheetName = 'Performance';
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Erro ao buscar CSV: ${response.status} ${response.statusText}. Verifique se a planilha está pública.`);
      }

      const csvText = await response.text();
      const allRows = parseCSV(csvText);
      
      // O seu código original pedia Performance!A5:CV
      // No CSV, A5 é a linha 5 (índice 4 se contarmos do zero)
      const rows = allRows.slice(4);

      cache = { data: rows, timestamp: Date.now() };
      activeFetchPromise = null;
      return rows;
    } catch (error: any) {
      console.error('Erro ao buscar dados do Google Sheets:', error.message);
      activeFetchPromise = null;
      if (cache) {
        return cache.data;
      }
      throw error;
    }
  })();

  return activeFetchPromise;
}
