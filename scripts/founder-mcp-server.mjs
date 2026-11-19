#!/usr/bin/env node
// Minimal stdio MCP server for the AppsWorld founder flow.
// It deliberately delegates execution to the audited founder-command adapter.
import {spawn} from 'node:child_process';

const tools = [{
  name: 'appsworld_founder_flow',
  description: 'Run the AppsWorld AI Organization founder flow and return auditable workflow evidence. Use this for natural founder product requests.',
  inputSchema: {type: 'object', properties: {
    action: {type: 'string', enum: ['discover','decision','approve','plan','route','test','status'], description: 'Workflow action'},
    idea: {type: 'string'}, idea_id: {type: 'string'}, decision: {type: 'string'},
    product_repo: {type: 'string'}, feature_id: {type: 'string'}, test_id: {type: 'string'},
    session_id: {type: 'string'}, response_id: {type: 'string'}
  }, required: ['action']}
}];

const send = (message) => process.stdout.write(JSON.stringify(message) + '\n');
const run = (input) => new Promise((resolve) => {
  const args = [input.action];
  for (const [key, value] of Object.entries(input)) {
    if (key !== 'action' && value !== undefined && value !== null && value !== '') args.push(`--${key}=${value}`);
  }
  const child = spawn(process.execPath, ['scripts/founder-command.mjs', ...args], {stdio: ['ignore','pipe','pipe']});
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => stdout += chunk);
  child.stderr.on('data', chunk => stderr += chunk);
  child.on('close', code => resolve({code, stdout: stdout.trim(), stderr: stderr.trim()}));
});

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newline).trim(); buffer = buffer.slice(newline + 1);
    if (!line) continue;
    let request;
    try { request = JSON.parse(line); } catch { continue; }
    if (request.method === 'initialize') {
      send({jsonrpc:'2.0', id:request.id, result:{protocolVersion:'2024-11-05', capabilities:{tools:{}}, serverInfo:{name:'appsworld-ai-org',version:'1.0.0'}}});
    } else if (request.method === 'notifications/initialized') {
      // notification: no response
    } else if (request.method === 'tools/list') {
      send({jsonrpc:'2.0', id:request.id, result:{tools}});
    } else if (request.method === 'tools/call') {
      const input = request.params?.arguments ?? {};
      if (request.params?.name !== 'appsworld_founder_flow' || !tools[0].inputSchema.properties.action.enum.includes(input.action)) {
        send({jsonrpc:'2.0', id:request.id, error:{code:-32602,message:'Unknown tool or action'}}); continue;
      }
      run(input).then(result => send({jsonrpc:'2.0', id:request.id, result:{isError:result.code !== 0, content:[{type:'text',text:result.stdout || result.stderr || JSON.stringify(result)}]}}));
    } else if (request.id !== undefined) {
      send({jsonrpc:'2.0', id:request.id, error:{code:-32601,message:'Method not found'}});
    }
  }
});
