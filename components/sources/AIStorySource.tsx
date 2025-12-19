
import { useState } from "react";
import { ArrowLeft, Sparkles, Loader2, RefreshCw, Clapperboard } from "lucide-react";
import axios from "axios";

interface AIStorySourceProps {
    onBack: () => void;
    onGenerate: (script: any) => void;
}

export function AIStorySource({ onBack, onGenerate }: AIStorySourceProps) {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedScript, setGeneratedScript] = useState<any>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsGenerating(true);
        // Do NOT clear generatedScript here, so we stay on the review screen
        try {
            const res = await axios.post("/api/generate-script", { prompt });
            setGeneratedScript(res.data);
        } catch (error) {
            console.error("Generation failed", error);
            alert("Failed to generate story. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleConfirm = () => {
        if (generatedScript) {
            onGenerate(generatedScript);
        }
    };

    // Calculate the full story text for preview
    const storyText = generatedScript?.script?.map((s: any) => s.text).join("\n\n") || "";

    if (generatedScript) {
        return (
            <div className="max-w-3xl mx-auto w-full space-y-6 animate-in fade-in duration-500 relative">
                {/* Loading Overlay for Regeneration */}
                {isGenerating && (
                    <div className="absolute inset-0 z-50 bg-zinc-950/60 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center animate-in fade-in duration-300">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                        <p className="text-xl font-medium text-white">Regenerating the story...</p>
                        <p className="text-zinc-400 text-sm mt-2">Crafting a new version for you</p>
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setGeneratedScript(null)}
                        className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-2xl font-bold text-white">Review Story</h2>
                </div>

                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 space-y-6">
                    <div className="prose prose-invert max-w-none">
                        <h3 className="text-zinc-400 text-sm uppercase tracking-wider mb-4">Generated Story</h3>
                        <div className="bg-zinc-950 rounded-xl p-6 border border-zinc-800 text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                            {storyText}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={handleGenerate}
                            className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all border border-zinc-700 flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Regenerate
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 flex items-center justify-center gap-2"
                        >
                            <Clapperboard className="w-5 h-5" />
                            Create Video
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold text-white">AI Story Generator</h2>
            </div>

            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Prompt</label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Tell me a scary story about a night shift guard..."
                        className="w-full h-40 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all"
                    />
                </div>

                <div className="flex gap-2 flex-wrap">
                    {["Scary Story", "Funny Fail", "Motivational", "History Fact"].map((tag) => (
                        <button
                            key={tag}
                            onClick={() => setPrompt(tag + " about ")}
                            className="px-3 py-1.5 rounded-full bg-zinc-800 text-xs text-zinc-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors"
                        >
                            {tag}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Writing Story...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5" />
                            Generate Script
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
