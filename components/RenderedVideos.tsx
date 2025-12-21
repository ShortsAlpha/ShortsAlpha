"use client";
import { useEffect, useState } from "react";
import { Download, Clock, FileVideo, AlertCircle } from "lucide-react";

interface RenderedVideo {
    key: string;
    lastModified: string;
    output_url?: string;
    script?: any[];
    summary?: string;
    virality_score?: number;
}

export function RenderedVideos() {
    const [videos, setVideos] = useState<RenderedVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch("/api/history");
            if (!res.ok) throw new Error("Failed to load history");
            const data = await res.json();
            setVideos(data);
        } catch (err) {
            setError("Failed to load rendered videos.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-zinc-500 gap-2">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                Loading history...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-red-400 gap-2">
                <AlertCircle className="w-8 h-8" />
                <p>{error}</p>
                <button
                    onClick={fetchHistory}
                    className="mt-4 px-4 py-2 bg-zinc-800 rounded-lg text-white hover:bg-zinc-700 transition"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Rendered Videos</h2>
                    <p className="text-zinc-500">Your renders from the last 24 hours.</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full text-sm text-zinc-400">
                    {videos.length} Videos Found
                </div>
            </header>

            {videos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20 text-zinc-500">
                    <FileVideo className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No videos found</p>
                    <p className="text-sm">Render a video in the Studio to see it here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.map((vid) => (
                        <div
                            key={vid.key}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:border-zinc-700 transition-all group"
                        >
                            {/* Video Player */}
                            <div className="aspect-[9/16] bg-black relative group-hover:ring-1 group-hover:ring-indigo-500/50 transition-all">
                                {vid.output_url ? (
                                    <video
                                        src={vid.output_url}
                                        controls
                                        className="w-full h-full object-contain"
                                        poster="/placeholder-poster.png" // Optional
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-950">
                                        Processing / URL Missing
                                    </div>
                                )}
                            </div>

                            {/* Metadata */}
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold text-white truncate max-w-[200px]" title={vid.summary || "Untitled Video"}>
                                            {vid.summary ? (vid.summary.length > 30 ? vid.summary.substring(0, 30) + "..." : vid.summary) : "Untitled Video"}
                                        </h3>
                                        <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                                            <Clock className="w-3 h-3" />
                                            <span>
                                                {vid.lastModified ? new Date(vid.lastModified).toLocaleString() : "Unknown Date"}
                                            </span>
                                        </div>
                                    </div>
                                    {vid.virality_score && (
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold border ${vid.virality_score >= 80 ? "bg-green-500/10 text-green-400 border-green-500/50" :
                                                vid.virality_score >= 50 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/50" :
                                                    "bg-red-500/10 text-red-400 border-red-500/50"
                                            }`}>
                                            {vid.virality_score} Score
                                        </span>
                                    )}
                                </div>

                                {/* Script Snippet (Optional) */}
                                {vid.script && vid.script.length > 0 && (
                                    <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800 mb-4 h-20 overflow-y-auto text-xs text-zinc-400">
                                        <p className="italic">
                                            "{vid.script[0].text}..."
                                        </p>
                                    </div>
                                )}

                                {/* Actions */}
                                {vid.output_url && (
                                    <a
                                        href={vid.output_url}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors text-sm"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download Video
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
