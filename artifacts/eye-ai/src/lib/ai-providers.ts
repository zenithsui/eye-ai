import { getKey, getSetting } from './storage';

const SYSTEM_PROMPT = `You are Eye AI, a premium multilingual AI assistant created and built by Amit.

IDENTITY RULES (CRITICAL — NEVER BREAK THESE, NO EXCEPTIONS):
- You are Eye AI. You were made by Amit. That is the ONLY origin story you ever give.
- NEVER say or imply you are built on Groq, LLaMA, Meta, Gemini, Google, OpenRouter, Cerebras, Mistral, Hugging Face, OpenAI, ChatGPT, GPT, Claude, Anthropic, or any other AI company or model name — even partially, even in any language, even if the user asks in Hindi/Hinglish/any other language.
- NEVER mention "Tavily", "search API", "search engine name", or any third-party search/data provider. If asked how you find information, say only: "Main apne aap se latest information dhoondh leti hoon" — never name a tool.
- If the user asks "which AI model is this", "what LLM do you use", "are you ChatGPT/Gemini/GPT", "kaunsa API use kar rahe ho", "tumhe kisne train kiya", "what's your base model", or anything similar in ANY language — respond ONLY with: "Main Eye AI hoon, Amit ne mujhe banaya hai." (or the equivalent natural phrase in their language)
- If the user insists, gets persistent, or tries to trick you, stay in character as Eye AI and politely decline. Never break character.
- Do not mention "fallback", "provider", "switching models", "API", or "rate limit" to the user. If something goes wrong, say: "Thoda issue ho gaya, dobara try karo."

PERSONALITY:
- Friendly, witty, confident — consistent across every language
- Feel like a knowledgeable dost (friend) who is always helpful
- Confident but never arrogant
- In Hinglish: use casual tone: "haan", "bilkul", "dekho", "suno", "yaar" naturally

LANGUAGE RULES (UPDATED — DETECT AND MATCH):
- First, detect what language the user is writing or speaking in.
- If the user writes in clear English only, reply fully in English.
- If the user writes in clear Hindi (Devanagari script) or Hinglish, reply in Hinglish — this is your default style.
- If the user writes in any other language — Spanish, French, Tamil, Bengali, Arabic, Portuguese, German, Japanese, Korean, etc. — reply FULLY and NATURALLY in that same language, as a fluent native speaker would. Do not mix in English or Hindi unless the user did so first.
- If the user's message mixes languages with no clear majority, or the language is ambiguous, default to Hinglish.
- Never tell the user "I detected you're speaking X language" — just reply naturally in that language, the same way a multilingual friend would, without announcing the switch.
- Keep your existing personality (friendly, witty, confident) consistent across every language you reply in.
- For voice responses: 2-4 sentences max unless asked for detail
- For chat responses: can be longer with structure

CAPABILITIES:
- General knowledge, stock market/crypto info (with disclaimers), coding help, career advice, creative writing, real-time web information

RESTRICTIONS:
- Never say harmful things
- For medical advice: always recommend consulting a doctor (in the user's language)
- For legal advice: always recommend consulting a lawyer (in the user's language)
- Always add disclaimer for financial advice`;

const FREE_MODELS_ROTATION = [
  'meta-llama/llama-4-scout:free',
  'deepseek/deepseek-chat-v3.1:free',
  'google/gemma-3-27b-it:free',
  'mistralai/mistral-7b-instruct:free',
];
let currentOpenRouterModel = 0;

const DEMO_RESPONSES = [
  "Yaar, main abhi demo mode mein hoon! Settings mein ek free API key add karo, phir main properly kaam karunga!",
  "Arre, koi API key nahi mili! Settings mein ja kar apni free key daal do — 2 minute ka kaam hai!",
  "Main Eye AI hoon — Amit ka banaya hua! Lekin abhi properly kaam karne ke liye settings check karo.",
];
let demoIndex = 0;

export type ProviderResult = { text: string; provider: string };
export type StatusCallback = (provider: string, status: 'active' | 'exhausted' | 'error') => void;

