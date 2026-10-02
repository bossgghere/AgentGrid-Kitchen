import { GoogleGenerativeAI } from "@google/generative-ai";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = process.env.MODEL || "gemini-1.5-pro";

export async function complete(prompt, maxTokens = 4096) {
  const model = client.getGenerativeModel({
    model: MODEL,
    generationConfig: { maxOutputTokens: maxTokens },
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export const info = { name: "Gemini", model: MODEL };
