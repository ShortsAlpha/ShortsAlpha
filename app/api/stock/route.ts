import { NextRequest, NextResponse } from "next/server";
import { ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, BUCKET_NAME } from "@/lib/s3Client";

export const dynamic = 'force-dynamic'; // Disable caching

export async function GET(request: NextRequest) {
    console.log("[Stock API] Request Received"); // Fixed typo 'Sock' -> 'Stock'

    try {
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: "stock/"
        });

        const response = await s3Client.send(command);
        const contents = response.Contents || [];

        // Manual Metadata Mapping (Since R2 files have UUID names)
        const STOCK_METADATA: Record<string, string> = {
            "05d07c5c-3d44-4db6-bb87-e23f5b7d9a12.mp4": "Minecraft Parkour",
            "minecraft_parkour.mp4": "Minecraft Parkour",
            "subway_surfer.mp4": "Subway Surfers",
            "gta_v.mp4": "GTA V Gameplay",

            // --- MAPPED ASSETS FROM LOGS ---
            "39b3b955-8c04-4f97-8605-06cf5d7af714.mp4": "Minecraft Gameplay 1",
            "49ca3019-f888-4d6c-ba9a-469bef834d70.mp4": "Minecraft Gameplay 2",
            "4d832044-d3db-4fcb-86c5-8d6bf78275f9.mp4": "Subway Surfers 1",
            "cd0a63c1-1c31-45a3-8e93-5b3c84982920.mp4": "GTA V Gameplay 1",
            "f288d44a-68c3-4cbf-980b-2ff4f5aff6cb.mp4": "Satisfying Video 1",

            // Audio
            "0856a09b-4336-424c-8ce9-72e20f67692c.mp3": "Upbeat Music 1",
            "2eb222db-1c41-4e37-99d3-542fe2cc4f39.mp3": "Chill Lo-Fi",
            "66644baf-b232-4384-891f-459cc6006820.mp3": "Sound Effect Pop",
            "aacffae9-6937-4f07-8cc9-d9d0efbaeac5.mp3": "Suspense Sound",

            // Fuzzy match candidates (Safety)
            "05d07c5c": "Minecraft Parkour",
            "0d20179d": "Subway Surfers"
        };

        // Generate Signed URLs for each item
        const assets = await Promise.all(contents.map(async (item) => {
            const key = item.Key!;
            // Skip folders
            if (key.endsWith('/')) return null;

            // Generate Signed URL
            const getCommand = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
            const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 }); // 7 Days

            const filename = key.split('/').pop() || "Untitled";

            // 1. Try Exact/Fuzzy Map
            // Normalize helper: lowercase, remove dashes/underscores/spaces/dots/extensions
            const normalize = (s: string) => s.toLowerCase().replace(/(\.[^/.]+)|[^a-z0-9]/g, "");

            let cleanTitle = STOCK_METADATA[filename];

            if (!cleanTitle) {
                // Fuzzy Match Loop
                const normFilename = normalize(filename);
                // Check if any KEY in Metadata matches the filename (contains or equal)
                const matchKey = Object.keys(STOCK_METADATA).find(k => {
                    const normK = normalize(k);
                    // Key is inside Filename? OR Filename is inside Key?
                    return normFilename.includes(normK) || normK.includes(normFilename);
                });
                if (matchKey) cleanTitle = STOCK_METADATA[matchKey];
            }

            // 2. Try "Name__UUID" Pattern (New Uploads)
            // Example: My_Cool_Video__8a7b9c.mp4
            if (!cleanTitle && filename.includes('__')) {
                const parts = filename.split('__');
                if (parts.length >= 2) {
                    cleanTitle = parts[0].replace(/_/g, " "); // Restore spaces
                }
            }

            // 3. Fallback to Pretty Print
            if (!cleanTitle) {
                console.log(`[Stock-Debug] Unmapped File: ${filename}`); // Debug Log
                cleanTitle = filename
                    .replace(/\.[^/.]+$/, "") // Remove ext
                    .replace(/[_-]/g, " ") // Replace separators
                    .replace(/\b\w/g, c => c.toUpperCase()); // Capitalize
            }

            // Heuristic for type
            const isAudio = filename.endsWith('.mp3') || filename.endsWith('.wav') || filename.endsWith('.m4a');
            return {
                id: key,
                title: cleanTitle,
                url: signedUrl,
                type: isAudio ? 'audio' : 'video',
                category: 'Stock',
                duration: 10 // Placeholder
            };
        }));

        return NextResponse.json({
            assets: assets.filter(Boolean)
        });

    } catch (err: any) {
        console.error("List Stock Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
