import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

// Free-tier model on Google AI Studio (no credit card required): 1,500
// requests/day, 15 RPM, 1M TPM as of mid-2026. Supports both text and
// vision (receipt photos) in the same model.
export const GEMINI_MODEL = "gemini-2.5-flash";
