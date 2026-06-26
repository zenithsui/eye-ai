# Eye AI 👁️

> Aapka intelligent Hinglish AI saathi — built by Amit

A premium voice + chat AI assistant that speaks natural Hinglish. Powered by 5 AI providers in waterfall order (Groq → Gemini → OpenRouter → Cerebras → Mistral).

## Features
- 🗣️ Voice & chat modes
- 🇮🇳 Natural Hinglish responses
- 🔄 5-provider AI waterfall (auto-fallback on rate limits)
- 🎨 Black/grey/white glassmorphism theme
- 📱 Responsive: Android, iOS, Windows, Linux, tablet
- 🔊 ElevenLabs TTS integration

## Stack
- React + Vite + TypeScript + Tailwind CSS v4
- pnpm monorepo

## Setup
```bash
pnpm install
# Set your API keys as env vars (VITE_GROQ_KEY, VITE_GEMINI_KEY, etc.)
pnpm --filter @workspace/eye-ai run dev
```

## Made with ❤️ by Amit
