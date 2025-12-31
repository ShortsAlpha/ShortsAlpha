import { NextRequest, NextResponse } from "next/server";
import { ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3Client";
import { auth } from "@clerk/nextjs/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

        // List objects in 'processed/' prefix
        const listCommand = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: "processed/",
        });

        const listResponse = await s3Client.send(listCommand);

        if (!listResponse.Contents) {
            return NextResponse.json([]);
        }

        // Filter: Last 48h AND ends with _result.json
        const recentResults = listResponse.Contents.filter(obj => {
            const isRecent = obj.LastModified && obj.LastModified > twoDaysAgo;
            const isResultFile = obj.Key?.endsWith("_result.json");
            return isRecent && isResultFile;
        });

        // Sort by date (newest first)
        recentResults.sort((a, b) => {
            return (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0);
        });

        // Fetch details for each result
        const historyItems = await Promise.all(recentResults.map(async (obj) => {
            try {
                if (!obj.Key) return null;

                const getCommand = new GetObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: obj.Key,
                });

                const response = await s3Client.send(getCommand);
                const str = await response.Body?.transformToString();

                if (str) {
                    const data = JSON.parse(str);
                    return {
                        key: obj.Key,
                        lastModified: obj.LastModified,
                        ...data // output_url, script, summary, etc.
                    };
                }
                return null;
            } catch (e) {
                console.error(`Failed to fetch details for ${obj.Key}:`, e);
                return null;
            }
        }));

        // Filter out failed fetches AND ensure belongs to user
        const validItems = historyItems
            .filter(item => item !== null)
            .filter((item: any) => item.userId === userId);

        return NextResponse.json(validItems);

    } catch (error) {
        console.error("Error fetching history:", error);
        return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }
}
