import { useState } from "react";
import { Bot, Type, MessageSquare, ArrowLeft } from "lucide-react";
import { AIStorySource } from "./sources/AIStorySource";
// import { RedditSource } from "./sources/RedditSource";
// import { CustomTextSource } from "./sources/CustomTextSource";

interface CreateSourceViewProps {
    onBack: () => void;
    onScriptGenerated: (script: any) => void;
}

type SourceType = 'ai' | 'reddit' | 'text' | null;

export function CreateSourceView({ onBack, onScriptGenerated }: CreateSourceViewProps) {
    const [selectedSource, setSelectedSource] = useState<SourceType>(null);

    // If a specific source is active, show that component
    if (selectedSource === 'ai') {
        return <AIStorySource onBack={() => setSelectedSource(null)} onGenerate={onScriptGenerated} />;
    }
    // if (selectedSource === 'reddit') return <RedditSource ... />;
    // if (selectedSource === 'text') return <CustomTextSource ... />;

    return (
        <div className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Select Content Source</h1>
                    <p className="text-zinc-400">Where should we get the story from?</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* AI Story Generator */}
                <button
                    onClick={() => setSelectedSource('ai')}
                    className="group flex flex-col items-center justify-center gap-4 p-8 h-64 bg-zinc-900/40 border border-white/5 hover:border-indigo-500/50 hover:bg-zinc-900 rounded-2xl transition-all"
                >
                    <div className="p-4 bg-indigo-500/10 rounded-full group-hover:bg-indigo-500/20 text-indigo-400 transition-colors">
                        <Bot className="w-8 h-8" />
                    </div>
                    <div className="text-center space-y-1">
                        <h3 className="text-lg font-semibold text-white">AI Generator</h3>
                        <p className="text-sm text-zinc-500">Generate unique stories from a prompt</p>
                    </div>
                </button>

                {/* Reddit Scraper (Coming Soon) */}
                <button
                    // onClick={() => setSelectedSource('reddit')}
                    className="group flex flex-col items-center justify-center gap-4 p-8 h-64 bg-zinc-900/40 border border-white/5 hover:border-orange-500/50 hover:bg-zinc-900 rounded-2xl transition-all opacity-50 cursor-not-allowed"
                >
                    <div className="p-4 bg-orange-500/10 rounded-full group-hover:bg-orange-500/20 text-orange-400 transition-colors">
                        <MessageSquare className="w-8 h-8" />
                    </div>
                    <div className="text-center space-y-1">
                        <h3 className="text-lg font-semibold text-white">Reddit (Soon)</h3>
                        <p className="text-sm text-zinc-500">Fetch viral posts from subreddits</p>
                    </div>
                </button>

                {/* Custom Text (Coming Soon) */}
                <button
                    // onClick={() => setSelectedSource('text')}
                    className="group flex flex-col items-center justify-center gap-4 p-8 h-64 bg-zinc-900/40 border border-white/5 hover:border-zinc-500/50 hover:bg-zinc-900 rounded-2xl transition-all opacity-50 cursor-not-allowed"
                >
                    <div className="p-4 bg-zinc-500/10 rounded-full group-hover:bg-zinc-500/20 text-zinc-400 transition-colors">
                        <Type className="w-8 h-8" />
                    </div>
                    <div className="text-center space-y-1">
                        <h3 className="text-lg font-semibold text-white">Custom Text (Soon)</h3>
                        <p className="text-sm text-zinc-500">Paste your own script or story</p>
                    </div>
                </button>
            </div>
        </div>
    );
}
