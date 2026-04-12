# Ko-nnect

Shift scheduling mobile app for small and medium Puerto Rican businesses (2–15 employees). Replaces paper, Excel, and WhatsApp scheduling.

**UI language:** Spanish  
**Tagline:** "Turnos sin complique"

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React Native + Expo + TypeScript (expo-router) |
| Backend | Supabase Edge Functions (Deno runtime) |
| Auth | Supabase Auth — JWT stored in `expo-secure-store` |
| Database | Supabase Postgres |

---

## Project Structure

```
Ko-nnect-APP/
├── frontend/
│   ├── app/
│   │   ├── (auth)/           # login.tsx, signup.tsx, employee-login.tsx, role-select.tsx
│   │   ├── (owner)/          # index.tsx (dashboard), employees.tsx, timeclock.tsx, settings.tsx
│   │   └── (employee)/       # index.tsx (my shifts), profile.tsx
│   ├── components/           # AnimatedBackground, GoogleLogo, GlassCard
│   ├── context/              # AuthContext.tsx — single source of truth for user/business/primaryColor
│   ├── services/             # api.ts — all API calls
│   ├── types/                # index.ts — shared TypeScript types
│   └── lib/                  # supabase.ts — Supabase client
└── supabase/
    └── functions/
        ├── _shared/          # cors.ts, supabase.ts (getServiceClient, getUserClient)
        └── [30 functions]    # one folder per edge function
```

---

## Roles

- **owner** — creates a business, manages employees, shifts, and time logs
- **employee** — views their own shifts only, no access to business data

---

## Auth Flow

### Owner login options
1. **Google OAuth** — recommended path, Google manages the password
2. **Email + password** — manual credentials created at signup

### Token handling
- Tokens stored manually via `expo-secure-store` (`konnect_token`, `konnect_refresh`)
- `AuthContext` restores session on startup via `supabase.auth.setSession()`
- `getValidToken()` in `api.ts` handles token refresh before every request
- `onAuthStateChange('TOKEN_REFRESHED')` syncs new tokens back to SecureStore

### Employee login
- Auto-generated credentials on creation: `firstname.lastname@businessname.app`
- Default password: `firstnamelastname` + 4 random digits
- Stored in `tempPassword` field on the employee record
- Collision-safe: iterates suffix (`john.smith2@...`) if email is taken
- Employees log in via a separate screen (`employee-login.tsx`)

---

## Edge Functions (30 total)

All functions deployed with `--no-verify-jwt`. Auth is verified inside each function via `getUserClient(auth).auth.getUser()`.

| Domain | Functions |
|---|---|
| Auth | `auth-login`, `auth-signup`, `auth-profile`, `auth-change-password`, `auth-check-provider` |
| Business | `business-create`, `business-get`, `business-update` |
| Employees | `employees-add`, `employees-list`, `employees-update`, `employees-delete`, `employees-reset-pin` |
| Shifts | `shifts-create`, `shifts-get`, `shifts-assign`, `shifts-delete`, `shifts-my` |
| Time Clock | `timelog-clock-in`, `timelog-clock-out`, `timelog-break-start`, `timelog-break-end`, `timelog-list`, `timelog-my`, `timelog-active`, `timelog-update` |
| Availability | `availability-set`, `availability-get` |
| PTO | `pto-add`, `pto-list` |

**Deploy all functions:**
```bash
npx supabase functions deploy --no-verify-jwt --project-ref izfcsiqucpkroylkgjei
```

**Deploy a single function:**
```bash
npx supabase functions deploy <function-name> --no-verify-jwt --project-ref izfcsiqucpkroylkgjei
```

---

## UI Conventions

- **`AnimatedBackground`** — always wrap screen backgrounds with this, never use `LinearGradient` directly
  - Auth screens: white/blush base with brand-colored blobs (`primaryColor={BRAND}`)
  - App screens: pass `primaryColor` from `useAuth()` to match the business color
- **`GoogleLogo`** — use for Google sign-in buttons, never a plain text "G"
- **`GlassCard`** — use for card containers throughout the app
- **Brand constant** in auth screens: `const BRAND = '#E11D48'`
- `StatusBar style="dark"` on light backgrounds, `"light"` on dark backgrounds
- `primaryColor` defaults to `#4F46E5` before a business is loaded

---

## Business Settings

Owners can configure:
- Business name and brand color
- Logo
- Pay period type: `weekly`, `biweekly`, or `semi-monthly`
- Pay period start day and anchor date
- Open days of the week
- Max hours per day (0 = no limit)
- Auto clock-out toggle and minutes
- Scheduling window (weeks ahead/back to show)

---

## Data Types

| Type | Key Fields |
|---|---|
| `User` | `userId`, `email`, `firstName`, `lastName`, `role`, `businessId`, `provider` |
| `Business` | `businessId`, `name`, `color`, `ownerId`, `payPeriodType`, `openDays` |
| `Employee` | `employeeId`, `businessId`, `userId`, `email`, `tempPassword` |
| `Shift` | `shiftId`, `businessId`, `title`, `startTime`, `endTime`, `breakDuration`, `employeeId` |
| `TimeLog` | `logId`, `clockIn`, `clockOut`, `breaks[]`, `status`, `totalMinutes` |
| `Availability` | `availabilityId`, `type`, `startDate`, `endDate`, `daysOfWeek` |
| `PTO` | `ptoId`, `date`, `hours`, `type` |

---

## Key Rules

- **Never** remove `--no-verify-jwt` from function deploys — without it, Supabase rejects all requests before the function runs
- **Never** use `LinearGradient` directly — always use `AnimatedBackground`
- Edge functions run on **Deno**, not Node — use `https://esm.sh/` imports, not `npm:`
- **Never** add `persistSession: true` to the Supabase client — token persistence is handled manually via SecureStore
- Use `getServiceClient()` for DB writes, `getUserClient(authHeader)` for user validation inside edge functions

---

## Local Development

```bash
# Install dependencies
cd frontend && npm install

# Start Expo
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```
