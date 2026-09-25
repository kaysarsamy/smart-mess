# Task 2-e — Expenses Module

Agent: full-stack-developer
Task ID: 2-e
Scope: Expenses API + view component (Smart Mess — Next.js 16 / App Router).

## Files created / modified
- `src/app/api/expenses/route.ts` — NEW
  - `GET` list: optional `?from=&to=&category=` filters; returns recent 100 expenses sorted by `incurredOn` desc, with `createdByName`.
  - `POST` create: zod-validated body `{ category, amount>0, incurredOn, note? }`; sets `createdById` = current user; returns created expense (201).
- `src/app/api/expenses/[id]/route.ts` — NEW
  - `DELETE`: hard delete by id; 404 if not found; returns `{ ok: true }`.
- `src/components/modules/expenses-view.tsx` — OVERWRITTEN (was stub)
  - PageHeader with "Add Expense" action.
  - StatCard "Total This Month" (formatBDT, tone=danger, Wallet icon).
  - SectionCard "This Month" — 6 mini rows (Electricity/Gas/Water/Internet/Salary/Others) with formatBDT + relative bar (width = amount/maxCategory).
  - Add Expense Dialog: Category Select (expenseCategoryLabel), Amount (number, min 0), Date (`toDateInputValue()` default today), optional Note Textarea. Submit → POST /api/expenses → toast.success → invalidate ['expenses'] → close.
  - Recent Expenses SectionCard — desktop: scrollable Table (max-h-96, scroll-slim, sticky header) with date/category badge/amount/note/createdBy/delete (ConfirmDialog); mobile: stacked cards.
  - Category badges color-coded: Electricity=amber, Gas=blue, Water=cyan, Internet=violet, Salary=emerald, Others=slate. Icons: Zap, Flame, Droplet, Wifi, Users, MoreHorizontal.
  - Empty state + loading skeletons.
  - TanStack Query useQuery(['expenses']) + useMutation for create/delete. Toasts via sonner.

## Conventions followed
- API: try/catch + `handleError(err)`; `requireUser()` for auth; `NextRequest` for body routes; zod for body validation; `Response.json` only.
- Dynamic route params: `{ params }: { params: Promise<{ id: string }> }` (Next 16 async params — matches existing `users/[id]` route).
- View: `'use client'`, default export, no props; relative fetch paths; cool blue/slate palette; responsive (table→cards on mobile); no indigo; no footer.

## Verification
- `bunx eslint src/components/modules/expenses-view.tsx src/app/api/expenses` → exit 0, clean.
- Did NOT modify prisma schema, shared lib, or any other module.

## Shared exports consumed
- `@/lib/db` → `db`
- `@/lib/auth` → `requireUser, handleError`
- `@/lib/format` → `formatBDT, formatDate, formatMonth, monthKey, toDateInputValue`
- `@/lib/types` → `EXPENSE_CATEGORY, ExpenseCategory, expenseCategoryLabel`
- `@/components/shared/*` → `PageHeader, SectionCard, EmptyState, StatCard, ConfirmDialog`
- `@/components/ui/*` → button, input, label, textarea, badge, skeleton, dialog, select, table
- `sonner` → `toast`
