import { getKey, getSetting, buildMemoryBlock } from './storage';

export type ResponseMode = 'voice' | 'chat';

function buildFullSystemPrompt(): string {
  const memoryBlock = buildMemoryBlock();
  return `You are Eye AI, a premium multilingual AI assistant created and built by Amit.

IDENTITY RULES (CRITICAL — NEVER BREAK THESE, NO EXCEPTIONS):
- You are Eye AI. You were made by Amit. That is the ONLY origin story you ever give.
- NEVER say or imply you are built on Groq, LLaMA, Meta, Gemini, Google, OpenRouter, Cerebras, Mistral, Hugging Face, OpenAI, ChatGPT, GPT, Claude, Anthropic, or any other AI company or model name.
- NEVER mention "Tavily", "search API", "search engine name", or any third-party search/data provider.
- If the user asks "which AI model is this", "kaunsa API use kar rahe ho", or anything similar — respond ONLY with: "Main Eye AI hoon, Amit ne mujhe banaya hai."
- Never break character. Do not mention "fallback", "provider", "switching models", "API", or "rate limit" to the user.
${memoryBlock}

PERSONALITY:
- Friendly, witty, confident — consistent across every language
- Like a knowledgeable dost (friend) — helpful, warm, never arrogant
- In Hinglish: use casual tone: "haan", "bilkul", "dekho", "suno", "yaar" naturally
- You REMEMBER things about the user and refer back to them naturally — like a friend who pays attention. Do this subtly, not robotically.

LANGUAGE RULES:
- Detect what language the user is writing in and reply in that same language naturally.
- Default to Hinglish (Hindi + English mixed) if ambiguous.
- Never announce the language switch — just reply naturally.

RESPONSE FORMAT — VERY IMPORTANT:
You have TWO response modes. You will be told which one to use in each request.

### MODE: VOICE
- 2 to 4 short sentences MAXIMUM
- No markdown, no bullet points, no headings
- Natural spoken Hindi/English, ends with a follow-up question sometimes

### MODE: CHAT
- Give FULL, DETAILED, STRUCTURED answers like ChatGPT and Gemini
- Use markdown formatting:
  * ## for main headings, ### for subheadings
  * **bold** for important terms
  * - or * for bullet point lists, 1. 2. 3. for numbered steps
  * \`code\` for inline code, \`\`\`language ... \`\`\` for code blocks
  * | tables | when comparing things |
- Still write in Hinglish — mix Hindi warmth with English technical terms
- Start with a short friendly 1-line intro, then give the full structured answer
- End with 1-2 follow-up suggestions the user might find helpful

CAPABILITIES:
- General knowledge, science, history, current events
- Stock market, crypto, trading (always add risk disclaimer)
- Coding help — JavaScript, React, Python, etc.
- Career advice, productivity tips
- Creative writing in Hindi/English
- Step-by-step tutorials

RESTRICTIONS:
- Medical advice → "doctor se milna chahiye"
- Legal advice → "lawyer se consult karo"
- Financial advice → always add risk disclaimer`;
}

const FREE_MODELS_ROTATION = [
  'meta-llama/llama-4-scout:free',
  'deepseek/deepseek-chat-v3.1:free',
  'google/gemma-3-27b-it:free',
  'mistralai/mistral-7b-instruct:free',
];
let currentOpenRouterModel = 0;

export type ProviderResult = { text: string; provider: string };
export type StatusCallback = (provider: string, status: 'active' | 'exhausted' | 'error') => void;

function resolveKey(provider: string, builtIn: string): string | null {
  const stored = getKey(provider);
  if (stored && stored.length > 4) return stored;
  return builtIn && builtIn.length > 4 ? builtIn : null;
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

// ─── Individual providers ─────────────────────────────────────────────────────

export async function tryGroq(
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<ProviderResult> {
  const key = resolveKey('groq', BUILT_IN.groq);
  if (!key) throw new Error('no_key');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: buildFullSystemPrompt() },
        ...history,
        { role: 'user', content: message },
      ],
      max_tokens: 1500,
      temperature: 0.7,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, message: data.error?.message };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('empty_response');
  return { text, provider: 'eye_ai' };
}

export async function tryGemini(
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<ProviderResult> {
  const key = resolveKey('gemini', BUILT_IN.gemini);
  if (!key) throw new Error('no_key');
  const geminiHistory = history.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildFullSystemPrompt() }] },
        contents: [...geminiHistory, { role: 'user', parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 1500, temperature: 0.7 },
      }),
    }
  );
  const data = await response.json();
  if (!response.ok) throw { status: response.status, message: data.error?.message };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('empty_response');
  return { text, provider: 'eye_ai' };
}

