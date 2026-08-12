# Client-Side Caching Strategy

## Overview

This document provides client-side caching strategies for non-interactive, non-sensitive data across BoostBuddy panels.

---

## 🟢 SAFE FOR CACHING (No Security Issues)

### Static Configuration Data

These rarely change and are perfect for localStorage caching:

| Data | Cache Type | TTL | Storage Key | Implementation |
|------|-----------|-----|-------------|----------------|
| **Payment Rules** | localStorage | 1 hour | `payment_rules` | `/a/earnings/rules` |
| **Credit Packages** | localStorage | 30 min | `credit_packages` | `/c/wallet/top-up` |
| **Review Pricing** | localStorage | 30 min | `review_pricing` | `/a/services/reviews/pricing` |
| **Services List** | localStorage | 30 min | `services_list` | `/c/boxes/buy` |
| **Language Data** | localStorage | 1 hour | `locale_{lang}` | `lib/i18n.ts` |

### Dashboard Stats (Short-lived Cache)

These change more frequently but can be cached briefly:

| Data | Cache Type | TTL | When to Invalidate |
|------|-----------|-----|-------------------|
| **Admin Stats** | SWR/Memory | 2 min | Manual refresh |
| **Client Stats** | SWR/Memory | 2 min | Order placed |
| **Employee Stats** | SWR/Memory | 1 min | Task completed |

---

## 🟡 SAFE FOR localStorage (User Preferences)

Non-sensitive user settings that improve UX:

| Setting | Storage Key | Example Value | Notes |
|----------|-------------|--------------|-------|
| **Language** | `bb_language` | `"it"` | Already in cookie |
| **Theme** | `bb_theme` | `"dark"` | Could replace cookie |
| **Filter State** | `bb_filters_orders` | `{"status":"COMPLETED"}` | Per page |
| **Pagination** | `bb_page_orders` | `{"page":2,"pageSize":20}` | Per page |
| **Column Visibility** | `bb_cols_employees` | `["name","email"]` | Per table |
| **Sidebar State** | `bb_sidebar_collapsed` | `false` | Global |

---

## 🔒 NEVER CACHE (Security-Sensitive)

Financial and authentication data must always be fetched fresh:

| Data | Why Not Secure | Alternative |
|------|----------------|-------------|
| **Auth Tokens** | Security risk | Supabase handles |
| **Credit Balances** | Financial | Always fresh |
| **Employee Earnings** | Financial | Always fresh |
| **Payout Requests** | Financial | Always fresh |
| **Order Data** | Time-sensitive | Always fresh |
| **Invoice Data** | Financial | Always fresh |
| **User Profile** | Security | Always fresh |

---

## Implementation Examples

### Example 1: Payment Rules with Cache

```typescript
// app/a/earnings/rules/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getEarningRulesAction } from "@/app/actions/admin-earnings";
import { setCache, getCache, clearCache } from "@/lib/cache/localCache";

const CACHE_KEY = "payment_rules";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export default function PaymentRulesPage() {
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try cache first
    const cached = getCache(CACHE_KEY);
    if (cached) {
      setRules(cached);
      setLoading(false);
    }

    // Always fetch fresh data
    getEarningRulesAction().then(result => {
      if (result.success) {
        setRules(result.data);
        setCache(CACHE_KEY, result.data, CACHE_TTL);
      }
      setLoading(false);
    });
  }, []);

  const handleRefresh = () => {
    clearCache(CACHE_KEY);
    // Re-fetch...
  };

  return (
    // Component...
  );
}
```

### Example 2: Credit Packages with Cache

```typescript
// app/c/wallet/top-up/page.tsx
const CACHE_KEY = "credit_packages";
const CACHE_TTL = 30 * 60 * 1000; // 30 min

// Check cache before fetch
const cached = getCache(CACHE_KEY);
if (cached) {
  setPackages(cached);
}

getActiveCreditPackagesAction().then(result => {
  if (result.success) {
    setPackages(result.data);
    setCache(CACHE_KEY, result.data, CACHE_TTL);
  }
});
```

### Example 3: SWR for Dashboard Stats

```typescript
// Using simple SWR pattern for frequently-changing data
const useSWR = (key: string, fetcher: () => Promise<any>, ttl: number) => {
  const [data, setData] = useState(null);
  const [lastFetch, setLastFetch] = useState(0);

  useEffect(() => {
    const now = Date.now();
    // Use cached if within TTL
    if (data && (now - lastFetch) < ttl) {
      return;
    }

    fetcher().then(result => {
      setData(result);
      setLastFetch(now);
    });
  }, [key]);

  return { data, refresh: () => fetcher().then(setData) };
};

// Usage
const { data: stats, refresh } = useSWR(
  'admin_stats',
  getAdminDashboardStatsData,
  2 * 60 * 1000 // 2 minutes
);
```

---

## Cache Invalidation Strategies

### Manual Invalidation

Add refresh buttons to pages with cached data:

```typescript
// Add to admin earnings rules page
<Button onClick={() => {
  clearCache('payment_rules');
  window.location.reload();
}}>
  Refresh Rules
</Button>
```

### Automatic Invalidation

Clear related caches after data changes:

```typescript
// After updating payment rule
await updateEarningRuleAction(data);
clearCache('payment_rules'); // Invalidate cache
router.refresh(); // Refetch from server
```

### Event-Based Invalidation

Clear cache on specific events:

```typescript
// After order placement
await createReviewOrderAction(orderData);
clearCache('client_stats'); // Invalidate dashboard stats
```

---

## Performance Impact

### Expected Improvements

| Page | Before | After (with cache) | Improvement |
|------|--------|-------------------|-------------|
| `/a/earnings/rules` | 400ms | 50ms (cached) | **87% faster** |
| `/c/wallet/top-up` | 550ms | 100ms (cached) | **82% faster** |
| `/a/services/reviews/pricing` | 300ms | 50ms (cached) | **83% faster** |
| `/a/dashboard` | 150ms | 50ms (2min cache) | **67% faster** |
| `/c/dashboard` | 300ms | 100ms (2min cache) | **67% faster** |

**Total Expected Savings:** ~1.5-2 seconds on initial page loads

---

## Implementation Priority

### Phase 1: High Impact, Low Effort ✅

1. **Payment Rules Cache** - 1 hour TTL
   - File: `/a/earnings/rules/page.tsx`
   - Impact: 87% faster on repeat visits

2. **Credit Packages Cache** - 30 min TTL
   - File: `/c/wallet/top-up/page.tsx`
   - Impact: 82% faster on repeat visits

3. **Review Pricing Cache** - 30 min TTL
   - File: `/a/services/reviews/pricing/page.tsx`
   - Impact: 83% faster on repeat visits

### Phase 2: Dashboard Stats Cache

1. **Admin Dashboard** - 2 min SWR
2. **Client Dashboard** - 2 min SWR
3. **Employee Dashboard** - 1 min SWR

### Phase 3: User Preferences (localStorage)

1. Filter states
2. Pagination states
3. Column visibility

---

## Testing Checklist

- [ ] Verify cache expires after TTL
- [ ] Verify manual refresh clears cache
- [ ] Verify cache invalidates after data changes
- [ ] Test cache across browser sessions
- [ ] Verify no sensitive data is cached

---

**Created:** 2026-08-12
**Related Files:**
- `/lib/cache/localCache.ts` - Cache implementation
- `/ROUTES_PERFORMANCE_ANALYSIS.md` - Performance analysis
