"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from '@/lib/auth/server-auth';
import { stripe } from "@/lib/stripe/stripe";

// Helper function to calculate proration credit and dynamic upgrade prices on the server
async function calculateUpgradePriceInternal(
  supabase: any,
  profileId: string,
  targetServiceId: string
) {
  try {
    // 1. Fetch target service details
    const { data: targetService, error: srvError } = await supabase
      .from("services")
      .select("price, name")
      .eq("id", targetServiceId)
      .single();

    if (srvError || !targetService) {
      return { success: false, credit: 0, finalPrice: 0, targetName: "", targetPrice: 0, error: "Target service not found" };
    }

    const targetPrice = Number(targetService.price);

    // 2. Fetch profile account details
    const { data: profile, error: prfError } = await supabase
      .from("profile_accounts")
      .select("expiration_date, service_id")
      .eq("id", profileId)
      .single();

    if (prfError || !profile) {
      return { success: false, credit: 0, finalPrice: targetPrice, targetName: targetService.name, targetPrice, error: "Profile account not found" };
    }

    // If there's no active service on the profile, or it's the exact same service (renewal)
    if (!profile.service_id || profile.service_id === targetServiceId) {
      return { success: true, credit: 0, finalPrice: targetPrice, targetName: targetService.name, targetPrice };
    }

    // 3. Fetch the active service details
    const { data: activeService } = await supabase
      .from("services")
      .select("price, duration_days")
      .eq("id", profile.service_id)
      .single();

    if (!activeService) {
      return { success: true, credit: 0, finalPrice: targetPrice, targetName: targetService.name, targetPrice };
    }

    // 4. Calculate proration credit based on remaining time
    const now = new Date();
    const expirationDate = new Date(profile.expiration_date);

    if (expirationDate > now) {
      const remainingMs = expirationDate.getTime() - now.getTime();
      const remainingDays = remainingMs / (1000 * 60 * 60 * 24);
      const dailyRate = Number(activeService.price) / Number(activeService.duration_days);
      const credit = Number((dailyRate * remainingDays).toFixed(2));
      
      // Upgrade charge is target price minus credit (minimum €1.00 transaction)
      const finalPrice = Number(Math.max(1.00, targetPrice - credit).toFixed(2));
      return { success: true, credit, finalPrice, targetName: targetService.name, targetPrice };
    }

    return { success: true, credit: 0, finalPrice: targetPrice, targetName: targetService.name, targetPrice };
  } catch (err: any) {
    return { success: false, credit: 0, finalPrice: 0, targetName: "", targetPrice: 0, error: err.message };
  }
}

// Server Action for calculating upgrade prices securely in the UI
export async function calculateUpgradePriceAction(profileId: string, targetServiceId: string) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return { success: false, error: auth.error };

    const supabase = await createClient();
    const res = await calculateUpgradePriceInternal(supabase, profileId, targetServiceId);
    return res;
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to calculate upgrade price" };
  }
}

// Creates the Stripe checkout session with computed proration and EUR currency
export async function createCheckoutSessionAction(
  type: "PURCHASE" | "RENEWAL",
  amount: number, // Fallback amount from client (only used for PURCHASES)
  itemName: string,
  itemDescription: string,
  serviceId?: string,
  profileId?: string
) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth;

    const supabase = await createClient();

    if (!auth.user.email) {
      return { success: false, error: "User email not found" };
    }

    let checkoutAmount = amount;
    let checkoutItemName = itemName;
    let checkoutItemDescription = itemDescription;

    // Secure server-side calculation for RENEWAL/UPGRADE type checkout session
    if (type === "RENEWAL" && profileId && serviceId) {
      const calculation = await calculateUpgradePriceInternal(supabase, profileId, serviceId);
      if (calculation.success) {
        checkoutAmount = calculation.finalPrice;
        checkoutItemName = `Renewal/Upgrade: ${calculation.targetName}`;
        checkoutItemDescription = calculation.credit > 0 
          ? `Prorated upgrade. €${calculation.credit} credit applied for remaining days.`
          : `Standard subscription renewal.`;
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3300";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: auth.user.email,
      line_items: [
        {
          price_data: {
            currency: 'eur', // Changed to Euro (€) to match user currency settings
            product_data: {
              name: checkoutItemName,
              description: checkoutItemDescription,
            },
            unit_amount: Math.round(checkoutAmount * 100), // Stripe expects cents
            tax_behavior: 'exclusive', // Required for automatic_tax: calculates tax ON TOP of this amount
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      automatic_tax: { enabled: true },
      success_url: `${siteUrl}/dashboard/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/dashboard/payments`,
      metadata: {
        userId: auth.user.id,
        type,
        serviceId: serviceId || "",
        profileId: profileId || "",
        amount: checkoutAmount.toString()
      }
    });

    return { success: true, url: session.url };
  } catch (error: any) {
    console.error("Stripe session creation failed:", error);
    return { success: false, error: error?.message || "Failed to create checkout session" };
  }
}
