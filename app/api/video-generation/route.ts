import { NextResponse } from 'next/server';
// Force reload

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, apiUrl, action, jobId } = body;

        // Common URL logic
        const colabUrl = apiUrl || process.env.COLAB_API_URL;
        if (!colabUrl) {
            return NextResponse.json({ error: 'API URL Not Configured' }, { status: 500 });
        }

        // --- ACTION: HEALTH CHECK ---
        if (action === 'health') {
            const response = await fetch(`${colabUrl}/`);
            if (!response.ok) throw new Error(await response.text());
            return NextResponse.json({ status: 'ok', message: await response.text() });
        }

        // --- ACTION: START GENERATION ---
        if (!action || action === 'generate') {
            const response = await fetch(`${colabUrl}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            if (!response.ok) throw new Error(await response.text());
            return NextResponse.json(await response.json());
        }

        // --- ACTION: POLL STATUS ---
        if (action === 'poll') {
            const response = await fetch(`${colabUrl}/poll?job_id=${jobId}`);
            if (!response.ok) throw new Error(await response.text());
            return NextResponse.json(await response.json());
        }

        // --- ACTION: DOWNLOAD ---
        if (action === 'download') {
            const response = await fetch(`${colabUrl}/download?job_id=${jobId}`);
            if (!response.ok) throw new Error(await response.text());

            const videoBlob = await response.blob();
            const arrayBuffer = await videoBlob.arrayBuffer();
            return new NextResponse(arrayBuffer, {
                headers: { 'Content-Type': 'video/mp4' },
            });
        }

        return NextResponse.json({ error: 'Invalid Action' }, { status: 400 });

    } catch (error: any) {
        console.error("API Proxy Error:", error);
        return NextResponse.json({ error: error.message || 'Proxy Error' }, { status: 500 });
    }
}
