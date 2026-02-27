import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryDB } from '../src/database.js';
import { unlinkSync, existsSync } from 'fs';

const TEST_DB = '/tmp/forge-test.db';

describe('MemoryDB', () => {
  let db: MemoryDB;

  beforeEach(() => {
    db = new MemoryDB(TEST_DB);
  });

  afterEach(() => {
    db.close();
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
    if (existsSync(TEST_DB + '-wal')) unlinkSync(TEST_DB + '-wal');
    if (existsSync(TEST_DB + '-shm')) unlinkSync(TEST_DB + '-shm');
  });

  it('should add and retrieve timeline events', () => {
    db.addTimelineEvent({ type: 'system', summary: 'Test event', payload: { key: 'value' } });
    const events = db.getTimeline(10);
    expect(events.length).toBe(1);
    expect(events[0].summary).toBe('Test event');
  });

  it('should add and search memories', () => {
    db.addMemory({ type: 'fact', text: 'Nick lives in Minneapolis', tags: ['personal', 'location'], importance: 8 });
    db.addMemory({ type: 'fact', text: 'ContentForge uses Next.js', tags: ['tech', 'project'], importance: 7 });

    const results = db.searchMemories('Minneapolis');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].text).toContain('Minneapolis');
  });

  it('should handle punctuation-heavy queries safely', () => {
    db.addMemory({ type: 'fact', text: 'Keep .env files out of source control', tags: ['security', 'dotfiles'], importance: 9 });

    const results = db.searchMemories('.env');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].text).toContain('.env');
  });

  it('should manage approvals', () => {
    const approval = db.createApproval({
      request: { tool: 'shell', args: { command: 'npm install' }, risk_level: 2, reason: 'Package install' },
    });
    expect(approval.status).toBe('pending');

    db.resolveApproval(approval.id, 'approved');
    const pending = db.getPendingApprovals();
    expect(pending.length).toBe(0);
  });

  it('should track content pieces', () => {
    db.addContent({
      type: 'tweet',
      platform: 'twitter',
      body: 'Test tweet about AI automation',
      status: 'draft',
    });
    const drafts = db.getContentByStatus('draft');
    expect(drafts.length).toBe(1);
  });
});
