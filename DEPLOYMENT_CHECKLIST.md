# Reviews System Redesign - Deployment Checklist

**Status**: Ready for Deployment to Vercel
**Date**: 2025-01-06

## Pre-Deployment Steps

### 1. Database Setup (REQUIRED - Do This First)

1. **Run the SQL Migration in Supabase SQL Editor**
   - Open: `/migrations/reviews_system_redesign.sql`
   - Copy entire contents
   - Paste into Supabase SQL Editor
   - Execute all statements
   - Verify no errors occurred

2. **Verify Tables Created**
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN (
     'review_urls',
     'employee_earnings',
     'employee_earning_transactions',
     'employee_earning_rules',
     'employee_payout_requests'
   );
   ```
   Expected: 5 tables

3. **Verify Default Data**
   ```sql
   SELECT COUNT(*) FROM employee_earning_rules;
   ```
   Expected: 6 default payment rules

### 2. Prisma Schema Sync (REQUIRED)

1. **Run Prisma Commands**
   ```bash
   npx prisma db pull
   npx prisma generate
   ```

2. **Verify Models Generated**
   - Check `node_modules/.prisma/client` for new models
   - Ensure ReviewUrl, EmployeeEarnings, etc. are present

### 3. Environment Variables (Verify)

Ensure these are set in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN` (optional, for notifications)

## Deployment Steps

### 1. Commit Changes

```bash
git add .
git commit -m "feat: Reviews System Redesign - Multi-URL, Employee Earnings, Payment Rules

- Add ReviewUrl model for multi-URL support
- Add EmployeeEarnings wallet system
- Add EmployeeEarningTransaction ledger
- Add EmployeeEarningRule payment configuration
- Add EmployeePayoutRequest management
- Update ReviewOrder with total_urls field
- Update EmployeeStats with accepting_tasks field
- Create server actions for multi-URL orders
- Create employee earnings actions
- Create admin earnings management actions
- Create UI components for earnings dashboards
- Add Copy Review button component

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push origin master
```

### 2. Deploy to Vercel

1. **Push to Git** (if not done)
   ```bash
   git push origin master
   ```

2. **Vercel Auto-Deploy**
   - Vercel will automatically deploy
   - Monitor deployment logs
   - Verify no build errors

### 3. Post-Deployment Verification

1. **Test Database Connection**
   - Visit site and check for database errors
   - Verify tables are accessible

2. **Test Admin Functions**
   - Navigate to `/a/earnings`
   - Should see employee earnings overview
   - Navigate to `/a/earnings/rules`
   - Should see payment rules
   - Navigate to `/a/earnings/payouts`
   - Should see payouts interface

3. **Test Employee Functions**
   - Navigate to `/e/earnings`
   - Should see earnings dashboard
   - Verify wallet balance display
   - Check payout request form

## Files Created/Modified

### New Files Created

**Server Actions:**
- `/app/actions/reviews-multiurl.ts` - Multi-URL support
- `/app/actions/employee-earnings.ts` - Employee earnings
- `/app/actions/admin-earnings.ts` - Admin earnings management

**UI Pages:**
- `/app/e/earnings/page.tsx` - Employee earnings dashboard
- `/app/a/earnings/page.tsx` - Admin earnings overview
- `/app/a/earnings/rules/page.tsx` - Payment rules configuration
- `/app/a/earnings/payouts/page.tsx` - Payout processing

**Components:**
- `/components/reviews/CopyReviewButton.tsx` - Copy review content

**Database:**
- `/migrations/reviews_system_redesign.sql` - Migration script
- `/prisma/schema.prisma` - Updated with new models

**Documentation:**
- `/REVIEWS_SYSTEM_REDESIGN.md` - Comprehensive redesign documentation
- `/DEPLOYMENT_CHECKLIST.md` - This file

### Modified Files

- `/prisma/schema.prisma` - Added 5 new models, updated 2 existing models
- `/app/actions/admin-reviews.ts` - Added task distribution control actions

## Vercel Compatibility Notes

All code is Vercel-compatible:
- ✅ Uses Next.js App Router (`app/` directory)
- ✅ Server Actions with `"use server"` directive
- ✅ Client Components with `"use client"` directive
- ✅ Proper TypeScript types and interfaces
- ✅ Case-sensitive file paths and imports
- ✅ No Node.js-specific APIs that don't work on Edge Runtime
- ✅ Proper error handling and loading states
- ✅ Responsive UI with Tailwind CSS

## Rollback Plan (If Needed)

If issues occur after deployment:

1. **Database Rollback**
   ```sql
   -- In Supabase SQL Editor
   DROP TABLE IF EXISTS employee_payout_requests;
   DROP TABLE IF EXISTS employee_earning_rules;
   DROP TABLE IF EXISTS employee_earning_transactions;
   DROP TABLE IF EXISTS employee_earnings;
   DROP TABLE IF EXISTS review_urls;

   ALTER TABLE review_orders DROP COLUMN IF EXISTS total_urls;
   ALTER TABLE employee_stats DROP COLUMN IF EXISTS accepting_tasks;
   ```

2. **Code Rollback**
   ```bash
   git revert HEAD
   git push origin master
   ```

## Support

For issues or questions:
- Check: `/REVIEWS_SYSTEM_REDESIGN.md` for detailed documentation
- Review server action logs in Vercel deployment
- Check Supabase dashboard for database errors

## Next Steps (After Deployment)

1. **Test Multi-URL Order Creation**
   - Update `/c/services/reviews/new-order` to use multi-URL form
   - Test creating orders with multiple URLs

2. **Test Employee Workflow**
   - Update `/e/dashboard` to show URL tasks
   - Test task acceptance and completion
   - Verify earnings are credited

3. **Configure Payment Rules**
   - Visit `/a/earnings/rules`
   - Adjust payment amounts as needed

4. **Set Up Notifications**
   - Ensure Telegram notifications are configured
   - Test earnings credit notifications

---

**Status**: ✅ Ready for Production
**Risk Level**: Low (database changes are backward compatible)
**Estimated Deployment Time**: 5-10 minutes
