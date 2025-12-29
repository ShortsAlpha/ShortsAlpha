import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3Client";

interface Subscription {
    userId: string;
    email: string | undefined;
    plan: string;
    renewsAt: number;
    status: unknown;
}

export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Security Check (Fetch fresh user data to handle stale sessions)
        const client = await clerkClient();
        const currentUser = await client.users.getUser(userId);

        if (currentUser.publicMetadata?.plan !== 'admin') {
            return NextResponse.json({ error: "Unauthorized: Admin Plan Required" }, { status: 403 });
        }

        // 2. Fetch Users from Clerk (Limit 100)
        const response = await client.users.getUserList({
            limit: 100,
            orderBy: '-last_active_at'
        });

        const users = response.data;
        const totalUsers = response.totalCount;

        // 3. Aggregate Stats
        let activeUsers = 0;
        let proUsers = 0;
        let agencyUsers = 0;
        let totalRevenue = 0; // Estimated monthly based on plans

        const subscriptions: Subscription[] = [];

        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const now = Date.now();

        users.forEach((user: any) => {
            const lastActive = user.lastActiveAt;
            if (lastActive && (now - lastActive < ONE_DAY_MS * 7)) {
                activeUsers++;
            }

            const meta = user.publicMetadata;
            const plan = (meta.plan as string) || 'free';

            if (plan === 'pro') proUsers++;
            if (plan === 'agency') agencyUsers++;

            // Collect subscription info for calendar/list
            if (meta.lemonRenewsAt) {
                subscriptions.push({
                    userId: user.id,
                    email: user.emailAddresses[0]?.emailAddress,
                    plan: plan,
                    renewsAt: meta.lemonRenewsAt,
                    status: meta.lemonStatus
                });
            }
        });

        // 4. Activity Logs (Mock/Derived)
        const recentActivity = users.map((user: any) => ({
            userId: user.id,
            email: user.emailAddresses[0]?.emailAddress,
            action: "Last Active",
            timestamp: user.lastActiveAt,
            plan: user.publicMetadata.plan || 'free'
        }));

        // 5. Fetch Recent Renders (from R2)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const listCommand = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: "processed/",
        });
        const listResponse = await s3Client.send(listCommand);

        const recentRenders = [];
        if (listResponse.Contents) {
            const results = listResponse.Contents.filter(obj =>
                obj.LastModified && obj.LastModified > oneDayAgo && obj.Key?.endsWith("_result.json")
            );

            // Fetch up to 10 recent renders for the log
            const topResults = results.sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)).slice(0, 10);

            for (const obj of topResults) {
                try {
                    const getCmd = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: obj.Key });
                    const res = await s3Client.send(getCmd);
                    const str = await res.Body?.transformToString();
                    if (str) {
                        const data = JSON.parse(str);
                        // Try to match render to a user (if data has userId, otherwise use unknown)
                        // Note: Our render manifest might not strictly have userId unless we added it previously.
                        // Let's check `main.py` output. Assuming it might not, we'll label as "System/User".
                        recentRenders.push({
                            action: "Rendered Video",
                            timestamp: obj.LastModified,
                            details: data.topic || "Untitled Video",
                            userId: data.user_id || "Unknown", // Assuming we track this now or in future
                            status: "completed"
                        });
                    }
                } catch (e) { }
            }
        }

        // 5. Combine Logs
        const combinedLogs = [
            ...recentActivity,
            ...recentRenders
        ].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);

        return NextResponse.json({
            overview: {
                totalUsers,
                activeUsers,
                proUsers,
                agencyUsers,
            },
            subscriptions: subscriptions.sort((a: any, b: any) => new Date(a.renewsAt).getTime() - new Date(b.renewsAt).getTime()),
            recentActivity: combinedLogs
        });

        return NextResponse.json({
            overview: {
                totalUsers,
                activeUsers, // Last 7 days
                proUsers,
                agencyUsers,
            },
            subscriptions: subscriptions.sort((a: any, b: any) => new Date(a.renewsAt).getTime() - new Date(b.renewsAt).getTime()),
            recentActivity: recentActivity
        });

    } catch (error: any) {
        console.error("Admin Stats Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
