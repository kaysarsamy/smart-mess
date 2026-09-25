# Task 2-d — Billing & Payments module

**Agent:** full-stack-developer
**Task:** Build Billing & Payments module (API routes + view + printable receipt).

## Files created / modified
- `src/app/api/bills/route.ts` (NEW) — GET list (filtered by studentId+month, or recent 50) + POST generate bill (zod body, unique studentId+month → 409 BILL_EXISTS, default dueDate = 10th of month).
- `src/app/api/bills/[id]/route.ts` (NEW) — GET single bill with student + payments list (404 if missing).
- `src/app/api/payments/route.ts` (NEW) — GET list (filters: studentId, month, method; recent 50 by paidAt desc) + POST record payment (zod body, receivedById = current user, optional billId FK validation).
- `src/app/api/payments/[id]/receipt/route.ts` (NEW) — GET printable receipt data (payment, student, bill|null, messName from Setting key='messName', receivedByName, receiptNo = `SM-<id.slice(-6).toUpperCase()>`).
- `src/components/modules/billing-view.tsx` (OVERWRITE) — full view.

## View features
- 3 StatCards (Rent Billed / Collected / Outstanding this month) sourced from `['dashboard','summary']` query (graceful '—' if summary endpoint not ready).
- "Record Payment" dialog (centerpiece):
  - Searchable student Combobox (Popover+Command) listing ACTIVE students (`/api/students?status=ACTIVE`).
  - Billing month Select (last 6 months, default = `monthKey()`).
  - Bill lookup via `/api/bills?studentId=X&month=Y` → 3 read-only SummaryFields (Billed/Paid/Due).
  - If no bill exists → inline "Generate bill" widget (amount input + button → POST /api/bills).
  - Amount Received input with ৳ prefix; default = bill.due when user hasn't typed (derived state, no effect).
  - Payment Method RadioGroup (Cash / bKash / Nagad / Bank) with branded color dots.
  - Non-cash → txnRef (required) + payerName (optional) shown in a bordered panel.
  - Note Textarea.
  - `<Alert>` info: security deposits not recorded here.
  - Footer: Cancel + "Save & Print Receipt". On submit → POST /api/payments → toast, invalidate ['payments'],['dashboard','summary'],['students'],['bill'], close Record dialog, open Receipt dialog with returned id.
- Receipt Dialog: monospace Card preview (messName centered, big amount, dl rows for receiptNo/date/student/phone/ID Ref/bill month/method/txnRef/payer/receivedBy/note, dashed footer). "Print" button → `printReceipt(buildReceiptHtml(data))` = `window.open('', '_blank', 'width=400,height=600')` + `document.write` + `print()` after 120ms delay. Includes inline CSS for clean print (dashed borders, monospace font, centered head).
- Recent Payments table (SectionCard): date / student / month / amount / method badge (Cash=slate, bKash=pink, Nagad=orange, Bank=blue) / txnRef / receivedBy / actions (Print receipt → opens Receipt dialog). `max-h-96 overflow-y-auto scroll-slim`. Empty state + Refresh button.
- Cross-module: `useEffect([pendingPayment, clearPendingPayment])` reads `useUIStore.pendingPayment` (set by dashboard "Collect" → `startPayment({studentId, billId, month})`), pre-fills student/month/method=CASH and opens Record dialog, then `clearPendingPayment()`. Block-level `eslint-disable react-hooks/set-state-in-effect` since this is a genuine external-event subscription.
- Loading skeletons everywhere; toast errors on failure; mutation pending spinners.

## Design choices
- Cool blue/slate (project palette). Method badge colors per task spec.
- Receipt: monospace font, dashed dividers, centered messName + big amount, RTL-aligned values.
- 44px+ touch targets; mobile-first; dialogs scroll on overflow.
- All API routes use try/catch + `handleError(err)`; `requireUser()` for auth (manager+admin).
- Zod validation on POST bodies (bills: `studentId/month(YYYY-MM)/amount(>0)/dueDate?`; payments: `studentId/billId?/amount(>0)/method(enum)/txnRef?/payerName?/note?`).

## Lint
Clean. `bunx eslint src/components/modules/billing-view.tsx src/app/api/bills src/app/api/payments` → 0 errors, 0 warnings.
