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

        const modalUrl = process.env.MODAL_SUBTITLES_URL;

        if (!modalUrl) {
            console.warn("MODAL_SUBTITLES_URL not set. Running in Mock Mode.");
            // Mock Response
            return NextResponse.json({
                status: "mock_success",
                subtitles: [
                    { start: 0, duration: 2, text: "Mock Subtitle 1" },
                    { start: 2.5, duration: 2, text: "Mock Subtitle 2" }
                ]
            });
        }

        // Forward to Modal
        console.log("Triggering Subtitle Generation at:", modalUrl);

        const response = await axios.post(modalUrl, {
            ...body,
            // Inject Credentials securely
            api_key: process.env.GOOGLE_API_KEY || "",
            r2_account_id: process.env.R2_ACCOUNT_ID || "",
            r2_access_key_id: process.env.R2_ACCESS_KEY_ID || "",
            r2_secret_access_key: process.env.R2_SECRET_ACCESS_KEY || "",
            r2_bucket_name: process.env.R2_BUCKET_NAME || ""
        }, {
            timeout: 120000, // 120s timeout
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            httpsAgent: new https.Agent({ keepAlive: true })
        });

        return NextResponse.json(response.data);

    } catch (error: any) {
        console.error("Error triggering subtitles:", error.message);
        if (error.response) {
            console.error("Modal Response Status:", error.response.status);
            console.error("Modal Response Data:", JSON.stringify(error.response.data, null, 2));
            return NextResponse.json(
                { error: `Modal Error ${error.response.status}: ${JSON.stringify(error.response.data)}` },
                { status: error.response.status }
            );
        }
        return NextResponse.json(
            { error: error.message || "Failed to trigger subtitles" },
            { status: 500 }
        );
    }
}
