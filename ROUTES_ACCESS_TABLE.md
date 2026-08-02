# BoostBuddy Routes & Access Control Table

Complete overview of all authenticated routes organized by sidebar navigation structure.

## Access Control Legend

- ✅ = Allowed Access
- ❌ = No Access / Redirected
- 🔒 = Authentication Required
- 📄 = Protected by Layout
- ⚡ = Page-level Protection
- 📁 = Section/Category

---

## 🛡️ ADMIN WORKSPACE (/a/*)
**Protected by**: `/app/a/layout.tsx` with `requireAuth({ role: 'ADMIN' })`

### 📂 OVERVIEW
| Route | URL | Authentication | ADMIN | CLIENT | EMPLOYEE | Protection | Notes |
|-------|-----|----------------|-------|--------|----------|------------|-------|
| 📊 Dashboard | `/a/dashboard` | 🔒 Required | ✅ | ❌ | ❌ | ⚡ + 📄 | Main admin dashboard |

### 📂 OPERATIONS
| Route | URL | Authentication | ADMIN | CLIENT | EMPLOYEE | Protection | Notes |
|-------|-----|----------------|-------|--------|----------|------------|-------|
| 👥 Clients | `/a/clients` | 🔒 Required | ✅ | ❌ | ❌ | ⚡ + 📄 | User CRUD operations |
| 👨‍💼 Employees | `/a/employees` | 🔒 Required | ✅ | ❌ | ❌ | ⚡ + 📄 | Employee CRUD + stats |
| 📦 Orders | `/a/orders` | 🔒 Required | ✅ | ❌ | ❌ | 📄 | Order oversight |
| 🆔 Profiles | `/a/profiles` | 🔒 Required | ✅ | ❌ | ❌ | 📄 | Browser profile management |

### 📂 REVIEWS MANAGEMENT
| Route | URL | Authentication | ADMIN | CLIENT | EMPLOYEE | Protection | Notes |
|-------|-----|----------------|-------|--------|----------|------------|-------|
| 📥 Pending Queue | `/a/reviews/queue` | 🔒 Required | ✅ | ❌ | ❌ | 📄 | Pending review queue |
| 🔍 Verification | `/a/reviews/verification` | 🔒 Required | ✅ | ❌ | ❌ | 📄 | Verification queue |
| 👷 Employee Submissions | `/a/reviews/employees` | 🔒 Required | ✅ | ❌ | ❌ | 📄 | Per-employee review view |
| 📋 Active Reviews | `/a/reviews` | 🔒 Required | ✅ | ❌ | ❌ | 📄 | Reviews overview |
| 📜 Complete History | `/a/reviews/history` | 🔒 Required | ✅ | ❌ | ❌ | 📄 | Complete order history |

### 📂 SERVICES & PRICING
| Route | URL | Authentication | ADMIN | CLIENT | EMPLOYEE | Protection | Notes |
|-------|-----|----------------|-------|--------|----------|------------|-------|
| 🛠️ Catalog | `/a/services` | 🔒 Required | ✅ | ❌ | ❌ | 📄 | Service catalog |
| 🏷️ Review Pricing | `/a/services/reviews/pricing` | 🔒 Required | ✅ | ❌ | ❌ | 📄 | Pricing configuration |
| ⚙️ Configuration | `/a/services/credits` | 🔒 Required | ✅ | ❌ | ❌ | ⚡ + 📄 | Credit system settings |
| ✍️ Adjustments | `/a/services/credits/adjust` | 🔒 Required | ✅ | ❌ | ❌ | 📄 | Manual credit adjustments |
| 📊 Transactions | `/a/services/credits/transactions` | 🔒 Required | ✅ | ❌ | ❌ | 📄 | Transaction history |

### 📂 FINANCE
| Route | URL | Authentication | ADMIN | CLIENT | EMPLOYEE | Protection | Notes |
|-------|-----|----------------|-------|--------|----------|------------|-------|
| 🧾 Invoices | `/a/invoices` | 🔒 Required | ✅ | ❌ | ❌ | 📄 | Invoice management |
| 💳 Shared Wallet | `/wallet` | 🔒 Required | ✅ | ✅ | ✅ | ⚡ | Shared wallet route |

