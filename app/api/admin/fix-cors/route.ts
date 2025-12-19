import { NextRequest, NextResponse } from "next/server";
import { PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3Client";

export async function GET(request: NextRequest) {
    try {
        const command = new PutBucketCorsCommand({
            Bucket: BUCKET_NAME,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["GET", "PUT", "POST", "HEAD", "DELETE"],
                        AllowedOrigins: ["*"], // Allow all for now to fix production
                        ExposeHeaders: ["ETag"],
                        MaxAgeSeconds: 3000
                    }
                ]
            }
        });

        await s3Client.send(command);

        return NextResponse.json({ success: true, message: "CORS configuration updated successfully" });
    } catch (err: any) {
        console.error("CORS Update Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
