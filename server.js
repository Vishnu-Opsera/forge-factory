import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import cors from 'cors';

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

app.post('/api/forge', async (req, res) => {
  const { input, mode } = req.body;
  if (!input?.trim()) return res.status(400).json({ error: 'Input is required' });
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
      max_tokens: agentKey === 'prd' || agentKey === 'tasks' ? 4096 : 2048,
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

    // Agent 1: Intent
    const intentRaw = await runAgent('intent', [{
      role: 'user',
      content: `Analyze this project idea for ${modeLabel}:\n\n${input}`,
    }]);

    // Agent 2: Architecture
    const archRaw = await runAgent('architecture', [{
      role: 'user',
      content: `Design the architecture for this product.\n\nRequirements analysis:\n${intentRaw}\n\nOriginal input:\n${input}`,
    }]);

    // Agent 3: PRD
    const prdRaw = await runAgent('prd', [{
      role: 'user',
      content: `Generate a PRD.\n\nRequirements:\n${intentRaw}\n\nArchitecture:\n${archRaw}\n\nOriginal input:\n${input}`,
    }]);

    // Agent 4: Tasks
    const tasksRaw = await runAgent('tasks', [{
      role: 'user',
      content: `Generate development tasks.\n\nRequirements:\n${intentRaw}\n\nArchitecture:\n${archRaw}`,
    }]);

    // Parse and send final structured results
    const intentData = parseJSON(intentRaw);
    const archData = parseJSON(archRaw);
    const tasksData = parseJSON(tasksRaw);

    send({
      type: 'results',
      data: {
        intent: intentData || intentRaw,
        architecture: archData || archRaw,
        prd: prdRaw,
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🔥 Forge API Server ready → http://localhost:${PORT}`);
  console.log(`   API Key: ${process.env.ANTHROPIC_API_KEY ? '✓ configured' : '✗ missing (set ANTHROPIC_API_KEY)'}\n`);
});
