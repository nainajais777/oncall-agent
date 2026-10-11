import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function callModel(request, maxTries = 3) {
  let lastErr;
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= maxTries; attempt++) {
      try {
        const response = await ai.models.generateContent({ model, ...request });
        console.log(`(answered by ${model})`);
        return response;                                   // ← full response, not just text (Q: why? see below)
      } catch (err) {
        lastErr = err;
        console.log(`${model} attempt ${attempt} failed (${err.status}).`);
const isClientError = err.status >= 400 && err.status < 500;
if (isClientError && err.status !== 404 && err.status !== 429) throw err;  
        if (attempt < maxTries) await sleep(2000 * attempt);
      }
    }
  }
  throw new Error(`All models failed. Last error: ${lastErr?.status} ${lastErr?.message}`);  // Q3
}