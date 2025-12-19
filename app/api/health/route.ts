
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    const vars = {
        GEMINI_API_KEY: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
        R2_ACCOUNT_ID: !!process.env.R2_ACCOUNT_ID,
        R2_ACCESS_KEY_ID: !!process.env.R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY,
        R2_BUCKET_NAME: !!process.env.R2_BUCKET_NAME,
        MODAL_SUBTITLES_URL: !!process.env.MODAL_SUBTITLES_URL,
        MODAL_RENDER_URL: !!process.env.MODAL_RENDER_URL,
    };

    return NextResponse.json({
        status: "online",
        environment_check: vars,
        timestamp: new Date().toISOString()
    });
}
