import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3Client";

export async function POST(request: NextRequest) {
    try {
        const { keys } = await request.json();

        if (!keys || !Array.isArray(keys) || keys.length === 0) {
            return NextResponse.json({ message: "No keys provided" }, { status: 400 });
        }

        console.log(`Cleanup: Deleting ${keys.length} files...`);

        const command = new DeleteObjectsCommand({
            Bucket: BUCKET_NAME,
            Delete: {
                Objects: keys.map((key) => ({ Key: key })),
                Quiet: false,
            },
        });

        const response = await s3Client.send(command);

        console.log("Cleanup Success:", response.Deleted?.length || 0, "deleted.");

        return NextResponse.json({
            success: true,
            deletedCount: response.Deleted?.length || 0,
            deleted: response.Deleted
        });
    } catch (err: any) {
        console.error("Cleanup Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
