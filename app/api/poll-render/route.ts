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
        const response = await fetch(url, { method: 'HEAD' });

        if (response.ok) {
            return NextResponse.json({ status: 'ready' });
        } else {
            return NextResponse.json({ status: 'pending' }, { status: 404 });
        }
    } catch (error) {
        return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
    }
}
