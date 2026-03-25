import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import cors from 'cors';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const PROJECTS_FILE = join(DATA_DIR, 'projects.json');
const KEYS_FILE = join(DATA_DIR, 'mcp-keys.json');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function readProjects() {
  try { return JSON.parse(readFileSync(PROJECTS_FILE, 'utf-8')); } catch { return []; }
}
function writeProjects(projects) {
  writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}
function readKeys() {
  try { return JSON.parse(readFileSync(KEYS_FILE, 'utf-8')); } catch { return []; }
}
function writeKeys(keys) {
  writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:4173'] }));
app.use(express.json({ limit: '10mb' }));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function parseJSON(text) {
  try { return JSON.parse(text); } catch {}
  const stripped = text.replace(/```(?:json)?\n?|\n?```/g, '').trim();
  try { return JSON.parse(stripped); } catch {}
  const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) try { return JSON.parse(match[0]); } catch {}
  return null;
}

const AGENT_PROMPTS = {
  intent: {
    name: 'Triage',
    icon: '🔮',
    system: `You are Triage — the requirements intelligence agent for Forge Platform, an AI-powered software modernization platform.
Analyze the user's input and return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "concept": "2-3 sentence product concept",
  "problem": "Clear problem statement",
  "target_users": [{"role": "User Role", "pain_points": ["pain1", "pain2"]}],
  "core_features": [{"name": "Feature Name", "description": "Brief description", "priority": "high|medium|low"}],
  "technical_constraints": ["constraint 1"],
  "success_metrics": ["metric 1"],
  "complexity": "low|medium|high",
  "estimated_timeline": "X weeks",
  "tech_category": "web|mobile|platform|api|data"
}
Return at least 5 core features. Be specific and actionable.`,
  },
  architecture: {
    name: 'Drafthouse',
    icon: '⚙️',
    system: `You are Drafthouse — the architecture design agent for Forge Platform.
Design the technical architecture and return ONLY valid JSON with this structure:
{
  "style": "microservices|monolith|serverless|event-driven",
  "mermaid": "graph TD\\n  Client[React Frontend] --> API[API Gateway]\\n  API --> Auth[Auth Service]\\n  ...",
  "tech_stack": {
    "frontend": ["React", "TypeScript"],
    "backend": ["Node.js", "Express"],
    "database": ["PostgreSQL", "Redis"],
    "infrastructure": ["AWS ECS", "Docker"],
    "ai_ml": ["Claude API", "Anthropic SDK"]
  },
  "key_decisions": [
    {"title": "Decision title", "choice": "What was chosen", "rationale": "Why"}
  ],
  "api_design": "REST|GraphQL|gRPC",
  "deployment": "cloud|on-premise|hybrid",
  "estimated_cost": "$X-Y/month"
}
For mermaid: use flowchart TD, include at least 8 nodes showing frontend, API, services, and database layers. Use proper Mermaid syntax with --> arrows and [label] nodes.`,
  },
  prd: {
    name: 'Press',
    icon: '📜',
    system: `You are Press — the documentation agent for Forge Platform. Generate a comprehensive, professional Product Requirements Document in markdown.

Structure:
# [Product Name] — Product Requirements Document

## Executive Summary
(2-3 compelling paragraphs about the product vision)

## The Problem
(Clear articulation of pain points)

## The Solution
(How this product solves the problem uniquely)

## User Personas

### [Persona 1 Name] — [Role]
**Goals:** ...
**Pain Points:** ...
**How Forge Helps:** ...

(2-3 personas)

## Feature Requirements

### MVP (Phase 1)
| Feature | Description | Priority | Effort |
|---------|-------------|----------|--------|
| ... | ... | High | M |

### Phase 2
(Future features)

## Technical Requirements
- Performance: ...
- Security: ...
- Scalability: ...

## Success Metrics & KPIs
| Metric | Target | Measurement |
|--------|--------|-------------|

## Delivery Timeline
| Phase | Duration | Deliverables |
|-------|----------|--------------|

Be detailed, professional, and actionable. This should be ready for stakeholder review.`,
  },
  techspec: {
    name: 'Blueprint',
    icon: '🔧',
    system: `You are Blueprint — the engineering specification agent for Forge Platform.
Generate a comprehensive Technical Specification document in markdown for engineering teams.

Structure it as follows:

# Technical Specification — [Product Name]

## Overview
(2-3 sentence technical summary of what's being built and the core architectural approach)

## System Architecture
(Key architectural patterns, design decisions, and rationale)

## API Contracts
### Endpoints
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|

### Key Request / Response Shapes
(JSON examples for the 3-5 most critical endpoints)

## Data Models
### [Entity Name]
| Field | Type | Required | Description |
|-------|------|----------|-------------|

(Cover all core entities)

## Component Breakdown
### Frontend
(Key components, responsibilities, state management strategy)

### Backend Services
(Services/modules, responsibilities, inter-service communication patterns)

## Integration Points
(Third-party APIs, webhooks, event bus patterns, auth providers)

## Security Implementation
- **Authentication:** ...
- **Authorization:** ...
- **Input validation:** ...
- **Data encryption:** ...
- **Secrets management:** ...

## Infrastructure & Deployment
(Docker setup, CI/CD pipeline, environments, scaling strategy, environment variables needed)

## Error Handling & Observability
(Logging strategy, error response patterns, monitoring approach)

## Development Guidelines
(Project structure, naming conventions, testing strategy, code review process)

Be specific, technical, and immediately actionable by an engineering team. Reference the actual tech stack from the architecture.`,
  },
  tasks: {
    name: 'Mill',
    icon: '⚡',
    system: `You are Mill — the sprint planning agent for Forge Platform.
Break requirements into actionable development work orders. Output in this exact markdown format — no JSON, no preamble:

# Work Orders

**Total Story Points:** X | **Sprints:** X | **Stories:** X

---

## Epic 1: [Epic Title]
> [One sentence describing what this epic delivers]

### [E1-S1] [Story Title]
**Type:** feature | **Priority:** high | **Sprint:** 1 | **Points:** 5
**Tags:** frontend, backend

**User Story**
As a [user role], I want [action] so that [benefit].

**Work Description**
[2-3 sentences describing what needs to be built and how.]

**Acceptance Criteria**
- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] [Specific, testable criterion 3]

---

Repeat the story block for each story. Generate 4 epics with 4-5 stories each. Be specific and developer-actionable.`,
  },
};

