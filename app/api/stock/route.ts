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

        // Generate Signed URLs for each item
        const assets = await Promise.all(contents.map(async (item) => {
            const key = item.Key!;
            // Skip folders
            if (key.endsWith('/')) return null;

            // Generate Signed URL
            const getCommand = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
            const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 }); // 7 Days

            const filename = key.split('/').pop() || "Untitled";
            // Heuristic for type
            const isAudio = filename.endsWith('.mp3') || filename.endsWith('.wav') || filename.endsWith('.m4a');
            return {
                id: key,
                title: filename, // Ideally stored in metadata, but filename works for now
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
