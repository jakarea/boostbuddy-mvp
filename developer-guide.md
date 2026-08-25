# BoostBuddy MVP - Developer Guide

**Last Updated:** August 25, 2026
**Version:** 1.0.0
**Status:** Production Live

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Development Setup](#4-development-setup)
5. [Code Structure](#5-code-structure)
6. [Key Patterns & Conventions](#6-key-patterns--conventions)
7. [Common Development Tasks](#7-common-development-tasks)
8. [Database & Schema](#8-database--schema)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Known Issues & TODOs](#10-known-issues--todos)
11. [Deployment](#11-deployment)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Project Overview

BoostBuddy MVP is a **client account management platform** that serves as both an admin panel and client portal for managing:

- **Browser profiles/accounts** (via IXBrowser integration)
- **Services & Billing** (Stripe payments, invoices)
- **Review Orders** (Facebook reviews/reactions management)
- **Notifications** (Telegram integration)
- **Employee Management** (order assignment and completion tracking)

### Key Features

- **Three Access Levels**: Admin, Employee, Client
- **Multi-language Support**: English, Italian (i18next)
- **Dark/Light Theme**: User-selectable via next-themes
- **Real-time Updates**: WebSocket support for notifications
- **Stripe Integration**: EUR currency checkout sessions
- **Telegram Bot**: Automated notifications and order alerts

---

## 2. Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Base UI + Custom shadcn-like components in `/components/ui`
- **Icons**: Lucide React
- **State Management**: React Context (AuthContext, ToastContext)
- **Forms**: Client-side with validation
- **i18n**: react-i18next with browser language detection

### Backend
- **Runtime**: Node.js (via Next.js Server Actions)
- **API Pattern**: Server Actions (not API routes) for all backend operations
- **Database**: Supabase PostgreSQL
- **ORM**: Prisma for schema management and type-safe queries
- **Auth**: Supabase Auth + custom user profile layer

### Payment & Integration
- **Payments**: Stripe (EUR currency, checkout sessions)
- **External**: IXBrowser (manual - no API integration yet)
- **Notifications**: Telegram Bot API

---

## 3. Architecture

### Directory Structure

```
boostbuddy-mvp/
├── app/                          # Next.js App Router (16)
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Home/Landing page
│   ├── actions/                  # Server Actions (not routes!)
│   ├── admin/                    # Admin panel routes (/a/*)
│   ├── dashboard/                # Client routes (/c/*)
│   ├── employee/                 # Employee routes (/e/*)
│   ├── auth/                     # Auth callbacks
│   ├── api/                      # API routes (webhooks, etc.)
│   ├── checkout/                 # Stripe checkout page
│   └── notifications/            # Notification settings
├── components/                   # React components
│   ├── providers/                # Context providers
│   ├── ui/                       # Base UI components
│   ├── admin/                    # Admin-specific components
│   └── [other].tsx               # Shared components
├── context/                      # React Context definitions
├── lib/                          # Utility libraries
│   ├── auth/                     # Authentication utilities
│   ├── supabase/                 # Supabase clients
│   ├── stripe/                   # Stripe client
│   ├── cache/                    # Caching utilities
│   └── [other].ts                # Other utilities
├── prisma/                       # Database schema & migrations
│   ├── schema.prisma             # Data model definition
│   └── migrations/               # Database migrations
├── locales/                      # Translation files (JSON)
│   ├── en.json                   # English translations
│   └── it.json                   # Italian translations
└── public/                       # Static assets
```

### Route Structure by Role

| Role | Path Pattern | Purpose |
|------|--------------|---------|
| Admin | `/a/*` | Admin panel - manages all entities |
| Client | `/c/*` | Client portal - orders, profiles, billing |
| Employee | `/e/*` | Employee dashboard - task completion |

### Key Architectural Patterns

#### 1. Server Actions Pattern (All Backend Logic)

**File Location**: `/app/actions/*.ts`

All backend operations use Next.js Server Actions:
```typescript
"use server";

import { requireAuth } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";

export async function someAction(params: any) {
  // 1. Check authentication
  const auth = await requireAuth({ role: 'ADMIN' });
  if (!auth.success) return auth;

  // 2. Execute business logic
  const supabase = await createClient();
  // ... perform operations

  // 3. Return structured response
  return { success: true, data: result };
}
```

**Response Format**:
```typescript
// Success
{ success: true, data: any }

// Failure
{ success: false, error: string }
```

#### 2. Authentication Flow

**Two-tier auth system**:
1. **Supabase Auth**: Handles sign-up, sign-in, password reset, email verification
2. **Custom User Profile**: Stores in PostgreSQL with role (ADMIN/CLIENT/EMPLOYEE) and status

**Flow**:
```
User signs up
→ Supabase creates auth record
→ Server action creates user profile in PostgreSQL
→ AuthContext fetches and stores user with role
→ Role-based access control via requireAuth()
```

#### 3. Database Access

**Server-side (Server Actions)**:
```typescript
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
```

**Admin operations**:
```typescript
import { createAdminClient } from "@/lib/supabase/admin";
const adminClient = createAdminClient(); // Synchronous
```

**Client-side**:
```typescript
import { createClient } from "@/lib/supabase/client";
const supabase = createClient(); // Synchronous
```

---

## 4. Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for database and auth)
- Stripe account (for payments, test mode for development)

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your credentials
```

### Required Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_postgres_connection_string

# Stripe
STRIPE_SECRET_KEY=sk_test_...     # For server-side
NEXT_PUBLIC_STRIPE_KEY=pk_test_... # For client-side
STRIPE_WEBHOOK_SECRET=whsec_...    # For webhook verification

# App
NEXT_PUBLIC_APP_URL=http://localhost:3400
```

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Or create a migration (production)
npx prisma migrate dev --name description
```

### Running the App

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

**Dev Server**: http://localhost:3400

---

## 5. Code Structure

### Server Actions Organization

| Action File | Purpose | Role Required |
|-------------|---------|---------------|
| `orders.ts` | Core order management | CLIENT/ADMIN |
| `profiles.ts` | Browser profile CRUD | ADMIN |
| `services.ts` | Service package management | ADMIN |
| `clients.ts` | Client user management | ADMIN |
| `invoices.ts` | Invoice operations | ADMIN/CLIENT |
| `billing.ts` | Billing info management | CLIENT |
| `notifications.ts` | Notification preferences | ALL |
| `telegram.ts` | Telegram integration | SERVER |
| `reviews.ts` | Review order CRUD | CLIENT |
| `reviews-multiurl.ts` | Multi-URL order creation | CLIENT |
| `employee-dashboard.ts` | Employee stats | EMPLOYEE |
| `employee.ts` | Employee order operations | EMPLOYEE |
| `admin-reviews.ts` | Admin review management | ADMIN |
| `stripe.ts` | Stripe session creation | CLIENT |
| `credits.ts` | Credit package management | ADMIN |

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AuthProvider` | `components/providers/` | Auth state management |
| `SidebarLayout` | `components/` | Main layout with nav |
| `OrdersList` | `components/orders/` | Reusable order table |
| `StatusBadge` | `components/` | Status display with colors |
| `PhotoUpload` | `components/ui/` | Image upload component |
| `LanguageSwitcher` | `components/` | i18n selector |
| `ThemeToggle` | `components/` | Dark/light mode switcher |

---

## 6. Key Patterns & Conventions

### TypeScript Conventions

1. **Server Actions**: Always use `"use server"` directive
2. **Client Components**: Use `"use client"` directive when needed
3. **Type Imports**: Use `import type { ... }` for type-only imports
4. **Interfaces**: Define in same file or central types file
5. **No `any` types**: Minimize usage; prefer proper typing

### File Naming

- **Server Actions**: `{feature}.ts` in `/app/actions/`
- **Client Components**: `{name}-client.tsx` in page directories
- **Pages**: `page.tsx` in App Router directories
- **Shared Components**: `PascalCase.tsx` in `/components/`

### Database Naming

- **Tables**: `snake_case` (e.g., `review_orders`, `credit_packages`)
- **Columns**: `snake_case` (e.g., `user_id`, `created_at`)
- **JavaScript/TypeScript**: `camelCase` (e.g., `userId`, `createdAt`)

**Normalization Pattern**:
```typescript
const normalizedData = {
  userId: data.user_id,
  facebookUrl: data.facebook_url,
  createdAt: data.created_at
};
```

### Status Values

All status enums use `UPPER_SNAKE_CASE`:

| Context | Statuses |
|---------|----------|
| Orders | `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| Users | `PENDING`, `ACTIVE`, `DEACTIVATED` |
| Profiles | `AVAILABLE`, `ASSIGNED`, `ACTIVE`, `EXPIRED`, `BANNED` |
| Reviews | `PENDING`, `COMPLETED`, `CANCELLED` |

### Error Handling Pattern

**Always** return structured errors from Server Actions:
```typescript
try {
  // ... operation
  return { success: true, data: result };
} catch (error: any) {
  console.error("Operation failed:", error);
  return { success: false, error: error.message };
}
```

**Client-side error display**:
```typescript
const result = await someAction();
if (!result.success) {
  toastError(result.error);
}
```

---

## 7. Common Development Tasks

### Adding a New Server Action

1. Create file in `/app/actions/{feature}.ts`
2. Add `"use server"` directive
3. Import required utilities
4. Implement with proper auth check
5. Return `{ success, data? }` or `{ success, error }`

```typescript
"use server";

import { requireAuth } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";

export async function newAction(params: any) {
  const auth = await requireAuth();
  if (!auth.success) return auth;

  const supabase = await createClient();
  // ... your logic

  return { success: true, data: result };
}
```

### Adding a New Page

1. Create directory under appropriate role path (`/a/`, `/c/`, `/e/`)
2. Add `page.tsx` (server component) or `{name}-client.tsx` (client component)
3. Export metadata for page title
4. Use proper auth checks

```typescript
// app/a/new-feature/page.tsx
import { requireAuth } from "@/lib/auth/server-auth";

export const metadata = {
  title: "New Feature - Admin",
};

export default async function NewFeaturePage() {
  const auth = await requireAuth({ role: 'ADMIN' });
  if (!auth.success) return null; // or redirect

  // ... your page content
}
```

### Adding Database Fields

1. Update `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name add_field`
3. Or push directly: `npx prisma db push`
4. Update related TypeScript interfaces
5. Update SELECT queries to include new field
6. Normalize field name if needed (snake_case → camelCase)

### Adding Translations

1. Update `locales/en.json` with new keys
2. Update `locales/it.json` with Italian translations
3. Use in components: `t("key", "fallback")`

**Pattern**:
```json
{
  "feature": {
    "title": "Feature Title",
    "description": "Feature Description",
    "action": "Action"
  }
}
```

---

## 8. Database & Schema

### Core Models

**User** (with Supabase Auth):
```prisma
model User {
  id              String   @id @default(uuid())
  email           String   @unique
  name            String?
  role            String   @default("CLIENT")  // ADMIN, CLIENT, EMPLOYEE
  status          String   @default("PENDING")  // PENDING, ACTIVE, DEACTIVATED
  creditsBalance  Int      @default(0) @map("credits_balance")
  // ... relations and timestamps
}
```

**ProfileAccount** (Browser Profiles):
```prisma
model ProfileAccount {
  id                String   @id @default(uuid())
  clientId          String   @map("client_id")
  client            User     @relation(fields: [clientId], references: [id])
  profileName       String   @map("profile_name")
  accountEmail      String   @map("account_email")
  // ... IXBrowser credentials, expiration, status
}
```

**Order** (Service Purchases):
```prisma
model Order {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  user            User     @relation(fields: [userId], references: [id])
  serviceId       String   @map("service_id")
  service         Service  @relation(fields: [serviceId], references: [id])
  status          String   // PENDING, PAID, FAILED
  amount          Float
  // ... timestamps
}
```

**ReviewOrder** (Facebook Reviews):
```prisma
model ReviewOrder {
  id                    String   @id @default(uuid())
  userId                String   @map("user_id")
  user                  User     @relation("ReviewOrderClient", fields: [userId], references: [id])
  businessName          String   @map("business_name")
  orderType             String   @map("order_type")  // REVIEW, COMMENT, COMMENT_WITH_PHOTO
  gender                String?  @map("gender")       // MALE, FEMALE, or null
  quantity              Int
  creditsConsumed       Int      @map("credits_consumed")
  status                String   // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  // ... employee assignments, URLs, timestamps
}
```

**CreditPackage** (Credits System):
```prisma
model CreditPackage {
  id              String   @id @default(uuid())
  name            String
  description     String?
  creditsAmount   Int      @map("credits_amount")
  price           Float    // EUR
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
}
```

### Running Migrations

```bash
# Development
npx prisma migrate dev --name migration_name

# Production (after review)
npx prisma migrate deploy

# View migration history
npx prisma migrate status
```

---

## 9. Authentication & Authorization

### Role-Based Access Control

**Three Roles**:
- **ADMIN**: Full access to all features
- **CLIENT**: Can place orders, view assigned profiles, manage billing
- **EMPLOYEE**: Can complete assigned review orders

### Auth Checks in Server Actions

```typescript
// Any authenticated user
const auth = await requireAuth();

// Specific role required
const auth = await requireAuth({ role: 'ADMIN' });

// Multiple roles allowed
const auth = await requireAuth({ role: ['ADMIN', 'EMPLOYEE'] });
```

### Client-Side Role Checks

```typescript
const { user } = useAuth();

if (user?.role === 'ADMIN') {
  // Show admin-only content
}
```

---

## 10. Known Issues & TODOs

### TypeScript Errors (11 remaining - August 2026)

**Telegram Components** (not fixed due to production risk):
- `components/admin/TelegramBotConfig.tsx` - Type definition mismatches
- `components/TelegramGroupManager.tsx` - Property access issues

**Fix when**: During maintenance window with full Telegram testing

### Pending Implementation

**File**: `app/api/cron/retry-failed-notifications/route.ts:257`
```typescript
// TODO: Implement actual retry logic with Telegram API
```

### Debug Statements

High concentration of console.log statements in:
- `lib/auth/pure-functions.ts` (29 logs)
- `app/actions/employee.ts` (69 logs)
- `app/actions/reviews-multiurl.ts` (61 logs)

**Action**: Consider removing or reducing before production deployment

---

## 11. Deployment

### Build Process

```bash
# 1. Build for production
npm run build

# 2. Start production server
npm start

# Or use PM2 (recommended)
pm2 start npm --name "boostbuddy" -- start
```

### Environment Checklist

Before deploying to production:

- [ ] Set production DATABASE_URL
- [ ] Set production Supabase credentials
- [ ] Set production Stripe keys (live mode)
- [ ] Set NEXT_PUBLIC_APP_URL to production domain
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Test Stripe webhook endpoint
- [ ] Verify Telegram bot connection
- [ ] Test all user roles (Admin, Client, Employee)

### Deployment Platforms

Compatible with:
- Vercel (recommended for Next.js)
- Railway
- AWS (with proper configuration)
- Any Node.js hosting

---

## 12. Troubleshooting

### Common Issues

**Issue**: "useApp is not defined" error
**Solution**: This was fixed by changing `useApp()` to `useAuth()` in:
- `/app/e/orders/[id]/page.tsx`
- `/app/c/services/reviews/orders/[id]/page.tsx`

**Issue**: TypeScript compilation errors
**Solution**: Run `npx tsc --noEmit` to see all errors. Check:
- Missing imports
- Type mismatches
- Property access errors

**Issue**: Database connection fails
**Solution**: Verify:
- DATABASE_URL is correct
- Supabase project is active
- Network allows connection

**Issue**: Stripe webhook fails
**Solution**: Verify:
- STRIPE_WEBHOOK_SECRET matches dashboard
- Webhook endpoint is publicly accessible
- Endpoint returns 200 OK

**Issue**: Prisma migrations fail
**Solution**:
```bash
npx prisma migrate reset  # WARNING: clears database
# Or
npx prisma db push        # Push schema without migration
```

### Getting Help

- Check existing issues: `./prisma/migrations/`
- Review Server Actions: `./app/actions/*.ts`
- Check Auth patterns: `./lib/auth/`
- Review similar working code for patterns

---

## Additional Resources

### Key Files to Understand

- **Auth Flow**: `context/AuthContext.tsx`, `lib/auth/server-auth.ts`
- **Server Actions Pattern**: Any file in `/app/actions/`
- **Database Schema**: `prisma/schema.prisma`
- **UI Patterns**: `components/orders/OrdersList.tsx`

### External Documentation

- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Prisma ORM](https://www.prisma.io/docs)
- [Stripe API](https://stripe.com/docs/api)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Aug 25, 2026 | Initial developer guide |
| 0.9.5 | Aug 25, 2026 | Added Gender field to Review Orders |
| 0.9.0 | Aug 2026 | Fixed useApp/useAuth bug, reduced TS errors |

---

**End of Developer Guide**

For questions or clarifications, refer to the code comments or existing working patterns in the codebase.