// Build message content supporting text + image attachments
function buildMessageContent(textContent, files = []) {
  const content = [];
  if (textContent) content.push({ type: 'text', text: textContent });
  for (const file of files) {
    if (file.type && file.type.startsWith('image/') && file.content) {
      // Strip data URL prefix to get raw base64
      const base64 = file.content.includes(',') ? file.content.split(',')[1] : file.content;
      content.push({ type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } });
    } else if (file.content) {
      content.push({ type: 'text', text: `\n\n[Attached file: ${file.name}]\n${file.content}` });
    }
  }
  return content.length === 1 && content[0].type === 'text' ? content[0].text : content;
}

app.post('/api/forge', async (req, res) => {
  const { input, mode, files = [] } = req.body;
  if (!input?.trim() && files.length === 0) return res.status(400).json({ error: 'Input is required' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  const runAgent = async (agentKey, messages) => {
    const agent = AGENT_PROMPTS[agentKey];
    send({ type: 'agent_start', agent: agentKey, name: agent.name, icon: agent.icon });
    let result = '';
    const start = Date.now();

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: ['prd', 'tasks', 'techspec'].includes(agentKey) ? 4096 : 2048,
      system: agent.system,
      messages,
    });

    stream.on('text', (text) => {
      result += text;
      send({ type: 'agent_text', agent: agentKey, text });
    });

    await stream.finalMessage();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    send({ type: 'agent_done', agent: agentKey, elapsed });
    return result;
  };

  try {
    const modeLabel = mode === 'legacy' ? 'Legacy Modernization' : 'New Product Development';

    // Agent 1: Triage — include any attached files (images/docs) in first message
    const intentRaw = await runAgent('intent', [{
      role: 'user',
      content: buildMessageContent(
        `Analyze this project idea for ${modeLabel}:\n\n${input}`,
        files
      ),
    }]);

    // Agent 2: Drafthouse
    const archRaw = await runAgent('architecture', [{
      role: 'user',
      content: `Design the architecture for this product.\n\nRequirements analysis:\n${intentRaw}\n\nOriginal input:\n${input}`,
    }]);

    // Agent 3: Press
    const prdRaw = await runAgent('prd', [{
      role: 'user',
      content: `Generate a PRD.\n\nRequirements:\n${intentRaw}\n\nArchitecture:\n${archRaw}\n\nOriginal input:\n${input}`,
    }]);

    // Agent 4: Blueprint — tech spec for engineering teams
    const techspecRaw = await runAgent('techspec', [{
      role: 'user',
      content: `Generate a Technical Specification for engineering teams.\n\nRequirements:\n${intentRaw}\n\nArchitecture:\n${archRaw}\n\nPRD:\n${prdRaw}`,
    }]);

    // Agent 5: Mill
    const tasksRaw = await runAgent('tasks', [{
      role: 'user',
      content: `Generate development tasks.\n\nRequirements:\n${intentRaw}\n\nArchitecture:\n${archRaw}`,
    }]);

    const intentData = parseJSON(intentRaw);
    const archData = parseJSON(archRaw);
    const tasksData = parseJSON(tasksRaw);

    send({
      type: 'results',
      data: {
        intent: intentData || intentRaw,
        architecture: archData || archRaw,
        prd: prdRaw,
        techspec: techspecRaw,
        tasks: tasksData || tasksRaw,
      },
    });

    send({ type: 'done' });
  } catch (err) {
    console.error('Forge error:', err);
    send({ type: 'error', message: err.message });
  }

  res.end();
});