export async function tryOpenRouter(
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<ProviderResult> {
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
      messages: [
        { role: 'system', content: buildFullSystemPrompt() },
        ...history,
        { role: 'user', content: message },
      ],
      max_tokens: 1500,
    }),
  });
  if (response.status === 429) { currentOpenRouterModel++; throw { status: 429, message: 'Rate limited' }; }
  const data = await response.json();
  if (!response.ok) { currentOpenRouterModel++; throw { status: response.status, message: data.error?.message }; }
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('empty_response');
  return { text, provider: 'eye_ai' };
}

export async function tryCerebras(
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<ProviderResult> {
  const key = resolveKey('cerebras', BUILT_IN.cerebras);
  if (!key) throw new Error('no_key');
  const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b',
      messages: [
        { role: 'system', content: buildFullSystemPrompt() },
        ...history,
        { role: 'user', content: message },
      ],
      max_tokens: 1500,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, message: data.error?.message };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('empty_response');
  return { text, provider: 'eye_ai' };
}

export async function tryMistral(
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<ProviderResult> {
  const key = resolveKey('mistral', BUILT_IN.mistral);
  if (!key) throw new Error('no_key');
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [
        { role: 'system', content: buildFullSystemPrompt() },
        ...history,
        { role: 'user', content: message },
      ],
      max_tokens: 1500,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, message: data.error?.message };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('empty_response');
  return { text, provider: 'eye_ai' };
}

export async function tavilySearch(
  query: string
): Promise<{ answer: string; sources: Array<{ title: string; url: string; content: string }> }> {
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
  if (!response.ok) throw new Error('search_failed');
  const data = await response.json();
  return {
    answer: data.answer || '',
    sources: (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      content: r.content,
    })),
  };
}

// ─── Chat: Groq primary → OpenRouter → Cerebras → Mistral → Gemini ───────────

export async function callAIWithFallback(
  userMessage: string,
  history: Array<{ role: string; content: string }>,
  responseMode: ResponseMode = 'chat',
  onStatusChange?: StatusCallback
): Promise<ProviderResult> {
  const modeInstruction =
    responseMode === 'voice'
      ? '[VOICE MODE: Reply in 2-4 short sentences only. No markdown, no bullet points. Natural spoken Hinglish.]'
      : '[CHAT MODE: Give a full, detailed, structured answer using markdown formatting — headings, bullets, bold, code blocks as needed. Thorough Hinglish response like ChatGPT/Gemini would give.]';

  const messageWithMode = `${modeInstruction}\n\n${userMessage}`;
  const CALL_TIMEOUT = 20000;

  // Groq is the primary for chat, then OpenRouter, Cerebras, Mistral, Gemini
  const providers: { fn: (m: string, h: typeof history) => Promise<ProviderResult>; name: string }[] = [
    { fn: tryGroq, name: 'engine1' },
    { fn: tryOpenRouter, name: 'engine2' },
    { fn: tryCerebras, name: 'engine3' },
    { fn: tryMistral, name: 'engine4' },
    { fn: tryGemini, name: 'engine5' },
  ];

  for (const provider of providers) {
    try {
      const result = await withTimeout(provider.fn(messageWithMode, history), CALL_TIMEOUT);
      onStatusChange?.(provider.name, 'active');
      return result;
    } catch (error: any) {
      const msg = error?.message ?? '';
      if (msg === 'no_key' || msg === 'empty_response') { continue; }
      if (error?.status === 429 || error?.status === 503 || error?.status === 529) {
        onStatusChange?.(provider.name, 'exhausted');
        continue;
      }
      if (error?.status === 401 || error?.status === 403) {
        onStatusChange?.(provider.name, 'error');
        continue;
      }
      // Network errors, timeouts, unknown — log and try next
      console.error(`[Eye AI] Provider ${provider.name} failed:`, msg || error);
      onStatusChange?.(provider.name, 'error');
      continue;
    }
  }

  // All providers failed — return a helpful but honest message
  return {
    text: 'Yaar, abhi temporarily server se connect nahi ho pa raha. Thodi der mein dobara try karo! 🔄',
    provider: 'eye_ai',
  };
}

// ─── Web Search: Tavily context + Groq/OpenRouter ─────────────────────────────

