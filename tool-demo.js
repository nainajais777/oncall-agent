import fs from 'node:fs';                                    // NEW
import path from 'node:path';                                // NEW
import { Type } from '@google/genai';
import { callModel } from './llm.js';

// NEW: the real function (Gemini's "hands"), with a safety check
const SAFE_DIR = path.resolve('sample-api');
function readFile({ path: filePath }) {
  const full = path.resolve(filePath);
  if (!full.startsWith(SAFE_DIR + path.sep)) {
    return { error: `Access denied: ${filePath} is outside sample-api/` };   // your answer to Q2
  }
  try {
    return { content: fs.readFileSync(full, 'utf8') };
  } catch (err) {
    return { error: err.message };       // never crash: tell Gemini what went wrong
  }
}

const readFileTool = {
  name: 'read_file',
  description: 'Read a source code file from the project. Use it to inspect code before suggesting a fix.',
  parameters: {
    type: Type.OBJECT,
    properties: { path: { type: Type.STRING, description: 'File path, e.g. sample-api/crops.js' } },
    required: ['path'],
  },
};
// NEW: conversation history as an array
const contents = [
  { role: 'user', parts: [{ text: 'My API crashes with: TypeError: Cannot read properties of undefined (reading "needMm") at sample-api/crops.js:5. Find the cause and suggest the fix.' }] },
];
const config = { tools: [{ functionDeclarations: [readFileTool] }] };

// Call 1: Gemini asks for a tool
const first = await callModel({ contents, config });
const call = first.functionCalls?.[0];
console.log('1️⃣ Gemini asks:', call?.name, call?.args);

// We run the tool
const result = readFile(call.args);
console.log('2️⃣ Tool result:', result);

// Add both to the history: Gemini's request + our result
contents.push(first.candidates[0].content);
contents.push({
  role: 'user',
  parts: [{ functionResponse: { name: call.name, id: call.id, response: result } }],
});

// Call 2: Gemini now sees the code and answers
const second = await callModel({ contents, config });
console.log('3️⃣ Final answer:\n', second.text);