### 📂 SYSTEM
| Route | URL | Authentication | ADMIN | CLIENT | EMPLOYEE | Protection | Notes |
|-------|-----|----------------|-------|--------|----------|------------|-------|
| 🔔 Notifications | `/a/notifications` | 🔒 Required | ✅ | ❌ | ❌ | 📄 | System notifications |

---

## 👤 CLIENT WORKSPACE (/c/*)
**Protected by**: `/app/c/layout.tsx` with `requireAuth()` - redirects ADMIN to `/a/dashboard`

### 📂 OVERVIEW
| Route | URL | Authentication | ADMIN | CLIENT | EMPLOYEE | Protection | Notes |
|-------|-----|----------------|-------|--------|----------|------------|-------|
| 📊 Dashboard | `/c/dashboard` | 🔒 Required | ❌→redirect | ✅ | ❌ | ⚡ + 📄 | Main client dashboard |

### 📂 SERVICES
| Route | URL | Authentication | ADMIN | CLIENT | EMPLOYEE | Protection | Notes |
|-------|-----|----------------|-------|--------|----------|------------|-------|
| ➕ New Order | `/c/services/reviews/new-order` | 🔒 Required | ❌→redirect | ✅ | ❌ | 📄 | Create review orders |
| 📦 My Orders | `/c/services/reviews/orders` | 🔒 Required | ❌→redirect | ✅ | ❌ | 📄 | Orders list |
| 📈 Overview | `/c/services/reviews` | 🔒 Required | ❌→redirect | ✅ | ❌ | 📄 | Reviews dashboard |
| ⏱️ Clocker | `/c/services/clocker` | 🔒 Required | ❌→redirect | ✅ | ❌ | 📄 | Clocker service |
| 🪄 Prompt Engine | `/c/services/prompt` | 🔒 Required | ❌→redirect | ✅ | ❌ | 📄 | Prompt service (Coming Soon) |

### 📂 FINANCE & BILLING
| Route | URL | Authentication | ADMIN | CLIENT | EMPLOYEE | Protection | Notes |
|-------|-----|----------------|-------|--------|----------|------------|-------|
| 🪙 Wallet | `/c/wallet` | 🔒 Required | ❌→redirect | ✅ | ❌ | 📄 | Wallet overview |
| ⚡ Top-Up | `/c/wallet/top-up` | 🔒 Required | ❌→redirect | ✅ | ❌ | 📄 | Add credits |
| 📊 Transactions | `/c/wallet/transactions` | 🔒 Required | ❌→redirect | ✅ | ❌ | 📄 | Transaction history |
| 💳 Billing Details | `/c/billing` | 🔒 Required | ❌→redirect | ✅ | ❌ | 📄 | Billing details management |
| 🧾 Invoices | `/c/invoices` | 🔒 Required | ❌→redirect | ✅ | ❌ | 📄 | Invoice history/download |
| 💸 Payments | `/c/payments` | 🔒 Required | ❌→redirect | ✅ | ❌ | 📄 | Payment history |

### 📂 SUPPORT & ACCOUNT
| Route | URL | Authentication | ADMIN | CLIENT | EMPLOYEE | Protection | Notes |
|-------|-----|----------------|-------|--------|----------|------------|-------|
| 🔔 Notifications | `/c/notifications` | 🔒 Required | ❌→redirect | ✅ | ❌ | 📄 | Client notifications |
| ⚙️ Settings | `/c/settings` | 🔒 Required | ❌→redirect | ✅ | ❌ | 📄 | Account settings |
| 📚 Documentation | `/c/docs` | 🔒 Required | ❌→redirect | ✅ | ❌ | 📄 | Help/documentation |

---

## 👷 EMPLOYEE WORKSPACE (/e/*)
**Protected by**: `/app/e/layout.tsx` with `requireAuth()` + role check - redirects others to `/c/dashboard`

### 📂 WORKSPACE
| Route | URL | Authentication | ADMIN | CLIENT | EMPLOYEE | Protection | Notes |
|-------|-----|----------------|-------|--------|----------|------------|-------|
| 📊 Dashboard | `/e/dashboard` | 🔒 Required | ❌→redirect | ❌→redirect | ✅ | 📄 | Main employee dashboard |

