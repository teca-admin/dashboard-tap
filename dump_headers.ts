
import { fetchRawData } from './server/services/googleSheets.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkHeaders() {
  try {
    const rows = await fetchRawData();
    console.log('HEADERS:', JSON.stringify(rows[0]));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
checkHeaders();
