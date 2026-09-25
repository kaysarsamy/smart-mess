# Task 2-b — Students module (full-stack)

Agent: full-stack-developer
Module: Students (API + view + profile drawer)
Scope: API routes under `src/app/api/students/...` and the `src/components/modules/students-view.tsx` view.

## Files created
- `src/app/api/students/route.ts` — GET list + POST create
- `src/app/api/students/[id]/route.ts` — GET profile + PATCH update
- `src/app/api/students/[id]/checkout/route.ts` — POST checkout (transactional)
- `src/app/api/students/[id]/ledger/route.ts` — GET merged ledger with running balance
- `src/components/modules/students-view.tsx` — full UI (overwrote stub)

## API contract summary
- `GET /api/students?q=&status=ACTIVE|FORMER` → `{ students: [{ id, fullName, phone, studentIdRef, institution, status, currentSeat: { id, roomId, roomName, seatLabel, monthlyRent, moveInDate } | null, balance: { billed, paid, due } | null }] }`. Current seat via `seatAssignment.findFirst({ active:true })`. Balance from current-month Bill + its Payments.
- `POST /api/students` (zod-validated) → creates an ACTIVE student, returns full record.
- `GET /api/students/[id]` → `{ student, currentSeat, seatHistory[], balance, ledgerSummary }` (all-time totals).
- `PATCH /api/students/[id]` → partial update of any student field incl. status.
- `POST /api/students/[id]/checkout` → `db.$transaction`: closes all active SeatAssignment (moveOutDate=now, active=false) + sets student.status=FORMER.
- `GET /api/students/[id]/ledger` → `{ entries: [{ id, type, date, month?, amount, method?, txnRef?, note?, balanceAfter }] }`. Built from bills+payments, sorted asc for running balance, then reversed for newest-first display.

## View features
- PageHeader with "Add Student" button.
- Controls: debounced search input (300ms) + Tabs (Active / Former / All).
- TanStack Query `['students', q, statusTab]`.
- Desktop `<Table>` (avatar+name+ID, phone, institution, seat badge, balance badge+due, row-actions DropdownMenu).
- Mobile (`sm:hidden`) stacked cards with same data + tap-to-open profile.
- Profile drawer (`Sheet` right, `lg:max-w-xl`): header w/ avatar + status badge; SectionCard for personal info (phone/email/institution/ID/guardian/addresses/deposit/notes); current seat card w/ inline "Change" action; this-month balance (3 mini stats + Paid/Partial/Due badge via `statusTone`); all-time ledger summary (3 mini stats); ledger history table (scroll-slim, max-h-72, color-coded bills blue / payments emerald, signed amounts, running balance column); seat history list (room·seat, move-in→move-out/Present, rent); action row: Edit profile / Change seat / Check out (ConfirmDialog).
- Add Student Dialog (react-hook-form + zodResolver, all fields incl. securityDeposit coerced to number via `setValueAs`).
- Edit Profile Dialog (pre-filled from profile query via `editForm.reset` on open).
- Change Seat Dialog: fetches `/api/rooms` (enabled only when open), parses flexibly (`seat.occupied` / `seat.currentAssignment` / `seat.assignment` / `seat.occupant`), Select for available seats, date input (default today), rent input (auto-fills from seat.defaultRent on pick), POST `/api/seats/${seatId}/assign` body `{ studentId, moveInDate (ISO), monthlyRent }`.
- On mount, reads `useUIStore.wantAddStudent`; if true opens the Add dialog and calls `consumeAddStudent()`.
- Invalidation: `['students']`, `['student', profileId]`, `['student-ledger', profileId]`, `['rooms']`, `['rooms-for-seat-picker']`, `['dashboard']` after each mutation.

## Cross-module dependencies
- Consumes `useUIStore.wantAddStudent` + `consumeAddStudent()` (dashboard "Add Student" quick-action).
- Calls `/api/rooms` (owned by Rooms module agent) to list available seats — defensive shape parser so it tolerates whatever the Rooms agent returns.
- Calls `POST /api/seats/[seatId]/assign` body `{ studentId, moveInDate, monthlyRent }` (owned by Rooms agent) for the Change Seat flow.

## Verification
- `bunx eslint src/components/modules/students-view.tsx "src/app/api/students"` → 0 errors, 0 warnings (clean).
- `bunx tsc --noEmit` → no errors in any `src/` file (only pre-existing errors in `examples/` and `skills/` which are out of scope and eslint-ignored).

## Notes for other agents
- The student balance for the *current* month is keyed by `monthKey()` (YYYY-MM in Asia/Dhaka). The Billing module should create the current-month Bill with the same month key for the badge to populate.
- Checkout closes ALL active assignments for the student (defensive — should normally be exactly one).
- `studentIdRef` is NOT unique (multiple students can share null); do not add a unique constraint.