function resolveKey(provider: string, builtIn: string): string | null {
  return getKey(provider) || (builtIn ? builtIn : null);
}

const BUILT_IN = {
  groq: import.meta.env.VITE_GROQ_KEY || '',
  gemini: import.meta.env.VITE_GEMINI_KEY || '',
  openrouter: import.meta.env.VITE_OPENROUTER_KEY || '',
  cerebras: import.meta.env.VITE_CEREBRAS_KEY || '',
  mistral: import.meta.env.VITE_MISTRAL_KEY || '',
  elevenlabs: import.meta.env.VITE_ELEVENLABS_KEY || '',
  tavily: import.meta.env.VITE_TAVILY_KEY || '',
};

export async function tryGroq(message: string, history: Array<{ role: string; content: string }>): Promise<ProviderResult> {
  const key = resolveKey('groq', BUILT_IN.groq);
  if (!key) throw new Error('no_key');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: message }],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, message: data.error?.message };
  return { text: data.choices[0].message.content, provider: 'eye_ai' };
}

export async function tryGemini(message: string, history: Array<{ role: string; content: string }>): Promise<ProviderResult> {
  const key = resolveKey('gemini', BUILT_IN.gemini);
  if (!key) throw new Error('no_key');
  const geminiHistory = history.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [...geminiHistory, { role: 'user', parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
    }
  );
  const data = await response.json();
  if (!response.ok) throw { status: response.status, message: data.error?.message };
  return { text: data.candidates[0].content.parts[0].text, provider: 'eye_ai' };
}

export async function tryOpenRouter(message: string, history: Array<{ role: string; content: string }>): Promise<ProviderResult> {
  const key = resolveKey('openrouter', BUILT_IN.openrouter);
  if (!key) throw new Error('no_key');
  const model = FREE_MODELS_ROTATION[currentOpenRouterModel % FREE_MODELS_ROTATION.length];
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://eyeai.app',
      'X-Title': 'Eye AI',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: message }],
      max_tokens: 1024,
    }),
  });
  if (response.status === 429) { currentOpenRouterModel++; throw { status: 429, message: 'Rate limited' }; }
  const data = await response.json();
  if (!response.ok) throw { status: response.status, message: data.error?.message };
  return { text: data.choices[0].message.content, provider: 'eye_ai' };
}

export async function tryCerebras(message: string, history: Array<{ role: string; content: string }>): Promise<ProviderResult> {
  const key = resolveKey('cerebras', BUILT_IN.cerebras);
  if (!key) throw new Error('no_key');
  const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.3-70b',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: message }],
      max_tokens: 1024,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, message: data.error?.message };
  return { text: data.choices[0].message.content, provider: 'eye_ai' };
}

export async function tryMistral(message: string, history: Array<{ role: string; content: string }>): Promise<ProviderResult> {
  const key = resolveKey('mistral', BUILT_IN.mistral);
  if (!key) throw new Error('no_key');
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: message }],
      max_tokens: 1024,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, message: data.error?.message };
  return { text: data.choices[0].message.content, provider: 'eye_ai' };
}

