# Stripe Webhook Setup for Local Development

## Option 1: Stripe CLI (Recommended for Testing)

### Install Stripe CLI
```bash
# On macOS
brew install stripe/stripe-cli/stripe

# On Windows
# Download from https://github.com/stripe/stripe-cli/releases

# On Linux
# Download from https://github.com/stripe/stripe-cli/releases
```

### Login to Stripe
```bash
stripe login
```

### Forward Webhooks to Local Development
```bash
stripe listen --forward-to localhost:3400/api/webhooks/stripe
```

This will give you a webhook secret like:
```
whr_1234567890abcdef...
```

### Add to your .env.local
```env
STRIPE_WEBHOOK_SECRET="whr_YOUR_WEBHOOK_SECRET_HERE"
```

### Restart your dev server
```bash
npm run dev
```

Now test payments will automatically update credits!

---

## Option 2: Test Webhook Secret (Temporary)

If you can't use Stripe CLI, you can get test webhook secrets from:

1. Go to https://dashboard.stripe.com/test/webhooks
2. Create a webhook pointing to your ngrok/tunnel URL
3. Copy the webhook secret

---

## Test Webhook Events

The webhook handles these events:
- `checkout.session.completed` - Fulfills credit purchases

After successful payment, it will:
1. Create Order record
2. Create CreditTransaction
3. Update User.creditsBalance
4. Send Telegram notification (if configured)
