# Eye AI — Mobile App

Expo / React Native app. **Not deployed via Vercel** — mobile apps ship through app stores (or Expo's own hosting for a web build), Vercel doesn't apply here.

## Local development

```bash
npm install
cp .env.example .env   # then fill in your real keys (Expo loads .env automatically)
npx expo start
```

## What changed from the original Replit export

- **Removed real API keys that were hardcoded directly in `lib/built-in-keys.ts` and inline in the `dev` script in `package.json`.** Those keys are now read only from `EXPO_PUBLIC_*` env vars, with empty-string fallback instead of real secrets. See the root README — please rotate those keys.
- Removed dependency specifiers that only make sense inside the original Replit pnpm workspace (`catalog:`, `workspace:*`) and pinned them to real versions instead, so `npm install` works standalone. The one `workspace:*` package (`@workspace/api-client-react`) wasn't actually imported anywhere in this app's code, so it was just removed.
- Removed `scripts/build.js` and `server/serve.js` — these were custom static-export/serve scripts that only work by walking up the directory tree to find a `pnpm-workspace.yaml` from the original monorepo. They won't run standalone, and they're not how you'd normally ship an Expo app anyway. Use `npx expo start` for development or [EAS Build](https://docs.expo.dev/eas/) for production builds.
- Removed `tsconfig.json`'s reference to `../../lib/api-client-react` (a path outside this folder that doesn't exist standalone).
