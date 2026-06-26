# Eye AI

This repo has two separate apps:

| Folder | What it is | Where it deploys |
|---|---|---|
| [`eye-ai/`](./eye-ai) | The web chat app (Vite + React) | **Vercel** |
| [`eye-ai-mobile/`](./eye-ai-mobile) | The mobile app (Expo / React Native) | App stores via [EAS](https://docs.expo.dev/eas/), not Vercel |

Each folder has its own README with setup details. Start with `eye-ai/` — that's the one this whole exercise was about.

## Before you push to GitHub

Both folders already have `.gitignore` files that exclude `.env` / `.env.local`, so your real API keys won't be committed. Double check this worked:

```bash
git status
```

If you don't see `.env.local` (in `eye-ai/`) or `.env` (in `eye-ai-mobile/`) listed, you're good.

## ⚠️ Please rotate your API keys

Your Groq, OpenRouter, Mistral, Cerebras, and Gemini keys were sitting in **plaintext** in the files you sent me — including hardcoded directly in mobile's `lib/built-in-keys.ts` and in a shell command in `package.json`. I removed them from the source code, but the fact that they were ever written down in a file like this means you should treat them as compromised and **generate new keys** from each provider's dashboard, then drop the new ones into your local `.env.local` / `.env` files. This is good practice regardless of where you deploy.

## The bigger thing to know about this app's architecture

This app calls Groq/Gemini/OpenRouter/Cerebras/Mistral **directly from the browser/app**, using keys baked into the client bundle (`VITE_*` / `EXPO_PUBLIC_*` vars). That means:

- ✅ Simple to deploy, no backend needed, works great for personal/private use
- ⚠️ **Anyone who uses your deployed site can open DevTools → Network/Sources and read your API keys out of the JS bundle.** This isn't a GitHub or Vercel problem — it's true no matter where this gets hosted, because the keys have to ship to the browser for client-side fetch calls to work.

This is fine if this is a personal project, a demo, or the keys are free-tier/low-stakes. If you're planning to share the link publicly or this app might get real traffic, the keys will get scraped and abused (people do scan deployed sites for exactly this). The proper fix is to move the AI calls behind a small serverless backend (e.g. a Vercel Function) that holds the keys server-side and the frontend just calls *that*. I didn't do this automatically since it's an architecture change, not a deploy-readiness fix — happy to build it if you want it.
