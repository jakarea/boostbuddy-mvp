# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Commands

```bash
# Development
npm run dev                 # Start dev server on port 3300

# Production
npm run build             # Build for production
npm start                 # Start production server

# Code quality
npm run lint              # Run ESLint (no fix)
```

## High-Level Architecture

### Project Overview
BoostBuddy MVP is a client account management platform built with Next.js 16 (App Router). It serves as both an admin panel and client portal for managing browser profiles/accounts, services, billing, payments, and invoices.

### Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js 16 (Server Actions pattern), Node.js
- **Database**: SQLite + better-sqlite3 (dev), Prisma ORM
- **Auth**: Supabase Auth with custom user profile layer
- **Payments**: Stripe (EUR currency, checkout sessions)
- **UI Components**: Base UI, Lucide icons, custom shadcn-like components in `/components/ui`
- **i18n**: i18next with browser language detection
- **Themes**: next-themes for dark/light mode

### Data Model (Prisma)
Key entities defined in `prisma/schema.prisma`:
- **User**: Account holders with roles (ADMIN/CLIENT) and status (PENDING/ACTIVE/DEACTIVATED)
- **BillingInfo**: Individual or company billing details (name, address, VAT, fiscal codes)
- **Service**: Products/services with price, duration, and assignment requirements
- **ProfileAccount**: Browser profiles/accounts with credentials, 2FA, IXBrowser IDs, status tracking
- **Order**: Service purchases and renewals (status: PENDING/PAID/FAILED)
- **Invoice**: PDF invoices linked to users and orders

### Directory Structure

```
app/
  ├── layout.tsx                 # Root layout with AuthProvider, ThemeProvider
  ├── page.tsx                   # Home/landing page (usually redirects to auth or dashboard)
  ├── admin/                     # Admin panel routes
  │   ├── layout.tsx             # Admin sidebar layout
  │   ├── dashboard/page.tsx      # Admin overview/stats
  │   ├── clients/page.tsx        # Manage users
  │   ├── profiles/page.tsx       # Manage browser profiles
  │   ├── services/page.tsx       # Manage services/products
  │   ├── orders/page.tsx         # View/manage orders
  │   ├── invoices/page.tsx       # Upload/manage invoices
  │   └── notifications/page.tsx  # Expiration alerts
  ├── dashboard/                 # Client portal routes
  │   ├── layout.tsx             # Client sidebar layout
  │   ├── page.tsx               # Client dashboard (assigned profiles)
  │   ├── payments/page.tsx       # Payment history
  │   ├── invoices/page.tsx       # Invoice history/download
  │   ├── billing/page.tsx        # Billing details form
  │   ├── notifications/page.tsx  # Client expiration alerts
  │   └── pending/page.tsx        # Pending orders
  ├── auth/callback/route.ts      # Supabase auth redirect
  ├── api/
  │   ├── webhooks/stripe/route.ts # Stripe webhook handler
  │   └── logout/route.ts         # Logout API
  ├── checkout/page.tsx           # Stripe checkout page
  ├── logout/page.tsx             # Logout confirmation
  ├── forgot-password/page.tsx     # Password reset request
  ├── reset-password/page.tsx      # Password reset form
  └── actions/                    # Server actions (not routes)
      ├── stripe.ts               # Stripe session creation, proration calc
      ├── profiles.ts             # Profile CRUD operations
      ├── clients.ts              # Client management
      ├── services.ts             # Service management
      ├── orders.ts               # Order management
      ├── invoices.ts             # Invoice operations
      ├── billing.ts              # Billing info management
      ├── notifications.ts        # Expiration reminders
      ├── dashboard.ts            # Dashboard stats
      └── telegram.ts             # Telegram integration (optional)

components/
  ├── providers/                 # Context providers setup
  │   ├── AuthProvider.tsx        # Wraps app with auth context
  │   └── theme-provider.tsx      # Theme provider wrapper
  ├── SidebarLayout.tsx           # Main layout with sidebar navigation
  ├── TopHeader.tsx               # User menu, language switcher
  ├── ProfileCard.tsx             # Profile display component
  ├── BillingForm.tsx             # Billing details form
  ├── UserTelegramConfig.tsx       # Telegram settings
  ├── StatusBadge.tsx             # Status display component
  ├── LanguageSwitcher.tsx         # i18n language selector
  ├── ThemeToggle.tsx              # Dark/light mode toggle
  ├── LoadingScreen.tsx            # Full-page loading
  ├── ToastContainer.tsx           # Notification container
  ├── admin/                      # Admin-specific components
  └── ui/                         # Base UI components (button, input, card, etc.)

context/
  ├── AuthContext.tsx             # Client auth state, sign in/up/out, user persistence
  ├── ToastContext.tsx             # Toast notifications (success/error/info)
  └── ConfirmContext.tsx           # Confirmation dialogs

lib/
  ├── auth/
  │   ├── server-auth.ts          # requireAuth() helper for server actions
  │   ├── pure-functions.ts       # signIn/signUp/signOut utils
  │   ├── cached-auth.ts          # Auth caching (session management)
  │   ├── logout.ts               # Logout logic
  │   └── types.ts                # Auth types (AuthUser, AuthState, etc.)
  ├── supabase/
  │   ├── server.ts               # Server-side Supabase client (middleware)
  │   ├── client.ts               # Client-side Supabase client
  │   ├── admin.ts                # Admin Supabase client (if needed)
  │   └── middleware.ts           # Auth middleware for routes
  ├── stripe/
  │   └── stripe.ts               # Stripe client initialization
  ├── constants.ts                # App-wide constants, status enums
  ├── dateUtils.ts                # Date formatting, expiration checks
  ├── statusUtils.ts              # Status color/label mappings
  ├── i18n.ts                     # i18next config
  └── utils.ts                    # General utilities

prisma/
  ├── schema.prisma               # Data model
  └── dev.db                      # SQLite dev database (committed)

locales/                          # Translation files (JSON by language)
supabase/                         # Supabase config files

public/                           # Static assets
```

