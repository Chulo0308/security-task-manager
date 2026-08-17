import { GoogleGenAI } from "@google/genai";

// This is the ONLY function that knows which AI provider we use.
// To switch providers later (e.g. to Claude), rewrite just this function —
// everything that calls askAssistant() stays exactly the same.

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function askAssistant(systemPrompt: string, userMessage: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return "Vigil isn't configured yet — the API key is missing.";
  }
  try {
    const response = await client.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 600,
      },
    });
    return response.text || "I couldn't come up with a response to that.";
  } catch (e) {
    console.error("Vigil (Gemini) error:", e);
    return "Vigil is having trouble responding right now — please try again shortly.";
  }
}

