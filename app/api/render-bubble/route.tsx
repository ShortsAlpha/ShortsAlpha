
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text');
    const type = searchParams.get('type') || 'received'; // 'received' (left) or 'sent' (right)
    const style = searchParams.get('style') || 'imessage'; // default style

    if (!text) {
        return new Response('Missing text', { status: 400 });
    }

    // iMessage Colors
    const isSent = type === 'sent';
    const bgColor = isSent ? '#007AFF' : '#E9E9EB';
    const textColor = isSent ? 'white' : 'black';
    const alignSelf = isSent ? 'flex-end' : 'flex-start';
    const tailRadius = isSent ? '20px 20px 0px 20px' : '20px 20px 20px 0px';

    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: alignSelf,
                    width: '100%',
                    height: '100%',
                    padding: '40px',
                    backgroundColor: 'transparent',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        backgroundColor: bgColor,
                        color: textColor,
                        padding: '24px 32px',
                        borderRadius: tailRadius,
                        fontSize: 48,
                        maxWidth: '80%',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                        lineHeight: 1.3,
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                >
                    {text}
                </div>
            </div>
        ),
        {
            width: 1080, // Full width for video overlay
            height: 300, // Enough height for a bubble
        }
    );
}
