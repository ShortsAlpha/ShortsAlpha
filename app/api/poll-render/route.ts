import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Optional: Use edge runtime for speed

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        // Server-side fetch (no CORS limitations)
        const response = await fetch(url, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });

        if (response.ok) {
            // If it's a JSON status file, return the body
            if (url.endsWith('.json')) {
                const data = await response.json();
                return NextResponse.json(data);
            }
            // If it's the video file, just confirm existence
            return NextResponse.json({ status: 'ready' });
        } else {
            return NextResponse.json({ status: 'pending' }, { status: 404 });
        }
    } catch (error) {
        return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
    }
}
