import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Force Node.js runtime for stability
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { topic, context } = body;

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // User requested "Gemini 2.5 Pro".
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

        const systemPrompt = `
        You are an expert scriptwriter for viral social media videos (Shorts/TikTok).
        Your goal is to write a "Fake Chat" conversation that is engaging, funny, or dramatic.
        
        Rules:
        1. Two speakers: "A" (Sender/Right) and "B" (Receiver/Left).
        2. Keep messages short and punchy (text message style).
        3. Use slang, abbreviations, and emojis where appropriate for the context.
        4. Total length: 10-15 messages.
        5. Output strictly valid JSON array of objects.
        
        Output Format:
        [
            { "speaker": "A", "text": "..." },
            { "speaker": "B", "text": "..." }
        ]
        `;

        const userPrompt = `Topic: ${topic}\nContext: ${context || "Make it viral and catchy."}\n\nGenerate the JSON script now.`;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
            generationConfig: {
                temperature: 0.8, // Creative
                responseMimeType: "application/json"
            }
        });

        const responseText = result.response.text();

        // Clean markdown if present
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const messages = JSON.parse(jsonStr);

        return NextResponse.json({ messages });

    } catch (error: any) {
        console.error("AI Chat Generation Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate chat." },
            { status: 500 }
        );
    }
}
