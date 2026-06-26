# Eye AI — Web App

Vite + React chat app. No backend, no database — chat history and memory live in the browser's `localStorage` (see `src/lib/storage.ts`), and AI responses come from calling Groq/Gemini/OpenRouter/Cerebras/Mistral directly from the client.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in your real keys
npm run dev
```

## Deploying to Vercel

1. Push this repo to GitHub (see root README for the security checklist first).
2. In Vercel: **Add New Project** → import the GitHub repo.
3. If this `eye-ai` folder is *not* the root of your GitHub repo (e.g. you kept `eye-ai-mobile` alongside it), set **Root Directory** to `eye-ai` in the project's Settings → General.
4. Vercel will auto-detect Vite. Build command and output directory are already pinned in `vercel.json` (`npm run build`, `dist/public`) so you shouldn't need to touch them.
5. Go to **Settings → Environment Variables** and add each of these (values from your `.env.local`):
   - `VITE_GROQ_KEY`
   - `VITE_OPENROUTER_KEY`
   - `VITE_MISTRAL_KEY`
   - `VITE_CEREBRAS_KEY`
   - `VITE_GEMINI_KEY`
   - `VITE_ELEVENLABS_KEY` (optional)
   - `VITE_TAVILY_KEY` (optional, enables web search mode)
6. Deploy.

`vercel.json` also adds a catch-all rewrite to `index.html`, which the app needs since it does client-side routing (wouter) — without it, refreshing on any screen other than `/` would 404.

## Notes on what changed from the original Replit export

- `vite.config.ts` no longer requires `PORT`/`BASE_PATH` env vars to be set (it defaults them) — the old version threw an error without them, which would have failed on Vercel.
- Removed `vite.config.vercel.ts` / `package.vercel.json` — they existed but weren't actually wired together, so they did nothing. Consolidated into one config.
- Removed Replit-only plugins (`@replit/vite-plugin-*`) since they're not needed outside Replit.
- `tsconfig.json` no longer extends a parent config from outside this folder (it referenced `../../tsconfig.base.json`, which doesn't exist outside the original monorepo).
- All dependencies moved into `dependencies` (several were sitting in `devDependencies`, which works fine here but is the less safe default for things the build actually needs).
