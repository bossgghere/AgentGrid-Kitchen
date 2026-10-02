import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.MODEL || "gpt-4o";

export async function complete(prompt, maxTokens = 4096) {
  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices[0].message.content;
}

export const info = { name: "OpenAI", model: MODEL };
