import { NextRequest, NextResponse } from "next/server";
import { ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, BUCKET_NAME } from "@/lib/s3Client";

export const dynamic = 'force-dynamic'; // Disable caching

export async function GET(request: NextRequest) {
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
            // Add partial matchers or IDs as discovered
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

            // 1. Try Exact Map
            let cleanTitle = STOCK_METADATA[filename];

            // 2. Try Partial Map (if filename contains the ID)
            if (!cleanTitle) {
                const match = Object.keys(STOCK_METADATA).find(k => filename.includes(k));
                if (match) cleanTitle = STOCK_METADATA[match];
            }

            // 3. Fallback to Pretty Print
            if (!cleanTitle) {
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
