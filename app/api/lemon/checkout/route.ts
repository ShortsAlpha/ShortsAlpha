import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createCheckout } from '@/lib/lemon';

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { variantId } = body;

        if (!variantId) {
            return new NextResponse("Variant ID is required", { status: 400 });
        }

        const checkout = await createCheckout({
            variantId,
            userId,
            redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin')}/studio?success=true`
        });

        return NextResponse.json({ url: checkout.data.attributes.url });

    } catch (error) {
        console.error("[LEMON_CHECKOUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
