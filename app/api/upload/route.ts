import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, BUCKET_NAME } from "@/lib/s3Client";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
    try {
        const { filename, contentType, prefix, customName } = await request.json();

        if (!filename || !contentType) {
            return NextResponse.json(
                { error: "Filename and content type are required" },
                { status: 400 }
            );
        }

        // Create a unique key for the file
        const uniqueId = uuidv4().split('-')[0]; // Shorter UUID
        const extension = filename.split(".").pop();
        const folder = prefix ? prefix.replace(/\/$/, "") : "uploads"; // Default or custom

        let finalFilename = uniqueId;
        if (customName) {
            // Sanitize Custom Name: Alpha-numeric + Underscores
            const safeName = customName.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "_");
            finalFilename = `${safeName}__${uniqueId}`;
        }

        const key = `${folder}/${finalFilename}.${extension}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        // Generate Signed GET URL for immediate playback (Fallback if no Public URL)
        // This ensures playback works even if bucket is private
        const getCommand = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
        const signedGetUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 }); // 7 Days

        // FORCE SIGNED URL: Bypasses "Private Bucket" access issues which cause 403 (Err 4) on iOS
        // even if R2_PUBLIC_URL is configured (but bucket is not actually public).
        const finalPublicUrl = signedGetUrl;

        return NextResponse.json({
            uploadUrl: signedUrl,
            key: key,
            publicUrl: finalPublicUrl
        });
    } catch (err: any) {
        console.error("Presign Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
