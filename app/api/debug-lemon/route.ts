import { NextResponse } from 'next/server';
import { lemonClient } from '@/lib/lemon';

export async function GET() {
    try {
        const apiKey = process.env.LEMONSQUEEZY_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "API Key is missing in env" }, { status: 500 });
        }

        // Check key structure (safe log)
        const keyDebug = {
            length: apiKey.length,
            start: apiKey.substring(0, 5),
            end: apiKey.substring(apiKey.length - 5)
        };

        // Attempt basic fetch
        const response = await lemonClient.get('/users/me');

        return NextResponse.json({
            status: "success",
            user: response.data,
            key_debug: keyDebug
        });

    } catch (error: any) {
        return NextResponse.json({
            status: "error",
            message: error.message,
            response_data: error.response?.data,
            key_debug: process.env.LEMONSQUEEZY_API_KEY ? {
                length: process.env.LEMONSQUEEZY_API_KEY.length,
                start: process.env.LEMONSQUEEZY_API_KEY.substring(0, 5)
            } : "missing"
        }, { status: error.response?.status || 500 });
    }
}
