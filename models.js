import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
for await (const m of await ai.models.list()) {
  if (m.name.includes('flash')) console.log(m.name);
}