// ─── Code Analysis Endpoints ─────────────────────────────────────────────────

const CODE_ANALYSIS_SYSTEM = `You are Bench — the code intelligence agent for Forge Platform, a senior software architect specializing in legacy modernization.
Analyze the provided codebase files/structure and return ONLY valid JSON (no markdown, no explanation):
{
  "repo_name": "detected project name",
  "description": "1-2 sentences about what this application does",
  "tech_stack": {
    "primary_language": "e.g. JavaScript",
    "languages": ["lang1", "lang2"],
    "frameworks": ["React 16", "Express 4"],
    "databases": ["PostgreSQL", "Redis"],
    "infrastructure": ["Docker", "Nginx"],
    "build_tools": ["Webpack", "Maven"],
    "testing": ["Jest", "JUnit"]
  },
  "code_quality": "poor|fair|good|excellent",
  "age_estimate": "e.g. 5-8 years",
  "complexity": "low|medium|high|very_high",
  "file_stats": {
    "structure_summary": "Brief description of directory structure",
    "main_directories": ["src", "lib", "tests"]
  },
  "issues": [
    {"severity": "critical|high|medium|low", "category": "Security|Performance|Maintainability|Compatibility|Testing", "issue": "Specific issue description"}
  ],
  "dependencies": {
    "total": 0,
    "outdated_count": 0,
    "security_vulnerabilities": 0,
    "key_dependencies": ["react@16.14", "spring-boot@2.3"]
  },
  "auto_intent": "A comprehensive modernization description covering: what the app does, current tech stack, detected problems, recommended target architecture (cloud-native, microservices etc), migration strategy (strangler fig vs big-bang), key improvements needed. Write 3-4 detailed sentences that can be used as input for architecture and PRD generation.",
  "modernization_suggestions": [
    {"priority": "critical|high|medium|low", "category": "Architecture|Security|Performance|Developer Experience|Testing|Infrastructure|Database", "title": "Concise title", "description": "What to do, why, and expected impact", "effort": "Small|Medium|Large"}
  ],
  "migration_strategy": "strangler-fig|big-bang|hybrid",
  "migration_complexity": "simple|moderate|complex|very_complex",
  "estimated_effort": "e.g. 3-4 months with 4 engineers",
  "quick_wins": ["Specific actionable quick win 1", "Quick win 2", "Quick win 3"]
}
Be specific and accurate. Base analysis strictly on the provided files. Identify at least 5 issues and 5 modernization suggestions.`;

