import express from 'express';
import dotenv from 'dotenv';
import { sheetsApiRouter } from '../server/api/sheets.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use('/api/sheets', sheetsApiRouter);

export default app;
