# ⚡ Cron Jobs Setup Guide - Quick Implementation

## 🎯 Summary

**Do you need cron jobs?**
- ❌ **NO** for basic functionality (real-time notifications work fine)
- ✅ **YES** for production reliability (retry failed notifications, group verification, cleanup)

**Recommended Setup**: GitHub Actions (FREE, reliable, easy to configure)

---

## 🚀 Quick Setup (5 minutes)

### **Step 1: Set Environment Variables**

Add to your `.env.local` file:

```env
# Cron job security (generate a random string)
CRON_SECRET=your-super-secret-random-string-here

# Your application URL (for GitHub Actions to call)
APP_URL=https://your-domain.com
```

**Generate CRON_SECRET:**
```bash
# Run this in terminal to generate a secure random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### **Step 2: Configure GitHub Secrets**

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

1. **`CRON_SECRET`**: Your generated cron secret
2. **`APP_URL`**: Your Vercel deployment URL (e.g., `https://boostbuddy.vercel.app`)

### **Step 3: Enable GitHub Actions**

1. Push the `.github/workflows/telegram-crons.yml` file to your repository
2. Go to GitHub → Actions tab
3. Enable workflow runs (if prompted)

### **Step 4: Test Cron Jobs**

**Manual Test:**
1. Go to GitHub → Actions tab
2. Select "Telegram Notification Crons" workflow
3. Click "Run workflow"
4. Choose job type: "all" (or specific job)
5. Click "Run workflow"

**Expected Result:**
- ✅ Jobs should complete successfully
- ✅ Check logs for confirmation
- ✅ You should receive test messages in your Telegram groups

---

## 📋 What These Cron Jobs Do

### **1. Retry Failed Notifications** (Every 5 minutes)
```bash
# What it does:
- Finds failed Telegram notifications from last hour
- Retries them automatically
- Marks permanently failed ones (after 3 attempts)
- Updates database with retry status

# Why you need it:
- Temporary network issues
- Telegram API rate limits
- Bot configuration changes
```

### **2. Verify Telegram Groups** (Every hour)
```bash
# What it does:
- Tests all configured Telegram groups
- Disables inaccessible groups automatically
- Sends admin alert if many groups fail
- Logs response times

# Why you need it:
- Detect bot removal from groups
- Identify permission changes
- Monitor group accessibility
```

### **3. Cleanup Old Notifications** (Daily at 2 AM)
```bash
# What it does:
- Deletes notification logs older than 90 days
- Prevents database bloat
- Maintains performance

# Why you need it:
- Database size management
- Query performance
- Storage optimization
```

### **4. Daily Summary** (Daily at 9 AM)
```bash
# What it does:
- Sends summary of yesterday's notifications
- Includes high/medium/low priority counts
- Shows failed notification count
- Delivered to admin groups

# Why you need it:
- Admin visibility
- System health monitoring
- Usage insights
```

---

## 🛠️ Alternative Cron Services

### **If GitHub Actions doesn't work for you:**

#### **A. Cron-Job.org** (Free)
1. Go to https://cron-job.org
2. Create free account
3. Add cron jobs:
   - URL: `https://your-domain.com/api/cron/retry-failed-notifications`
   - Headers: `Authorization: Bearer YOUR_CRON_SECRET`
   - Schedule: Every 5 minutes

#### **B. EasyCron** (Free tier available)
1. Go to https://easycron.com
2. Configure cron jobs similarly
3. Good for non-GitHub projects

#### **C. Vercel Cron Jobs** (Pro plan only)
- Requires Vercel Pro ($20/month)
- Built into Vercel platform
- `vercel.json` configuration

---

## 🔒 Security Notes

### **Important Security Practices:**

1. **Never expose CRON_SECRET**: Always use environment variables
2. **Use HTTPS**: All cron endpoints should be HTTPS
3. **Monitor failed auth attempts**: Logs show unauthorized access
4. **Rotate secrets periodically**: Change CRON_SECRET regularly

### **Cron Endpoint Protection:**

Each cron endpoint checks:
```typescript
const authHeader = request.headers.get("authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

---

## 📊 Monitoring & Debugging

### **Check Cron Job Logs:**

**GitHub Actions:**
1. Go to GitHub → Actions tab
2. Select workflow run
3. View detailed logs for each job

**Application Logs:**
```typescript
// All cron jobs log to console
console.log("[CRON] Starting failed notification retry job");
console.log("[CRON] Retry job completed: 5 succeeded, 2 failed");
```

### **Common Issues:**

**Issue**: "Unauthorized" error
- **Solution**: Check CRON_SECRET matches in GitHub secrets and .env.local

**Issue**: Cron jobs not running
- **Solution**: Check GitHub Actions is enabled, workflow file exists

**Issue**: Telegram API errors
- **Solution**: Verify bot token is correct, bot has permissions

---

## ✅ Verification Checklist

After setup, verify:

- [ ] CRON_SECRET generated and added to .env.local
- [ ] CRON_SECRET added to GitHub secrets
- [ ] APP_URL added to GitHub secrets
- [ ] GitHub Actions workflow file pushed
- [ ] GitHub Actions enabled in repository
- [ ] Manual test run successful
- [ ] Check logs show successful execution
- [ ] Telegram groups receive test messages

---

## 🎯 Production Recommendations

### **For Production Deployment:**

1. **Use all 4 cron jobs** for reliability
2. **Monitor execution logs** regularly
3. **Set up failure notifications** (GitHub Action notifications)
4. **Test manually** before relying on automation
5. **Document any custom schedules** for your team

### **Optional Enhancements:**

- Add Slack/Discord webhooks for cron job failure alerts
- Implement retry logic for failed cron executions
- Add metrics dashboard for cron job performance
- Set up logging aggregation (Sentry, LogRocket, etc.)

---

## 💡 Quick Start Commands

```bash
# 1. Generate CRON_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Add to .env.local
echo "CRON_SECRET=generated_secret_here" >> .env.local
echo "APP_URL=https://your-domain.com" >> .env.local

# 3. Test manually (after GitHub setup)
# Go to GitHub → Actions → Run workflow

# 4. Monitor logs
# Check GitHub Actions logs for confirmation
```

---

## 🚀 Ready to Go!

Your Telegram notification system now has:

✅ **Real-time notifications** (works without cron jobs)
✅ **Automatic retry** (every 5 minutes)
✅ **Group monitoring** (every hour)
✅ **Database cleanup** (daily)
✅ **Daily summaries** (daily)

**The system is production-ready with free tier cron jobs!** 🎉