// Helper: run analysis and stream result
async function streamCodeAnalysis(res, contextText) {
  const send = (data) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`); };

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: CODE_ANALYSIS_SYSTEM,
    messages: [{ role: 'user', content: contextText }],
  });

  let raw = '';
  stream.on('text', (text) => {
    raw += text;
    send({ type: 'text', text });
  });
  await stream.finalMessage();

  const parsed = parseJSON(raw);
  send({ type: 'analysis_complete', data: parsed || raw });
  send({ type: 'done' });
}

// Helper: fetch GitHub repo files
async function fetchGitHubFiles(url) {
  const match = url.match(/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?(?:\/tree\/([^/\s]+))?(?:\/|$)/i);
  if (!match) throw new Error('Invalid GitHub URL. Use: https://github.com/owner/repo');
  const [, owner, repo, branch] = match;

  const headers = { 'User-Agent': 'Forge-Platform/1.0', 'Accept': 'application/vnd.github.v3+json' };
  const base = `https://api.github.com/repos/${owner}/${repo}`;

  const repoRes = await fetch(base, { headers });
  if (!repoRes.ok) throw new Error(`GitHub API error: ${repoRes.status} — repo may be private or not found`);
  const repoInfo = await repoRes.json();

  // Key files to fetch for analysis
  const PRIORITY_FILES = [
    'package.json', 'package-lock.json', 'yarn.lock',
    'pom.xml', 'build.gradle', 'settings.gradle',
    'requirements.txt', 'setup.py', 'Pipfile', 'pyproject.toml',
    'go.mod', 'go.sum', 'Cargo.toml',
    'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
    '.github/workflows', 'Makefile',
    'README.md', 'README.rst', 'ARCHITECTURE.md',
    'src/App.js', 'src/App.tsx', 'src/index.js', 'src/main.js', 'src/main.py',
    'app.py', 'main.py', 'index.js', 'app.js', 'server.js',
    'angular.json', 'vue.config.js', 'next.config.js', 'vite.config.js',
    'webpack.config.js', '.eslintrc.json', 'tsconfig.json',
    'application.yml', 'application.properties',
  ];

  const files = [{ path: '__REPO_META__', content: JSON.stringify({ name: repoInfo.name, description: repoInfo.description, language: repoInfo.language, stars: repoInfo.stargazers_count, updated: repoInfo.updated_at, topics: repoInfo.topics }, null, 2) }];

  for (const filePath of PRIORITY_FILES) {
    try {
      const r = await fetch(`${base}/contents/${filePath}`, { headers });
      if (!r.ok) continue;
      const d = await r.json();
      if (Array.isArray(d)) {
        // directory listing
        const items = d.slice(0, 5).map(f => f.name).join(', ');
        files.push({ path: filePath + '/ (dir)', content: `Directory contents: ${items}` });
      } else if (d.content) {
        const content = Buffer.from(d.content, 'base64').toString('utf-8').slice(0, 3000);
        files.push({ path: filePath, content });
      }
    } catch {}
  }

  // Get file tree
  try {
    const treeRef = branch || repoInfo.default_branch || 'main';
    const treeRes = await fetch(`${base}/git/trees/${treeRef}?recursive=1`, { headers });
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      const paths = (treeData.tree || []).filter(f => f.type === 'blob').map(f => f.path).slice(0, 300).join('\n');
      files.push({ path: '__FILE_TREE__', content: paths });
    }
  } catch {}

  return { files, owner, repo, repoInfo };
}

