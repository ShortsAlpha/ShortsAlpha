
import { useState } from "react";
import { ArrowLeft, Wand2, Loader2, Play } from "lucide-react";
import axios from "axios";

interface CustomTextSourceProps {
    onBack: () => void;
    onGenerate: (script: any) => void;
}

export function CustomTextSource({ onBack, onGenerate }: CustomTextSourceProps) {
    const [text, setText] = useState("");
    const [isRefining, setIsRefining] = useState(false);
    const [refinedData, setRefinedData] = useState<any>(null);

    const handleRefine = async () => {
        if (!text.trim()) return;

        setIsRefining(true);
        try {
            const res = await axios.post("/api/refine-script", { text });
            setRefinedData(res.data);
        } catch (error) {
            console.error("Refine failed", error);
            alert("Failed to refine text. Please try again.");
        } finally {
            setIsRefining(false);
        }
    };

    const handleConfirm = () => {
        if (refinedData) {
            onGenerate(refinedData);
        }
    };

    const handleUseOriginal = () => {
        if (refinedData) {
            // Manually construct a script object for the original text
            const originalScript = {
                script: [
                    {
                        text: refinedData.original_text,
                        type: 'body',
                        visual_prompt: 'Background matching the story context'
                    }
                ],
                virality_score: 50, // Default/Unknown
                keywords: []
            };
            onGenerate(originalScript);
        }
    };

    if (refinedData) {
        return (
            <div className="max-w-3xl mx-auto w-full space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setRefinedData(null)}
                        className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-2xl font-bold text-white">Review Polished Script</h2>
                </div>

                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Original</span>
                            <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800 text-zinc-400 text-sm h-[400px] overflow-y-auto whitespace-pre-wrap">
                                {refinedData.original_text}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                                    <Wand2 className="w-3 h-3" />
                                    Polished Version
                                </span>
                                <span className="text-xs text-green-400 bg-green-900/20 px-2 py-0.5 rounded-full border border-green-900/50">
                                    Grammar Fixed
                                </span>
                            </div>
                            <div className="p-4 rounded-xl bg-indigo-950/10 border border-indigo-500/20 text-indigo-100 text-sm h-[400px] overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-[0_0_15px_-5px_rgba(99,102,241,0.2)]">
                                {refinedData.refined_text}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 gap-4">
                        <button
                            onClick={handleUseOriginal}
                            className="px-6 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800 font-medium rounded-xl transition-all border border-transparent hover:border-zinc-700"
                        >
                            Use Original
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="w-full md:w-auto px-8 py-3 bg-white text-black hover:bg-zinc-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <Play className="w-4 h-4 fill-black" />
                            Use Polished
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
                <h2 className="text-2xl font-bold text-white">Custom Script</h2>
            </div>

            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Your Story</label>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Paste your script or story here..."
                        className="w-full h-64 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all font-mono text-sm leading-relaxed"
                    />
                </div>

                <button
                    onClick={handleRefine}
                    disabled={isRefining || !text.trim()}
                    className="w-full py-4 bg-gradient-to-r from-zinc-100 to-zinc-300 hover:from-white hover:to-zinc-200 text-black font-bold rounded-xl transition-all shadow-lg shadow-white/5 hover:shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isRefining ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Polishing Text...
                        </>
                    ) : (
                        <>
                            <Wand2 className="w-5 h-5" />
                            Refine & Create
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
