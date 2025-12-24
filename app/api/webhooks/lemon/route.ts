import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(req: Request) {
    try {
        const text = await req.text();
        const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

        if (!secret) {
            console.error("LEMONSQUEEZY_WEBHOOK_SECRET is missing");
            return new NextResponse("Server Config Error", { status: 500 });
        }

        const hmac = crypto.createHmac('sha256', secret);
        const digest = Buffer.from(hmac.update(text).digest('hex'), 'utf8');
        const signatureHeader = req.headers.get('x-signature');

        if (!signatureHeader) {
            return new NextResponse("No Signature", { status: 401 });
        }

        const signature = Buffer.from(signatureHeader, 'utf8');

        if (digest.length !== signature.length || !crypto.timingSafeEqual(digest, signature)) {
            return new NextResponse("Invalid Signature", { status: 401 });
        }

        const payload = JSON.parse(text);
        const { meta, data } = payload;
        const eventName = meta.event_name;

        console.log(`[LEMON_WEBHOOK] Event: ${eventName}`);

        // meta.custom_data contains the user ID we passed during checkout
        const userId = meta.custom_data?.userId;

        if (!userId) {
            console.log("[LEMON_WEBHOOK] No userId found in custom_data. Payload meta:", meta);
            // We return 200 to acknowledge receipt even if we can't process it, to stop retries
            return NextResponse.json({ received: true, status: "ignored_no_userid" });
        }

        const variantId = data.attributes.variant_id?.toString();
        let plan = 'free';

        // Helper to check IDs (handling string vs number)
        const isId = (envVar: string | undefined, id: string) => envVar && envVar.toString() === id;

        if (eventName === 'subscription_created' || eventName === 'subscription_updated' || eventName === 'subscription_resumed') {
            if (isId(process.env.NEXT_PUBLIC_LEMON_VARIANT_AGENCY, variantId)) plan = 'agency';
            else if (isId(process.env.NEXT_PUBLIC_LEMON_VARIANT_PRO, variantId)) plan = 'pro';
            else if (isId(process.env.NEXT_PUBLIC_LEMON_VARIANT_STARTER, variantId)) plan = 'starter';

            // If status is not active (e.g. past_due), we might optionally downgrade, 
            // but usually we rely on 'subscription_expired' for hard stops.
            // However, let's store the raw status too.
        } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
            plan = 'free';
        } else {
            // For other events like 'order_created', we might not want to change plan yet/or duplicate logic.
            // We focus on subscription events.
            return NextResponse.json({ received: true });
        }

        console.log(`[LEMON_WEBHOOK] Updating user ${userId} to plan ${plan} (Variant: ${variantId})`);

        // Update Clerk Metadata
        const client = await clerkClient();
        await client.users.updateUserMetadata(userId, {
            publicMetadata: {
                plan: plan,
                lemonSubscriptionId: data.id,
                lemonCustomerId: data.attributes.customer_id,
                lemonVariantId: variantId,
                lemonStatus: data.attributes.status,
                lemonRenewsAt: data.attributes.renews_at,
                lemonEndsAt: data.attributes.ends_at
            }
        });

        return NextResponse.json({ received: true });
    } catch (e: any) {
        console.error("[LEMON_WEBHOOK_ERROR]", e);
        return new NextResponse(`Webhook Error: ${e.message}`, { status: 500 });
    }
}
