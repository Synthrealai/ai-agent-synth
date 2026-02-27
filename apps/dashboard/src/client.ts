type TabId =
  | 'tasks'
  | 'agents'
  | 'content'
  | 'approvals'
  | 'council'
  | 'calendar'
  | 'projects'
  | 'memory'
  | 'docs'
  | 'people'
  | 'office'
  | 'team'
  | 'feedback';

type AgentLayer = 'leadership' | 'operations' | 'input' | 'output' | 'meta';

interface MissionAgent {
  id: string;
  name: string;
  role: string;
  layer: AgentLayer;
  description: string;
  skills: string[];
  status: 'active' | 'paused' | 'offline';
  priority: number;
  icon: string;
  accent: string;
}

interface Approval {
  id: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  request: {
    tool: string;
    args: Record<string, unknown>;
    risk_level: number;
    reason: string;
  };
  requested_at: string;
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: string;
  summary: string;
}

interface Task {
  id: string;
  goal: string;
  status: string;
  created_at: string;
  updated_at: string;
  result_summary?: string;
}

interface ContentItem {
  id: string;
  type: string;
  platform: string;
  title?: string;
  body: string;
  status: string;
  created_at: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string;
  type: string;
  status: string;
  notes?: string;
}

interface FeedbackItem {
  id: string;
  source: string;
  category: string;
  text: string;
  status: string;
  priority: number;
  created_at: string;
}

interface DocItem {
  path: string;
  title: string;
  updatedAt: string;
}

interface HealthResponse {
  status: string;
  paused: boolean;
  uptime_sec: number;
  autonomy_level: string;
  services: Array<{ name: string; status: string; uptimeSec: number }>;
  db_stats: Record<string, number>;
  env: Record<string, boolean>;
  costs: {
    today_cents: number;
    recent: Array<{ date: string; total_cents: number }>;
  };
}

interface MissionControlResponse {
  by_layer: Record<AgentLayer, MissionAgent[]>;
  stats: Record<string, number>;
  generated_at: string;
}

interface MissionStateResponse {
  paused: boolean;
  started_at: string;
  uptime_sec: number;
  generated_at: string;
}

const NAV_ITEMS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'tasks', label: 'Tasks', icon: '☑' },
  { id: 'agents', label: 'Agents', icon: '🤖' },
  { id: 'content', label: 'Content', icon: '✍' },
  { id: 'approvals', label: 'Approvals', icon: '🛡' },
  { id: 'council', label: 'Council', icon: '👑' },
  { id: 'calendar', label: 'Calendar', icon: '🗓' },
  { id: 'projects', label: 'Projects', icon: '📁' },
  { id: 'memory', label: 'Memory', icon: '🧠' },
  { id: 'docs', label: 'Docs', icon: '📄' },
  { id: 'people', label: 'People', icon: '👥' },
  { id: 'office', label: 'Office', icon: '🏢' },
  { id: 'team', label: 'Team', icon: '🧭' },
  { id: 'feedback', label: 'Feedback', icon: '💬' },
];

const state: {
  activeTab: TabId;
  search: string;
  memoryQuery: string;
  memoryResults: Array<{ id: string; type: string; text: string; importance: number; tags: string[] }>;
  health: HealthResponse | null;
  mission: MissionControlResponse | null;
  missionState: MissionStateResponse | null;
  tasks: Task[];
  currentTask: Task | null;
  approvals: Approval[];
  timeline: TimelineEvent[];
  content: ContentItem[];
  calendar: CalendarEvent[];
  docs: DocItem[];
  feedback: FeedbackItem[];
} = {
  activeTab: 'team',
  search: '',
  memoryQuery: '',
  memoryResults: [],
  health: null,
  mission: null,
  missionState: null,
  tasks: [],
  currentTask: null,
  approvals: [],
  timeline: [],
  content: [],
  calendar: [],
  docs: [],
  feedback: [],
};

