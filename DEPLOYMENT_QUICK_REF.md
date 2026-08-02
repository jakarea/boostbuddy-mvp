# BoostBuddy MVP - Deployment Quick Reference

## 🚀 Quick Deploy Commands

```bash
# Pre-deployment check
./scripts/deploy-checklist.sh

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View deployment logs
vercel logs

# Rollback to previous deployment
vercel rollback
```

## 📋 Environment Variables Checklist

### Required for Production:
- [ ] `DATABASE_URL` - Supabase PostgreSQL connection string
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key (sensitive)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe live publishable key
- [ ] `STRIPE_SECRET_KEY` - Stripe live secret key (sensitive)
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret (sensitive)
- [ ] `NEXT_PUBLIC_SITE_URL` - Your production URL

### Optional:
- [ ] `TELEGRAM_BOT_TOKEN` - For Telegram notifications
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - For error tracking
- [ ] `NEXT_PUBLIC_GA_ID` - For analytics

## 🔧 Common Commands

### Prisma Database Operations
```bash
npx prisma generate      # Generate Prisma client
npx prisma db push      # Push schema to database
npx prisma studio       # Open database viewer
npx prisma migrate dev  # Create migration
```

### Vercel Operations
```bash
vercel                    # Deploy to preview
vercel --prod            # Deploy to production
vercel env ls           # List all env variables
vercel env add KEY      # Add environment variable
vercel env pull .env    # Pull env vars locally
vercel domains          # Manage custom domains
```

### Build & Test
```bash
npm run build           # Build for production
npm run start           # Start production server locally
npm run lint           # Run linter
```

## 🔍 Post-Deployment Checklist

### Database
- [ ] Run `npx prisma db push` to create tables
- [ ] Verify database connection in logs
- [ ] Check Supabase dashboard for tables created

### Stripe
- [ ] Create webhook endpoint in Stripe dashboard
- [ ] Add webhook secret to Vercel env vars
- [ ] Test webhook with test events
- [ ] Update `NEXT_PUBLIC_SITE_URL`

### Testing
- [ ] Test authentication flow
- [ ] Test payment flow with real card (small amount)
- [ ] Test admin panel
- [ ] Test client dashboard
- [ ] Verify webhook processing

### Monitoring
- [ ] Enable Vercel Analytics
- [ ] Set up error tracking (optional)
- [ ] Configure uptime monitoring
- [ ] Set up alert notifications

## 🚨 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Database Connection Issues
```bash
# Test connection string
DATABASE_URL="your-connection-string" npx prisma db push

# Check Supabase logs
# Supabase Dashboard → Logs
```

### Webhook Issues
```bash
# Check webhook secret matches
# Verify endpoint URL: /api/webhooks/stripe

# Test webhook in Stripe Dashboard
# Stripe → Webhooks → Your webhook → Send test event
```

### Environment Variable Issues
```bash
# Pull and verify env vars
vercel env pull .env.production
cat .env.production

# Redeploy to apply changes
vercel --prod
```

## 📊 Performance Monitoring

### Key Metrics to Watch:
- Response time (should be < 500ms for API routes)
- Error rate (should be < 1%)
- Database query time (should be < 100ms)
- Stripe webhook processing time

### Monitoring Tools:
- Vercel Dashboard → Analytics
- Supabase Dashboard → Logs
- Stripe Dashboard → Webhooks

## 🔄 Update Deployment

```bash
# Make changes to code
git add .
git commit -m "Description of changes"
git push

# Deploy to production
vercel --prod

# Monitor deployment
vercel logs --follow
```

## 📱 Useful URLs

- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://supabase.com/dashboard
- Stripe Dashboard: https://dashboard.stripe.com
- Next.js Docs: https://nextjs.org/docs

## 💡 Pro Tips

1. **Always test in preview environment first**
   - `vercel` deploys to preview URL
   - Test thoroughly before `vercel --prod`

2. **Use Vercel's environment variable protection**
   - Mark sensitive keys as "Secret" in Vercel
   - Never commit actual values to git

3. **Keep Supabase connection pooling enabled**
   - Use port 6543 (pooler) not 5432 (direct)
   - Essential for serverless performance

4. **Monitor Stripe webhooks closely**
   - Failed webhooks = failed payments
   - Set up alerts for webhook failures

5. **Database migrations**
   - Use `prisma db push` for schema changes
   - Test migrations on staging first
   - Always backup before major changes

---
Last Updated: 2026-08-02