export async function webSearch(
  userMessage: string,
  history: Array<{ role: string; content: string }>
): Promise<ProviderResult> {
  let searchContext = '';
  try {
    const result = await withTimeout(tavilySearch(userMessage), 8000);
    if (result.answer) searchContext = result.answer;
  } catch {
    // No Tavily key or search failed — fall back to AI knowledge
  }

  const modeInstruction =
    '[CHAT MODE: Give a full, detailed, structured answer using markdown formatting.]';
  const prompt = searchContext
    ? `${modeInstruction}\n\nUser asked: "${userMessage}"\n\nRelevant current information from web:\n${searchContext}\n\nAnswer the user's question in Eye AI's normal Hinglish tone, using this information where relevant. Use markdown formatting. Never mention where the information came from.`
    : `${modeInstruction}\n\n${userMessage}`;

  return callAIWithFallback(prompt, history, 'chat');
}

// ─── Deep Search: all providers parallel + Tavily → merge best answer ─────────

export async function deepSearch(
  userMessage: string,
  history: Array<{ role: string; content: string }>
): Promise<ProviderResult> {
  const DEEP_TIMEOUT = 15000;
  const modeInstruction =
    '[CHAT MODE: Give a full, detailed, structured answer using markdown formatting — headings, bullets, bold, code blocks as needed. Thorough Hinglish response like ChatGPT/Gemini would give.]';
  const messageWithMode = `${modeInstruction}\n\n${userMessage}`;

  // Fire all AI providers in parallel
  const aiCalls = [
    withTimeout(tryGroq(messageWithMode, history), DEEP_TIMEOUT),
    withTimeout(tryOpenRouter(messageWithMode, history), DEEP_TIMEOUT),
    withTimeout(tryCerebras(messageWithMode, history), DEEP_TIMEOUT),
    withTimeout(tryMistral(messageWithMode, history), DEEP_TIMEOUT),
    withTimeout(tryGemini(messageWithMode, history), DEEP_TIMEOUT),
  ];

  const [aiResults, searchResult] = await Promise.all([
    Promise.allSettled(aiCalls),
    Promise.allSettled([withTimeout(tavilySearch(userMessage), 10000)]),
  ]);

  const aiAnswers = aiResults
    .filter(
      (r): r is PromiseFulfilledResult<ProviderResult> =>
        r.status === 'fulfilled' && !!r.value?.text && r.value.text.length > 20
    )
    .map(r => r.value.text);

  let searchContext = '';
  const sr = searchResult[0];
  if (sr.status === 'fulfilled' && sr.value?.answer) {
    searchContext = `\n\nLIVE WEB SEARCH FINDINGS:\n${sr.value.answer}`;
  }

  if (aiAnswers.length === 0 && !searchContext) {
    // All parallel calls failed — try Groq synchronously as last resort
    try {
      const fallback = await withTimeout(tryGroq(messageWithMode, history), 20000);
      return fallback;
    } catch {
      return {
        text: 'Yaar, deep search mein thoda issue aa gaya. Normal chat mein poocho — main wahan pakka answer dunga! 🙏',
        provider: 'eye_ai',
      };
    }
  }

  if (aiAnswers.length === 0 && searchContext) {
    return {
      text: searchContext.replace('\n\nLIVE WEB SEARCH FINDINGS:\n', ''),
      provider: 'eye_ai',
    };
  }

  // If only one answer, return it directly (fast path)
  if (aiAnswers.length === 1 && !searchContext) {
    return { text: aiAnswers[0], provider: 'eye_ai' };
  }

  // Merge multiple answers into one comprehensive response
  const mergePrompt = `[CHAT MODE: Full structured markdown response]\n\nA user asked: "${userMessage}"

Below are ${aiAnswers.length} independent draft answers${searchContext ? ', plus live web search findings' : ''}. Combine everything into ONE final answer that:
- Keeps everything correct and useful from each draft${searchContext ? ' and from the search findings' : ''}
${searchContext ? '- Prioritizes the live web search findings for anything time-sensitive, factual, or current' : ''}
- Removes repeated points and contradictions
- Reads as a single, natural, well-organized markdown response with headings, bullets, bold text
- IMPORTANT: Detect what language the user asked in and reply in that same language

DRAFTS:
${aiAnswers.map((a, i) => `\n[Draft ${i + 1}]\n${a}`).join('\n')}${searchContext}

Write only the final merged answer, nothing else.`;

  try {
    const merged = await withTimeout(tryGroq(mergePrompt, []), 20000);
    return { text: merged.text, provider: 'eye_ai' };
  } catch {
    try {
      const merged2 = await withTimeout(tryOpenRouter(mergePrompt, []), 20000);
      return { text: merged2.text, provider: 'eye_ai' };
    } catch {
      // Return the longest / most detailed answer
      const best = aiAnswers.reduce((a, b) => (b.length > a.length ? b : a), aiAnswers[0]);
      return { text: best, provider: 'eye_ai' };
    }
  }
}

export function getBuiltInElevenLabsKey(): string {
  return resolveKey('elevenlabs', BUILT_IN.elevenlabs) || '';
}