### Authentication & Authorization

**System**: Two-tier auth using Supabase Auth + custom user profile.

1. Supabase Auth: Handles sign-up, sign-in, password reset, email verification
2. User Profile: Custom table in SQLite stores role (ADMIN/CLIENT) and status

**Flow**:
- User signs up → Supabase creates auth record → Server action creates User profile with role=CLIENT
- User signs in → Supabase validates → AuthContext fetches User profile → Sets role in context
- Server actions use `requireAuth()` from `lib/auth/server-auth.ts` to verify auth + role

**Important**: AuthContext is the single source of truth for client-side user state. It:
- Listens to Supabase auth state changes
- Restores session on mount (via `getFullAuthUser()`)
- Provides `signIn`, `signUp`, `signOut` methods
- Wraps entire app via AuthProvider in root layout

### Server Actions Pattern

All backend operations use Next.js Server Actions (in `/app/actions/`). Each action:
1. Checks auth with `requireAuth()` or `requireAuth({ role: 'ADMIN' })`
2. Returns result as `{ success: true, data?: ... }` or `{ success: false, error: string }`
3. Uses Supabase client via `createClient()` from `lib/supabase/server.ts`

Example pattern:
```typescript
"use server";
import { requireAuth } from '@/lib/auth/server-auth';
import { createClient } from '@/lib/supabase/server';

export async function updateProfile(profileId: string, updates: any) {
  const auth = await requireAuth();
  if (!auth.success) return auth; // Early return on auth failure

  const supabase = await createClient();
  // ... perform operation ...
  return { success: true, data: result };
}
```

### Stripe Integration

- **Currency**: EUR (€) hardcoded in checkout sessions
- **Flow**: User clicks "Buy" → `createCheckoutSessionAction()` → Creates Stripe session → Redirects to Stripe → Success/cancel redirects to app
- **Renewal with Proration**: `calculateUpgradePriceInternal()` computes prorated credit for service upgrades (unused days credited)
- **Webhooks**: `app/api/webhooks/stripe/route.ts` handles payment_intent.succeeded and payment_intent.failed events
- **Metadata**: Stripe sessions store userId, type (PURCHASE/RENEWAL), serviceId, profileId for webhook processing

### Key Concepts

**Profile Statuses**: AVAILABLE, ASSIGNED, ACTIVE, EXPIRED, BANNED, CANCELLED, REQUEST_CHANGE
- Admin sets these manually in the profiles page
- Client sees assigned profiles with expiration dates
- Notifications alert when profile is close to expiration (configurable days)

**Billing Types**: INDIVIDUAL or COMPANY
- Each user has one optional BillingInfo record
- Stores local/country-specific tax info (VAT, fiscal codes, SDI codes for Italy)

**Service Types**: Products with fixed price and duration
- `requiresManualAssignment`: If true, admin must assign a profile after purchase
- `instructions`: Client-visible help text (shown when profile is assigned)

**IXBrowser Integration**: Currently manual (no API integration)
- Admin copies IXBrowser profile ID/group into BoostBuddy
- BoostBuddy displays reference codes to client
- Client opens profiles directly in IXBrowser (external app)

## Development Notes

### Common Tasks

**Adding a new page/feature**:
1. Create page.tsx in appropriate route folder
2. Use `requireAuth()` in any server actions
3. Import AuthContext if checking role on client
4. Use Supabase client for data operations

**Creating a server action**:
1. Add file in `app/actions/`
2. Mark with `"use server"`
3. Verify auth first with `requireAuth()`
4. Return `{ success: true, data }` or `{ success: false, error }`

**Adding a UI component**:
1. Base components go in `components/ui/`
2. Feature-specific in `components/` root (ProfileCard, BillingForm, etc.)
3. Use Tailwind + clsx for styling
4. Leverage CVA (class-variance-authority) for component variants

**Database changes**:
1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <change_description>` (creates migration)
3. Commit migration files
4. Note: This app uses SQLite in dev; better-sqlite3 adapter; schema auto-generated in `app/generated/prisma`

### Important Patterns

**Auth Flow**: Never skip auth checks. Always use `requireAuth()` in server actions.

**Database Queries**: Use Supabase client from `lib/supabase/server.ts` for server actions. Client-side use `lib/supabase/client.ts`.

**Error Handling**: Return structured errors `{ success: false, error: "message" }`. Never throw in actions; catch and return.

**Timestamps**: Use ISO format. Prisma handles `@default(now())` and `@updatedAt` automatically.

**Proration Logic**: If modifying service renewal/upgrade, see `calculateUpgradePriceInternal()` in `app/actions/stripe.ts` for how to compute prorated credits.

### Debugging

- **Auth issues**: Check `AuthContext` logs (verbose logging with `[AUTH-CONTEXT]` prefix) and Supabase session
- **Database**: SQLite stored in `dev.db`; inspect with Prisma Studio: `npx prisma studio`
- **Stripe**: Test keys in env; webhooks tested with Stripe CLI
- **Environment variables**: Required `.env.local` keys: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, STRIPE_SECRET_KEY, etc.

### Note on App Initialization

The app directory is mostly empty at the root (see `app/`). Main pages are under:
- `/app/admin/*` for admin routes
- `/app/dashboard/*` for client routes
- `/app/auth/*` and `/app/api/*` for authentication/webhooks
- Root `app/layout.tsx` wraps entire app with providers

There is no `/app/page.tsx` home page currently; routing logic determines which section user sees based on auth state and role.
