import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createChildLogger, generateId, now } from '@forgeclaw/shared';
import type { Memory, TimelineEvent, Approval, ContentPiece } from '@forgeclaw/shared';

const log = createChildLogger('memory');

export interface MissionAgentRecord {
  id: string;
  name: string;
  role: string;
  layer: 'leadership' | 'operations' | 'input' | 'output' | 'meta';
  description: string;
  skills: string[];
  status: 'active' | 'paused' | 'offline';
  priority: number;
  icon: string;
  accent: string;
  created_at: string;
  updated_at: string;
}

export interface MissionAgentInput {
  name: string;
  role: string;
  layer: MissionAgentRecord['layer'];
  description: string;
  skills: string[];
  status?: MissionAgentRecord['status'];
  priority?: number;
  icon?: string;
  accent?: string;
}

export interface CalendarEventRecord {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string;
  type: string;
  status: 'scheduled' | 'done' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardFeedbackRecord {
  id: string;
  source: string;
  category: string;
  text: string;
  status: 'open' | 'planned' | 'done';
  priority: number;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'planning' | 'executing' | 'paused' | 'completed' | 'failed';

export interface TaskRecord {
  id: string;
  goal: string;
  status: TaskStatus;
  plan: string[];
  result_summary?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskInput {
  goal: string;
  plan?: string[];
  status?: TaskStatus;
  result_summary?: string;
}

export class MemoryDB {
  private db: Database.Database;

  constructor(dbPath: string = process.env.FORGE_DB_PATH || `${process.env.FORGE_DATA_DIR || '~/.forgeclaw/data'}/forge.db`) {
    const resolvedPath = dbPath.replace('~', process.env.HOME || '');
    mkdirSync(dirname(resolvedPath), { recursive: true });
    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
    log.info({ path: resolvedPath }, 'Database initialized');
  }

  private migrate(): void {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const schemaPath = resolve(__dirname, 'schema.sql');
    const fallbackSchemaPath = resolve(__dirname, '../src/schema.sql');
    const schema = readFileSync(existsSync(schemaPath) ? schemaPath : fallbackSchemaPath, 'utf-8');
    this.db.exec(schema);
    log.info('Schema migration complete');
  }

  addTimelineEvent(event: Omit<TimelineEvent, 'id' | 'timestamp'>): TimelineEvent {
    const full: TimelineEvent = { id: generateId(), timestamp: now(), ...event };
    this.db.prepare(
      `INSERT INTO timeline_events (id, timestamp, type, summary, payload_json) VALUES (?, ?, ?, ?, ?)`
    ).run(full.id, full.timestamp, full.type, full.summary, JSON.stringify(full.payload));
    return full;
  }

  getTimeline(limit = 50, type?: string): TimelineEvent[] {
    const query = type
      ? `SELECT * FROM timeline_events WHERE type = ? ORDER BY timestamp DESC LIMIT ?`
      : `SELECT * FROM timeline_events ORDER BY timestamp DESC LIMIT ?`;
    const rows = type ? this.db.prepare(query).all(type, limit) : this.db.prepare(query).all(limit);
    return (rows as any[]).map(r => ({ ...r, payload: JSON.parse(r.payload_json || '{}') }));
  }

  addMemory(memory: Omit<Memory, 'id' | 'created_at' | 'updated_at'>): Memory {
    const full: Memory = { id: generateId(), created_at: now(), updated_at: now(), ...memory };
    this.db.prepare(
      `INSERT INTO memories (id, type, text, tags, importance, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(full.id, full.type, full.text, JSON.stringify(full.tags), full.importance, full.source, full.created_at, full.updated_at);
    return full;
  }

  searchMemories(query: string, limit = 10): Memory[] {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }

    const ftsQuery = this.buildSafeFtsQuery(trimmedQuery);

    try {
      if (ftsQuery) {
        const rows = this.db.prepare(
          `SELECT m.* FROM memories m JOIN memories_fts fts ON m.rowid = fts.rowid WHERE memories_fts MATCH ? ORDER BY m.importance DESC LIMIT ?`
        ).all(ftsQuery, limit);
        return (rows as any[]).map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
      }
    } catch (error: any) {
      log.warn({ query: trimmedQuery, error: error.message }, 'FTS search failed, falling back to LIKE search');
    }

    // Safe fallback for punctuation-heavy queries that are invalid for FTS syntax.
    const like = `%${trimmedQuery}%`;
    const rows = this.db.prepare(
      `SELECT * FROM memories WHERE text LIKE ? OR tags LIKE ? ORDER BY importance DESC, updated_at DESC LIMIT ?`
    ).all(like, like, limit);
    return (rows as any[]).map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
  }

  getMemoriesByType(type: string, limit = 20): Memory[] {
    const rows = this.db.prepare(
      `SELECT * FROM memories WHERE type = ? ORDER BY importance DESC, updated_at DESC LIMIT ?`
    ).all(type, limit);
    return (rows as any[]).map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
  }

  createApproval(approval: Omit<Approval, 'id' | 'status' | 'requested_at'>): Approval {
    const full: Approval = { id: generateId(), status: 'pending', requested_at: now(), ...approval };
    this.db.prepare(
      `INSERT INTO approvals (id, status, tool, args_json, risk_level, reason, requested_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(full.id, full.status, full.request.tool, JSON.stringify(full.request.args), full.request.risk_level, full.request.reason, full.requested_at);
    return full;
  }

  getApprovalById(id: string): Approval | null {
    const row = this.db.prepare(`SELECT * FROM approvals WHERE id = ? LIMIT 1`).get(id) as any;
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      status: row.status,
      request: {
        tool: row.tool,
        args: JSON.parse(row.args_json || '{}'),
        risk_level: row.risk_level,
        reason: row.reason || '',
      },
      requested_at: row.requested_at,
      resolved_at: row.resolved_at || undefined,
      resolved_by: row.resolved_by || undefined,
    };
  }

  resolveApproval(id: string, status: 'approved' | 'denied', by: string = 'user'): void {
    this.db.prepare(
      `UPDATE approvals SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?`
    ).run(status, now(), by, id);
  }

  getPendingApprovals(): Approval[] {
    return this.getApprovals('pending', 100);
  }

  getApprovals(status?: Approval['status'], limit = 50): Approval[] {
    const hasStatus = Boolean(status);
    const rows = hasStatus
      ? this.db.prepare(`SELECT * FROM approvals WHERE status = ? ORDER BY requested_at DESC LIMIT ?`).all(status, limit) as any[]
      : this.db.prepare(`SELECT * FROM approvals ORDER BY requested_at DESC LIMIT ?`).all(limit) as any[];
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      request: {
        tool: row.tool,
        args: JSON.parse(row.args_json || '{}'),
        risk_level: row.risk_level,
        reason: row.reason || '',
      },
      requested_at: row.requested_at,
      resolved_at: row.resolved_at || undefined,
      resolved_by: row.resolved_by || undefined,
    }));
  }

  createTask(task: TaskInput): TaskRecord {
    const full: TaskRecord = {
      id: generateId(),
      goal: task.goal,
      status: task.status || 'planning',
      plan: task.plan || [],
      result_summary: task.result_summary,
      created_at: now(),
      updated_at: now(),
    };

    this.db.prepare(
      `INSERT INTO tasks (id, goal, status, plan_json, result_summary, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      full.id,
      full.goal,
      full.status,
      JSON.stringify(full.plan),
      full.result_summary || null,
      full.created_at,
      full.updated_at
    );

    return full;
  }

  getTaskById(id: string): TaskRecord | null {
    const row = this.db.prepare(`SELECT * FROM tasks WHERE id = ? LIMIT 1`).get(id) as any;
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      goal: row.goal,
      status: row.status,
      plan: JSON.parse(row.plan_json || '[]'),
      result_summary: row.result_summary || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  claimNextTask(prioritizedStatuses: TaskStatus[] = ['planning', 'paused']): TaskRecord | null {
    if (prioritizedStatuses.length === 0) {
      return null;
    }

    const placeholders = prioritizedStatuses.map(() => '?').join(', ');
    const row = this.db.prepare(
      `SELECT * FROM tasks
       WHERE status IN (${placeholders})
       ORDER BY updated_at ASC
       LIMIT 1`
    ).get(...prioritizedStatuses) as any;

    if (!row) {
      return null;
    }

    const claimedAt = now();
    this.db.prepare(
      `UPDATE tasks SET status = 'executing', updated_at = ? WHERE id = ?`
    ).run(claimedAt, row.id);

    return {
      id: row.id,
      goal: row.goal,
      status: 'executing',
      plan: JSON.parse(row.plan_json || '[]'),
      result_summary: row.result_summary || undefined,
      created_at: row.created_at,
      updated_at: claimedAt,
    };
  }

  updateTask(
    id: string,
    updates: Partial<Pick<TaskRecord, 'status' | 'plan' | 'result_summary' | 'goal'>>
  ): void {
    const sets: string[] = [];
    const values: Array<string | null> = [];

    if (typeof updates.status === 'string') {
      sets.push(`status = ?`);
      values.push(updates.status);
    }
    if (typeof updates.goal === 'string') {
      sets.push(`goal = ?`);
      values.push(updates.goal);
    }
    if (Array.isArray(updates.plan)) {
      sets.push(`plan_json = ?`);
      values.push(JSON.stringify(updates.plan));
    }
    if (updates.result_summary !== undefined) {
      sets.push(`result_summary = ?`);
      values.push(updates.result_summary ?? null);
    }

    sets.push(`updated_at = ?`);
    values.push(now());
    values.push(id);

    this.db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  getTasks(limit = 50, status?: string): TaskRecord[] {
    const rows = status
      ? this.db.prepare(`SELECT * FROM tasks WHERE status = ? ORDER BY updated_at DESC LIMIT ?`).all(status, limit)
      : this.db.prepare(`SELECT * FROM tasks ORDER BY updated_at DESC LIMIT ?`).all(limit);
    return (rows as any[]).map((row) => ({
      id: row.id,
      goal: row.goal,
      status: row.status,
      plan: JSON.parse(row.plan_json || '[]'),
      result_summary: row.result_summary || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  getCurrentTask(): TaskRecord | null {
    const row = this.db.prepare(
      `SELECT * FROM tasks WHERE status IN ('planning', 'executing', 'paused') ORDER BY updated_at DESC LIMIT 1`
    ).get() as any;
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      goal: row.goal,
      status: row.status,
      plan: JSON.parse(row.plan_json || '[]'),
      result_summary: row.result_summary || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  getContent(limit = 50, status?: string): ContentPiece[] {
    const rows = status
      ? this.db.prepare(`SELECT * FROM content_pieces WHERE status = ? ORDER BY created_at DESC LIMIT ?`).all(status, limit)
      : this.db.prepare(`SELECT * FROM content_pieces ORDER BY created_at DESC LIMIT ?`).all(limit);
    return (rows as any[]).map((row) => ({
      ...row,
      media_urls: JSON.parse(row.media_urls || '[]'),
      engagement: JSON.parse(row.engagement_json || '{}'),
    }));
  }

  getRecentCosts(days = 7): Array<{ date: string; total_cents: number }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const rows = this.db.prepare(
      `SELECT date, COALESCE(SUM(cost_cents), 0) AS total_cents
       FROM cost_tracking
       WHERE date >= ?
       GROUP BY date
       ORDER BY date ASC`
    ).all(since);
    return rows as Array<{ date: string; total_cents: number }>;
  }

  getSystemStats(): Record<string, number> {
    const timeline = this.db.prepare(`SELECT COUNT(*) AS c FROM timeline_events`).get() as any;
    const memories = this.db.prepare(`SELECT COUNT(*) AS c FROM memories`).get() as any;
    const approvalsPending = this.db.prepare(`SELECT COUNT(*) AS c FROM approvals WHERE status = 'pending'`).get() as any;
    const approvalsTotal = this.db.prepare(`SELECT COUNT(*) AS c FROM approvals`).get() as any;
    const tasksOpen = this.db.prepare(`SELECT COUNT(*) AS c FROM tasks WHERE status IN ('planning', 'executing', 'paused')`).get() as any;
    const tasksTotal = this.db.prepare(`SELECT COUNT(*) AS c FROM tasks`).get() as any;
    const contentDraft = this.db.prepare(`SELECT COUNT(*) AS c FROM content_pieces WHERE status = 'draft'`).get() as any;
    const contentTotal = this.db.prepare(`SELECT COUNT(*) AS c FROM content_pieces`).get() as any;
    const agentsActive = this.db.prepare(`SELECT COUNT(*) AS c FROM mission_agents WHERE status = 'active'`).get() as any;
    return {
      timeline_events: timeline.c,
      memories: memories.c,
      approvals_pending: approvalsPending.c,
      approvals_total: approvalsTotal.c,
      tasks_open: tasksOpen.c,
      tasks_total: tasksTotal.c,
      content_draft: contentDraft.c,
      content_total: contentTotal.c,
      agents_active: agentsActive.c,
    };
  }

  upsertMissionAgent(agent: MissionAgentInput): MissionAgentRecord {
    const existing = this.db.prepare(`SELECT id FROM mission_agents WHERE name = ?`).get(agent.name) as { id: string } | undefined;
    const id = existing?.id || generateId();
    const row = {
      id,
      name: agent.name,
      role: agent.role,
      layer: agent.layer,
      description: agent.description,
      skills_json: JSON.stringify(agent.skills || []),
      status: agent.status || 'active',
      priority: agent.priority ?? 5,
      icon: agent.icon || '🧠',
      accent: agent.accent || '#4f46e5',
      updated_at: now(),
      created_at: now(),
    };
    this.db.prepare(
      `INSERT INTO mission_agents (id, name, role, layer, description, skills_json, status, priority, icon, accent, created_at, updated_at)
       VALUES (@id, @name, @role, @layer, @description, @skills_json, @status, @priority, @icon, @accent, @created_at, @updated_at)
       ON CONFLICT(name) DO UPDATE SET
         role = excluded.role,
         layer = excluded.layer,
         description = excluded.description,
         skills_json = excluded.skills_json,
         status = excluded.status,
         priority = excluded.priority,
         icon = excluded.icon,
         accent = excluded.accent,
         updated_at = excluded.updated_at`
    ).run(row);

    return this.listMissionAgents().find((item) => item.name === agent.name)!;
  }

  seedMissionAgentsIfEmpty(agents: MissionAgentInput[]): number {
    const count = this.db.prepare(`SELECT COUNT(*) AS c FROM mission_agents`).get() as any;
    if (count.c > 0) {
      return 0;
    }
    let inserted = 0;
    for (const agent of agents) {
      this.upsertMissionAgent(agent);
      inserted += 1;
    }
    return inserted;
  }

  listMissionAgents(layer?: MissionAgentRecord['layer']): MissionAgentRecord[] {
    const rows = layer
      ? this.db.prepare(`SELECT * FROM mission_agents WHERE layer = ? ORDER BY priority DESC, name ASC`).all(layer)
      : this.db.prepare(`SELECT * FROM mission_agents ORDER BY priority DESC, name ASC`).all();
    return (rows as any[]).map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      layer: row.layer,
      description: row.description,
      skills: JSON.parse(row.skills_json || '[]'),
      status: row.status,
      priority: row.priority,
      icon: row.icon || '🧠',
      accent: row.accent || '#4f46e5',
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  upsertCalendarEvent(event: Omit<CalendarEventRecord, 'id' | 'created_at' | 'updated_at'> & { id?: string }): CalendarEventRecord {
    const id = event.id || generateId();
    const payload = {
      id,
      title: event.title,
      starts_at: event.starts_at,
      ends_at: event.ends_at || null,
      type: event.type || 'task',
      status: event.status || 'scheduled',
      notes: event.notes || null,
      created_at: now(),
      updated_at: now(),
    };
    this.db.prepare(
      `INSERT INTO calendar_events (id, title, starts_at, ends_at, type, status, notes, created_at, updated_at)
       VALUES (@id, @title, @starts_at, @ends_at, @type, @status, @notes, @created_at, @updated_at)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         starts_at = excluded.starts_at,
         ends_at = excluded.ends_at,
         type = excluded.type,
         status = excluded.status,
         notes = excluded.notes,
         updated_at = excluded.updated_at`
    ).run(payload);
    return this.getCalendarEvents(1, id)[0];
  }

  getCalendarEvents(limit = 20, id?: string): CalendarEventRecord[] {
    const rows = id
      ? this.db.prepare(`SELECT * FROM calendar_events WHERE id = ? ORDER BY starts_at ASC LIMIT ?`).all(id, limit)
      : this.db.prepare(`SELECT * FROM calendar_events ORDER BY starts_at ASC LIMIT ?`).all(limit);
    return rows as CalendarEventRecord[];
  }

  addFeedbackItem(item: Omit<DashboardFeedbackRecord, 'id' | 'created_at' | 'updated_at'>): DashboardFeedbackRecord {
    const full = { ...item, id: generateId(), created_at: now(), updated_at: now() };
    this.db.prepare(
      `INSERT INTO feedback_items (id, source, category, text, status, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(full.id, full.source, full.category, full.text, full.status, full.priority, full.created_at, full.updated_at);
    return full;
  }

  getFeedbackItems(limit = 30, status?: DashboardFeedbackRecord['status']): DashboardFeedbackRecord[] {
    const rows = status
      ? this.db.prepare(`SELECT * FROM feedback_items WHERE status = ? ORDER BY priority DESC, created_at DESC LIMIT ?`).all(status, limit)
      : this.db.prepare(`SELECT * FROM feedback_items ORDER BY priority DESC, created_at DESC LIMIT ?`).all(limit);
    return rows as DashboardFeedbackRecord[];
  }

  addContent(piece: Omit<ContentPiece, 'id' | 'created_at'>): ContentPiece {
    const full: ContentPiece = { id: generateId(), created_at: now(), ...piece };
    this.db.prepare(
      `INSERT INTO content_pieces (id, type, platform, title, body, media_urls, status, source_idea, scheduled_for, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(full.id, full.type, full.platform, full.title, full.body, JSON.stringify(full.media_urls || []), full.status, full.source_idea, full.scheduled_for, full.created_at);
    return full;
  }

  getContentByStatus(status: string, limit = 20): ContentPiece[] {
    return this.db.prepare(`SELECT * FROM content_pieces WHERE status = ? ORDER BY created_at DESC LIMIT ?`).all(status, limit) as any[];
  }

  updateContentStatus(id: string, status: string): void {
    this.db.prepare(`UPDATE content_pieces SET status = ?, posted_at = CASE WHEN ? = 'posted' THEN datetime('now') ELSE posted_at END WHERE id = ?`)
      .run(status, status, id);
  }

  recordCost(model: string, inputTokens: number, outputTokens: number, costCents: number): void {
    const date = new Date().toISOString().split('T')[0];
    this.db.prepare(
      `INSERT INTO cost_tracking (date, model, input_tokens, output_tokens, cost_cents, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(date, model, inputTokens, outputTokens, costCents, now());
  }

  getDailyCost(date?: string): number {
    const d = date || new Date().toISOString().split('T')[0];
    const row = this.db.prepare(`SELECT COALESCE(SUM(cost_cents), 0) as total FROM cost_tracking WHERE date = ?`).get(d) as any;
    return row.total;
  }

  close(): void {
    this.db.close();
  }

  private buildSafeFtsQuery(input: string): string {
    const tokens = input
      .split(/\s+/)
      .map((token) => token.replace(/[^A-Za-z0-9_-]/g, ''))
      .filter(Boolean)
      .slice(0, 8);

    if (tokens.length === 0) {
      return '';
    }

    return tokens.map((token) => `"${token}"*`).join(' AND ');
  }
}
