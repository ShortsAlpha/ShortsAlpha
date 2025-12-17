import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, BUCKET_NAME } from "@/lib/s3Client";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
    try {
        const { filename, contentType } = await request.json();

        if (!filename || !contentType) {
            return NextResponse.json(
                { error: "Filename and content type are required" },
                { status: 400 }
            );
        }

        // Create a unique key for the file
        const uniqueId = uuidv4();
        const extension = filename.split(".").pop();
        const key = `uploads/${uniqueId}.${extension}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        return NextResponse.json({
            uploadUrl: signedUrl,
            key: key,
            publicUrl: `${process.env.R2_PUBLIC_URL}/${key}`
        });
    } catch (err: any) {
        console.error("Presign Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
