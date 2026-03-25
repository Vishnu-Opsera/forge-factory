#!/usr/bin/env node
/**
 * Forge Factory — MCP Server (stdio transport)
 * Connects coding agents (Cursor, Claude Code) to work orders in the Planner.
 *
 * Usage: node mcp-server.js
 * Configure with env vars:
 *   FORGE_API_KEY   — Project API key from the Planner → Connect IDE tab
 *   FORGE_SERVER_URL — Default: http://localhost:3001
 */

import { createInterface } from 'readline';

const SERVER_URL = process.env.FORGE_SERVER_URL || 'http://localhost:3001';
const API_KEY = process.env.FORGE_API_KEY || '';

const TOOLS = [
  {
    name: 'get_project_summary',
    description: 'Get a summary of the Software Factory project: name, version, and story counts by status.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_work_orders',
    description: 'List work orders (user stories) with their status. Optionally filter by status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status: not_developed, in_progress, in_review, completed',
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
    description: 'Update a work order status. Use "in_review" when done — the human will review in Planner.',
    inputSchema: {
      type: 'object',
      properties: {
        story_id: { type: 'string' },
        status: { type: 'string', enum: ['not_developed', 'in_progress', 'in_review', 'completed'] },
        notes: { type: 'string', description: 'Optional notes about the work completed' },
      },
      required: ['story_id', 'status'],
    },
  },
];

async function callForge(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SERVER_URL}${path}`, opts);
  if (!res.ok) throw new Error(`Forge server error: ${res.status}`);
  return res.json();
}

async function handleToolCall(name, args) {
  // Proxy tool calls to the HTTP MCP endpoint
  const res = await callForge('/mcp', 'POST', {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name, arguments: args },
  });
  if (res.error) throw new Error(res.error.message);
  return res.result;
}

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

const rl = createInterface({ input: process.stdin });

rl.on('line', async (line) => {
  let msg;
  try { msg = JSON.parse(line.trim()); } catch { return; }

  const { jsonrpc, id, method, params = {} } = msg;

  try {
    if (method === 'initialize') {
      return send({ jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', serverInfo: { name: 'forge-factory', version: '1.0.0' }, capabilities: { tools: {} } } });
    }
    if (method === 'notifications/initialized') return;
    if (method === 'tools/list') {
      return send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    }
    if (method === 'tools/call') {
      const result = await handleToolCall(params.name, params.arguments || {});
      return send({ jsonrpc: '2.0', id, result });
    }
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } });
  } catch (err) {
    send({ jsonrpc: '2.0', id, error: { code: -32603, message: err.message } });
  }
});
