#!/usr/bin/env tsx
import { MemoryDB } from './database.js';

const dbPath = process.env.FORGE_DB_PATH || process.env.FORGE_DATA_DIR?.replace('~', process.env.HOME || '') + '/forge.db' || '~/.forgeclaw/data/forge.db';
const db = new MemoryDB(dbPath);

db.addMemory({
  type: 'project',
  text: 'Forged Intelligence builds AI automation systems for solopreneurs and agencies.',
  tags: ['business', 'context'],
  importance: 9,
  source: 'seed',
});

db.addMemory({
  type: 'project',
  text: 'Primary product is ContentForge, focused on turning one idea into multi-platform content.',
  tags: ['contentforge', 'product'],
  importance: 8,
  source: 'seed',
});

console.log('✅ Seed data inserted');
db.close();
