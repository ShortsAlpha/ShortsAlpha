import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

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
