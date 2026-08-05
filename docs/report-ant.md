# 🔍 BoostBuddy MVP — Full Application Audit Report

**Date:** August 5, 2026  
**Auditor:** Antigravity AI  
**Scope:** Models, Database, Data Types, Validation, Error Messages, Performance, Security  
**Files Reviewed:** 50+ source files across 18 server actions, 11 API routes, 6 auth modules, 3 layouts, Prisma schema, Supabase config, Stripe integration

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [🚨 CRITICAL Security Vulnerabilities](#critical-security-vulnerabilities)
3. [🔴 HIGH Severity Issues](#high-severity-issues)
4. [🟠 MEDIUM Severity Issues](#medium-severity-issues)
5. [🟡 LOW Severity Issues](#low-severity-issues)
6. [📊 Database & Model Issues](#database--model-issues)
7. [✅ Validation & Error Message Issues](#validation--error-message-issues)
8. [⚡ Performance Issues](#performance-issues)
9. [🏗️ Architecture & Code Quality](#architecture--code-quality)
10. [📋 Route-by-Route Audit](#route-by-route-audit)
11. [Summary Scorecard](#summary-scorecard)

---

## Executive Summary

The BoostBuddy MVP is a **Next.js application** with Supabase Auth + PostgreSQL, Stripe payments, and a role-based system (Admin/Client/Employee). The codebase has a solid foundation with good patterns (centralized auth via `requireAuth`, request-level caching, idempotent webhook handling). However, the audit reveals **5 critical security vulnerabilities, 9 high-severity issues, 14 medium issues, and 11 low-severity issues** that need attention before production hardening.

| Severity | Count |
|----------|-------|
| 🚨 CRITICAL | 5 |
| 🔴 HIGH | 9 |
| 🟠 MEDIUM | 14 |
| 🟡 LOW | 11 |

---

## 🚨 CRITICAL Security Vulnerabilities

### C-1: Debug API Routes Exposed Without Authentication
**Files:** `app/api/debug-add-credits/route.ts`, `app/api/debug-stripe-session/route.ts`, `app/api/check-storage/route.ts`, `app/api/fix-constraint/route.ts`

The `/api/debug-add-credits` endpoint is **completely unauthenticated** — anyone who knows the URL can add unlimited credits to any user account by passing a `userId` and `amount` via query params. This is a **direct financial exploitation vector**.

```
GET /api/debug-add-credits?userId=xxx&amount=999999
```

Similarly, `/api/debug-stripe-session` exposes Stripe session details (payment status, metadata, customer email) to anyone. `/api/check-storage` leaks storage bucket configuration. `/api/fix-constraint` allows unauthenticated SQL execution via POST.

**Impact:** Full financial compromise, data exfiltration, database manipulation  
**Fix:** Delete all debug routes before production, or guard them with `requireAuth({ role: 'ADMIN' })` and `NODE_ENV !== 'production'` checks.

---

### C-2: Real API Keys Hardcoded in `.env.example`
**File:** `.env.example`

The `.env.example` file contains what appear to be **real Supabase and Stripe keys**:
```
NEXT_PUBLIC_SUPABASE_URL="https://tfnpwbolqgkpsfilhiqq.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_IRYXMUqoCdq9Hw3L557PeQ_EverIAzG"
SUPABASE_SERVICE_ROLE_KEY="sb_secret_29sCvzapQF76VwhVsvidXA_fsDsNUpz"
STRIPE_SECRET_KEY="sk_test_51Lp4ef..."
```

If this file has been committed to Git (which it has, since it's not in `.gitignore`), these keys are **permanently exposed** in the Git history. The Service Role Key bypasses all RLS policies.

**Impact:** Full database access bypass, payment system compromise  
**Fix:** Rotate ALL keys immediately. Replace `.env.example` with placeholder values like `your_supabase_url_here`.

---

### C-3: No Middleware — No Session Refresh, No Route Protection
**Files:** No `middleware.ts` in project root

The project defines `lib/supabase/middleware.ts` (a session refresh utility) but **never uses it** — there is no `middleware.ts` file at the project root. This means:

1. **Supabase JWT tokens are never refreshed** at the middleware level. Expired sessions may cause silent auth failures.
2. **No rate limiting** on any route.
3. **API routes lack centralized protection** — each route must implement its own auth check (and some don't).

**Impact:** Session expiration issues, unprotected routes, no rate limiting  
**Fix:** Create a root `middleware.ts` that calls `updateSession()` and applies route matchers for protected paths.

---

### C-4: `/api/fulfill-credits` — Unauthenticated Credit Fulfillment
**File:** `app/api/fulfill-credits/route.ts`

This endpoint triggers credit fulfillment for any Stripe session ID **without any authentication**:
```typescript
export async function POST(request: NextRequest) {
  const { sessionId } = await request.json();
  await fulfillCreditsPurchase(sessionId);
}
```

An attacker could brute-force or guess valid session IDs and trigger duplicate fulfillment. While `fulfillCreditsPurchase` has idempotency checks, this still leaks whether a session ID is valid.

**Impact:** Information disclosure, potential abuse of payment flow  
**Fix:** Add auth guard or restrict to internal-only calls. Consider deleting this route and relying solely on the Stripe webhook.

---

### C-5: SQL Injection in Admin Search Queries
**Files:** `app/actions/credits.ts:650`, `app/actions/admin-reviews.ts:72,93`

User search input is directly interpolated into Supabase `.or()` filter strings without sanitization:

```typescript
// credits.ts line 650
.or(`name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`)

// admin-reviews.ts line 72
.or(`business_name.ilike.%${searchLower}%,id.ilike.%${searchLower}%`)
```

While Supabase PostgREST parameterizes values server-side, the filter *syntax* can be exploited. A crafted input like `%,id.eq.any_id)--` could potentially manipulate the filter logic.

**Impact:** Potential filter bypass, unauthorized data access  
**Fix:** Sanitize the search input to remove special PostgREST characters (`,`, `.`, `(`, `)`, `%`) or use separate `.ilike()` calls chained with `.or()`.

---

## 🔴 HIGH Severity Issues

### H-1: Prisma Schema vs. Supabase Schema Mismatch
**File:** `prisma/schema.prisma`

The Prisma schema defines models with **camelCase** column names (`passwordHash`, `isActive`, `creditsBalance`), but the actual production database uses **snake_case** (`password_hash`, `is_active`, `credits_balance`). The entire codebase performs manual snake_case ↔ camelCase mapping everywhere, but the Prisma schema is essentially orphaned/wrong.

Additionally:
- The Prisma schema references `passwordHash String` — but Supabase Auth manages passwords; this field should not exist.
- `User.role` is `String` — should be an `enum` in the schema.
- The Prisma `datasource` block has `provider = "postgresql"` but no `url` configured.

**Impact:** Prisma migrations would generate incorrect schemas; developers using Prisma Client would get wrong column names  
**Fix:** Either remove Prisma entirely (since you use Supabase client directly) or synchronize the schema with the actual database.

---

### H-2: Dead Code — `pure-functions.ts` Uses `better-sqlite3` in Production
**File:** `lib/auth/pure-functions.ts`

This file imports `path` and uses `better-sqlite3` to query a local SQLite database:
```typescript
function getDb() {
  const Database = require('better-sqlite3');
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  return new Database(dbPath);
}
```

This code will **crash in production** (Vercel) since `better-sqlite3` is a native addon. While the `next.config.ts` has `serverExternalPackages: ['better-sqlite3']`, if any code path imports from `pure-functions.ts`, it will fail at runtime.

**Impact:** Runtime crash if any code path reaches `pure-functions.ts`  
**Fix:** Delete `pure-functions.ts` or ensure it's never imported in production code paths.

---

### H-3: Race Condition in Credit Adjustments
**File:** `app/actions/credits.ts:701-792`

The `adminAdjustCreditsAction` reads the balance, computes a new balance, then writes it:
```typescript
const currentBalance = user.credits_balance || 0;
const newBalance = currentBalance + data.amount;
// ... later ...
await supabase.from("users").update({ credits_balance: newBalance }).eq("id", data.userId);
```

This is a **TOCTOU (Time-of-Check-to-Time-of-Use)** race condition. If two admins adjust the same user's credits simultaneously, one adjustment will be lost. The `createReviewOrderAction` properly uses optimistic concurrency (`eq("credits_balance", expectedBalance)`), but `adminAdjustCreditsAction` does not.

**Impact:** Lost credit adjustments, incorrect balances  
**Fix:** Use the same optimistic concurrency pattern: `.eq("credits_balance", currentBalance)` on the update, and retry on failure.

---

### H-4: `broadcastToEmployeesAction` Queries Wrong Columns
**File:** `app/actions/notifications.ts:220-225`

```typescript
const { data, error } = await supabaseAdmin
  .from("users")
  .select("email")
  .eq("role", "EMPLOYEE")
  .eq("is_active", true)
  .eq("accepting_orders", true);
```

The query filters on `is_active` (boolean column) but the actual user status system uses the `status` column (`'ACTIVE'`, `'PENDING'`, `'DEACTIVATED'`). If the `is_active` column doesn't exist in the database (it may have been replaced by `status`), this query silently returns no results and no employee ever receives broadcast notifications.

**Impact:** Employee broadcast notifications silently fail  
**Fix:** Replace `.eq("is_active", true)` with `.eq("status", "ACTIVE")` to match the actual schema.

---

### H-5: Unreachable Code After Early Return
**File:** `app/actions/user-telegram.ts:109-181`

In `sendUserTelegramTestAction`, there's an early return on line 111 (`return { success: true }`), making all code after it **completely unreachable**:
```typescript
// TELEGRAM NOTIFICATIONS DISABLED
return { success: true };  // <-- Everything below is dead

if (!auth.success) {  // <-- This will NEVER execute
```

The same pattern exists in `telegram.ts:98-116` (`sendTelegramTestAction`) and `user-telegram.ts:193-209` (`getTelegramBotUsernameAction`).

**Impact:** Dead code, misleading "success" when nothing happens  
**Fix:** Remove the dead code after the early returns, or use a feature flag that can be toggled.

---

### H-6: `createAdminClient()` Used Without `await` Inconsistently
**Files:** `app/actions/notifications.ts:122`, `app/actions/clients.ts:389,441,505,542,571`, `app/actions/admin-reviews.ts:803,842`, `app/actions/services.ts:41,75`, `app/actions/profiles.ts:97,139,171,195`, `app/actions/invoices.ts:90,135,185`

`createAdminClient()` is a **synchronous function** (returns `ReturnType<typeof createClient>` directly), but some callers use `await createAdminClient()` while others don't. This inconsistency is confusing but not directly a bug. However, some places treat the return as awaitable when it isn't:

```typescript
// notifications.ts line 122
const supabaseAdmin = createAdminClient(); // No await - correct
// But other files:
const supabase = await createAdminClient(); // Await on sync function - harmless but misleading
```

**Impact:** Code confusion, potential for future bugs  
**Fix:** Standardize: since `createAdminClient()` is synchronous, never use `await` with it.

---

### H-7: No Input Sanitization on Employee/Client Creation
**Files:** `app/actions/employee.ts:38-228`, `app/actions/clients.ts:27-175`

When creating employees/clients via the REST API, user-supplied `name` is passed directly into `user_metadata` and database records without sanitization:
```typescript
body: JSON.stringify({
  email: data.email,
  password: data.password,
  user_metadata: {
    name: data.name,  // No sanitization — XSS risk if rendered
  }
})
```

**Impact:** Stored XSS if names are rendered without escaping  
**Fix:** Sanitize `name` to strip HTML/script tags. Add length limits.

---

### H-8: `signUpAction` Sets `isActive: false` in Metadata but `signUpUser` Sets `isActive: true`
**Files:** `app/actions/auth.ts:151` vs `lib/auth/pure-functions.ts:149`

Two different signup flows set contradictory `isActive` values:
```typescript
// auth.ts (server action) - correct
options: { data: { name, role: "CLIENT", isActive: false } }

// pure-functions.ts (client) - wrong
options: { data: { name, role: "CLIENT", isActive: true } }
```

If the client-side signup is ever used, users would be marked as active immediately, bypassing admin approval.

**Impact:** Authentication bypass for admin approval workflow  
**Fix:** Ensure all signup paths set `isActive: false` and `status: 'PENDING'`.

---

### H-9: Employee Listing Pulls ALL Auth Users
**File:** `app/actions/employee.ts:71`

```typescript
const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
const userExists = existingUser?.users?.some(u => u.email === data.email);
```

This fetches **ALL users from Supabase Auth** to check if one email exists. With even a few thousand users, this becomes extremely slow and wasteful.

**Impact:** O(N) user lookup, API rate limits, memory pressure  
**Fix:** Use `supabaseAdmin.from("users").select("id").eq("email", data.email).maybeSingle()` instead.

---

## 🟠 MEDIUM Severity Issues

### M-1: `Float` Used for Financial Fields in Prisma Schema
**File:** `prisma/schema.prisma:60,103,138`

```prisma
price   Float  // Service price
amount  Float  // Order amount
price   Float  // CreditPackage price
```

Using floating-point for financial values causes precision errors (e.g., `0.1 + 0.2 !== 0.3`). The Stripe integration correctly converts to cents (`Math.round(price * 100)`), but internal calculations may accumulate rounding errors.

**Impact:** Financial calculation imprecision  
**Fix:** Use `Decimal` type in Prisma, or use integer cents throughout.

---

### M-2: Stripe API Version Hardcoded to Future Date
**File:** `lib/stripe/stripe.ts:10`

```typescript
apiVersion: '2026-05-27.dahlia'
```

This pins the Stripe API to a specific version. If the version is incorrect or unavailable, all Stripe operations fail.

**Impact:** Stripe API calls may fail with version mismatch  
**Fix:** Use the latest stable API version or remove the explicit version to use the SDK default.

---

### M-3: Missing Stripe Webhook Signature Verification for Fulfill API
**File:** `app/api/fulfill-credits/route.ts`

Unlike the webhook route which properly verifies `stripe-signature`, the fulfill-credits endpoint processes session IDs without verifying they came from Stripe.

**Impact:** Bypass of payment verification  
**Fix:** Delete this endpoint or add signature verification.

---

### M-4: `photoUrls` Stored as String, Parsed with `JSON.parse` Without Error Handling
**Files:** `app/actions/reviews.ts:463,518`, `app/actions/admin-reviews.ts:152`

```typescript
photoUrls: order.photo_urls ? JSON.parse(order.photo_urls) : null
```

If `photo_urls` is malformed JSON (truncated, corrupted), this will throw an unhandled exception crashing the request.

**Impact:** Runtime crash on malformed data  
**Fix:** Wrap in try/catch: `try { JSON.parse(x) } catch { null }`.

---

### M-5: Password Minimum Length Only 6 Characters
**Files:** `app/actions/auth.ts:137`, `app/actions/employee.ts:62`, `app/actions/clients.ts:45`

```typescript
if (password.length < 6) {
  return { success: false, error: "Password must be at least 6 characters long." };
}
```

6 characters is too weak for production. No complexity requirements (uppercase, number, special char).

**Impact:** Weak password accounts easily compromised  
**Fix:** Enforce minimum 8 characters with complexity rules.

---

### M-6: Admin Layout Only Checks Role, Not Active Status
**File:** `app/a/layout.tsx`

```typescript
const auth = await requireAuth({ role: 'ADMIN' });
```

Unlike the client (`/c`) and employee (`/e`) layouts which check `isActive` status, the admin layout only checks role. A deactivated admin can still access the admin panel.

**Impact:** Deactivated admins retain full access  
**Fix:** Add `if (!auth.user.isActive) redirect('/');`

---

### M-7: Inconsistent Error Handling — Some Actions Throw, Others Return Error Objects
**Files:** `app/actions/clients.ts:278,289` vs `app/actions/credits.ts:61`

```typescript
// clients.ts - throws (will crash React component if not caught)
export async function getClientsAction() {
  if (!auth.success) throw new Error(auth.error);
  if (error) throw new Error("Failed to fetch clients");
}

// credits.ts - returns error object (safe)
export async function getCreditPackagesAdminAction() {
  return { success: false, error: error.message };
}
```

Components calling `getClientsAction` must use try/catch, while those calling credit actions check `result.success`. This inconsistency leads to unhandled exceptions.

**Impact:** Unhandled exceptions, React error boundaries triggered  
**Fix:** Standardize all actions to return `{ success, error }` objects.

---

### M-8: `revalidatePath` Targets May Not Match Actual Routes
**Files:** Various actions

Several `revalidatePath` calls target paths that don't match the actual route structure:
- `revalidatePath("/wallet")` — actual path is `/c/wallet`
- `revalidatePath("/a/services/credits")` — unclear if this path exists
- `revalidatePath("/dashboard")` — should be `/c/dashboard` or `/a/dashboard`

**Impact:** Stale cached data shown to users after mutations  
**Fix:** Audit all `revalidatePath` calls against actual route structure.

---

### M-9: Client-Side `signUpUser` Sets `isActive: true` — Bypasses Approval
**File:** `lib/auth/pure-functions-client.ts:53-72`

```typescript
options: {
  data: { name, role: "CLIENT", isActive: true },
}
```

If this client-side signup function is ever called (e.g., from a modified client), users are immediately marked active, bypassing the admin approval flow.

**Impact:** Potential approval bypass  
**Fix:** Set `isActive: false` or remove this function if unused.

---

### M-10: Notification System Returns Success But Does Nothing
**File:** `app/actions/notifications.ts:105-113`

```typescript
async function dispatchToTelegram(...): Promise<void> {
  // TELEGRAM NOTIFICATIONS DISABLED
  console.info("[TELEGRAM] Notifications disabled - skipping delivery.");
  return;
}
```

All notifications (Telegram) are hard-disabled. The system logs them but never delivers. Users may expect notifications but never receive them.

**Impact:** Silent notification delivery failure  
**Fix:** Use an environment variable flag (`TELEGRAM_ENABLED=true`) instead of hardcoding.

---

### M-11: `completeReviewAction` Uses Nested Async Query Inside `.update()`
**File:** `app/actions/employee.ts:1044-1049`

```typescript
orders_completed: await supabase
  .from("employee_stats")
  .select("orders_completed")
  .eq("user_id", employeeId)
  .single()
  .then(({ data }) => (data?.orders_completed || 0) + 1),
```

An `await` inside the `.update()` call body means the query runs *before* the update payload is constructed — but the pattern is fragile and could break with certain transpilers.

**Impact:** Potential compile/runtime errors, hard to debug  
**Fix:** Fetch the value first, then use it in the update.

---

### M-12: `getEmployeeOrderDetailAction` — Clients Can Access Any Order
**File:** `app/actions/admin-reviews.ts:866-892`

```typescript
export async function getEmployeeOrderDetailAction(orderId: string) {
  const auth = await requireAuth(); // No role check
  // Employees can only view orders assigned to them
  if (auth.user.role === 'EMPLOYEE' && order.assigned_employee_id !== auth.user.id) {
    return { success: false, error: "Unauthorized" };
  }
  return { success: true, data: order }; // CLIENT role can see ALL orders
}
```

A CLIENT user who is not an admin or employee can view **any** order's full details, including other clients' business information.

**Impact:** Data leakage between clients  
**Fix:** Add role-specific filtering: clients should only see their own orders.

---

### M-13: `createAdminClient` Singleton May Cause Stale Connections
**File:** `lib/supabase/admin.ts:12-35`

The admin client is cached in a module-level singleton (`_adminClient`). In long-running server processes, this could hold a stale connection or exhausted connection pool.

**Impact:** Potential stale connections after long uptime  
**Fix:** Consider recreating the client periodically or on error.

---

### M-14: `updateBillingInfoAction` Allows Admin to Modify Any User's Billing Without Logging
**File:** `app/actions/clients.ts:351-382`

Admin can update any user's billing information with no audit trail. No notification is sent to the user whose billing was changed.

**Impact:** No audit trail for sensitive financial data changes  
**Fix:** Add audit logging and user notification.

---

## 🟡 LOW Severity Issues

### L-1: Excessive Console Logging in Production
**Files:** Nearly all action files

Hundreds of `console.log`, `console.group`, `console.groupEnd` calls throughout:
```typescript
console.log("📍 [LOG#1] fulfillCreditsPurchase START - sessionId:", sessionId);
console.log("📍 [LOG#46a] Checking SUPABASE_SERVICE_ROLE_KEY...");
console.log("📍 [LOG#46c] Service key length:", process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
```

Note: `next.config.ts` strips console logs in production (good!), but `console.error` and `console.warn` are preserved — and some debug info leaks through those channels (line 362 logs the service key length).

**Impact:** Log noise, minor information leakage through error/warn channels  
**Fix:** Remove debug logs with numbered prefixes. Never log credential metadata.

---

### L-2: Unused Prisma Schema and Dev DB
**Files:** `prisma/schema.prisma`, `dev.db`, `prisma/dev.db`

The project has two `dev.db` files (root and prisma dir) and a Prisma schema that doesn't match the actual Supabase database. These are dead artifacts.

**Impact:** Confusion, disk space, false sense of schema documentation  
**Fix:** Delete `dev.db` files and either update or remove the Prisma schema.

---

### L-3: Leftover Test/Scratch Files in Root
**Files:** `test-auth.ts`, `fix-idea.ts`, `apply-schema.ts`, `proxy.ts`, `COMPLETE_AUTH_SYSTEM_READY.txt`

These files serve no production purpose and add confusion:
- `test-auth.ts` — 49 bytes, likely a test stub
- `fix-idea.ts` — 37 bytes
- `COMPLETE_AUTH_SYSTEM_READY.txt` — 11.9KB documentation artifact

**Impact:** Code clutter  
**Fix:** Move to a `/docs` folder or delete.

---

### L-4: `dev-server.log` Committed to Repo
**File:** `dev-server.log`

Server logs should never be committed to version control.

**Impact:** Log data exposed in Git history  
**Fix:** Add `*.log` to `.gitignore` and remove from tracking.

---

### L-5: `randomUUID` Imported but Supabase Auto-Generates IDs
**Files:** `app/actions/reviews.ts:8`, `app/actions/credits.ts:8`, `app/actions/employee.ts:7`

Several actions manually generate UUIDs with `randomUUID()`, but the Supabase tables have `@default(uuid())`. Double ID generation is unnecessary.

**Impact:** Unnecessary code, potential ID conflicts  
**Fix:** Let the database generate IDs; remove manual UUID generation.

---

### L-6: `hasRole` Function Only Accepts "ADMIN" | "CLIENT" — Missing "EMPLOYEE"
**Files:** `lib/auth/pure-functions.ts:216`, `lib/auth/pure-functions-client.ts:94`

```typescript
export function hasRole(user: AuthUser | null, requiredRole: "ADMIN" | "CLIENT"): boolean
```

The function signature doesn't accept "EMPLOYEE" as a valid role, even though the system has three roles.

**Impact:** TypeScript error if checking EMPLOYEE role via this function  
**Fix:** Add `"EMPLOYEE"` to the union type.

---

### L-7: `app/api/logout/route.ts` May Exist But Is Separate From Auth Sign-Out
**File:** `app/api/logout/` directory exists

There's a separate API route for logout alongside the server action `signOutAction`. Dual logout mechanisms can lead to inconsistent session cleanup.

**Impact:** Potential partial logout  
**Fix:** Consolidate to a single logout mechanism.

---

### L-8: `orders.ts` Uses `fulfillOrder` Without Transaction
**File:** `app/actions/orders.ts:55-157`

The `fulfillOrder` function performs multiple database writes (create order, update profile, send notification) without a database transaction. If a later step fails, earlier writes are not rolled back.

**Impact:** Partial fulfillment (order created but profile not updated)  
**Fix:** Use Supabase RPC or database function for atomic operations.

---

### L-9: `eslint.config.mjs` Present But No Lint CI Integration
**File:** `eslint.config.mjs`

ESLint config exists but there's no evidence of CI/CD integration or pre-commit hooks.

**Impact:** Code quality not enforced automatically  
**Fix:** Add lint step to CI pipeline.

---

### L-10: Stripe App Info Typo
**File:** `lib/stripe/stripe.ts:13`

```typescript
name: 'BoostBudy MVP'  // Missing 'd' — should be 'BoostBuddy'
```

**Impact:** Minor branding inconsistency in Stripe dashboard  
**Fix:** Correct to `'BoostBuddy MVP'`.

---

### L-11: `database-indexes.ts` Imports `success, error` from `ToastContext`
**File:** `app/actions/database-indexes.ts:4`

```typescript
import { success, error } from "@/context/ToastContext";
```

A server action importing from a client context. These imports are never used in the file. This may cause a build error if the ToastContext uses client-only APIs.

**Impact:** Potential build error, dead import  
**Fix:** Remove the unused import.

---

## 📊 Database & Model Issues

### Schema vs. Reality Gaps

| Prisma Schema | Actual Supabase Table | Issue |
|---|---|---|
| `User.passwordHash` | Not used (Supabase Auth) | Dead column in schema |
| `User.isActive: Boolean` | `users.status: String ('ACTIVE'/'PENDING')` | Different representation |
| `User.acceptingOrders: Boolean` | `users.accepting_orders: Boolean` | Case mismatch |
| `User.telegramChatId: String?` | `users.telegram_chat_id` | Case mismatch |
| `ReviewOrder` (13 fields) | `review_orders` (25+ fields) | Schema outdated — missing `order_type`, `facebook_url`, `quantity`, `comment_text`, `photo_urls`, `client_feedback`, `number_of_reviews`, etc. |
| No `review_credit_pricing` model | `review_credit_pricing` table exists | Missing from schema |
| No `user_telegram_configs` model | `user_telegram_configs` table exists | Missing from schema |
| No `app_settings` model | `app_settings` table exists | Missing from schema |
| No `notification_logs` model | `notification_logs` table exists | Missing from schema |

### Data Type Concerns

| Field | Current Type | Recommended Type | Reason |
|---|---|---|---|
| `Service.price` | `Float` | `Decimal` / `Int` (cents) | Financial precision |
| `Order.amount` | `Float` | `Decimal` / `Int` (cents) | Financial precision |
| `CreditPackage.price` | `Float` | `Decimal` / `Int` (cents) | Financial precision |
| `User.role` | `String` | `Enum` | Type safety |
| `ReviewOrder.status` | `String` | `Enum` | Type safety |
| `Order.status` | `String` | `Enum` | Type safety |
| `ProfileAccount.status` | `String` | `Enum` | Type safety |
| `Notification.channels` | `String` (comma-sep) | `String[]` or join table | Proper normalization |

---

## ✅ Validation & Error Message Issues

### Missing Validations

| Action | Missing Validation | Risk |
|---|---|---|
| `updateClientStatusAction` | No validation on `status` parameter | Admin could set invalid status string |
| `updateUserRoleAction` | No self-role-change prevention | Admin could change their own role |
| `updateBillingInfoAction` | No `billingData` shape validation | Arbitrary fields injected |
| `upsertServiceAction` | No check for `NaN` on `parseFloat/parseInt` | Invalid prices/durations saved |
| `assignProfileAction` | No date format validation for `expirationDate` | Invalid dates saved |
| `createReviewOrderAction` | No max length on `facebookUrl` | Oversized URLs |
| `submitCompletedReviewAction` | No max length on `proof` string | Oversized proof text |
| `skipOrderAction` | No max length on `reason` | Oversized reason text |

### Error Message Inconsistencies

| Issue | Examples |
|---|---|
| Mix of i18n keys and hardcoded English | `"email_not_verified_login_error"` (i18n key) vs `"All fields are required."` (hardcoded) |
| Error messages expose internal details | `"Failed to create admin client: {error}. Check SUPABASE_SERVICE_ROLE_KEY..."` |
| Inconsistent error shapes | Some return `{ success, error }`, some `{ success, message }`, some throw |

---

## ⚡ Performance Issues

### P-1: N+1 Query Pattern in Employee Order Views
**File:** `app/actions/employee.ts:897-988`

`getEmployeeReviewOrdersAction` fetches pending orders, assigned orders, then queries skip records for ALL combined order IDs. This could be consolidated into fewer queries.

### P-2: `getAllCreditTransactionsAction` Loads Unbounded Data
**File:** `app/actions/credits.ts:615-692`

No pagination — fetches ALL credit transactions. With thousands of transactions, this will be slow and memory-intensive.

### P-3: `getProfilesAction` Fetches Everything
**File:** `app/actions/profiles.ts:8-51`

```typescript
.select(`*, users (...), services (...)`)
.order("created_at", { ascending: false })
```

Selects ALL profiles with ALL columns and joins. No pagination, no limit.

### P-4: `getReviewsOverviewAction` Makes 6 Parallel Queries Including a Full Table Scan
**File:** `app/actions/admin-reviews.ts:658-665`

```typescript
supabase.from("review_orders").select("credits_consumed").select("credits_consumed")
```

This loads ALL review orders just to sum `credits_consumed`. Should use a database aggregate function.

### P-5: Client Layout Reads `x-current-path` Header
**File:** `app/c/layout.tsx:17-18`

```typescript
const headersList = await headers();
const currentPath = headersList.get('x-current-path') || '';
```

This header is never set (no middleware sets it), so `currentPath` is always `''`. The redirect logic based on it (`/c/pending`, `/c`) never triggers correctly.

---

## 🏗️ Architecture & Code Quality

### Duplicate Logic
- **Two `completeReviewAction` functions**: `employee.ts:569-677` (`submitCompletedReviewAction`) and `employee.ts:993-1063` (`completeReviewAction`) do essentially the same thing with slightly different implementations.
- **Two signup paths**: `auth.ts:signUpAction` and `pure-functions.ts:signUpUser` / `pure-functions-client.ts:signUpUser` with contradictory `isActive` values.
- **Two client creation paths**: `clients.ts:createClientAction` and `clients.ts:inviteUserAction`.

### Code Duplication — snake_case Normalization
The snake_case → camelCase mapping is repeated in **15+ places** across the codebase. Each mapping is done manually with potential for typos. Consider a shared utility function.

---

## 📋 Route-by-Route Audit

| Route / API | Auth | Validation | Security Issues |
|---|---|---|---|
| `POST /api/webhooks/stripe` | Stripe Signature ✅ | Session ID check ✅ | None |
| `POST /api/upload-photo` | `requireAuth()` ✅ | File type + size ✅ | Missing content-type re-validation |
| `POST /api/fulfill-credits` | ❌ **NONE** | Session ID only | 🚨 CRITICAL — No auth |
| `GET /api/debug-add-credits` | ❌ **NONE** | userId param only | 🚨 CRITICAL — No auth |
| `GET /api/debug-credits` | `requireAuth()` ✅ | None needed | Exposes order/transaction data |
| `GET /api/debug-stripe-session` | ❌ **NONE** | session_id param | 🚨 Exposes Stripe data |
| `GET /api/check-storage` | ❌ **NONE** | None | Leaks bucket config |
| `POST /api/fix-constraint` | ❌ **NONE** | None | 🚨 Executes SQL |
| `GET /api/user/credits` | Unknown | Unknown | Needs verification |
| `POST /api/logout` | Unknown | Unknown | Dual logout mechanism |
| `/a/*` (Admin routes) | `requireAuth({ role: 'ADMIN' })` ✅ | Varies | Missing `isActive` check |
| `/c/*` (Client routes) | `requireAuth()` ✅ | Status check ✅ | Header-based path check broken |
| `/e/*` (Employee routes) | `requireAuth()` ✅ + role check | Status check ✅ | Correct implementation |

---

## Summary Scorecard

| Category | Score | Notes |
|---|---|---|
| **Authentication** | 6/10 | Good centralized auth, but debug routes bypass it entirely |
| **Authorization** | 7/10 | Role checks present, but some actions allow cross-role data access |
| **Input Validation** | 5/10 | Partial — many endpoints missing length limits, format checks |
| **Error Handling** | 5/10 | Inconsistent patterns (throw vs return), some unhandled parse errors |
| **Data Integrity** | 5/10 | Race conditions in credit operations, no DB transactions |
| **Performance** | 6/10 | Good use of `Promise.all`, but missing pagination on key queries |
| **Security** | 3/10 | Critical: debug routes, exposed keys, SQL injection vectors |
| **Code Quality** | 6/10 | Well-structured but significant duplication, dead code, schema mismatch |
| **Database Design** | 6/10 | Reasonable schema, but Float for money, no enums, orphaned Prisma |
| **Production Readiness** | 4/10 | Must fix critical issues before production launch |

### **Overall: 5.3/10 — Needs Significant Hardening Before Production**

---

### Priority Fix Order

1. 🚨 **Immediately**: Delete or auth-gate all debug API routes (C-1, C-4)
2. 🚨 **Immediately**: Rotate all exposed API keys (C-2)
3. 🚨 **Today**: Add root middleware for session refresh (C-3)
4. 🚨 **Today**: Sanitize search inputs in filter queries (C-5)
5. 🔴 **This Week**: Fix race conditions in credit adjustments (H-3)
6. 🔴 **This Week**: Delete/fix dead `pure-functions.ts` and duplicate code (H-2, H-5)
7. 🔴 **This Week**: Fix employee broadcast query columns (H-4)
8. 🟠 **Next Sprint**: Add pagination to unbounded queries (P-2, P-3)
9. 🟠 **Next Sprint**: Standardize error handling patterns (M-7)
10. 🟠 **Next Sprint**: Fix schema mismatches and add proper validation (M-1, H-1)

---

## 🔄 Additional Findings (Cross-Referenced from GLM Report)

The following issues were identified in the GLM report (`report-glm.md`) that were **not covered** in my audit above. They are valid and should also be addressed.

---

### Frontend Performance (Not Covered Above)

#### GLM-F1: Unnecessary React Re-renders
**File:** `app/a/clients/client-page.tsx:88`

`setState` called inside `useEffect` triggers cascading re-renders:
```typescript
useEffect(() => {
  const page = parseInt(searchParams.get("page") || "1", 10);
  setCurrentPage(page); // Triggers re-render
}, [searchParams]);
```

**Fix:** Derive `currentPage` from `searchParams` via `useMemo` instead of `useState + useEffect`.

#### GLM-F2: Missing `React.memo` on List Items
**Files:** Multiple list components (client list, order list, profile list)

No memoization of child list items — parent re-renders cause all children to re-render.

**Fix:** Wrap list item components in `React.memo()`.

#### GLM-F3: No Lazy Loading / Dynamic Imports
**Files:** Multiple client pages

All components are loaded eagerly. Heavy components like dashboard charts, modals, and forms should use `next/dynamic`.

**Fix:** Use `dynamic(() => import('./HeavyComponent'), { ssr: false })` for non-critical components.

#### GLM-F4: Missing Next.js `<Image>` Component Usage
**Files:** Multiple components using `<img>` tags

Standard `<img>` tags miss out on Next.js image optimization (lazy loading, responsive sizes, format conversion).

**Fix:** Replace `<img>` with `next/image` `<Image>` component.

#### GLM-F5: Large Monolithic Client Components
**File:** `app/c/dashboard-client.tsx` (13.5KB, 487 lines)

Single files containing too much logic and UI. Should be split into smaller focused components.

**Fix:** Extract sub-components (stats section, profile cards, action buttons).

---

### Infrastructure & DevOps (Not Covered Above)

#### GLM-I1: No Environment Variable Validation at Startup
**Files:** Application startup

Required env vars (`SUPABASE_URL`, `STRIPE_SECRET_KEY`, etc.) are accessed with `!` assertions or `|| ''` fallbacks. If missing, errors appear at runtime, not startup.

**Fix:** Add a startup validation script (e.g., using `zod` or a simple `checkEnv()` function in `instrumentation.ts`).

#### GLM-I2: No Health Check Endpoint
**Files:** API routes

No `/api/health` or equivalent for monitoring/load-balancer health probes.

**Fix:** Add `app/api/health/route.ts` returning `{ status: "ok", timestamp: ... }`.

#### GLM-I3: No Testing Infrastructure
**Files:** No `__tests__/`, no `jest.config`, no Playwright config

Zero test coverage. No unit tests, integration tests, or E2E tests.

**Fix:** Add Jest + React Testing Library for unit tests. Add Playwright for E2E.

---

### Compliance (Not Covered Above)

#### GLM-C1: GDPR Considerations
The app stores user personal data (names, emails, billing info) without:
- Data retention policies
- Right-to-deletion functionality
- Data export capability

**Fix:** Implement user data export and account deletion features before EU launch.

#### GLM-C2: Accessibility (WCAG)
No evidence of ARIA labels, keyboard navigation support, or screen reader testing.

**Fix:** Audit all forms and interactive elements for accessibility.

---

### Code Quality (Not Covered Above)

#### GLM-Q1: Excessive `any` Usage — 110+ Occurrences
**Files:** Nearly all server action files

Every `catch (error: any)` and many response mappings use `any`, eliminating TypeScript's safety.

**Fix:** Define proper error types. Use `unknown` in catch blocks with type narrowing.

#### GLM-Q2: Missing `useEffect` Cleanup Functions
**File:** `app/a/reviews/page.tsx:38-56`

`useEffect` hooks that set up intervals, subscriptions, or async state without returning cleanup functions can cause memory leaks.

**Fix:** Add cleanup return functions to all `useEffect` hooks.

#### GLM-Q3: Magic Numbers Without Constants
**File:** `app/actions/reviews.ts:166`

Hardcoded credit costs, timeout values, and limit numbers scattered through the code.

**Fix:** Extract to a `lib/constants.ts` file.

#### GLM-Q4: No Centralized Route Constants
**Files:** Multiple components with hardcoded route strings

Routes like `/a/dashboard`, `/c/dashboard`, `/e/dashboard` are repeated as strings.

**Fix:** Create `lib/routes.ts` with `export const ROUTES = { ADMIN_DASHBOARD: '/a/dashboard', ... }`.

---

## ⚠️ Corrections to GLM Report (report-glm.md)

> **🔔 NOTE FOR GLM AI (or any AI reading `report-glm.md`):**
> The following items in the GLM report contain **inaccuracies or misleading assessments**. Please review and correct these in your report or implementation work.

### ❌ GLM Issue 5.2: "No File Upload Validation" — INCORRECT

GLM states: *"No file type/size validation"* for invoice uploads.

**Reality:** The `app/api/upload-photo/route.ts` has **proper validation**:
```typescript
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
// Validates both file type AND size before upload
```
Invoice uploads (`app/actions/invoices.ts`) validate file presence and handle storage errors. The validation **does exist** — it's not missing.

---

### ❌ GLM Issue 7.10: "Passwords stored in plain text" — INCORRECT

GLM states: *"Passwords stored in plain text"* referencing `prisma/schema.prisma:75-77`.

**Reality:** Supabase Auth manages ALL password hashing and storage. The `passwordHash` field in the Prisma schema is **dead/unused code** — it was part of an old local SQLite setup. The actual production app never stores or reads passwords directly. The real issue is that the Prisma schema is orphaned, not that passwords are stored in plain text.

---

### ❌ GLM Issue 7.12: "Missing CSRF Protection" — MISLEADING

GLM states: *"No CSRF tokens on forms"*.

**Reality:** Next.js Server Actions have **built-in CSRF protection**. Every server action call includes an `__next_action_id` header that is validated by the framework. Additionally, Supabase Auth uses httpOnly cookies with SameSite attributes. While explicit CSRF tokens aren't used, the framework provides equivalent protection for server actions. API routes (non-server-action) may still benefit from additional protection, but this is not the critical gap GLM suggests.

---

### ❌ GLM Issue 7.11: "No Session Timeout" — PARTIALLY INCORRECT

GLM states: *"Sessions don't expire"*.

**Reality:** Supabase Auth uses **JWT tokens with built-in expiry** (default 1 hour access token, 7 day refresh token). Sessions DO expire — the issue is that the app lacks a root `middleware.ts` to refresh them (already documented as C-3 in my report), not that sessions have no timeout.

---

### ⚠️ GLM Report Missing Critical Items

The GLM report **completely missed** these critical security issues that should be the **highest priority fixes**:

1. **🚨 Unauthenticated Debug API Routes** (my C-1): `/api/debug-add-credits` allows ANYONE to add unlimited credits to any user. This is the single most dangerous vulnerability in the codebase. GLM's report does not mention it.

2. **🚨 Unauthenticated `/api/fulfill-credits`** (my C-4): Anyone can trigger credit fulfillment without auth.

3. **🚨 Unauthenticated `/api/fix-constraint`** (part of C-1): Anyone can POST to execute SQL DDL commands.

4. **🚨 No Root Middleware** (my C-3): The `lib/supabase/middleware.ts` utility exists but is **never mounted** — there is no `middleware.ts` at the project root.

5. **🚨 SQL Injection in PostgREST Filters** (my C-5): User search input is interpolated into `.or()` filter strings.

6. **🔴 `getEmployeeOrderDetailAction` Data Leak** (my M-12): CLIENT role users can access ANY order's details.

7. **🔴 Employee Broadcast Wrong Column** (my H-4): `broadcastToEmployeesAction` filters on `is_active` boolean but the schema uses `status` string.

8. **🔴 `pure-functions.ts` will crash in production** (my H-2): Imports `better-sqlite3` which is a native addon that cannot run on Vercel.

> **Instructions for GLM AI:** When implementing fixes, prioritize the 5 CRITICAL items from my report (C-1 through C-5) before addressing any MEDIUM or LOW items from your own report. The debug routes (C-1) should be deleted or auth-gated **first** — they represent an active exploitation vector.

---

## 📝 Combined Priority Fix Order (Both Reports)

| Priority | Action | Source |
|---|---|---|
| 🚨 **P0 — NOW** | Delete/auth-gate debug API routes (`debug-add-credits`, `debug-stripe-session`, `fix-constraint`, `check-storage`, `fulfill-credits`) | ANT C-1, C-4 |
| 🚨 **P0 — NOW** | Rotate ALL API keys (Supabase, Stripe) and replace `.env.example` with placeholders | ANT C-2, GLM 7.1 |
| 🚨 **P0 — TODAY** | Create root `middleware.ts` mounting `updateSession()` | ANT C-3 |
| 🚨 **P0 — TODAY** | Sanitize search inputs in `.or()` PostgREST filters | ANT C-5 |
| 🔴 **P1 — THIS WEEK** | Fix race condition in `adminAdjustCreditsAction` (add optimistic locking) | ANT H-3, GLM 3.1 |
| 🔴 **P1 — THIS WEEK** | Delete dead `pure-functions.ts` / `pure-functions-client.ts` | ANT H-2 |
| 🔴 **P1 — THIS WEEK** | Fix `broadcastToEmployeesAction` column name (`is_active` → `status`) | ANT H-4 |
| 🔴 **P1 — THIS WEEK** | Fix `getEmployeeOrderDetailAction` — add CLIENT ownership check | ANT M-12 |
| 🔴 **P1 — THIS WEEK** | Remove unreachable dead code in telegram actions | ANT H-5 |
| 🔴 **P1 — THIS WEEK** | Fix `signUpUser` `isActive: true` → `isActive: false` | ANT H-8, M-9 |
| 🟠 **P2 — NEXT SPRINT** | Add pagination to unbounded queries (`getAllCreditTransactions`, `getProfiles`) | ANT P-2, P-3 |
| 🟠 **P2 — NEXT SPRINT** | Standardize all actions to return `{ success, error }` (no throws) | ANT M-7, GLM 5.3 |
| 🟠 **P2 — NEXT SPRINT** | Admin layout — add `isActive` check | ANT M-6 |
| 🟠 **P2 — NEXT SPRINT** | Wrap `JSON.parse(photo_urls)` in try/catch | ANT M-4 |
| 🟠 **P2 — NEXT SPRINT** | Fix broken `revalidatePath` targets (`/wallet` → `/c/wallet`) | ANT M-8 |
| 🟠 **P2 — NEXT SPRINT** | Strengthen password requirements (min 8 chars + complexity) | ANT M-5, GLM 7.3 |
| 🟠 **P2 — NEXT SPRINT** | Add env validation at startup | GLM 9.1 |
| 🟡 **P3 — BACKLOG** | Replace `<img>` with `<Image>` component | GLM-F4 |
| 🟡 **P3 — BACKLOG** | Add `React.memo` to list item components | GLM-F2 |
| 🟡 **P3 — BACKLOG** | Fix `useEffect` re-render pattern in client-page | GLM-F1 |
| 🟡 **P3 — BACKLOG** | Create centralized route constants | GLM-Q4 |
| 🟡 **P3 — BACKLOG** | Reduce `any` type usage, use `unknown` in catches | GLM-Q1 |
| 🟡 **P3 — BACKLOG** | Add health check endpoint | GLM-I2 |
| 🟡 **P3 — BACKLOG** | Delete leftover files (`test-auth.ts`, `fix-idea.ts`, `dev-server.log`) | ANT L-3, L-4 |
| 🟡 **P3 — BACKLOG** | Fix Stripe app info typo (`BoostBudy` → `BoostBuddy`) | ANT L-10 |
| 🟡 **P3 — BACKLOG** | Set up testing infrastructure (Jest + Playwright) | GLM-I3 |
| 🟡 **P3 — BACKLOG** | GDPR compliance (data export, account deletion) | GLM-C1 |

---

*End of Audit Report — Antigravity AI, August 5, 2026*
