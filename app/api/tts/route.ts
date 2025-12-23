import { NextRequest, NextResponse } from "next/server";
import { s3Client, BUCKET_NAME } from "@/lib/s3Client";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";



export const maxDuration = 60; // Allow longer timeout for backend generation
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { text, voice = "en-US-ChristopherNeural", speed = 1 } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        // 1. CACHE CHECK
        // Create deterministic hash
        const cacheString = `${text}-${voice}-${speed}`;
        const hash = crypto.createHash('sha256').update(cacheString).digest('hex');
        const cacheKey = `tts-cache/${hash}.mp3`;
        const publicUrl = `https://pub-b1a4f641f6b640c9a03f5731f8362854.r2.dev/${cacheKey}`;

        // Check if file exists in R2
        try {
            await s3Client.send(new HeadObjectCommand({
                Bucket: BUCKET_NAME,
                Key: cacheKey
            }));
            console.log(`TTS: Cache HIT for ${hash.substr(0, 8)}`);
            return NextResponse.json({ url: publicUrl, cached: true });
        } catch (e) {
            console.log(`TTS: Cache MISS for ${hash.substr(0, 8)}. Generating via Edge TTS...`);
        }

        // 2. GENERATE (Cache Miss) -> Call Modal Backend
        const modalUrl = "https://yadaumur127--shorts-pilot-backend-generate-speech.modal.run";

        const response = await fetch(modalUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: text,
                voice: voice,
                speed: speed,
                output_key: cacheKey, // Tell backend where to save it (same as our cache key)
                r2_account_id: process.env.R2_ACCOUNT_ID,
                r2_access_key_id: process.env.R2_ACCESS_KEY_ID,
                r2_secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
                r2_bucket_name: BUCKET_NAME
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Modal TTS API Error:", response.status, errText);
            throw new Error(`Modal TTS API returned ${response.status}: ${errText}`);
        }

        const data = await response.json();

        if (data.status !== "success") {
            console.error("Modal TTS Application Error:", data);
            throw new Error("Modal TTS Failed: " + (data.error || JSON.stringify(data)));
        }

        console.log("TTS: Generation Complete via Modal");

        // Return same public URL
        return NextResponse.json({ url: publicUrl, cached: false });

    } catch (error: any) {
        console.error("TTS Error:", error);
        return NextResponse.json({ error: error.message || "Unknown Error", stack: error.stack }, { status: 500 });
    }
}
