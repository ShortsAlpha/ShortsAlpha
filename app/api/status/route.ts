import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3Client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Add specific runtime config to prevent static generation issues
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get("key");

    if (!key) {
        return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    // Expected JSON Key Logic:
    // Input Key: uploads/uuid-video.mp4
    // Backend Logic: key.replace("uploads/", "processed/") + base_name + "_result.json" (Wait, backend logic was slightly different)
    // Backend Code: 
    // base_name = os.path.splitext(output_key)[0] => "processed/uuid-video"
    // json_key = f"{base_name}_result.json" => "processed/uuid-video_result.json"

    // Let's replicate this:
    const outputKey = key.replace("uploads/", "processed/");
    const baseName = outputKey.substring(0, outputKey.lastIndexOf('.'));
    const jsonKey = `${baseName}_result.json`;

    // 1. Check for Result (PRIORITY)

    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: jsonKey,
        });

        const response = await s3Client.send(command);
        const str = await response.Body?.transformToString();

        if (str) {
            const jsonData = JSON.parse(str);
            return NextResponse.json(jsonData);
        }
    } catch (error: any) {
        if (error.name !== 'NoSuchKey' && error.$metadata?.httpStatusCode !== 404) {
            console.error("Error checking result status:", error);
        }
        // Result not found, continue to check Error
    }

    // 2. Check for Error
    const errorKey = `processed/${key.split('/').pop()?.split('.')[0]}_error.json`;
    try {
        const errorCommand = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: errorKey,
        });
        const errorResponse = await s3Client.send(errorCommand);
        const errorBody = await errorResponse.Body?.transformToString();
        return NextResponse.json({ status: "failed", error: errorBody ? JSON.parse(errorBody) : "Unknown error" });
    } catch (e: any) {
        if (e.name !== 'NoSuchKey' && e.$metadata?.httpStatusCode !== 404) {
            // console.error("Error checking for error file:", e);
        }
        // No error file, continue
    }

    // 3. Check for Processing Marker
    const processingKey = `processed/${key.split('/').pop()?.split('.')[0]}_started.json`;
    try {
        await s3Client.send(new HeadObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: processingKey,
        }));
        return NextResponse.json({ status: "processing" });
    } catch (e: any) {
        // No processing marker either
    }

    // Default fallthrough
    console.log(`[Status API] ${baseName} -> Still Processing`);
    return NextResponse.json({ status: "processing" }, { status: 202 });
}