### 📂 TASKS & ORDERS
| Route | URL | Authentication | ADMIN | CLIENT | EMPLOYEE | Protection | Notes |
|-------|-----|----------------|-------|--------|----------|------------|-------|
| 📦 Available Orders | `/e/orders` | 🔒 Required | ❌→redirect | ❌→redirect | ✅ | 📄 | Assigned orders list |
| ✍️ Review Queue | `/e/reviews` | 🔒 Required | ❌→redirect | ❌→redirect | ✅ | 📄 | Review orders + completion |

### 📂 AUDIT & HISTORY
| Route | URL | Authentication | ADMIN | CLIENT | EMPLOYEE | Protection | Notes |
|-------|-----|----------------|-------|--------|----------|------------|-------|
| ✅ Completed Reviews | `/e/reviews/completed` | 🔒 Required | ❌→redirect | ❌→redirect | ✅ | 📄 | Completed review history |
| ❌ Rejected Reviews | `/e/reviews/rejected` | 🔒 Required | ❌→redirect | ❌→redirect | ✅ | 📄 | Rejected review history |

### 📂 ACCOUNT
| Route | URL | Authentication | ADMIN | CLIENT | EMPLOYEE | Protection | Notes |
|-------|-----|----------------|-------|--------|----------|------------|-------|
| 💳 Shared Wallet | `/wallet` | 🔒 Required | ✅ | ✅ | ✅ | ⚡ | Shared wallet route |
| 🔔 Notifications | `/e/notifications` | 🔒 Required | ❌→redirect | ❌→redirect | ✅ | 📄 | Employee notifications |

---

## 🔗 SHARED / UTILITY ROUTES

### 📁 AUTHENTICATION & REDIRECTS
| Route | URL | Authentication | ADMIN | CLIENT | EMPLOYEE | Protection | Notes |
|-------|-----|----------------|-------|--------|----------|------------|-------|
| 🔄 Role Router | `/dashboard` | 🔒 Required | ✅→/a | ✅→/c | ✅→/e | ⚡ | Role-based redirect |
| 🛒 Checkout | `/checkout` | 🔒 Required | ✅ | ✅ | ✅ | ⚡ | Authenticated purchase flow |
| 🚪 Logout | `/logout` | 🔒 Required | ✅ | ✅ | ✅ | ⚡ | Logout confirmation |

### 📁 SPECIAL STATUS ROUTES
| Route | URL | Authentication | ADMIN | CLIENT | EMPLOYEE | Protection | Notes |
|-------|-----|----------------|-------|--------|----------|------------|-------|
| ⏳ Pending Client | `/c/pending` | 🔒 Required | ❌→redirect | ✅ (inactive) | ❌ | 📄 | For inactive clients |
| ⏳ Pending Employee | `/e/pending` | 🔒 Required | ❌→redirect | ❌→redirect | ✅ (inactive) | 📄 | For inactive employees |

---

## 🎯 ACCESS CONTROL SUMMARY

### Three-Layer Protection System

1. **Layout-Level Guards** (Primary Protection)
   ```
   /app/a/layout.tsx → requireAuth({ role: 'ADMIN' })
   /app/c/layout.tsx → requireAuth() + admin redirect
   /app/e/layout.tsx → requireAuth() + role check
   ```

2. **Page-Level Protection** (Secondary)
   ```typescript
   const auth = await requireAuth({ role: 'ADMIN' })  // For admin pages
   const auth = await requireAuth()                   // For authenticated pages
   ```

3. **Status-Based Access** (Account Status)
   - **CLIENT**: `isActive: false` → `/c/pending`
   - **EMPLOYEE**: `status: 'PENDING'|'DEACTIVATED'` → `/e/pending`
   - Active status stored in JWT metadata + user profile

### Redirect Behavior Matrix

