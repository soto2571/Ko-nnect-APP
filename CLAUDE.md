# Ko-nnecta' App

Shift scheduling mobile app for small/medium Puerto Rican businesses (2–15 employees).
Replaces paper/Excel/WhatsApp scheduling. Rebranded from Ko-nnect → Ko-nnecta' to target the Puerto Rican market and differentiate from the existing "Connect" app.
UI language: Spanish. Tagline: "Turnos sin complique".

## Stack

- **Frontend:** React Native + Expo + TypeScript (expo-router, file-based routing)
- **Backend:** Supabase Edge Functions (Deno runtime — NOT Node.js)
- **Auth:** Supabase Auth with JWT stored in `expo-secure-store`
- **DB:** Supabase Postgres (accessed via service role key in edge functions)

## Project Structure

```
frontend/
  app/
    (auth)/       login.tsx, signup.tsx
    (owner)/      index.tsx (dashboard), employees.tsx, timeclock.tsx, settings.tsx
    (employee)/   index.tsx (my shifts), profile.tsx
  components/     AnimatedBackground.tsx, GoogleLogo.tsx, GlassCard.tsx
  context/        AuthContext.tsx  ← single source of truth for user/business/primaryColor
  services/       api.ts           ← all API calls go here
  types/          index.ts
  lib/            supabase.ts      ← Supabase client (persistSession: false, autoRefreshToken: true)
supabase/
  functions/      one folder per edge function
  functions/_shared/  cors.ts, supabase.ts (getServiceClient, getUserClient)
```

## Roles

- **owner** — creates business, manages employees and shifts
- **employee** — views own shifts only, no business data

## Auth Flow

- Tokens stored manually via `expo-secure-store` (`konnect_token`, `konnect_refresh`)
- `AuthContext` restores session on startup via `supabase.auth.setSession()`
- `getValidToken()` in `api.ts` handles token refresh before every request
- `onAuthStateChange('TOKEN_REFRESHED')` syncs new tokens back to SecureStore
- `primaryColor` comes from the business profile and is exposed via `useAuth()`

## Edge Functions

- All 29 functions deployed with `--no-verify-jwt` flag — Supabase gateway does NOT validate JWTs
- Auth is verified inside each function using `getUserClient(auth).auth.getUser()`
- Use `getServiceClient()` for DB writes, `getUserClient(authHeader)` for user validation
- To redeploy all: `npx supabase functions deploy --no-verify-jwt --project-ref izfcsiqucpkroylkgjei`

### Function list
auth-login, auth-signup, auth-profile, auth-change-password,
business-create, business-get, business-update,
employees-add, employees-list, employees-update, employees-delete, employees-reset-pin,
shifts-create, shifts-get, shifts-assign, shifts-delete, shifts-my,
timelog-clock-in, timelog-clock-out, timelog-break-start, timelog-break-end,
timelog-list, timelog-my, timelog-active, timelog-update,
availability-set, availability-get, pto-add, pto-list

## UI Conventions

- `AnimatedBackground` — always use this for screen backgrounds, never hardcode `LinearGradient` directly
  - Auth screens: white/blush base with brand-colored blobs (`primaryColor={BRAND}`)
  - App screens: pass `primaryColor` from `useAuth()` so it matches the business color
- `GoogleLogo` component — use for Google sign-in button, never a plain text "G"
- `StatusBar style="dark"` on light (white) backgrounds, `"light"` on dark backgrounds
- Brand constant in auth screens: `const BRAND = '#E11D48'`

## Employee Credentials

Auto-generated on creation:
- Email: `firstname.lastname@businessname.app`
- Password: `firstnamelastname` + 4 random digits
- Stored in `tempPassword` field on the employee record
- Collision-safe: iterates suffix (`john.smith2@...`, `john.smith3@...`) if email taken

## Key Rules

- **Never** remove `--no-verify-jwt` from function deploys — without it, Supabase gateway rejects all requests before the function runs (zero invocations in logs = this problem)
- **Never** use `LinearGradient` directly in auth screens — use `AnimatedBackground`
- Edge functions run on **Deno**, not Node — use `https://esm.sh/` imports, not `npm:`
- Don't add `persistSession: true` to the Supabase client — token persistence is handled manually
