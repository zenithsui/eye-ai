import { getKey } from "./storage";
import { BUILT_IN_KEYS } from "./built-in-keys";

export interface ProviderResult {
  text: string;
  provider: string;
}

export type StatusCallback = (provider: string, status: "active" | "exhausted" | "error") => void;

async function resolveKey(provider: keyof typeof BUILT_IN_KEYS): Promise<string | null> {
  const stored = await getKey(provider);
  if (stored && stored.length > 4) return stored;
  const builtin = BUILT_IN_KEYS[provider];
  return builtin && builtin.length > 4 ? builtin : null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

const SYSTEM_PROMPT = `You are Eye AI, a premium multilingual AI assistant created and built by Amit.

IDENTITY RULES (NEVER BREAK):
- You are Eye AI made by Amit. NEVER mention Groq, Gemini, OpenRouter, Meta, LLaMA, or any other AI provider.
- If asked which model/AI you are, reply: "Main Eye AI hoon, Amit ne mujhe banaya hai."

PERSONALITY:
- Friendly, warm, witty — like a knowledgeable dost (friend)
- Mix Hinglish naturally; default to Hinglish if language is ambiguous

RESPONSE FORMAT:
[CHAT MODE] — Full, detailed, structured markdown: headings, bullets, bold, code blocks
[VOICE MODE] — 2–4 short sentences only, no markdown, natural spoken Hinglish`;

const FREE_MODELS = [
  "meta-llama/llama-4-scout:free",
  "deepseek/deepseek-chat-v3.1:free",
  "google/gemma-3-27b-it:free",
];
let orModel = 0;

// ─── Individual providers ───────────────────────────────────────────────────

async function tryGroq(
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<ProviderResult> {
  const key = await resolveKey("groq");
  if (!key) throw new Error("no_key");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: message }],
      max_tokens: 1500,
      temperature: 0.7,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, message: data.error?.message };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("empty_response");
  return { text, provider: "eye_ai" };
}

async function tryOpenRouter(
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<ProviderResult> {
  const key = await resolveKey("openrouter");
  if (!key) throw new Error("no_key");
  const model = FREE_MODELS[orModel % FREE_MODELS.length];
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://eyeai.app",
      "X-Title": "Eye AI",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: message }],
      max_tokens: 1500,
    }),
  });
  if (response.status === 429) { orModel++; throw { status: 429 }; }
  const data = await response.json();
  if (!response.ok) { orModel++; throw { status: response.status, message: data.error?.message }; }
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("empty_response");
  return { text, provider: "eye_ai" };
}

async function tryGemini(
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<ProviderResult> {
  const key = await resolveKey("gemini");
  if (!key) throw new Error("no_key");
  const geminiHistory = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [...geminiHistory, { role: "user", parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 1500, temperature: 0.7 },
      }),
    }
  );
  const data = await response.json();
  if (!response.ok) throw { status: response.status, message: data.error?.message };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("empty_response");
  return { text, provider: "eye_ai" };
}

async function tryCerebras(
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<ProviderResult> {
  const key = await resolveKey("cerebras");
  if (!key) throw new Error("no_key");
  const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: message }],
      max_tokens: 1500,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, message: data.error?.message };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("empty_response");
  return { text, provider: "eye_ai" };
}

async function tryMistral(
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<ProviderResult> {
  const key = await resolveKey("mistral");
  if (!key) throw new Error("no_key");
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: message }],
      max_tokens: 1500,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, message: data.error?.message };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("empty_response");
  return { text, provider: "eye_ai" };
}

const DEMO_RESPONSES = [
  "Yaar, abhi thoda network issue lag raha hai. Ek second mein dobara try karo!",
  "Arre, kuch gadbad ho gayi. Dobara message bhejo yaar!",
  "Main Eye AI hoon — Amit ka banaya hua! Thoda wait karo, phir se try karo.",
];
let demoIndex = 0;

// ─── Chat: Groq first, then OpenRouter, Cerebras, Mistral, Gemini ────────────

export async function callAIWithFallback(
  userMessage: string,
  history: Array<{ role: string; content: string }>,
  onStatusChange?: StatusCallback
): Promise<ProviderResult> {
  const modeInstruction =
    "[CHAT MODE: Give a full, detailed, structured answer using markdown formatting — headings, bullets, bold, code blocks as needed. Thorough Hinglish response.]";
  const messageWithMode = `${modeInstruction}\n\n${userMessage}`;
  const TIMEOUT = 20000;

  const providers = [
    { fn: tryGroq, name: "engine1" },
    { fn: tryOpenRouter, name: "engine2" },
    { fn: tryCerebras, name: "engine3" },
    { fn: tryMistral, name: "engine4" },
    { fn: tryGemini, name: "engine5" },
  ];

  for (const provider of providers) {
    try {
      const result = await withTimeout(provider.fn(messageWithMode, history), TIMEOUT);
      onStatusChange?.(provider.name, "active");
      return result;
    } catch (error: any) {
      const msg = error?.message ?? "";
      if (msg === "no_key" || msg === "empty_response") continue;
      if (error?.status === 429 || error?.status === 503 || error?.status === 529) {
        onStatusChange?.(provider.name, "exhausted");
        continue;
      }
      if (error?.status === 401 || error?.status === 403) {
        onStatusChange?.(provider.name, "error");
        continue;
      }
      console.error(`[Eye AI] ${provider.name} error:`, msg);
      onStatusChange?.(provider.name, "error");
      continue;
    }
  }

  const demo = DEMO_RESPONSES[demoIndex % DEMO_RESPONSES.length];
  demoIndex++;
  return { text: demo, provider: "eye_ai" };
}

// ─── Deep Search: all providers parallel + merge ──────────────────────────────

export async function deepSearch(
  userMessage: string,
  history: Array<{ role: string; content: string }>
): Promise<ProviderResult> {
  const DEEP_TIMEOUT = 15000;
  const modeInstruction =
    "[CHAT MODE: Full detailed structured markdown response. Thorough Hinglish like ChatGPT/Gemini.]";
  const messageWithMode = `${modeInstruction}\n\n${userMessage}`;

  const aiCalls = [
    withTimeout(tryGroq(messageWithMode, history), DEEP_TIMEOUT),
    withTimeout(tryOpenRouter(messageWithMode, history), DEEP_TIMEOUT),
    withTimeout(tryCerebras(messageWithMode, history), DEEP_TIMEOUT),
    withTimeout(tryMistral(messageWithMode, history), DEEP_TIMEOUT),
    withTimeout(tryGemini(messageWithMode, history), DEEP_TIMEOUT),
  ];

  const results = await Promise.allSettled(aiCalls);
  const aiAnswers = results
    .filter(
      (r): r is PromiseFulfilledResult<ProviderResult> =>
        r.status === "fulfilled" && !!r.value?.text && r.value.text.length > 20
    )
    .map((r) => r.value.text);

  if (aiAnswers.length === 0) {
    return await callAIWithFallback(userMessage, history);
  }

  if (aiAnswers.length === 1) {
    return { text: aiAnswers[0], provider: "eye_ai" };
  }

  // Merge into one best answer
  const mergePrompt = `[CHAT MODE: Full structured markdown]\n\nUser asked: "${userMessage}"

Combine these ${aiAnswers.length} drafts into ONE comprehensive final answer. Keep all correct info, remove duplicates, format with headings/bullets/bold. Reply in the same language as the question.

${aiAnswers.map((a, i) => `[Draft ${i + 1}]\n${a}`).join("\n\n")}

Write only the final merged answer.`;

  return callAIWithFallback(mergePrompt, []);
}
