import { useState } from "react";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import axios from "axios";

interface AIStorySourceProps {
    onBack: () => void;
    onGenerate: (script: any) => void;
}

export function AIStorySource({ onBack, onGenerate }: AIStorySourceProps) {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsGenerating(true);
        try {
            const res = await axios.post("/api/generate-script", { prompt });
            onGenerate(res.data); // Should return the same standardized script format
        } catch (error) {
            console.error("Generation failed", error);
            alert("Failed to generate story. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

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

                <div className="flex gap-2">
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
