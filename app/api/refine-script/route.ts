
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text } = body;

        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const systemPrompt = `
        You are a professional script editor and viral video expert.
        Your task is to take the user's raw text and:
        1. Fix any grammar or spelling mistakes.
        2. Improve the flow and pacing for a short vertical video (30-60s).
        3. Break it down into logical segments (Hook, Body, Conclusion).
        
        Generate a JSON response with:
        - 'original_text': string (the input text)
        - 'refined_text': string (the full polished version)
        - 'virality_score': number (0-100)
        - 'script': array of objects, where each object has:
            - 'text': string (The spoken voiceover segment)
            - 'type': 'hook' | 'body' | 'cta'
            - 'visual_prompt': string (Brief suggestion for a background visual)
        
        Input Text:
        "${text}"
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const response = result.response;
        const jsonResponse = JSON.parse(response.text());

        return NextResponse.json(jsonResponse);

    } catch (error: any) {
        console.error("Refine script error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
