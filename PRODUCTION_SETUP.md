# BoostBuddy MVP - Production Environment Setup Guide

## 📋 Current Situation Analysis

Your Vercel project `jakareas-projects/boostbuddy-mvp` exists but has:
- ✅ Multiple successful deployments (latest: 12 days ago)
- ✅ Custom domains configured (boostbuddy.it, hooknhunt.com, shopilook.com)
- ❌ **NO environment variables** configured
- ❌ Current DATABASE_URL uses SQLite (won't work on Vercel)

## 🚀 Step 1: Get Your Supabase PostgreSQL Connection String

### 1. Access Your Supabase Dashboard
- Go to: https://supabase.com/dashboard
- Navigate to your project: `ugwjvpzwaqnghrbeuput`

### 2. Get Database Connection String
- Go to **Settings → Database**
- Find **Connection String** section
- Select **URI** format
- Choose **Session pooler** (port 6543) for serverless compatibility
- Copy the connection string (format below):

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### 3. Note Your Supabase API Keys
- Go to **Settings → API**
- Copy these values:
  - `Project URL` (NEXT_PUBLIC_SUPABASE_URL)
  - `anon/public` key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
  - `service_role` key (SUPABASE_SERVICE_ROLE_KEY)

## 🚀 Step 2: Get Stripe Production Keys

### 1. Access Stripe Dashboard
- Go to: https://dashboard.stripe.com
- Switch to **Live mode** (toggle in top-right)

### 2. Get Production Keys
- Go to **Developers → API keys**
- Copy:
  - **Publishable key**: `pk_live_...`
  - **Secret key**: `sk_live_...`

### 3. Set Up Webhook (After Deployment)
1. Go to **Developers → Webhooks**
2. Click "Add endpoint"
3. **Endpoint URL**: `https://boostbuddy.it/api/webhooks/stripe`
4. **Events to send**:
   - `payment_intent.succeeded`
   - `payment_intent.failed`
   - `checkout.session.completed`
5. Copy the **Signing Secret** (starts with `whsec_...`)

## 🚀 Step 3: Set Up Environment Variables in Vercel

Run these commands to add environment variables to your Vercel project:

```bash
# Database (Supabase PostgreSQL)
vercel env add DATABASE_URL production
# Paste your Supabase connection string

# Supabase Keys
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Paste: https://ugwjvpzwaqnghrbeuput.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Paste your anon key

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste your service_role key

# Stripe Keys (Production)
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
# Paste: pk_live_...

vercel env add STRIPE_SECRET_KEY production
# Paste: sk_live_...

# Site URL (Will be boostbuddy.it)
vercel env add NEXT_PUBLIC_SITE_URL production
# Paste: https://boostbuddy.it

# Webhook Secret (Add after setting up webhook in Stripe)
vercel env add STRIPE_WEBHOOK_SECRET production
# Paste: whsec_...
```

## 🚀 Step 4: Push Database Schema

After setting environment variables, push your Prisma schema to Supabase:

```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Push schema to Supabase
DATABASE_URL="your-supabase-connection-string" npx prisma db push
```

## 🚀 Step 5: Deploy to Production

```bash
# Deploy to Vercel
vercel --prod

# Monitor deployment
vercel logs --follow
```

## 🚀 Step 6: Post-Deployment Tasks

### 1. Set Up Stripe Webhook
- Follow webhook setup instructions from Step 2
- Update STRIPE_WEBHOOK_SECRET in Vercel
- Redeploy: `vercel --prod`

### 2. Test Your Deployment
- Test authentication: https://boostbuddy.it
- Test admin panel: https://boostbuddy.it/admin
- Test client dashboard: https://boostbuddy.it/dashboard
- Test payment flow with small amount

### 3. Monitor Functionality
- Check Vercel logs: `vercel logs`
- Check Supabase logs: Dashboard → Logs
- Check Stripe webhooks: Dashboard → Webhooks → Events

## 🔧 Quick Reference Commands

```bash
# List current env vars
vercel env ls

# Add env var
vercel env add VAR_NAME production

# Remove env var
vercel env rm VAR_NAME production

# Deploy
vercel --prod

# Check logs
vercel logs --follow

# Check deployment status
vercel ls
```

## ✅ Pre-Deployment Checklist

Before deploying, ensure:

- [ ] Supabase PostgreSQL connection string obtained
- [ ] Supabase API keys obtained (anon + service_role)
- [ ] Stripe production keys obtained (pk_live + sk_live)
- [ ] Stripe webhook endpoint set up (after first deployment)
- [ ] Environment variables added to Vercel
- [ ] Database schema pushed to Supabase
- [ ] `NEXT_PUBLIC_SITE_URL` set to https://boostbuddy.it
- [ ] Build tested locally: `npm run build`
- [ ] Git changes committed and pushed

## 🎯 Expected URLs After Deployment

- **Main Site**: https://boostbuddy.it
- **Admin Panel**: https://boostbuddy.it/admin
- **Client Dashboard**: https://boostbuddy.it/dashboard
- **API Endpoints**: https://boostbuddy.it/api/*
- **Webhook**: https://boostbuddy.it/api/webhooks/stripe

## 📊 Monitoring Setup

After deployment, set up monitoring:

1. **Vercel Analytics**: Enable in dashboard
2. **Error Tracking**: Consider Sentry or similar
3. **Uptime Monitoring**: Use UptimeRobot or similar
4. **Database Monitoring**: Supabase Dashboard → Logs
5. **Payment Monitoring**: Stripe Dashboard → Webhooks

## 🚨 Troubleshooting

### Deployment Fails
```bash
# Check build logs
vercel logs --build

# Verify env vars
vercel env ls

# Test build locally
npm run build
```

### Database Issues
```bash
# Test connection
DATABASE_URL="your-connection-string" npx prisma db push

# Check Supabase logs
# Supabase Dashboard → Logs
```

### Webhook Issues
- Verify webhook URL is correct
- Check Stripe webhook events
- Verify STRIPE_WEBHOOK_SECRET matches

---

## 📝 Notes

- **Database**: Your app is already configured for PostgreSQL in `prisma/schema.prisma`
- **SQLite**: Better-sqlite3 dependencies will be ignored in Vercel environment
- **Custom Domains**: You have boostbuddy.it, hooknhunt.com, and shopilook.com configured
- **Previous Deployments**: You have 20+ deployments, but they won't work without env vars

## 🎉 You're Ready!

Once environment variables are set, deployment should take 2-3 minutes and your app will be live at https://boostbuddy.it

---

**Last Updated**: 2026-08-02
**Project**: jakareas-projects/boostbuddy-mvp
**Primary Domain**: boostbuddy.it