| User Role/Status | Accesses /a/* | Accesses /c/* | Accesses /e/* |
|-----------------|---------------|---------------|---------------|
| **ADMIN + Active** | ✅ Allowed | ❌→ `/a/dashboard` | ❌→ `/c/dashboard` |
| **CLIENT + Active** | ❌→ `/c/dashboard` | ✅ Allowed | ❌→ `/c/dashboard` |
| **CLIENT + Inactive** | ❌→ `/c/pending` | ❌→ `/c/pending` | ❌→ `/c/pending` |
| **EMPLOYEE + Active** | ❌→ `/c/dashboard` | ❌→ `/c/dashboard` | ✅ Allowed |
| **EMPLOYEE + Inactive** | ❌→ `/e/pending` | ❌→ `/c/pending` | ❌→ `/e/pending` |
| **Not Authenticated** | ❌→ Login | ❌→ Login | ❌→ Login |

---

## 🔐 PRIVILEGE OVERVIEW

### 👨‍💼 Admin Privileges
- ✅ Full access to all 17 admin routes
- ✅ Can manage clients, employees, profiles, services
- ✅ Can view all reviews history and verification queues
- ✅ Can adjust credits manually
- ❌ No access to client/employee specific UI routes

### 🛒 Client Privileges
- ✅ Access to 21 client routes
- ✅ Can purchase services via `/checkout`
- ✅ Can manage own billing, invoices, payments
- ✅ Can create review orders
- ❌ Inactive accounts limited to `/c/pending`

### 👷 Employee Privileges
- ✅ Access to 8 employee routes
- ✅ Can view and accept available orders
- ✅ Can mark orders as complete with proof
- ✅ Can view own completed/rejected reviews
- ❌ Inactive accounts limited to `/e/pending`

---

## 📊 ROUTE STATISTICS

### By Role Structure
| Role | Exclusive Routes | Shared Routes | Total Accessible |
|------|-----------------|---------------|------------------|
| **ADMIN** | 17 | 3 | 20 |
| **CLIENT** | 21 | 3 | 24 |
| **EMPLOYEE** | 8 | 3 | 11 |

### By Functional Category
| Category | ADMIN | CLIENT | EMPLOYEE | Total |
|----------|-------|--------|----------|-------|
| **Dashboard** | 1 | 1 | 1 | 3 |
| **User Management** | 2 | 0 | 0 | 2 |
| **Operations** | 2 | 0 | 2 | 4 |
| **Reviews** | 5 | 4 | 3 | 12 |
| **Services** | 5 | 3 | 0 | 8 |
| **Financial** | 3 | 6 | 0 | 9 |
| **System/Support** | 1 | 3 | 1 | 5 |
| **Shared** | 0 | 0 | 0 | 3 |

---

## 🔧 TECHNICAL IMPLEMENTATION

### Authentication Flow
```
1. User → Route → Layout Guard → requireAuth()
2. requireAuth() → Check JWT + User Profile
3. Role Check → Redirect if wrong role
4. Status Check → Redirect if inactive
5. Success → Render Page
```

### Key Implementation Files
- **Auth Middleware**: `/lib/auth/server-auth.ts` - `requireAuth()` function
- **Layout Guards**: `/app/[role]/layout.tsx` files
- **Auth Context**: `/context/AuthContext.tsx` - Client auth state
- **Proxy Middleware**: `/proxy.ts` - Route-level role resolution

### Server Action Protection Pattern
```typescript
// Admin-only actions
const auth = await requireAuth({ role: 'ADMIN' })

// Any authenticated user
const auth = await requireAuth()

// Employee-only actions
if (auth.user.role !== 'EMPLOYEE') {
  return { success: false, error: "Unauthorized" }
}
```

---

## 📋 SIDEBAR NAVIGATION STRUCTURE SUMMARY

### 🛡️ Admin Workspace (6 Sections)
1. **Overview** - Dashboard
2. **Operations** - Clients, Employees, Orders, Profiles
3. **Reviews Management** - Pending Queue, Verification, Employee Submissions, Active Reviews, Complete History
4. **Services & Pricing** - Catalog, Review Pricing, Configuration, Adjustments, Transactions
5. **Finance** - Invoices, Shared Wallet
6. **System** - Notifications

### 👤 Client Workspace (4 Sections)
1. **Overview** - Dashboard
2. **Services** - New Order, My Orders, Overview, Clocker, Prompt Engine
3. **Finance & Billing** - Wallet, Top-Up, Transactions, Billing Details, Invoices, Payments
4. **Support & Account** - Notifications, Settings, Documentation

### 👷 Employee Workspace (4 Sections)
1. **Workspace** - Dashboard
2. **Tasks & Orders** - Available Orders, Review Queue
3. **Audit & History** - Completed Reviews, Rejected Reviews
4. **Account** - Shared Wallet, Notifications

---

*Last Updated: 2025-07-30*
*Total Routes Analyzed: 50 authenticated routes*
*Access Control System: Three-layer (Layout + Page + Status)*
*Organized by: Sidebar Navigation Structure*