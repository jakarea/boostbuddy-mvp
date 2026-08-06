import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  console.warn("⚠️ STRIPE_SECRET_KEY is missing. Stripe checkout will fail if you try to use it.");
}

export const stripe = new Stripe(secretKey || 'sk_test_dummy_key_please_replace_in_env', {
  apiVersion: '2026-05-27.dahlia',
  typescript: true,
  appInfo: {
    name: 'BoostBudy MVP',
    version: '0.1.0'
  }
});
