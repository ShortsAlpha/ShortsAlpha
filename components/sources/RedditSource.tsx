
import React, { useState } from "react";
import { ArrowLeft, Search, MessageSquare, ThumbsUp, Calendar, AlertCircle, Loader2 } from "lucide-react";
import axios from "axios";

interface RedditPost {
    id: string;
    title: string;
    selftext: string;
    author: string;
    score: number;
    num_comments: number;
    url: string;
}

interface RedditSourceProps {
    onBack: () => void;
    onGenerate: (script: any) => void;
}

export function RedditSource({ onBack, onGenerate }: RedditSourceProps) {
    const [subreddit, setSubreddit] = useState("AskReddit");
    const [posts, setPosts] = useState<RedditPost[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState("top"); // top, hot
    const [timeFrame, setTimeFrame] = useState("day"); // day, week, month, all

    const STORY_SUBREDDITS = [
        "AskReddit",
        "NoSleep",
        "TIFU",
        "Confessions",
        "WritingPrompts",
        "EntitledParents",
        "MaliciousCompliance",
        "AmItheAsshole"
    ];

    const fetchPosts = async (overrideSub?: string) => {
        const targetSub = overrideSub || subreddit;
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(`/api/reddit?subreddit=${targetSub}&listing=${filter}&time=${timeFrame}&limit=15`);
            const validPosts = response.data.posts.filter((p: RedditPost) => p.title.length > 10);
            setPosts(validPosts);
        } catch (err) {
            setError("Failed to fetch posts. Check subreddit name.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickSelect = (sub: string) => {
        setSubreddit(sub);
        fetchPosts(sub);
    };

    const handleSelectPost = (post: RedditPost) => {
        // Construct the script object

        // Mocking a single segment script for now
        const mockScript = [
            { text: post.title, type: 'hook' },
            { text: post.selftext, type: 'body' }
        ].filter(s => s.text); // Remove empty

        onGenerate({
            script: mockScript,
            virality_score: 85, // Mock
            keywords: ['reddit', subreddit]
        });
    };

    return (
        <div className="max-w-4xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white">Browse Reddit</h1>
                    <p className="text-zinc-400 text-sm">Find viral stories from your favorite communities</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4 bg-zinc-900/50 p-4 rounded-xl border border-white/5">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            value={subreddit}
                            onChange={(e) => setSubreddit(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchPosts()}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-9 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            placeholder="Enter subreddit (e.g. NoSleep)"
                        />
                    </div>

                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none"
                    >
                        <option value="top">Top</option>
                        <option value="hot">Hot</option>
                        <option value="new">New</option>
                    </select>

                    <select
                        value={timeFrame}
                        onChange={(e) => setTimeFrame(e.target.value)}
                        disabled={filter !== 'top'}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none disabled:opacity-50"
                    >
                        <option value="day">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="all">All Time</option>
                    </select>

                    <button
                        onClick={() => fetchPosts()}
                        disabled={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch"}
                    </button>
                </div>

                {/* Recommendations */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                    <span className="text-xs text-zinc-500 py-1 mr-2">Suggested:</span>
                    {STORY_SUBREDDITS.map(sub => (
                        <button
                            key={sub}
                            onClick={() => handleQuickSelect(sub)}
                            className={`px-3 py-1 rounded-full text-xs border transition-all ${subreddit === sub
                                ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"}`}
                        >
                            r/{sub}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Results Grid */}
            <div className="grid grid-cols-1 gap-4">
                {posts.map((post) => (
                    <div
                        key={post.id}
                        className="group bg-zinc-900/30 border border-white/5 p-5 rounded-xl hover:bg-zinc-900/60 hover:border-indigo-500/30 transition-all cursor-pointer"
                        onClick={() => handleSelectPost(post)}
                    >
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors line-clamp-2">
                            {post.title}
                        </h3>
                        <p className="text-zinc-400 text-sm line-clamp-3 mb-4 font-light leading-relaxed">
                            {post.selftext || "(No text content - Title Only)"}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span className="flex items-center gap-1 text-orange-400/80">
                                <ThumbsUp className="w-3 h-3" /> {post.score}
                            </span>
                            <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" /> {post.num_comments}
                            </span>
                            <span className="ml-auto">
                                by u/{post.author}
                            </span>
                        </div>
                    </div>
                ))}

                {!isLoading && posts.length === 0 && !error && (
                    <div className="text-center py-12 text-zinc-500">
                        Search for a subreddit to see posts
                    </div>
                )}
            </div>
        </div>
    );
}
