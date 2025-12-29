
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// This route proxies the request to the Python backend
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Robust File Reading for Node environment
        // In Next.js/Node, 'file' is sometimes a proprietary object. 
        // We convert it to a standard Blob via ArrayBuffer to ensure 'fetch' can stream it.
        const fileBuffer = await file.arrayBuffer();
        const fileBlob = new Blob([fileBuffer], { type: file.type });

        // Use MODAL_RENDER_URL which points to the main backend (render-video)
        // analyze_faces is a separate function, so it has a different URL subdomain.
        // We derive it by replacing 'render-video' with 'analyze-faces'
        const RENDER_URL = process.env.MODAL_RENDER_URL?.replace(/\/+$/, "");

        if (!RENDER_URL) {
            console.error("Missing MODAL_RENDER_URL env var");
            return NextResponse.json({ error: "Backend Configuration Error" }, { status: 500 });
        }

        const ANALYZE_URL = RENDER_URL.replace("render-video", "analyze-faces");
        console.log(`Forwarding analyze request to: ${ANALYZE_URL}`);

        const backendFormData = new FormData();
        backendFormData.append("file", fileBlob, file.name);

        // NATIVE FETCH (Correct FormData + Boundary handling in Node)
        // Set timeout to 10 minutes (600000ms) to allow for cold starts or long videos
        const response = await fetch(ANALYZE_URL, {
            method: "POST",
            body: backendFormData,
            signal: AbortSignal.timeout(600000),
            headers: {
                // DO NOT SET CONTENT-TYPE MANUALLY
                // fetch will add boundary automatically
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Backend Error (${response.status}):`, errorText);
            // Return 200 so frontend can parse the error message in 'data.error'
            return NextResponse.json({ error: `Backend failed (${response.status}): ${errorText}` }, { status: 200 });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Face Detect Proxy Error:", error.message);
        // Return 200 so frontend can parse the error message
        return NextResponse.json({ error: "Face detection failed: " + error.message }, { status: 200 });
    }
}
