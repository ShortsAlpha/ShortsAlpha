import { NextRequest, NextResponse } from 'next/server';
import { s3Client, BUCKET_NAME } from '@/lib/s3Client';
import { GetObjectCommand } from "@aws-sdk/client-s3";

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
        return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    try {
        const isDownload = searchParams.get('download') === 'true';
        const range = request.headers.get('range');

        const getParams: any = {
            Bucket: BUCKET_NAME,
            Key: key,
        };

        if (range && !isDownload) {
            getParams.Range = range;
        }

        const command = new GetObjectCommand(getParams);
        const response = await s3Client.send(command);

        // Convert the stream to a Web Stream for NextResponse
        const stream = response.Body as any;

        // Pass specific headers for video playback
        const headers = new Headers();
        headers.set('Content-Type', 'video/mp4');
        headers.set('Access-Control-Allow-Origin', '*');

        if (isDownload) {
            headers.set('Content-Disposition', 'attachment; filename="export.mp4"');
            headers.set('Content-Length', response.ContentLength?.toString() || '');
            headers.set('Cache-Control', 'public, max-age=3600');
            return new NextResponse(stream, { status: 200, headers });
        } else {
            headers.set('Content-Disposition', 'inline; filename="export.mp4"');
            headers.set('Cache-Control', 'public, max-age=3600');

            // Handle Range Response
            if (response.ContentRange) {
                headers.set('Content-Range', response.ContentRange);
                headers.set('Content-Length', response.ContentLength?.toString() || '');
                headers.set('Accept-Ranges', 'bytes');
                return new NextResponse(stream, { status: 206, headers });
            } else {
                headers.set('Content-Length', response.ContentLength?.toString() || '');
                headers.set('Accept-Ranges', 'bytes');
                return new NextResponse(stream, { status: 200, headers });
            }
        }

    } catch (error: any) {
        console.error("Proxy Error:", error);
        return NextResponse.json({ error: 'Failed to fetch video', details: String(error) }, { status: 500 });
    }
}
