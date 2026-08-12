# Local Pre-Push Testing Checklist

## ✅ COMMIT DONE - DO NOT PUSH YET

Before you `git push origin master`, verify everything works locally:

---

## Phase 1: Run Dev Server Locally

```bash
# Start local development server
npm run dev
```

Server should start on `http://localhost:3400`

---

## Phase 2: Test New Pages (Most Important!)

Open these URLs in your browser:

### Admin Earnings Pages:
1. **`http://localhost:3400/a/earnings`**
   - [ ] Page loads without errors
   - [ ] See table with employee earnings (or empty state)
   - [ ] No console errors (F12 → Console)

2. **`http://localhost:3400/a/earnings/rules`**
   - [ ] Page loads
   - [ ] See 6 payment rules displayed
   - [ ] Can click "Add New Rule" button
   - [ ] No console errors

3. **`http://localhost:3400/a/earnings/payouts`**
   - [ ] Page loads
   - [ ] See payout request table
   - [ ] No console errors

### Employee Earnings Page:
4. **`http://localhost:3400/e/earnings`**
   - [ ] Page loads
   - [ ] See earnings cards (Total Earned, Current Period, Wallet Balance)
   - [ ] Can click "Request Payout" button
   - [ ] No console errors

---

## Phase 3: Test as Different Users

### Test as Admin:
1. Log in as ADMIN user
2. Go to `/a/earnings/rules`
3. Try to edit a payment rule
   - [ ] Form opens
   - [ ] Can change amount
   - [ ] Can save

### Test as Employee:
1. Log in as EMPLOYEE user
2. Go to `/e/earnings`
3. Check if earnings account exists (should show €0.00 if first time)

---

## Phase 4: Check Console for Errors

Open browser DevTools (F12) → Console tab:
- [ ] No red errors
- [ ] No TypeScript errors
- [ ] No "Network failed" errors
- [ ] No 404s for new routes

---

## Phase 5: Check Database Connection

Verify data loads from Supabase:
- [ ] Employee earnings table queries successfully
- [ ] Payment rules load (should see 6 rules)
- [ ] No "Network request failed" in console

---

## Phase 6: Test Copy Review Button (Optional)

If you have existing review orders:
1. Go to employee order detail page
2. [ ] Copy Review button appears
3. [ ] Click button copies text to clipboard
4. [ ] Success toast appears

---

## Phase 7: Check Environment Variables

```bash
# Verify your .env.local has required keys:
cat .env.local | grep SUPABASE
cat .env.local | grep STRIPE
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `STRIPE_SECRET_KEY` ✅

---

## Common Issues & Fixes:

### ❌ "Page not found" error:
- Fix: Make sure dev server is running on port 3400

### ❌ "Network request failed":
- Fix: Check Supabase credentials in `.env.local`
- Fix: Check if you ran the SQL migration in Supabase

### ❌ "Cannot find module":
- Fix: Make sure you ran `npx prisma generate`

### ❌ "Type error" in browser:
- Fix: Check browser console for specific error message
- Fix: Some components may need hot-reload (refresh browser)

---

## Quick Test Commands:

```bash
# Check if TypeScript compiles
npm run build

# Check if dev server runs
npm run dev

# Check Prisma is synced
npx prisma generate
```

---

## If Everything Works ✅

Then you're safe to push:

```bash
git push origin master
```

---

## If Something Breaks ❌

Tell me the error message and I'll fix it before you push!

---

**Current Status**: ✅ Committed locally, awaiting your verification
