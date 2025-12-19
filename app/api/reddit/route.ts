
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const subreddit = searchParams.get("subreddit") || "AskReddit";
    const listing = searchParams.get("listing") || "top";
    const limit = searchParams.get("limit") || "10";
    const time = searchParams.get("time") || "day";

    if (!subreddit.match(/^[a-zA-Z0-9_]+$/)) {
        return NextResponse.json({ error: "Invalid subreddit name" }, { status: 400 });
    }

    const strategies = [
        // Strategy 1: Official API subdomain with correct API User-Agent
        {
            url: `https://api.reddit.com/r/${subreddit}/${listing}.json?limit=${limit}&t=${time}`,
            headers: { 'User-Agent': 'web:ShortsAlpha:1.0.0 (by /u/ShortsAlphaBot)' }
        },
        // Strategy 2: Main domain with generic Browser User-Agent (Mimic real user)
        {
            url: `https://www.reddit.com/r/${subreddit}/${listing}.json?limit=${limit}&t=${time}`,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        },
        // Strategy 3: Old Reddit (often less strict)
        {
            url: `https://old.reddit.com/r/${subreddit}/${listing}.json?limit=${limit}&t=${time}`,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
        }
    ];

    let lastError: any = null;

    for (const strategy of strategies) {
        console.log(`[Reddit API] Trying strategy: ${strategy.url}`);
        try {
            const response = await axios.get(strategy.url, { headers: strategy.headers, timeout: 5000 });

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

            console.log(`[Reddit API] Success with strategy ${strategy.url}`);
            return NextResponse.json({ posts });

        } catch (error: any) {
            console.warn(`[Reddit API] Strategy failed (${error.response?.status || 'network'}): ${strategy.url}`);
            lastError = error;
            // Continue to next strategy
        }
    }

    // Fallback: RSS Feed Parsing (Last resort for 403s)
    try {
        console.log(`[Reddit API] All JSON strategies failed. Trying RSS Fallback...`);
        const rssUrl = `https://www.reddit.com/r/${subreddit}/${listing}.rss?limit=${limit}&t=${time}`;
        const rssRes = await axios.get(rssUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShortsAlphaRSS/1.0)' }
        });

        // Simple Regex Parse for RSS (Avoids dependencies)
        const xml = rssRes.data;
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        const titleRegex = /<title>([\s\S]*?)<\/title>/;
        const linkRegex = /<link href="([^"]+)"/;
        const contentRegex = /<content type="html">([\s\S]*?)<\/content>/;

        const posts = [];
        let match;
        while ((match = entryRegex.exec(xml)) !== null) {
            const entryBlock = match[1];
            const title = entryBlock.match(titleRegex)?.[1] || "Untitled";
            const link = entryBlock.match(linkRegex)?.[1] || "";
            const contentHtml = entryBlock.match(contentRegex)?.[1] || "";

            // Basic HTML stripping for content
            const selftext = contentHtml.replace(/<[^>]+>/g, ' ').substring(0, 500).trim();

            posts.push({
                id: Math.random().toString(36).substr(2, 9),
                title: title.replace("&amp;", "&").replace("&quot;", '"'),
                selftext: selftext,
                author: "reddit_user",
                score: 0,
                url: link,
                num_comments: 0,
                thumbnail: "",
                permalink: link
            });
        }

        if (posts.length > 0) {
            return NextResponse.json({ posts, source: "rss_fallback" });
        }

    } catch (rssError) {
        console.error("RSS Fallback failed:", rssError);
    }

    // If all fail
    const status = lastError?.response?.status || 500;
    const msg = lastError?.response?.data?.message || lastError?.message || "Failed to fetch from Reddit";
    return NextResponse.json({ error: `Reddit Error (${status}): ${msg}` }, { status: status });
}
