import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 1. DEFINE the function 
async function askWithRetry(question, maxTries = 3) {
  for (const model of MODELS) {                       
    for (let attempt = 1; attempt <= maxTries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,                                          
          contents: question,
        });
        console.log(`(answered by ${model})`);
        return response.text;
      } catch (err) {
        const canRetry = err.status === 503 || err.status >= 500;
        console.log(`${model} attempt ${attempt} failed (${err.status}).`);
        if (!canRetry) break;                             
        await sleep(2000 * attempt);
      }
    }
  }
  throw new Error('All models failed');                
}

// 2. CALL the function (outside, at the bottom) 
const answer = await askWithRetry('What is the capital of France?');
console.log(answer);