
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const subreddit = searchParams.get("subreddit") || "AskReddit";
        const listing = searchParams.get("listing") || "top"; // top, hot, new
        const limit = searchParams.get("limit") || "10";
        const time = searchParams.get("time") || "day"; // hour, day, week, month, year, all

        if (!subreddit.match(/^[a-zA-Z0-9_]+$/)) {
            return NextResponse.json({ error: "Invalid subreddit name" }, { status: 400 });
        }

        const targetUrl = `https://www.reddit.com/r/${subreddit}/${listing}.json?limit=${limit}&t=${time}`;
        console.log(`[Reddit API] Fetching: ${targetUrl}`);

        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'web:ShortsAlpha:1.0.0 (by /u/ShortsAlphaBot)'
            }
        });

        const posts = response.data?.data?.children?.map((child: any) => {
            const data = child.data;
            return {
                id: data.id,
                title: data.title,
                selftext: data.selftext,
                author: data.author,
                score: data.score,
                url: data.url,
                num_comments: data.num_comments,
                thumbnail: data.thumbnail,
                permalink: `https://reddit.com${data.permalink}`
            };
        }) || [];

        return NextResponse.json({ posts });

    } catch (error: any) {
        console.error("Reddit API Error:", error.message);
        const status = error.response?.status || 500;
        const msg = error.response?.data?.message || error.message || "Failed to fetch from Reddit";
        return NextResponse.json({ error: `Reddit Error (${status}): ${msg}` }, { status: status });
    }
}