function esc(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value?: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function short(value: string, max = 140): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function centsToUsd(cents: number): string {
  return `$${(cents / 100).toFixed(4)}`;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${url} failed (${res.status})`);
  }
  return (await res.json()) as T;
}

async function postJson<T>(url: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`POST ${url} failed (${res.status})`);
  }
  return (await res.json()) as T;
}

function filtered<T>(items: T[], pick: (item: T) => string): T[] {
  if (!state.search.trim()) return items;
  const needle = state.search.toLowerCase();
  return items.filter((item) => pick(item).toLowerCase().includes(needle));
}

async function refreshData(): Promise<void> {
  const [health, mission, missionState, tasks, currentTask, approvals, timeline, content, calendar, docs, feedback] =
    await Promise.all([
      getJson<HealthResponse>('/api/health'),
      getJson<MissionControlResponse>('/api/mission-control'),
      getJson<MissionStateResponse>('/api/mission-control/state'),
      getJson<Task[]>('/api/tasks?limit=120'),
      getJson<Task | null>('/api/tasks/current'),
      getJson<Approval[]>('/api/approvals?status=pending&limit=120'),
      getJson<TimelineEvent[]>('/api/timeline?limit=120'),
      getJson<ContentItem[]>('/api/content?limit=120'),
      getJson<CalendarEvent[]>('/api/calendar?limit=80'),
      getJson<DocItem[]>('/api/docs?limit=120'),
      getJson<FeedbackItem[]>('/api/feedback?limit=120'),
    ]);

  state.health = health;
  state.mission = mission;
  state.missionState = missionState;
  state.tasks = tasks;
  state.currentTask = currentTask;
  state.approvals = approvals;
  state.timeline = timeline;
  state.content = content;
  state.calendar = calendar;
  state.docs = docs;
  state.feedback = feedback;
}

function renderKPIs(): string {
  const stats = state.health?.db_stats ?? {};
  const kpis = [
    { label: 'Active Agents', value: stats.agents_active ?? 0 },
    { label: 'Open Tasks', value: stats.tasks_open ?? 0 },
    { label: 'Pending Approvals', value: stats.approvals_pending ?? 0 },
    { label: 'Draft Content', value: stats.content_draft ?? 0 },
    { label: 'Memories', value: stats.memories ?? 0 },
  ];

  return `
    <div class="kpis">
      ${kpis
        .map(
          (kpi) => `
        <div class="kpi">
          <div class="kpi-label">${esc(kpi.label)}</div>
          <div class="kpi-value">${esc(kpi.value)}</div>
        </div>`
        )
        .join('')}
    </div>
  `;
}

function renderAgentCards(layer: AgentLayer): string {
  const agents = filtered(state.mission?.by_layer[layer] ?? [], (agent) => `${agent.name} ${agent.role} ${agent.description} ${agent.skills.join(' ')}`);
  if (agents.length === 0) {
    return `<div class="empty">No agents in ${esc(layer)} layer.</div>`;
  }
  return `
    <div class="agent-grid">
      ${agents
        .map(
          (agent) => `
        <article class="agent-card" style="--agent-accent:${esc(agent.accent)}">
          <div class="agent-head">
            <div class="agent-icon">${esc(agent.icon)}</div>
            <div>
              <div class="agent-name">${esc(agent.name)}</div>
              <div class="agent-role">${esc(agent.role)}</div>
            </div>
          </div>
          <div class="agent-desc">${esc(agent.description)}</div>
          <div class="tags">
            ${agent.skills.map((skill) => `<span class="tag">${esc(skill)}</span>`).join('')}
          </div>
          <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center">
            <span class="badge">${esc(agent.status)}</span>
            <span class="meta">Role card</span>
          </div>
        </article>
      `
        )
        .join('')}
    </div>
  `;
}

function renderApprovalList(withActions: boolean): string {
  const items = filtered(state.approvals, (approval) => `${approval.request.tool} ${approval.request.reason}`);
  if (items.length === 0) return `<div class="empty">No pending approvals.</div>`;
  return `
    <div class="list">
      ${items
        .map(
          (approval) => `
        <div class="list-item">
          <div class="list-top">
            <div>
              <div class="list-title">${esc(approval.request.tool)}</div>
              <div class="list-sub">${esc(short(approval.request.reason || 'No reason provided', 140))}</div>
            </div>
            <span class="badge">risk ${esc(approval.request.risk_level)}</span>
          </div>
          <div class="meta" style="margin-top:6px">${esc(formatDate(approval.requested_at))}</div>
          ${
            withActions
              ? `<div class="list-actions" style="margin-top:8px">
                  <button class="btn small primary" data-action="approve" data-id="${esc(approval.id)}">Approve</button>
                  <button class="btn small deny" data-action="deny" data-id="${esc(approval.id)}">Deny</button>
                </div>`
              : ''
          }
        </div>`
        )
        .join('')}
    </div>
  `;
}

function renderTimeline(limit = 20): string {
  const events = filtered(state.timeline, (event) => `${event.type} ${event.summary}`).slice(0, limit);
  if (events.length === 0) return `<div class="empty">No timeline data yet.</div>`;
  return `
    <div class="list">
      ${events
        .map(
          (event) => `
        <div class="list-item">
          <div class="list-top">
            <div class="list-title">${esc(event.type)}</div>
            <span class="meta">${esc(formatDate(event.timestamp))}</span>
          </div>
          <div class="list-sub">${esc(short(event.summary, 200))}</div>
        </div>`
        )
        .join('')}
    </div>
  `;
}

function renderTeamView(): string {
  return `
    <section class="grid">
      ${renderKPIs()}
      <div class="split">
        <div class="panel">
          <div class="panel-title">Mission Graph</div>
          <div class="layer-title">Leadership</div>
          ${renderAgentCards('leadership')}
          <div class="layer-title">Operations</div>
          ${renderAgentCards('operations')}
          <div class="layer-title">Input Signal</div>
          ${renderAgentCards('input')}
          <div class="layer-title">Output Action</div>
          ${renderAgentCards('output')}
          <div class="layer-title">Meta Layer</div>
          ${renderAgentCards('meta')}
        </div>
        <div class="grid">
          <div class="panel">
            <div class="panel-title">Approvals Queue</div>
            ${renderApprovalList(true)}
          </div>
          <div class="panel">
            <div class="panel-title">Live Timeline</div>
            ${renderTimeline(12)}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderTasksView(): string {
  const tasks = filtered(state.tasks, (task) => `${task.goal} ${task.status} ${task.result_summary ?? ''}`);
  return `
    <section class="grid cols-2">
      <div class="panel">
        <div class="panel-title">Current Task</div>
        ${
          state.currentTask
            ? `<div class="list-item">
                <div class="list-title">${esc(state.currentTask.goal)}</div>
                <div class="list-sub">Status: ${esc(state.currentTask.status)}</div>
                <div class="meta">Updated ${esc(formatDate(state.currentTask.updated_at))}</div>
              </div>`
            : '<div class="empty">No active task.</div>'
        }
      </div>
      <div class="panel">
        <div class="panel-title">All Tasks</div>
        ${
          tasks.length === 0
            ? '<div class="empty">No tasks found.</div>'
            : `<table class="table">
                <thead><tr><th>Goal</th><th>Status</th><th>Updated</th></tr></thead>
                <tbody>
                  ${tasks
                    .map(
                      (task) => `
                    <tr>
                      <td>${esc(short(task.goal, 120))}</td>
                      <td>${esc(task.status)}</td>
                      <td>${esc(formatDate(task.updated_at))}</td>
                    </tr>`
                    )
                    .join('')}
                </tbody>
              </table>`
        }
      </div>
    </section>
  `;
}

function renderAgentsView(): string {
  const agents = [
    ...(state.mission?.by_layer.leadership ?? []),
    ...(state.mission?.by_layer.operations ?? []),
    ...(state.mission?.by_layer.input ?? []),
    ...(state.mission?.by_layer.output ?? []),
    ...(state.mission?.by_layer.meta ?? []),
  ];
  const filteredAgents = filtered(agents, (agent) => `${agent.name} ${agent.role} ${agent.layer}`);
  return `
    <section class="panel">
      <div class="panel-title">Agent Registry</div>
      ${
        filteredAgents.length === 0
          ? '<div class="empty">No agents found.</div>'
          : `<div class="agent-grid">${filteredAgents
              .map(
                (agent) => `
              <article class="agent-card" style="--agent-accent:${esc(agent.accent)}">
                <div class="agent-head">
                  <div class="agent-icon">${esc(agent.icon)}</div>
                  <div>
                    <div class="agent-name">${esc(agent.name)}</div>
                    <div class="agent-role">${esc(agent.role)} · ${esc(agent.layer)}</div>
                  </div>
                </div>
                <div class="agent-desc">${esc(agent.description)}</div>
              </article>`
              )
              .join('')}</div>`
      }
    </section>
  `;
}

function renderContentView(): string {
  const items = filtered(state.content, (item) => `${item.type} ${item.platform} ${item.title ?? ''} ${item.body}`);
  return `
    <section class="panel">
      <div class="panel-title">Content Queue</div>
      ${
        items.length === 0
          ? '<div class="empty">No content records.</div>'
          : `<div class="list">
              ${items
                .map(
                  (item) => `
                <div class="list-item">
                  <div class="list-top">
                    <div class="list-title">${esc(item.title || `${item.type} · ${item.platform}`)}</div>
                    <span class="badge">${esc(item.status)}</span>
                  </div>
                  <div class="list-sub">${esc(short(item.body, 200))}</div>
                  <div class="meta">${esc(formatDate(item.created_at))}</div>
                </div>`
                )
                .join('')}
            </div>`
      }
    </section>
  `;
}

function renderApprovalsView(): string {
  return `<section class="panel"><div class="panel-title">Approval Control</div>${renderApprovalList(true)}</section>`;
}

function renderCouncilView(): string {
  const leaders = [...(state.mission?.by_layer.leadership ?? []), ...(state.mission?.by_layer.operations ?? [])];
  return `
    <section class="grid cols-2">
      <div class="panel">
        <div class="panel-title">Council Members</div>
        ${leaders.length === 0 ? '<div class="empty">No council members.</div>' : `<div class="agent-grid">${leaders.map((agent) => `<article class="agent-card" style="--agent-accent:${esc(agent.accent)}"><div class="agent-head"><div class="agent-icon">${esc(agent.icon)}</div><div><div class="agent-name">${esc(agent.name)}</div><div class="agent-role">${esc(agent.role)}</div></div></div><div class="agent-desc">${esc(agent.description)}</div></article>`).join('')}</div>`}
      </div>
      <div class="panel">
        <div class="panel-title">Decision Timeline</div>
        ${renderTimeline(20)}
      </div>
    </section>
  `;
}

function renderCalendarView(): string {
  const items = filtered(state.calendar, (event) => `${event.title} ${event.type} ${event.notes ?? ''}`);
  return `
    <section class="panel">
      <div class="panel-title">Calendar & Cadence</div>
      ${
        items.length === 0
          ? '<div class="empty">No events scheduled.</div>'
          : `<table class="table"><thead><tr><th>Event</th><th>Type</th><th>When</th><th>Status</th></tr></thead><tbody>
              ${items
                .map(
                  (event) => `
                <tr>
                  <td>${esc(event.title)}</td>
                  <td>${esc(event.type)}</td>
                  <td>${esc(formatDate(event.starts_at))}</td>
                  <td>${esc(event.status)}</td>
                </tr>`
                )
                .join('')}
            </tbody></table>`
      }
    </section>
  `;
}

function renderProjectsView(): string {
  const grouped: Record<string, number> = {};
  for (const task of state.tasks) {
    grouped[task.status] = (grouped[task.status] || 0) + 1;
  }
  const rows = Object.entries(grouped);
  return `
    <section class="grid cols-2">
      <div class="panel">
        <div class="panel-title">Project Buckets</div>
        ${
          rows.length === 0
            ? '<div class="empty">No project data.</div>'
            : `<div class="list">${rows
                .map(([status, count]) => `<div class="list-item"><div class="list-top"><span class="list-title">${esc(status)}</span><span class="badge">${esc(count)}</span></div></div>`)
                .join('')}</div>`
        }
      </div>
      <div class="panel">
        <div class="panel-title">Recent Tasks</div>
        ${renderTasksView()}
      </div>
    </section>
  `;
}

function renderMemoryView(): string {
  return `
    <section class="grid cols-2">
      <div class="panel">
        <div class="panel-title">Memory Search</div>
        <div style="display:flex;gap:8px">
          <input class="input" id="memory-query" placeholder="Search facts, projects, preferences..." value="${esc(state.memoryQuery)}" />
          <button class="btn primary" id="memory-search-btn">Search</button>
        </div>
        <div class="meta" style="margin-top:8px">Memories indexed in SQLite with FTS + fallback keyword search.</div>
      </div>
      <div class="panel">
        <div class="panel-title">Results</div>
        ${
          state.memoryResults.length === 0
            ? '<div class="empty">Run a memory search to see results.</div>'
            : `<div class="list">
                ${state.memoryResults
                  .map(
                    (item) => `
                  <div class="list-item">
                    <div class="list-top">
                      <div class="list-title">${esc(item.type)}</div>
                      <span class="badge">importance ${esc(item.importance)}</span>
                    </div>
                    <div class="list-sub">${esc(short(item.text, 220))}</div>
                    <div class="meta">${esc(item.tags.join(', '))}</div>
                  </div>`
                  )
                  .join('')}
              </div>`
        }
      </div>
    </section>
  `;
}

function renderDocsView(): string {
  const docs = filtered(state.docs, (doc) => `${doc.path} ${doc.title}`);
  return `
    <section class="panel">
      <div class="panel-title">Docs & Operational Files</div>
      ${
        docs.length === 0
          ? '<div class="empty">No docs indexed.</div>'
          : `<table class="table"><thead><tr><th>Path</th><th>Title</th><th>Updated</th></tr></thead><tbody>
              ${docs
                .map((doc) => `<tr><td>${esc(doc.path)}</td><td>${esc(doc.title)}</td><td>${esc(formatDate(doc.updatedAt))}</td></tr>`)
                .join('')}
            </tbody></table>`
      }
    </section>
  `;
}

function renderPeopleView(): string {
  const agents = [
    ...(state.mission?.by_layer.leadership ?? []),
    ...(state.mission?.by_layer.operations ?? []),
    ...(state.mission?.by_layer.input ?? []),
    ...(state.mission?.by_layer.output ?? []),
    ...(state.mission?.by_layer.meta ?? []),
  ];
  return `
    <section class="panel">
      <div class="panel-title">People / Team Roster</div>
      ${
        agents.length === 0
          ? '<div class="empty">No team roster.</div>'
          : `<table class="table"><thead><tr><th>Name</th><th>Role</th><th>Layer</th><th>Status</th></tr></thead><tbody>
              ${agents
                .map((agent) => `<tr><td>${esc(agent.name)}</td><td>${esc(agent.role)}</td><td>${esc(agent.layer)}</td><td>${esc(agent.status)}</td></tr>`)
                .join('')}
            </tbody></table>`
      }
    </section>
  `;
}

function renderOfficeView(): string {
  const services = state.health?.services ?? [];
  const env = state.health?.env ?? {};
  return `
    <section class="grid cols-2">
      <div class="panel">
        <div class="panel-title">Service Health</div>
        ${
          services.length === 0
            ? '<div class="empty">No PM2 service data.</div>'
            : `<div class="list">
                ${services
                  .map(
                    (service) => `
                  <div class="list-item">
                    <div class="list-top">
                      <span class="list-title">${esc(service.name)}</span>
                      <span class="badge">${esc(service.status)}</span>
                    </div>
                    <div class="meta">Uptime: ${esc(service.uptimeSec)}s</div>
                  </div>`
                  )
                  .join('')}
              </div>`
        }
      </div>
      <div class="panel">
        <div class="panel-title">Integration Readiness</div>
        <div class="list">
          ${Object.entries(env)
            .map(
              ([key, ok]) => `
            <div class="list-item">
              <div class="list-top">
                <span class="list-title">${esc(key)}</span>
                <span class="badge">${ok ? 'configured' : 'missing'}</span>
              </div>
            </div>`
            )
            .join('')}
        </div>
      </div>
    </section>
  `;
}

function renderFeedbackView(): string {
  const items = filtered(state.feedback, (item) => `${item.text} ${item.category} ${item.source}`);
  return `
    <section class="grid cols-2">
      <div class="panel">
        <div class="panel-title">Submit Feedback</div>
        <div class="feedback-form">
          <input class="input" id="feedback-source" placeholder="source (dashboard, telegram, cli)" value="dashboard" />
          <input class="input" id="feedback-category" placeholder="category (ui, bug, idea)" value="ui" />
          <input class="input" id="feedback-priority" type="number" min="1" max="10" value="5" />
          <textarea class="textarea" id="feedback-text" placeholder="What should improve next?"></textarea>
          <button class="btn primary" id="feedback-submit">Save Feedback</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Feedback Queue</div>
        ${
          items.length === 0
            ? '<div class="empty">No feedback items.</div>'
            : `<div class="list">
                ${items
                  .map(
                    (item) => `
                  <div class="list-item">
                    <div class="list-top">
                      <div class="list-title">${esc(item.category)} · ${esc(item.source)}</div>
                      <span class="badge">p${esc(item.priority)}</span>
                    </div>
                    <div class="list-sub">${esc(short(item.text, 220))}</div>
                    <div class="meta">${esc(formatDate(item.created_at))}</div>
                  </div>`
                  )
                  .join('')}
              </div>`
        }
      </div>
    </section>
  `;
}

function renderActiveView(): string {
  switch (state.activeTab) {
    case 'team':
      return renderTeamView();
    case 'tasks':
      return renderTasksView();
    case 'agents':
      return renderAgentsView();
    case 'content':
      return renderContentView();
    case 'approvals':
      return renderApprovalsView();
    case 'council':
      return renderCouncilView();
    case 'calendar':
      return renderCalendarView();
    case 'projects':
      return renderProjectsView();
    case 'memory':
      return renderMemoryView();
    case 'docs':
      return renderDocsView();
    case 'people':
      return renderPeopleView();
    case 'office':
      return renderOfficeView();
    case 'feedback':
      return renderFeedbackView();
    default:
      return renderTeamView();
  }
}

function render(): void {
  const app = document.getElementById('app');
  if (!app) return;

  const uptime = state.health ? `${Math.floor(state.health.uptime_sec / 60)}m` : '...';
  const pendingApprovals = state.health?.db_stats?.approvals_pending ?? state.approvals.length;
  const paused = state.missionState?.paused ?? false;

  app.innerHTML = `
    <aside class="sidebar">
      <div class="logo"><span class="logo-badge">FC</span> Mission Control</div>
      <nav class="nav-list">
        ${NAV_ITEMS.map((item) => `<button class="nav-item ${state.activeTab === item.id ? 'active' : ''}" data-nav="${item.id}"><span class="nav-icon">${item.icon}</span>${item.label}</button>`).join('')}
      </nav>
      <div class="sidebar-footer">
        <div>Uptime: ${esc(uptime)}</div>
        <div>Autonomy: ${esc(state.health?.autonomy_level || 'L2')}</div>
        <div>Approvals: ${esc(pendingApprovals)}</div>
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div class="title">Forge Mission Control</div>
        <div class="top-actions">
          <div class="search-wrap">
            <span class="search-icon">⌕</span>
            <input class="search" id="global-search" placeholder="Search agents, tasks, memory, docs..." value="${esc(state.search)}" />
            <span class="kbd">⌘K</span>
          </div>
          <button class="btn ${paused ? '' : 'warn'}" id="pause-toggle">${paused ? 'Resume' : 'Pause'}</button>
          <button class="btn primary" id="ping-henry">Ping Henry</button>
          <button class="btn" id="refresh-btn">Refresh</button>
          <span class="status-pill">${paused ? 'Paused' : 'Live'} · ${esc(state.health?.status || 'loading')}</span>
        </div>
      </header>
      <section class="content">${renderActiveView()}</section>
    </main>
  `;

  for (const item of app.querySelectorAll<HTMLElement>('[data-nav]')) {
    item.onclick = () => {
      const id = item.dataset.nav as TabId;
      state.activeTab = id;
      render();
    };
  }

  const searchInput = app.querySelector<HTMLInputElement>('#global-search');
  if (searchInput) {
    searchInput.oninput = () => {
      state.search = searchInput.value;
      render();
    };
  }

  const refreshBtn = app.querySelector<HTMLButtonElement>('#refresh-btn');
  if (refreshBtn) {
    refreshBtn.onclick = async () => {
      await refreshData();
      render();
    };
  }

  const pauseToggle = app.querySelector<HTMLButtonElement>('#pause-toggle');
  if (pauseToggle) {
    pauseToggle.onclick = async () => {
      const targetPaused = !(state.missionState?.paused ?? false);
      await postJson('/api/mission-control/pause', { paused: targetPaused });
      await refreshData();
      render();
    };
  }

  const pingBtn = app.querySelector<HTMLButtonElement>('#ping-henry');
  if (pingBtn) {
    pingBtn.onclick = async () => {
      await postJson('/api/mission-control/ping', { target: 'Henry' });
      await refreshData();
      render();
    };
  }

  for (const btn of app.querySelectorAll<HTMLButtonElement>('[data-action="approve"]')) {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      if (!id) return;
      await postJson(`/api/approvals/${id}/approve`);
      await refreshData();
      render();
    };
  }

  for (const btn of app.querySelectorAll<HTMLButtonElement>('[data-action="deny"]')) {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      if (!id) return;
      await postJson(`/api/approvals/${id}/deny`);
      await refreshData();
      render();
    };
  }

  const memorySearchBtn = app.querySelector<HTMLButtonElement>('#memory-search-btn');
  if (memorySearchBtn) {
    memorySearchBtn.onclick = async () => {
      const input = app.querySelector<HTMLInputElement>('#memory-query');
      const q = input?.value?.trim() || '';
      state.memoryQuery = q;
      if (!q) {
        state.memoryResults = [];
        render();
        return;
      }
      state.memoryResults = await getJson(`/api/memory/search?q=${encodeURIComponent(q)}&limit=20`);
      render();
    };
  }

  const feedbackSubmit = app.querySelector<HTMLButtonElement>('#feedback-submit');
  if (feedbackSubmit) {
    feedbackSubmit.onclick = async () => {
      const source = (app.querySelector<HTMLInputElement>('#feedback-source')?.value || 'dashboard').trim();
      const category = (app.querySelector<HTMLInputElement>('#feedback-category')?.value || 'general').trim();
      const priorityRaw = app.querySelector<HTMLInputElement>('#feedback-priority')?.value || '5';
      const text = (app.querySelector<HTMLTextAreaElement>('#feedback-text')?.value || '').trim();
      if (!text) return;
      await postJson('/api/feedback', {
        source,
        category,
        priority: Number(priorityRaw),
        text,
      });
      await refreshData();
      if (state.activeTab !== 'feedback') {
        state.activeTab = 'feedback';
      }
      render();
    };
  }
}

async function boot(): Promise<void> {
  try {
    await refreshData();
  } catch (error) {
    console.error('Dashboard boot error', error);
  }
  render();
  setInterval(async () => {
    try {
      await refreshData();
      render();
    } catch (error) {
      console.error('Dashboard refresh error', error);
    }
  }, 8000);
}

boot().catch((error) => {
  console.error(error);
});
