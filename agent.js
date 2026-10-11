import fs from 'node:fs';
import path from 'node:path';
import { Type } from '@google/genai';
import { callModel } from './llm.js';
import { span, flush, shutdown } from 'neatlogs';
const SAFE_DIR = path.resolve('sample-api');
function readFile({ path: filePath }) {
  const full = path.resolve(filePath);
  if (!full.startsWith(SAFE_DIR + path.sep)) {
    return { error: `Access denied: ${filePath} is outside sample-api/` };
  }
  try {
    return { content: fs.readFileSync(full, 'utf8') };
  } catch (err) {
    return { error: err.message };
  }
}

// ═══ CHANGE 1: NEW second tool ═══════════════════════════════════
// WHY: Gemini won't know which file has the bug, so it needs a way to look around.
function listFiles() {
  return { files: fs.readdirSync(SAFE_DIR).map((f) => `sample-api/${f}`) };
}
// ══════════════════════════════════════════════════════════════════

const readFileTool = {
  name: 'read_file',
  description: 'Read a source code file from the project. Use it to inspect code before suggesting a fix.',
  parameters: {
    type: Type.OBJECT,
    properties: { path: { type: Type.STRING, description: 'File path, e.g. sample-api/crops.js' } },
    required: ['path'],
  },
};

// ═══ CHANGE 1 (continued): menu card + name→function map ═════════
const listFilesTool = {
  name: 'list_files',
  description: 'List all source files of the API. Use it first when you do not know which file has the problem.',
  parameters: { type: Type.OBJECT, properties: {} },   // no input needed
};

// WHY: the loop gets a tool NAME from Gemini ("read_file") and must find the real function.
//const tools = { read_file: readFile, list_files: listFiles };
const tools = {
  read_file: span({ kind: 'TOOL', toolName: 'read_file' }, readFile),
  list_files: span({ kind: 'TOOL', toolName: 'list_files' }, listFiles),
};
const runAgent = span({ kind: 'WORKFLOW', name: 'incident_response' }, async () => {
// ══════════════════════════════════════════════════════════════════

// ═══ CHANGE 2: question WITHOUT file name + both tools ════════════
// WHY: if we tell Gemini the file, it skips exploring. We want to see it plan by itself.
const contents = [
  { role: 'user', parts: [{ text: 'My API crashes with: TypeError: Cannot read properties of undefined (reading "needMm"). Find the cause and suggest the fix.' }] },
];
const config = { tools: [{ functionDeclarations: [readFileTool, listFilesTool] }] };
// ══════════════════════════════════════════════════════════════════

// ═══ CHANGE 3: DELETE everything from "// Call 1" to the end,
//               and put this loop instead ════════════════════════
// WHY: Call 1 + Call 2 was fixed at 2 steps. A loop repeats as many times as needed.
const MAX_STEPS = 8;
let finished = false;
for (let step = 1; step <= MAX_STEPS; step++) {
  const response = await callModel({ contents, config });
  const calls = response.functionCalls ?? [];

  // Exit: Gemini wrote text instead of asking for a tool → job done
  if (calls.length === 0) {
    console.log(`\n✅ Done after ${step} steps:\n`, response.text);
        finished = true;
    break;
  }

  // Same as before: save what Gemini asked (it has no memory)
  contents.push(response.candidates[0].content);

  // Same as before, but for ANY tool and ANY number of requests
    const parts = [];
  for (const call of calls) {
    console.log(`🔧 Step ${step}: ${call.name}`, call.args);
    const fn = tools[call.name];
    const result = fn ? await fn(call.args) : { error: `Unknown tool: ${call.name}` };
    parts.push({ functionResponse: { name: call.name, id: call.id, response: result } });
  }
  // Same as before: send the results back
  contents.push({ role: 'user', parts });
}
if (!finished) {
  console.log(`\n Gave up after ${MAX_STEPS} steps. Escalating to a human.`);
}
});

await runAgent();
await flush();
await shutdown();