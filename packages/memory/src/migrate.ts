#!/usr/bin/env tsx
import { MemoryDB } from './database.js';

const dbPath = process.env.FORGE_DB_PATH || process.env.FORGE_DATA_DIR?.replace('~', process.env.HOME || '') + '/forge.db' || '~/.forgeclaw/data/forge.db';
const db = new MemoryDB(dbPath);
db.close();
console.log('✅ Database migration complete');
