## New UI Alignment Spec (Implementation-Oriented)

This document maps the reference UI to current product reality, and separates:
- what already exists and should be kept,
- what needs UI-only refactor,
- what needs net-new functionality.

---

## Current Functional Baseline (already implemented)

- Local sign-in/sign-up (email/phone + password) and route protection.
- Group membership model (`AppUser`, `GroupMembership`) with user-scoped group visibility.
- Invite link acceptance flow (`/invite/[token]`) with post-signin continuation.
- Group tabs: expenses, balances, information, stats, activity, settings.
- Expense creation/editing with advanced split modes:
  - evenly, by shares, by percentage, by amount
  - reimbursement support
  - optional documents and receipt extraction feature flags
- Group activity log + reimbursements + stats.

These should be preserved; redesign should be presentation-first.

---

## Screen-by-Screen Mapping

## 1) Home / Dashboard

**Reference intent**
- Wallet-like dashboard (balance, quick actions, active bills, recent activity, bottom nav).

**Current reality**
- Product opens on Groups list and Group detail flows, not a wallet ledger system.
- No top-up/withdraw/send wallet subsystem.

**Decision**
- Keep Groups as entry point for MVP.
- Re-style Groups landing as a dashboard shell (cards, quick actions, active groups).

**Needs new backend?**
- `No` for UI shell.
- `Yes` if wallet balance/top-up/withdraw are required.

---

## 2) Receipt Scan

**Reference intent**
- Live camera scan with OCR preview and split CTA.

**Current reality**
- Receipt-to-expense exists behind feature flag; not full camera-native UX.

**Decision**
- Keep current OCR pipeline.
- Re-skin flow to match visual style (sheet/card progression).

**Needs new backend?**
- `No` for UI polish.
- `Optional` for stronger OCR confidence metadata.

---

## 3) Recognized Items / Bill Review

**Reference intent**
- Editable OCR items + equal/manual split controls + member assignments.

**Current reality**
- Expense form already supports rich split logic and participant targeting.

**Decision**
- Keep split engine as-is.
- Reformat expense-create/edit UI into receipt-review style sections.

**Needs new backend?**
- `No` for present split modes.
- `Optional` if item-level allocation per line item is required.

---

## 4) Messages / Chat

**Reference intent**
- Group chat, pinned threads, payment status messages.

**Current reality**
- No chat system in current stack.

**Decision**
- Out of current MVP scope.
- Do not block core expense-sharing redesign on this.

**Needs new backend?**
- `Yes` (message model, realtime delivery, unread state, moderation/notifications).

---

## Invite + Membership Rules (must remain true)

- Group data is visible only to signed-in members.
- Joining happens via invite link token.
- If invite opened signed-out, user signs in then auto-completes invite.
- Joined users become participants and are available in split selection.

---

## Mobile-First Design Constraints

- Primary layout targets <= 430px viewport first.
- Sticky or bottom-aligned primary actions for creation flows.
- Horizontal overflow-safe navigation and chips.
- Minimum 44px touch targets.
- Reduced visual density on list rows; stronger section hierarchy.

---

## Phase Plan

## Phase 1 (UI-only, no new backend)

- Groups landing dashboard styling.
- Group header and tab bar polish.
- Expenses list/review visual hierarchy update.
- Balances/Stats/Activity cards modernization.
- Invite/share UI consistency pass.

## Phase 2 (UI + small behavior improvements)

- Receipt scanning flow visual progression.
- Item-review style for expense create/edit.
- Better empty/error/loading patterns.

## Phase 3 (net-new capability, optional)

- Chat/messaging system.
- Wallet/balance operations beyond group expenses.

---

## Acceptance Criteria for current redesign sprint

- Existing features keep working (auth, invites, memberships, splits, exports, stats).
- No route-level regression on mobile.
- Build and tests pass.
- UI reflects reference style direction without introducing unsupported features.
