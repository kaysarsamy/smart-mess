# Task 2-g — Users & Settings module

Agent: full-stack-developer
Scope: admin-only Users & Settings module (API + view).

## Files created

### API routes
- `src/app/api/users/route.ts` — GET (admin). Returns `{ users: [...] }` sorted by `createdAt desc`, without `passwordHash`.
- `src/app/api/users/[id]/route.ts` — PATCH (zod body: `name? | role? | phone? | active?`) and DELETE (soft delete = `active=false`). Includes `LAST_ADMIN` safeguard (rejects demotion/deactivation of the only remaining active admin) and `NOT_FOUND` for missing users. Uses `params: Promise<{ id: string }>` (Next 16 async params).
- `src/app/api/settings/route.ts` — GET returns `{ settings: {key:value, ...} }`. PATCH accepts either `{ updates: {key:value, ...} }` (bulk) or `{ key, value }` (single); upserts each row and returns the full updated map.

### View
- `src/components/modules/settings-view.tsx` (OVERWRITTEN) — `'use client'`, default export `SettingsView`. Tabs: Users | System Settings.

## View features
- Users tab:
  - SectionCard "Managers & Admins" with "Add user" header action.
  - Responsive table on desktop (User avatar+name+email, Role badge, Phone, Status badge, Created, Actions) and stacked cards on mobile.
  - Admin badge = blue + `ShieldCheck`; Manager badge = slate + `Users`; Active = emerald; Inactive = slate.
  - DropdownMenu per row: Edit, Toggle active (PATCH `{active: !current}`), Delete (AlertDialog confirm → DELETE).
  - Add user Dialog: name, email, password (min 6), role Select, phone → POST `/api/auth/register` (REUSED existing endpoint, not recreated). Handles 409 `EMAIL_TAKEN` → `toast.error`. On success → toast + invalidate `['users']` + close.
  - Edit user Dialog: name, role, phone only → PATCH `/api/users/[id]`. State initialized from user prop; component keyed by `user.id` so it remounts cleanly when a different user is selected. Handles `LAST_ADMIN`/`NOT_FOUND` error states with toasts.
- System Settings tab:
  - Form: Mess Name (text), Currency (default `"BDT"`), Contact Phone (optional). Initialized from GET `/api/settings`. Save → PATCH `/api/settings` `{ updates: {...} }` → toast + invalidate `['settings']` + clear dirty flag.
  - `<Alert>` "Permissions" explaining Admin vs Manager scope.
- Loading skeletons; toast errors; empty-state fallbacks.

## Patterns used to keep eslint clean
- Dialog form state lives in dedicated child components (`AddUserForm`, `EditUserForm`, `SettingsForm`) so state initializes from props via `useState` lazy initializers — no `useEffect`+`setState` cascades. Radix Dialog unmounts its content when closed, so child state is naturally reset on each open.
- `EditUserForm` is keyed by `user.id` to remount when the edit target changes.
- `SettingsForm` reads `initial` once via lazy initializers; after save it clears the local `dirty` flag in the mutation's `onSuccess` (event-handler context, not an effect).

## Notes
- REUSES existing `POST /api/auth/register` (admin create-user endpoint) — did not recreate or modify it.
- DELETE is soft (`active=false`) — preserves Payment/Expense FK integrity per the schema (`onDelete: SetNull` on `Payment.receivedBy` / `Expense.createdBy`).
- LAST_ADMIN safeguard: if the target is currently the only active ADMIN, demotion or deactivation returns `400 { error: 'LAST_ADMIN' }` (covers both PATCH role/active and DELETE).
- Module is admin-only at the API layer (`requireAdmin()`); the app-shell already hides the sidebar entry for managers and falls back to dashboard.

## Lint
- `bunx eslint src/components/modules/settings-view.tsx src/app/api/users src/app/api/settings` → 0 errors, 0 warnings.
