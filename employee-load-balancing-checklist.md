# Employee Load Balancing Validation Checklist

## Database Schema - User Model

The `users` table has these employee-related fields:
```typescript
- role: "ADMIN" | "CLIENT" | "EMPLOYEE"
- status: "PENDING" | "ACTIVE" | "DEACTIVATED"  ← Use this for active/inactive
- accepting_orders: boolean                          ← Use this for availability toggle
- NO is_active field exists in users table!
```

## ✅ Correct Query for Employee Load Balancing

```typescript
const { data: availableEmployees } = await supabase
  .from("users")
  .select("id, name, email")
  .eq("role", "EMPLOYEE")          // Must be EMPLOYEE role
  .eq("status", "ACTIVE')           // ✅ Must be ACTIVE (not DEACTIVATED or PENDING)
  .eq("accepting_orders", true);    // ✅ Must have accepting orders enabled
```

## ❌ Wrong Queries (DO NOT USE)

```typescript
// ❌ WRONG - is_active doesn't exist in users table!
.eq("is_active", true)

// ❌ WRONG - Checks accepting_orders but not status
.eq("role", "EMPLOYEE")
.eq("accepting_orders", true)

// ❌ WRONG - Checks role but not status
.eq("role", "EMPLOYEE")
.eq("is_active", true)
```

## Validation Steps

1. **Check Role**: `role = 'EMPLOYEE'`
   - Ensures user is an employee

2. **Check Status**: `status = 'ACTIVE'` ← CRITICAL for preventing deactivated employees
   - `"ACTIVE"` - Employee is active and can receive orders
   - `"PENDING"` - New account, not yet activated
   - `"DEACTIVATED"` - Employee account disabled, should NOT receive orders

3. **Check Availability**: `accepting_orders = true`
   - Employee has enabled order distribution
   - Can be toggled on/off by employee or admin

## Files That Need These Checks

### ✅ FIXED (Current Code):
1. `app/actions/reviews-multiurl.ts` (line 312-314)
   ```typescript
   .eq("role", "EMPLOYEE")
   .eq("status", "ACTIVE")         // ✅ Fixed
   .eq("accepting_orders", true);
   ```

2. `app/actions/employee.ts` (line 928-932)
   ```typescript
   .select("status")
   .eq("id", auth.user.id)
   // ✅ Checks status === 'ACTIVE'
   ```

## Test Case: Deactivated Employee Should NOT Receive Orders

**Scenario**:
- Employee "emp 4" has `status = 'DEACTIVATED'`
- Employee "wasim" has `status = 'ACTIVE'`
- Client creates 3 new orders

**Expected Result**:
- ❌ "emp 4" receives 0 orders (DEACTIVATED)
- ✅ "wasim" receives all 3 orders (ACTIVE and available)

**What Was Happening (BUG)**:
- Code checked `is_active` (doesn't exist) → Query ignored this condition
- "emp 4" with `status = 'DEACTIVATED'` still received orders

**After Fix**:
- Code checks `status = 'ACTIVE'` explicitly
- Only ACTIVE employees receive orders

## Quick SQL to Check Employee Status

```sql
-- Check which employees would receive orders
SELECT
  id,
  name,
  email,
  role,
  status,              -- PENDING | ACTIVE | DEACTIVATED
  accepting_orders
FROM users
WHERE role = 'EMPLOYEE'
  AND status = 'ACTIVE'        -- Must be ACTIVE
  AND accepting_orders = true; -- Must be accepting
```

## Summary

| Field | Purpose | Required for Load Balancing |
|-------|---------|----------------------------|
| `role` | User type | ✅ Must be 'EMPLOYEE' |
| `status` | Account state | ✅ Must be 'ACTIVE' |
| `accepting_orders` | Availability toggle | ✅ Must be true |
| `is_active` | ❌ Doesn't exist in users | ❌ DO NOT USE |
