import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { key } = body;

        if (!key) {
            return NextResponse.json(
                { error: "Missing key" },
                { status: 400 }
            );
        }

        const publicUrl = process.env.R2_PUBLIC_URL;
        const videoUrl = `${publicUrl}/${key}`;

        const modalUrl = process.env.MODAL_API_URL;
        const googleApiKey = process.env.GOOGLE_API_KEY;

        if (!modalUrl || !googleApiKey) {
            console.error("Configuration missing");
            return NextResponse.json(
                { error: "Backend configuration missing" },
                { status: 500 }
            );
        }

        console.log("Triggering Modal Backend at:", modalUrl);
        console.log("Payload:", JSON.stringify({ video_url: videoUrl, output_key: key.replace("uploads/", "processed/") }));

        // Call Modal Endpoint
        const response = await axios.post(modalUrl, {
            video_url: videoUrl,
            output_key: key.replace("uploads/", "processed/"),
            api_key: googleApiKey,
            r2_account_id: process.env.R2_ACCOUNT_ID,
            r2_access_key_id: process.env.R2_ACCESS_KEY_ID,
            r2_secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
            r2_bucket_name: process.env.R2_BUCKET_NAME
        }, {
            timeout: 15000 // 15 seconds timeout
        });

        console.log("Modal Response:", response.data);

        return NextResponse.json(response.data);

    } catch (error: any) {
        console.error("Error triggering automation:", error);
        const errorMessage = error.response?.data?.detail || error.message || "Failed to trigger automation";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
