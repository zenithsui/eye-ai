// Built-in API keys — baked in at bundle time from environment.
// IMPORTANT: never hardcode real keys here as fallback values — anything in
// this file ships inside the app bundle and ends up in source control.
// Set EXPO_PUBLIC_* values in a local .env (untracked) or your EAS secrets.
export const BUILT_IN_KEYS = {
  groq: process.env.EXPO_PUBLIC_GROQ_KEY || '',
  gemini: process.env.EXPO_PUBLIC_GEMINI_KEY || '',
  openrouter: process.env.EXPO_PUBLIC_OPENROUTER_KEY || '',
  cerebras: process.env.EXPO_PUBLIC_CEREBRAS_KEY || '',
  mistral: process.env.EXPO_PUBLIC_MISTRAL_KEY || '',
  elevenlabs: process.env.EXPO_PUBLIC_ELEVENLABS_KEY || '',
  tavily: process.env.EXPO_PUBLIC_TAVILY_KEY || '',
};

export const DEFAULT_VOICE_ID = 'VbDz3QQGkAGePVWfkfwE';
