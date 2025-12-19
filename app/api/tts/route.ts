import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { s3Client, BUCKET_NAME } from "@/lib/s3Client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

// Configure Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
    try {
        const { text, voice = "Puck", speed = 1 } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "Gemini API Key missing" }, { status: 500 });
        }

        // Prompt Engineering for Speed Control
        let pacingInstruction = "";
        if (speed >= 1.5) pacingInstruction = "Speak very fast and urgently, like a viral short video narrator. ";
        else if (speed > 1.0) pacingInstruction = "Speak quickly and energetically. ";
        else if (speed < 0.8) pacingInstruction = "Speak slowly, deliberately, and clearly. ";
        else if (speed < 1.0) pacingInstruction = "Speak slightly slower and more composed. ";

        const finalPrompt = pacingInstruction ? `[Director's Note: ${pacingInstruction}] ${text}` : text;

        const model = "gemini-2.5-pro-preview-tts";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: finalPrompt }] }],
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || "Puck" } }
                    }
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Gemini API Error Detail:", errText);
            throw new Error(`Gemini API returned ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const part = candidate?.content?.parts?.[0];

        console.log("TTS: Finish Reason:", candidate?.finishReason);
        console.log("TTS: Full Candidate content:", JSON.stringify(candidate?.content));

        // Inline data (base64) might be in inlineData
        const audioBase64 = part?.inlineData?.data;

        if (!audioBase64) {
            console.error("No audio in response:", JSON.stringify(data));
            return NextResponse.json({ error: "No audio data", details: data }, { status: 500 });
        }

        const rawBuffer = Buffer.from(audioBase64, 'base64');
        let finalBuffer = rawBuffer;
        let ext = 'mp3';
        let mimeInfo = part?.inlineData?.mimeType || "";
        let contentType = 'audio/mpeg';

        console.log("TTS: Response MimeType:", mimeInfo);

        // Handle PCM (audio/L16)
        if (mimeInfo.includes("codec=pcm")) {
            console.log("TTS: Detected Raw PCM. Adding WAV Header.");
            ext = 'wav';
            contentType = 'audio/wav';

            // Default to 24000 based on logs, but try to parse
            let sampleRate = 24000;
            const rateMatch = mimeInfo.match(/rate=(\d+)/);
            if (rateMatch) {
                sampleRate = parseInt(rateMatch[1], 10);
            }

            const header = createWavHeader(rawBuffer.length, sampleRate);
            finalBuffer = Buffer.concat([header, rawBuffer]);
        }
        // Handle MP3 detection (fallback)
        else {
            // ... existing header check logic or just assume MP3 if detection passes
            const headerHex = rawBuffer.subarray(0, 4).toString('hex');
            if (headerHex.startsWith('fffb') || headerHex.startsWith('fff3') || headerHex.startsWith('494433')) {
                ext = 'mp3';
                contentType = 'audio/mpeg';
            } else {
                console.log("TTS: Unknown format, defaulting to bin");
                ext = 'bin';
                contentType = 'application/octet-stream';
            }
        }

        const filename = `voiceover-${uuidv4()}.${ext}`;
        const key = `uploads/${filename}`;

        console.log(`TTS: Uploading ${finalBuffer.length} bytes to R2 as ${contentType}`);
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: finalBuffer,
            ContentType: contentType
        }));
        console.log("TTS: Upload complete");

        const publicUrl = `https://pub-b1a4f641f6b640c9a03f5731f8362854.r2.dev/${key}`;
        console.log("TTS: Returning URL", publicUrl);

        return NextResponse.json({ url: publicUrl });

    } catch (error: any) {
        console.error("TTS Error:", error);
        return NextResponse.json({ error: error.message || "Unknown Error", stack: error.stack }, { status: 500 });
    }
}

function createWavHeader(dataLength: number, sampleRate: number): Buffer {
    const numChannels = 1; // Mono usually for TTS? Or 2? 
    // Gemini documentation implies Mono for single voice usually. Let's assume Mono. 
    // If it sounds slow/fast, we adjust channels.
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const buffer = Buffer.alloc(44);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataLength, 4); // ChunkSize
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataLength, 40);

    return buffer;
}
