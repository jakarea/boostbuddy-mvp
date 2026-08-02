# BoostBuddy MVP - Vercel Deployment Guide

## Overview
This guide covers deploying BoostBuddy MVP to Vercel with Supabase PostgreSQL as the production database.

## Prerequisites
- Vercel account (https://vercel.com)
- Supabase project (already set up)
- Stripe account with production keys
- Git repository (GitHub/GitLab/Bitbucket)

---

## Phase 1: Database Setup (Supabase)

### 1. Get Supabase Database URL
1. Go to your Supabase project: https://tfnpwbolqgkpsfilhiqq.supabase.co
2. Navigate to **Settings → Database**
3. Find **Connection String** → **URI** format
4. Copy your connection string (format: `postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`)

**⚠️ IMPORTANT:** Use the pooler connection (port 6543) for better performance with serverless functions.

### 2. Test Database Connection
```bash
# Install required packages
npm install @prisma/client prisma

# Generate Prisma client
npx prisma generate

# Test connection
DATABASE_URL="your-supabase-connection-string" npx prisma db push
```

---

## Phase 2: Environment Variables Setup

### Production Environment Variables for Vercel:

```bash
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# Supabase Auth (Production)
NEXT_PUBLIC_SUPABASE_URL="https://tfnpwbolqgkpsfilhiqq.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-production-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-production-service-role-key"

# Stripe (Use PRODUCTION keys, not test keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."

# Stripe Webhook Secret (set after webhook creation)
STRIPE_WEBHOOK_SECRET="whsec_..."

# Site URL (Update after deployment)
NEXT_PUBLIC_SITE_URL="https://your-production-domain.vercel.app"
```

### Getting Your Keys:
1. **Supabase Keys**: Project Settings → API
2. **Stripe Keys**: Stripe Dashboard → Developers → API keys (switch to Live mode)

---

## Phase 3: Prepare Code for Production

### 1. Update package.json build script (if needed)
Your current setup already has proper build configuration:
```json
"build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
```

### 2. Ensure Prisma generates correctly
```bash
npx prisma generate
```

### 3. Remove better-sqlite3 from production dependencies
Since we're using Supabase PostgreSQL, update dependencies:
```bash
npm uninstall better-sqlite3 @prisma/adapter-better-sqlite3
npm uninstall @types/better-sqlite3
```

### 4. Update any direct SQLite references
Search your codebase for any direct better-sqlite3 imports and replace with Prisma client.

---

## Phase 4: Deploy to Vercel

### Method 1: Via Vercel Dashboard (Recommended for first time)

1. **Create New Project**
   - Go to https://vercel.com/new
   - Import your Git repository
   - Select framework preset: **Next.js**

2. **Configure Project**
   - **Root Directory**: `.` (root of repo)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

3. **Add Environment Variables**
   - Add all variables from Phase 2
   - Make sure to select the correct environment (Production)

4. **Deploy**
   - Click "Deploy"
   - Wait for build and deployment (2-3 minutes)

### Method 2: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

---

## Phase 5: Post-Deployment Setup

### 1. Push Database Schema to Production
```bash
# Set DATABASE_URL to your Supabase production URL
DATABASE_URL="postgresql://..." npx prisma db push
```

### 2. Set Up Stripe Webhook

1. **Create Webhook Endpoint**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://your-domain.vercel.app/api/webhooks/stripe`
   - Events to listen for:
     - `payment_intent.succeeded`
     - `payment_intent.failed`
     - `checkout.session.completed`

2. **Get Webhook Secret**
   - After creating webhook, click on it
   - Copy the "Signing Secret" (starts with `whsec_`)
   - Add `STRIPE_WEBHOOK_SECRET` to your Vercel environment variables

3. **Update Site URL**
   - Update `NEXT_PUBLIC_SITE_URL` in Vercel environment variables
   - Redeploy if needed

### 3. Test Production Deployment

```bash
# Test your deployed site
curl https://your-domain.vercel.app

# Test database connection (add a test endpoint if needed)
curl https://your-domain.vercel.app/api/health
```

### 4. Monitor and Debug
- Check Vercel Logs: Dashboard → Project → Logs
- Check Supabase Logs: Dashboard → Logs
- Monitor Stripe Webhooks: Dashboard → Webhooks → webhook → events

---

## Phase 6: Database Migration (if you have existing SQLite data)

If you have data in your local SQLite database that needs to be migrated:

1. **Export SQLite Data**
   ```bash
   npm install -g prisma-db-export
   prisma-db-export --schema ./prisma/schema.prisma
   ```

2. **Import to Supabase**
   - Use Supabase's SQL Editor to run INSERT statements
   - Or use a migration tool like `pgloader`

---

## Common Issues and Solutions

### Issue 1: Build Fails - Prisma Client Not Found
```bash
# Solution: Add pre-build script to package.json
"scripts": {
  "postinstall": "prisma generate"
}
```

### Issue 2: Database Connection Timeout
- **Solution**: Use Supabase connection pooling (port 6543)
- Add connection timeout to your DATABASE_URL: `?connect_timeout=10&pool_timeout=10`

### Issue 3: Stripe Webhook Verification Fails
- **Solution**: Make sure `STRIPE_WEBHOOK_SECRET` matches production webhook
- Test webhook in Stripe Dashboard with test events

### Issue 4: Environment Variables Not Working
- **Solution**: Redeploy after adding environment variables
- Use `vercel env pull` to verify variables are set correctly

---

## Security Checklist

- [ ] Using production Stripe keys (not test keys)
- [ ] `STRIPE_WEBHOOK_SECRET` is set
- [ ] Supabase service role key is secured
- [ ] Database connection uses SSL
- [ ] No hardcoded secrets in code
- [ ] CORS properly configured for production domain
- [ ] Rate limiting configured (if needed)
- [ ] Error monitoring set up (Sentry, etc.)

---

## Performance Optimization

1. **Enable Vercel Analytics**
   - Dashboard → Project → Analytics → Enable

2. **Set Up Caching Headers**
   - Add cache control for static assets
   - Consider using Vercel Blob for file uploads

3. **Database Connection Pooling**
   - Already configured with Supabase pooler (port 6543)

4. **Monitor Performance**
   - Set up Vercel Speed Insights
   - Monitor database query performance in Supabase

---

## Backup and Recovery

### Database Backups
- Supabase automatic backups: Enabled by default
- Manual backups: Supabase Dashboard → Database → Backups

### Code Backups
- Git repository (pushed regularly)
- Vercel deployment history

---

## Monitoring and Alerts

Set up the following monitoring:
1. **Vercel**: Deployment notifications, error alerts
2. **Supabase**: Database metrics, auth logs
3. **Stripe**: Payment failures, webhook issues
4. **Custom**: Application errors, failed transactions

---

## Cost Estimate (Monthly)

- **Vercel**: Free tier or $20/month (Pro plan)
- **Supabase**: Free tier or $25/month (Pro plan)
- **Stripe**: 2.9% + 30¢ per transaction
- **Total**: ~$45-50/month base + transaction fees

---

## Next Steps After Deployment

1. **Set up custom domain** (optional)
2. **Configure email notifications**
3. **Set up error tracking** (Sentry, LogRocket)
4. **Implement analytics** (Google Analytics, Mixpanel)
5. **Set up CI/CD pipeline** (GitHub Actions)
6. **Create staging environment**
7. **Document API endpoints**
8. **Create admin documentation**

---

## Support and Troubleshooting

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Stripe Docs**: https://stripe.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

## Quick Command Reference

```bash
# Prisma commands
npx prisma generate          # Generate Prisma client
npx prisma db push          # Push schema changes
npx prisma studio           # Open Prisma Studio (local only)

# Vercel commands
vercel                      # Deploy to preview
vercel --prod               # Deploy to production
vercel env ls               # List environment variables
vercel env add KEY value    # Add environment variable

# Build commands
npm run build               # Build for production
npm run start               # Start production server locally
```

---

## Rollback Procedure

If something goes wrong:

1. **Quick Rollback** (Vercel Dashboard):
   - Deployments → Select previous deployment → Rollback

2. **Database Rollback**:
   - Supabase Dashboard → Database → Backups → Restore

3. **Code Rollback**:
   - `git revert HEAD` → Commit and push → Redeploy

---

Last Updated: 2026-08-02
