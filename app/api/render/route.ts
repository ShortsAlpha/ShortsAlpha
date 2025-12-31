import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { auth } from "@clerk/nextjs/server";
import { getPlanLimits } from "@/lib/limits";
import https from "https";

export async function POST(request: NextRequest) {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Get User Plan
        const plan = (sessionClaims?.publicMetadata as any)?.plan || 'free';
        const limits = getPlanLimits(plan);

        const body = await request.json();

        // 2. Enforce Resolution
        // If user requests 1080p/4k but plan is 720p, downgrade it
        if (limits.maxResolution === '720p' && (body.width > 720 || body.height > 1280)) {
            // Forcing 720p
            const aspect = body.width / body.height;
            if (aspect > 1) { // Landscape
                body.width = 1280;
                body.height = 720;
            } else { // Portrait
                body.width = 720;
                body.height = 1280;
            }
        } else if (limits.maxResolution === '1080p' && (body.width > 1080 || body.height > 1920)) {
            // Forcing 1080p (No 4K for Pro)
            const aspect = body.width / body.height;
            if (aspect > 1) {
                body.width = 1920;
                body.height = 1080;
            } else {
                body.width = 1080;
                body.height = 1920;
            }
        }

        // 3. Enforce Watermark
        // If plan requires watermark, ensure we inject it (or backend handles it)
        // For now, we pass a flag to the backend
        if (limits.watermark) {
            body.add_watermark = true;
        } else {
            body.add_watermark = false;
        }

        // Validation
        if (!body.video_tracks && !body.audio_tracks) {
            return NextResponse.json({ error: "No tracks provided" }, { status: 400 });
        }

        const modalUrl = process.env.MODAL_RENDER_URL;

        if (!modalUrl) {
            console.warn("MODAL_RENDER_URL not set. Running in Mock Mode.");
            // Mock Response
            return NextResponse.json({
                status: "mock_success",
                message: "Render started (Mock). Configure MODAL_RENDER_URL to use real backend.",
                call_id: "mock-call-id-" + Date.now()
            });
        }

        // Forward to Modal
        console.log("Triggering Modal Render at:", modalUrl);

        // Construct expected Public URL
        const publicUrlBase = process.env.R2_PUBLIC_URL;
        const resultUrl = `${publicUrlBase}/${body.output_key}`;



        const response = await axios.post(modalUrl, {
            ...body,
            userId: userId, // Pass Auth User ID to Backend
            // Inject Setup Credentials securely
            r2_account_id: process.env.R2_ACCOUNT_ID || body.r2_account_id || "",
            r2_access_key_id: process.env.R2_ACCESS_KEY_ID || body.r2_access_key_id || "",
            r2_secret_access_key: process.env.R2_SECRET_ACCESS_KEY || body.r2_secret_access_key || "",
            r2_bucket_name: process.env.R2_BUCKET_NAME || body.r2_bucket_name || ""
        }, {
            timeout: 60000, // Increased to 60s
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            httpsAgent: new https.Agent({ keepAlive: true })
        });

        return NextResponse.json({
            ...response.data,
            result_url: resultUrl // Send back to client for polling
        });

    } catch (error: any) {
        console.error("Error triggering render:", error.message);
        if (error.response) {
            console.error("Modal Response Status:", error.response.status);
            console.error("Modal Response Data:", JSON.stringify(error.response.data, null, 2));
            // Forward the actual error payload (e.g. usage info or pydantic detail)
            return NextResponse.json(
                error.response.data,
                { status: error.response.status }
            );
        }
        return NextResponse.json(
            { error: error.message || "Failed to trigger render" },
            { status: 500 }
        );
    }
}
