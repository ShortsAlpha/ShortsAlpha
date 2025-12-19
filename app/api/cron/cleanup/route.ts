import { NextRequest, NextResponse } from "next/server";
import { ListObjectsV2Command, DeleteObjectsCommand, ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3Client";

// Force Node.js runtime for AWS SDK
export const runtime = 'nodejs';
// Prevent Vercel from caching the cron/cleanup response
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // 1. Authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Allow Dev mode bypass if no secret set (optional, but good for local testing)
        if (process.env.NODE_ENV === 'production' || process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const retentionHours = 24;
        const thresholdDate = new Date(Date.now() - retentionHours * 60 * 60 * 1000);
        console.log(`[Cron] Cleanup started. Deleting files older than ${thresholdDate.toISOString()}`);

        let continuationToken: string | undefined = undefined;
        let deletedCount = 0;
        let scannedCount = 0;


        do {
            // 2. List Files (Scan entire bucket or specific prefixes if needed)
            // Ideally we scan 'uploads/' and 'outputs/'. 
            // For now, scanning root is simpler but we MUST filtering rigorously.
            const listCommand = new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                ContinuationToken: continuationToken
            });

            const data: ListObjectsV2CommandOutput = await s3Client.send(listCommand);
            continuationToken = data.NextContinuationToken;

            if (!data.Contents || data.Contents.length === 0) continue;

            scannedCount += data.Contents.length;

            // 3. Filter Files to Delete
            // 3. Filter Files to Delete
            // Explicitly filter for defined Keys and match logic
            const objectsToDelete: { Key: string }[] = data.Contents
                .filter(obj => {
                    const key = obj.Key;
                    if (!key) return false;

                    // SAFETY 1: NEVER delete stock assets
                    if (key.startsWith("stock/") || key.includes("/stock/")) return false;

                    // SAFETY 2: Ignore folders themselves
                    if (key.endsWith("/")) return false;

                    // SAFETY 3: Check Age
                    if (obj.LastModified && obj.LastModified < thresholdDate) {
                        return true;
                    }
                    return false;
                })
                .map(obj => ({ Key: obj.Key as string }));

            // 4. Delete in Batch
            if (objectsToDelete.length > 0) {
                const deleteCommand = new DeleteObjectsCommand({
                    Bucket: BUCKET_NAME,
                    Delete: {
                        Objects: objectsToDelete,
                        Quiet: true
                    }
                });

                await s3Client.send(deleteCommand);
                deletedCount += objectsToDelete.length;
                console.log(`[Cron] Deleted batch of ${objectsToDelete.length} files.`);
            }

        } while (continuationToken);

        return NextResponse.json({
            success: true,
            message: `Cleanup complete. Scanned ${scannedCount} files, deleted ${deletedCount} files older than ${retentionHours}h.`,
            deletedCount
        });

    } catch (error: any) {
        console.error("[Cron] Cleanup Failed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
