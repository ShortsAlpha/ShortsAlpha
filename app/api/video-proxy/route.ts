import { NextRequest, NextResponse } from 'next/server';
import { s3Client, BUCKET_NAME } from '@/lib/s3Client';
import { GetObjectCommand } from "@aws-sdk/client-s3";

export const runtime = 'nodejs'; // Node runtime needed for heavier streaming if edge has limits (though edge is usually better for streaming, node is safer for AWS SDK compatibility sometimes)
// actually, let's use nodejs to avoid edge compatibility issues with some aws-sdk versions if not bundled right.

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
        return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        const response = await s3Client.send(command);

        // Convert the stream to a Web Stream for NextResponse
        const stream = response.Body as any; // Cast to bypass type issues with Node streams vs Web streams

        // Pass specific headers for video playback
        const headers = new Headers();
        headers.set('Content-Type', 'video/mp4');
        headers.set('Content-Length', response.ContentLength?.toString() || '');
        headers.set('Content-Disposition', 'inline; filename="export.mp4"');
        headers.set('Cache-Control', 'public, max-age=3600');
        headers.set('Access-Control-Allow-Origin', '*');

        return new NextResponse(stream, {
            status: 200,
            headers,
        });

    } catch (error) {
        console.error("Proxy Error:", error);
        return NextResponse.json({ error: 'Failed to fetch video', details: String(error) }, { status: 500 });
    }
}
