"use client";
import { useState } from "react";
import { Upload, Film, Loader2 } from "lucide-react";
import axios from "axios";

interface AnalysisViewProps {
    analysisResult: any;
    setAnalysisResult: (result: any) => void;
    onAnalysisComplete?: () => void;
}

export function AnalysisView({ analysisResult, setAnalysisResult, onAnalysisComplete }: AnalysisViewProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState("Waiting for input...");
    const [uploadProgress, setUploadProgress] = useState(0);

    const parseGeminiJson = (text: string) => {
        try {
            const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
            return JSON.parse(cleaned);
        } catch (e) {
            console.error("Failed to parse Gemini JSON:", e);
            return null;
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;

        const file = e.target.files[0];
        setIsUploading(true);
        setAnalysisResult(null);
        setStatus("Getting upload URL...");
        setUploadProgress(0);

        try {
            // 1. Get Presigned URL
            const { data } = await axios.post("/api/upload", {
                filename: file.name,
                contentType: file.type,
            });

            const { url, key } = data;
            setStatus("Uploading to Cloud Storage...");

            // 2. Upload to R2
            await axios.put(url, file, {
                headers: { "Content-Type": file.type },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
                    }
                },
            });

            setStatus("Upload Complete! Starting AI Processing...");

            // 3. Trigger Backend Processing
            const processResponse = await axios.post("/api/process", { key });
            const callId = processResponse.data.call_id;
            let processTime = 0;
            const timerInterval = setInterval(() => {
                processTime++;
                setStatus(`AI Processing... (${processTime}s)`);
            }, 1000);

            // 4. Poll for Results
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await axios.get(`/api/status?key=${key}`);

                    if (statusRes.data.status === "failed") {
                        clearInterval(pollInterval);
                        clearInterval(timerInterval);
                        setStatus(`Analysis Failed: ${statusRes.data.error?.error || "Unknown Error"}`);
                        setIsUploading(false);
                    }
                    else if (statusRes.status === 200 && statusRes.data.status === "completed") {
                        clearInterval(pollInterval);
                        clearInterval(timerInterval);
                        setStatus(`Analysis Completed in ${processTime}s! 🎉`);
                        setUploadProgress(100);
                        setIsUploading(false);

                        // Parse Analysis
                        let parsedAnalysis = statusRes.data.analysis;
                        // Check if it's already an object (from backend main.py fix) or string
                        if (typeof parsedAnalysis === 'string') {
                            parsedAnalysis = parseGeminiJson(parsedAnalysis);
                        }

                        if (parsedAnalysis) {
                            setAnalysisResult(parsedAnalysis);
                            if (onAnalysisComplete) onAnalysisComplete();
                        } else {
                            alert("Failed to parse AI Analysis");
                        }
                    }
                } catch (err) {
                    // console.log("Polling check...");
                }
            }, 3000); // Check every 3 seconds for faster feedback

        } catch (error: any) {
            console.error("Upload failed:", error);
            const errorMessage = error.response?.data?.error || error.message || "Unknown error";
            setStatus(`Upload failed: ${errorMessage}`);
            setIsUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
            <div className="space-y-2 text-center md:text-left">
                <h1 className="text-3xl font-bold tracking-tight text-white">
                    Video Analysis
                </h1>
                <p className="text-zinc-400">
                    Upload raw footage to generate viral scripts and voiceovers.
                </p>
            </div>

            {!analysisResult && (
                <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-12 hover:border-indigo-500/50 transition-all bg-zinc-900/30 group">
                    <label className="flex flex-col items-center gap-6 cursor-pointer">
                        <div className="p-5 bg-zinc-800 rounded-full group-hover:bg-zinc-800/80 transition-colors ring-1 ring-white/5">
                            {isUploading ? (
                                <div className="relative flex items-center justify-center">
                                    <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
                                    <span className="absolute text-[10px] font-bold text-white">{uploadProgress}%</span>
                                </div>
                            ) : (
                                <Upload className="w-10 h-10 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                            )}
                        </div>
                        <div className="text-center space-y-1">
                            <span className="text-lg font-medium text-zinc-200">Click to upload video</span>
                            <p className="text-sm text-zinc-500">MP4, MOV up to 50MB</p>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept="video/*"
                            onChange={handleUpload}
                            disabled={isUploading}
                        />
                    </label>
                </div>
            )}

            {status !== "Waiting for input..." && !analysisResult && (
                <div className="bg-zinc-900/50 rounded-lg p-4 text-left border border-zinc-800/50 font-mono text-xs text-indigo-300">
                    &gt; {status}
                    {(status.includes("Switching") || status.includes("Completed") || status.includes("Ready")) && (
                        <div className="mt-4">
                            <button
                                onClick={() => onAnalysisComplete && onAnalysisComplete()}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-sm transition-colors animate-pulse"
                            >
                                Enter Studio Now &rarr;
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* AI Analysis Result Display */}
            {analysisResult && (
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 md:p-8 text-left space-y-8 shadow-2xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Film className="w-6 h-6 text-indigo-400" />
                                AI Script Analysis
                            </h2>
                            <p className="text-sm text-zinc-500">Generated using Gemini 2.5 Pro</p>
                        </div>

                        <div className="flex flex-col items-end pr-2 bg-zinc-950/50 p-2 rounded-xl border border-white/5">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Virality Score</span>
                            <span className="text-xl font-bold text-indigo-400 leading-none">
                                {typeof analysisResult.virality_score === 'object'
                                    ? analysisResult.virality_score.score
                                    : analysisResult.virality_score}
                                <span className="text-sm text-zinc-600 font-normal">
                                    {Number(typeof analysisResult.virality_score === 'object' ? analysisResult.virality_score.score : analysisResult.virality_score) > 10 ? '/100' : '/10'}
                                </span>
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-zinc-400 uppercase">Viral Script</h3>
                        </div>

                        <div className="grid gap-3">
                            {Array.isArray(analysisResult.script) ? (
                                analysisResult.script.map((scene: any, i: number) => (
                                    <div key={i} className="group relative bg-zinc-950/50 hover:bg-zinc-900 border border-white/5 hover:border-indigo-500/20 rounded-xl p-5 transition-all duration-200">
                                        <div className="flex gap-6">
                                            <div className="flex flex-col items-center gap-2 pt-1">
                                                <div className="font-mono text-indigo-400 text-xs py-1 px-2 bg-indigo-500/10 rounded-md whitespace-nowrap">
                                                    {scene.time || `${scene.start_time} - ${scene.end_time}` || "??:??"}
                                                </div>
                                                <div className="h-full w-px bg-zinc-800 group-last:hidden"></div>
                                            </div>

                                            <div className="flex-1 space-y-4">
                                                <div className="prose prose-invert prose-sm max-w-none">
                                                    <p className="text-zinc-200 font-medium leading-relaxed text-base">
                                                        {scene.scene || scene.description || scene.instruction || scene.text || "No Content"}
                                                    </p>
                                                </div>

                                                {/* Voiceover removed from Analysis View as requested */}

                                                <div className="flex flex-wrap gap-4 pt-1">
                                                    {(scene.video || scene.visual) && (
                                                        <div className="flex gap-2 items-center text-xs bg-zinc-900 px-2 py-1.5 rounded border border-white/5">
                                                            <span className="text-zinc-500 font-bold uppercase tracking-wider">Visual</span>
                                                            <span className="text-zinc-300">{scene.video || scene.visual}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 bg-zinc-950 rounded-lg text-zinc-400 text-sm">
                                    {JSON.stringify(analysisResult.script)}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/5">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Target Keywords</h3>
                        <div className="flex flex-wrap gap-2">
                            {analysisResult.keywords?.map((kw: string, i: number) => (
                                <span key={i} className="px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-full border border-white/10 transition-colors cursor-default">
                                    #{kw}
                                </span>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => setAnalysisResult(null)}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-zinc-200 font-semibold rounded-xl transition-all border border-white/5 hover:border-white/10 text-sm tracking-wide uppercase"
                    >
                        Process New Video
                    </button>
                </div>
            )}
        </div>
    );
}
