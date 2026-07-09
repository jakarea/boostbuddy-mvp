import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/stripe";
import { fulfillOrder } from "@/app/actions/orders";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");

  if (!sig || !endpointSecret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    
    // Retrieve metadata
    const metadata = session.metadata;
    if (metadata && metadata.userId) {
      await fulfillOrder(
        metadata.userId,
        metadata.type as "PURCHASE" | "RENEWAL",
        parseFloat(metadata.amount || "0"),
        session.id,
        metadata.serviceId || undefined,
        metadata.profileId || undefined
      );
    }
  }

  return NextResponse.json({ received: true });
}
