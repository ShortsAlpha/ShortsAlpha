
require('dotenv').config({ path: '../.env.local' });
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require('fs');

// Config
const VOICES = ["Puck", "Charon", "Kore", "Fenrir", "Aoede"];
const PREVIEW_TEXT = "Hey there! This is a preview of my voice. I can tell your story with improved pacing and emotion.";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const s3Client = new S3Client({
    region: "us-east-1",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function main() {
    console.log("Starting Preview Generation...");

    for (const voice of VOICES) {
        console.log(`Generating preview for ${voice}...`);
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-tts:generateContent?key=${process.env.GEMINI_API_KEY}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: PREVIEW_TEXT }] }],
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
                        }
                    }
                })
            });

            if (!response.ok) throw new Error(await response.text());

            const data = await response.json();
            const audioBase64 = data.candidates[0].content.parts[0].inlineData.data;
            const buffer = Buffer.from(audioBase64, 'base64');

            // Upload to R2
            const key = `static/previews/${voice.toLowerCase()}_preview.mp3`;
            await s3Client.send(new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: key,
                Body: buffer,
                ContentType: 'audio/mpeg'
            }));

            const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
            console.log(`✅ ${voice}: ${publicUrl}`);

        } catch (error) {
            console.error(`❌ Failed ${voice}:`, error);
        }
    }
}

main();
