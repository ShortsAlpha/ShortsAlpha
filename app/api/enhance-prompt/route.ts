
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
        // Using the requested Gemini 2.5 Pro model
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

        const systemPrompt = `
        You are an expert AI Video Prompt Engineer and Cinematographer.
        Your goal is to take a simple user idea and transform it into a "Perfect Prompt" for Stable Video Diffusion (SVD/SDXL).
        
        The user wants the output to be "flawless, detailed, and cinematic".
        
        Guidelines:
        - Focus on visual details: Lighting (volumetric, cinematic, golden hour), Texture (8k, hyperrealistic), Camera Movement (slow pan, dolly zoom,), and Atmosphere.
        - Style: Photorealistic, 8k, Unreal Engine 5, Octane Render.
        - Keep the prompt under 77 tokens if possible, or dense and comma-separated.
        - Output ONLY the raw prompt text, no "Here is the prompt:" preambles.
        
        Input: "${prompt}"
        
        Output:
        `;

        const result = await model.generateContent(systemPrompt);
        const enhancedPrompt = result.response.text().trim();

        return NextResponse.json({ enhancedPrompt });

    } catch (error: any) {
        console.error("Enhance prompt error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