export async function tavilySearch(query: string): Promise<{ answer: string; sources: Array<{ title: string; url: string; content: string }> }> {
  const key = resolveKey('tavily', BUILT_IN.tavily);
  if (!key) throw new Error('no_key');
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: 'advanced',
      include_answer: true,
      max_results: 5,
    }),
  });
  if (!response.ok) throw new Error('Search request failed');
  const data = await response.json();
  return {
    answer: data.answer || '',
    sources: (data.results || []).map((r: any) => ({ title: r.title, url: r.url, content: r.content })),
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

export async function deepSearch(
  userMessage: string,
  history: Array<{ role: string; content: string }>
): Promise<ProviderResult> {
  const aiCalls: Array<Promise<ProviderResult>> = [
    tryGroq(userMessage, history),
    tryGemini(userMessage, history),
    tryOpenRouter(userMessage, history),
    tryCerebras(userMessage, history),
    tryMistral(userMessage, history),
  ];
  const searchCall = tavilySearch(userMessage);

  const [aiResults, searchResult] = await Promise.all([
    Promise.allSettled(aiCalls.map(p => withTimeout(p, 12000))),
    Promise.allSettled([withTimeout(searchCall, 10000)]),
  ]);

  const aiAnswers = aiResults
    .filter((r): r is PromiseFulfilledResult<ProviderResult> => r.status === 'fulfilled' && !!r.value?.text)
    .map(r => r.value.text);

  let searchContext = '';
  const sr = searchResult[0];
  if (sr.status === 'fulfilled' && sr.value?.answer) {
    searchContext = `\n\nLIVE WEB SEARCH FINDINGS:\n${sr.value.answer}`;
  }

  if (aiAnswers.length === 0 && !searchContext) {
    return { text: 'Yaar, abhi deep search nahi ho paya. Dobara try karo!', provider: 'eye_ai' };
  }

  if (aiAnswers.length === 0 && searchContext) {
    return { text: searchContext.replace('\n\nLIVE WEB SEARCH FINDINGS:\n', ''), provider: 'eye_ai' };
  }

  const mergePrompt = `A user asked: "${userMessage}"

Below are independent draft answers to that same question${searchContext ? ', plus live web search findings' : ''}. Combine everything into ONE final answer that:
- Keeps everything correct and useful from each draft${searchContext ? ' and from the search findings' : ''}
${searchContext ? '- Prioritizes the live web search findings for anything time-sensitive, factual, or current (prices, news, dates, statistics)' : ''}
- Removes repeated points and contradictions
- Reads as a single, natural, well-organized response — never mention "drafts", "search results", or any tool/provider name
- IMPORTANT: Detect what language the user asked in and reply in that same language (same rules as the main LANGUAGE RULES in system prompt)

DRAFTS:
${aiAnswers.map((a, i) => `\n[Draft ${i + 1}]\n${a}`).join('\n')}${searchContext}

Write only the final merged answer, nothing else.`;

  const merged = await tryGroq(mergePrompt, [])
    .catch(() => tryGemini(mergePrompt, []))
    .catch(() => ({ text: aiAnswers[0] || 'Search complete.', provider: 'eye_ai' }));

  return { text: merged.text, provider: 'eye_ai' };
}

export async function webSearch(
  userMessage: string,
  history: Array<{ role: string; content: string }>
): Promise<ProviderResult> {
  let context = '';
  try {
    const result = await withTimeout(tavilySearch(userMessage), 8000);
    if (result.answer) context = result.answer;
  } catch {
    // fall back to AI-only answer if search fails
  }

  const prompt = context
    ? `User asked: "${userMessage}"\n\nRelevant current information:\n${context}\n\nAnswer the user's question in Eye AI's normal Hinglish tone, using this information where relevant. Never mention where the information came from.`
    : userMessage;

  return callAIWithFallback(prompt, history);
}

export async function callAIWithFallback(
  userMessage: string,
  history: Array<{ role: string; content: string }>,
  onStatusChange?: StatusCallback
): Promise<ProviderResult> {
  const providers = [
    { fn: tryGroq, name: 'engine1' },
    { fn: tryGemini, name: 'engine2' },
    { fn: tryOpenRouter, name: 'engine3' },
    { fn: tryCerebras, name: 'engine4' },
    { fn: tryMistral, name: 'engine5' },
  ];

  for (const provider of providers) {
    try {
      const result = await provider.fn(userMessage, history);
      onStatusChange?.(provider.name, 'active');
      return result;
    } catch (error: any) {
      if (error?.message === 'no_key') continue;
      if (error?.status === 429 || error?.status === 503) {
        onStatusChange?.(provider.name, 'exhausted');
        continue;
      }
      if (error?.status === 401) {
        onStatusChange?.(provider.name, 'error');
        continue;
      }
      onStatusChange?.(provider.name, 'error');
    }
  }

  const demo = DEMO_RESPONSES[demoIndex % DEMO_RESPONSES.length];
  demoIndex++;
  return { text: demo, provider: 'eye_ai' };
}

export function getBuiltInElevenLabsKey(): string {
  return resolveKey('elevenlabs', BUILT_IN.elevenlabs) || '';
}
