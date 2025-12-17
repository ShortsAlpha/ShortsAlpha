import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt } = body;

        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        // Use a model that supports JSON mode if available, or just standard pro
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const systemPrompt = `
        You are a viral short video script writer.
        Generate a JSON response with a 'virality_score' (number 0-100) and a 'script' array.
        Each item in 'script' should have:
        - 'time': string (e.g., "00:00 - 00:05")
        - 'text': string (The voiceover text)
        - 'visual': string (Description of background visual)
        
        The story should be engaging, fast-paced, and suitable for a 30-60 second vertical video.
        Topic: ${prompt}
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const response = result.response;
        const text = response.text();

        return NextResponse.json(JSON.parse(text));

    } catch (error: any) {
        console.error("Generate script error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