// POST /api/analyze-github
app.post('/api/analyze-github', async (req, res) => {
  const { url } = req.body;
  if (!url?.trim()) return res.status(400).json({ error: 'GitHub URL is required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`); };

  try {
    send({ type: 'status', message: 'Connecting to GitHub API...' });
    const { files, owner, repo, repoInfo } = await fetchGitHubFiles(url);
    send({ type: 'repo_info', owner, repo, description: repoInfo.description, language: repoInfo.language, files_fetched: files.length - 2 });
    send({ type: 'status', message: `Fetched ${files.length - 2} key files. Starting AI analysis...` });

    const context = `Analyze this GitHub repository: ${owner}/${repo}\n\n` +
      files.map(f => `=== ${f.path} ===\n${f.content}`).join('\n\n');

    await streamCodeAnalysis(res, context);
  } catch (err) {
    console.error('GitHub analyze error:', err);
    send({ type: 'error', message: err.message });
    res.end();
  }
});

// POST /api/analyze-code  (uploaded files / ZIP)
app.post('/api/analyze-code', async (req, res) => {
  const { files, source } = req.body; // files: [{path, content}]
  if (!files?.length) return res.status(400).json({ error: 'No files provided' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`); };

  try {
    send({ type: 'status', message: `Processing ${files.length} files...` });
    send({ type: 'status', message: 'Starting AI code analysis...' });

    const context = `Analyze this uploaded codebase (source: ${source || 'upload'})\n\n` +
      files.slice(0, 30).map(f => `=== ${f.path} ===\n${f.content?.slice(0, 2500) || ''}`).join('\n\n');

    await streamCodeAnalysis(res, context);
  } catch (err) {
    console.error('Code analyze error:', err);
    send({ type: 'error', message: err.message });
    res.end();
  }
});

app.get('/api/health', (_, res) => res.json({ status: 'ok', model: 'claude-sonnet-4-6' }));

// ── ALM Data Sync ─────────────────────────────────────────────────────────────

app.post('/api/alm/sync', (req, res) => {
  const { projects } = req.body;
  if (!Array.isArray(projects)) return res.status(400).json({ error: 'Invalid data' });
  writeProjects(projects);
  res.json({ ok: true });
});

app.get('/api/alm/projects', (_, res) => res.json(readProjects()));

app.patch('/api/alm/stories/:projectId/:versionId/:storyId', (req, res) => {
  const { projectId, versionId, storyId } = req.params;
  const { status, notes } = req.body;
  const valid = ['not_developed', 'in_progress', 'in_review', 'completed', 'removed'];
  if (!valid.includes(status)) return res.status(400).json({ error: `Invalid status. Must be one of: ${valid.join(', ')}` });
  const projects = readProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const version = project.versions.find(v => v.id === versionId);
  if (!version) return res.status(404).json({ error: 'Version not found' });
  if (!version.story_statuses) version.story_statuses = {};
  version.story_statuses[storyId] = { status, updated_at: new Date().toISOString(), notes: notes || null };
  project.updated_at = new Date().toISOString();
  writeProjects(projects);
  res.json({ ok: true, storyId, status });
});

app.get('/api/alm/server-path', (_, res) => {
  res.json({ path: join(__dirname, 'mcp-server.js') });
});

// ── MCP API Key Management ─────────────────────────────────────────────────────

app.post('/api/mcp/keys', (req, res) => {
  const { projectId, projectName } = req.body;
  if (!projectId) return res.status(400).json({ error: 'projectId required' });
  const keys = readKeys();
  const existing = keys.find(k => k.projectId === projectId);
  if (existing) return res.json({ key: existing.key, projectId, projectName: existing.projectName });
  const key = `ff-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
  keys.push({ key, projectId, projectName: projectName || 'Unknown', createdAt: new Date().toISOString() });
  writeKeys(keys);
  res.json({ key, projectId, projectName });
});

app.get('/api/mcp/keys/:projectId', (req, res) => {
  const key = readKeys().find(k => k.projectId === req.params.projectId);
  res.json(key ? { key: key.key } : { key: null });
});

app.delete('/api/mcp/keys/:projectId', (req, res) => {
  writeKeys(readKeys().filter(k => k.projectId !== req.params.projectId));
  res.json({ ok: true });
});

// ── MCP Endpoint (JSON-RPC 2.0 over HTTP) ─────────────────────────────────────

const MCP_TOOLS = [
  {
    name: 'get_project_summary',
    description: 'Get a summary of the Software Factory project: name, version, epic list, and story counts by status.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_work_orders',
    description: 'List work orders (user stories) for the project. Optionally filter by status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status',
          enum: ['not_developed', 'in_progress', 'in_review', 'completed', 'removed'],
        },
      },
    },
  },
  {
    name: 'get_next_work_order',
    description: 'Get the next pending work order and automatically mark it as in_progress. Call this when ready to start working.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_work_order',
    description: 'Get full details of a specific work order by story ID (e.g. E1-S1).',
    inputSchema: {
      type: 'object',
      properties: { story_id: { type: 'string', description: 'The story ID, e.g. E1-S1' } },
      required: ['story_id'],
    },
  },
  {
    name: 'update_work_order_status',
    description: 'Update the status of a work order. Use "in_review" when done and ready for human review.',
    inputSchema: {
      type: 'object',
      properties: {
        story_id: { type: 'string', description: 'The story ID to update' },
        status: { type: 'string', enum: ['not_developed', 'in_progress', 'in_review', 'completed'] },
        notes: { type: 'string', description: 'Optional notes about the work done' },
      },
      required: ['story_id', 'status'],
    },
  },
];

function getMCPProject(projectId) {
  const projects = readProjects();
  const project = projects.find(p => p.id === projectId) || projects[0];
  if (!project) return { project: null, version: null, stories: [] };
  const version = project.versions[project.versions.length - 1] || null;
  const stories = [];
  if (version) {
    for (const epic of (version.artifacts?.tasks?.epics || [])) {
      for (const story of (epic.stories || [])) {
        const st = version.story_statuses?.[story.id];
        stories.push({ ...story, epic_title: epic.title, epic_color: epic.color, version_id: version.id, status: st?.status || 'not_developed', status_notes: st?.notes || null });
      }
    }
    // Markdown-based tasks (Mill format)
    if (stories.length === 0 && typeof version.artifacts?.tasks === 'string') {
      let epicTitle = '';
      for (const line of version.artifacts.tasks.split('\n')) {
        if (line.startsWith('## ')) epicTitle = line.replace(/^## /, '').replace(/^Epic\s*\d*:?\s*/i, '').trim();
        const match = line.match(/^### \[([^\]]+)\] (.+)/);
        if (match) {
          const [, id, title] = match;
          const st = version.story_statuses?.[id];
          stories.push({ id, title, epic_title: epicTitle, version_id: version.id, status: st?.status || 'not_developed', status_notes: st?.notes || null });
        }
      }
    }
  }
  return { project, version, stories };
}

function mcpUpdateStatus(projectId, versionId, storyId, status, notes) {
  const projects = readProjects();
  const version = projects.find(p => p.id === projectId)?.versions.find(v => v.id === versionId);
  if (!version) return false;
  if (!version.story_statuses) version.story_statuses = {};
  version.story_statuses[storyId] = { status, updated_at: new Date().toISOString(), notes: notes || null };
  writeProjects(projects);
  return true;
}

function mcpAuth(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Missing API key' } });
  const key = auth.slice(7);
  const record = readKeys().find(k => k.key === key);
  if (!record) return res.status(401).json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Invalid API key' } });
  req.mcpProjectId = record.projectId;
  next();
}

app.post('/mcp', mcpAuth, (req, res) => {
  const { id, method, params = {} } = req.body;
  const ok = (result) => res.json({ jsonrpc: '2.0', id, result });
  const err = (code, message) => res.json({ jsonrpc: '2.0', id, error: { code, message } });

  if (method === 'initialize') return ok({ protocolVersion: '2024-11-05', serverInfo: { name: 'forge-factory', version: '1.0.0' }, capabilities: { tools: {} } });
  if (method === 'notifications/initialized') return res.status(204).end();
  if (method === 'tools/list') return ok({ tools: MCP_TOOLS });

  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params;
    const { project, version, stories } = getMCPProject(req.mcpProjectId);
    if (!project) return err(-32603, 'No project found. Open the Forge app and forge a project first.');

    const counts = {
      not_developed: stories.filter(s => s.status === 'not_developed').length,
      in_progress: stories.filter(s => s.status === 'in_progress').length,
      in_review: stories.filter(s => s.status === 'in_review').length,
      completed: stories.filter(s => s.status === 'completed').length,
    };

    if (name === 'get_project_summary') {
      return ok({ content: [{ type: 'text', text: JSON.stringify({ project_id: project.id, name: project.name, version: version?.semver || '1.0.0', total_stories: stories.length, story_counts: counts, completion_pct: stories.length ? Math.round((counts.completed / stories.length) * 100) : 0, epics: [...new Set(stories.map(s => s.epic_title).filter(Boolean))] }, null, 2) }] });
    }

    if (name === 'get_work_orders') {
      const list = args.status ? stories.filter(s => s.status === args.status) : stories;
      return ok({ content: [{ type: 'text', text: JSON.stringify({ project: project.name, version: version?.semver, story_counts: counts, stories: list.map(s => ({ id: s.id, title: s.title, epic: s.epic_title, status: s.status, priority: s.priority, story_points: s.story_points, sprint: s.sprint })) }, null, 2) }] });
    }

    if (name === 'get_next_work_order') {
      const next = stories.find(s => s.status === 'not_developed');
      if (!next) return ok({ content: [{ type: 'text', text: 'No pending work orders. All stories are in progress, in review, or completed.' }] });
      mcpUpdateStatus(req.mcpProjectId, next.version_id, next.id, 'in_progress', 'Picked up by coding agent via MCP');
      return ok({ content: [{ type: 'text', text: JSON.stringify({ ...next, status: 'in_progress', message: `Work order ${next.id} is now in_progress. When done, call update_work_order_status with status "in_review".` }, null, 2) }] });
    }

    if (name === 'get_work_order') {
      const story = stories.find(s => s.id === args.story_id);
      if (!story) return err(-32602, `Work order ${args.story_id} not found`);
      return ok({ content: [{ type: 'text', text: JSON.stringify(story, null, 2) }] });
    }

    if (name === 'update_work_order_status') {
      const story = stories.find(s => s.id === args.story_id);
      if (!story) return err(-32602, `Work order ${args.story_id} not found`);
      mcpUpdateStatus(req.mcpProjectId, story.version_id, args.story_id, args.status, args.notes);
      return ok({ content: [{ type: 'text', text: JSON.stringify({ ok: true, story_id: args.story_id, new_status: args.status, message: args.status === 'in_review' ? `Work order ${args.story_id} is now In Review. A human will review your changes in the Planner.` : `Work order ${args.story_id} updated to ${args.status}.` }, null, 2) }] });
    }

    return err(-32601, `Unknown tool: ${name}`);
  }

  return err(-32601, `Unknown method: ${method}`);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🔥 Forge API Server ready → http://localhost:${PORT}`);
  console.log(`   MCP endpoint → http://localhost:${PORT}/mcp`);
  console.log(`   API Key: ${process.env.ANTHROPIC_API_KEY ? '✓ configured' : '✗ missing (set ANTHROPIC_API_KEY)'}\n`);
});
