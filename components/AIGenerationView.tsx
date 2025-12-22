import React, { useState, useEffect } from 'react';
import { Loader2, Video, Download, Sparkles, Settings, Save } from 'lucide-react';
import { toast } from 'sonner';

interface AIGenerationViewProps {
    onAddToStudio?: (asset: any) => void;
}

export function AIGenerationView({ onAddToStudio }: AIGenerationViewProps) {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

    // Custom API URL State
    const [showSettings, setShowSettings] = useState(false);
    const [customApiUrl, setCustomApiUrl] = useState('');

    // Load saved URL on mount
    useEffect(() => {
        const savedUrl = localStorage.getItem('shorts_colab_url');
        if (savedUrl) setCustomApiUrl(savedUrl);
    }, []);

    const [isTesting, setIsTesting] = useState(false);

    const testConnection = async () => {
        setIsTesting(true);
        try {
            const testUrl = customApiUrl.trim();
            if (!testUrl) throw new Error("URL is empty");

            const response = await fetch('/api/video-generation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiUrl: testUrl,
                    action: 'health'
                }),
            });

            const data = await response.json();
            if (data.status === 'ok') {
                toast.success("Connection Successful! ✅");
            } else {
                throw new Error("Connection failed");
            }
        } catch (e) {
            toast.error("Could not connect. URL is offline or incorrect. ❌");
        } finally {
            setIsTesting(false);
        }
    };



    const saveSettings = () => {
        if (!customApiUrl.trim()) return;
        localStorage.setItem('shorts_colab_url', customApiUrl.trim());
        setShowSettings(false);
        toast.success("API URL Saved!");
    };

    const [statusMessage, setStatusMessage] = useState("Initializing...");
    const [isEnhancing, setIsEnhancing] = useState(false);

    const enhancePrompt = async () => {
        if (!prompt.trim()) return;
        setIsEnhancing(true);
        try {
            const response = await fetch('/api/enhance-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            const data = await response.json();
            if (data.enhancedPrompt) {
                setPrompt(data.enhancedPrompt);
                toast.success("Prompt Enhanced! ✨");
            } else {
                throw new Error("Failed to enhance");
            }
        } catch (e) {
            toast.error("Could not enhance prompt");
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error("Please enter a prompt");
            return;
        }

        // DEBUG: Force logs
        console.log("Using API URL:", customApiUrl.trim() || "Fallback to Env");

        setIsGenerating(true);
        setGeneratedVideoUrl(null);
        setStatusMessage("Starting generation...");

        try {
            // Step 1: Trigger Generation
            const triggerResponse = await fetch('/api/video-generation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    apiUrl: customApiUrl.trim() || undefined,
                    action: 'generate'
                }),
            });

            if (!triggerResponse.ok) {
                await handleApiError(triggerResponse);
                return;
            }
            const { job_id } = await triggerResponse.json();

            // Step 2: Poll Status
            const pollInterval = setInterval(async () => {
                try {
                    const statusResponse = await fetch('/api/video-generation', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            apiUrl: customApiUrl.trim() || undefined,
                            action: 'poll',
                            jobId: job_id
                        }),
                    });

                    const statusData = await statusResponse.json();

                    if (statusData.status === 'processing') {
                        setStatusMessage(statusData.message || "Processing...");
                    } else if (statusData.status === 'completed') {
                        clearInterval(pollInterval);
                        setStatusMessage("Downloading video...");
                        await downloadResult(job_id);
                    } else if (statusData.status === 'failed') {
                        clearInterval(pollInterval);
                        throw new Error(statusData.error || "Generation Failed");
                    }
                } catch (e: any) {
                    clearInterval(pollInterval);
                    toast.error(e.message);
                    setIsGenerating(false);
                }
            }, 3000); // Check every 3 seconds

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Something went wrong");
            setIsGenerating(false);
        }
    };

    const downloadResult = async (jobId: string) => {
        try {
            const response = await fetch('/api/video-generation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiUrl: customApiUrl.trim() || undefined,
                    action: 'download',
                    jobId: jobId
                }),
            });

            if (!response.ok) throw new Error("Download failed");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setGeneratedVideoUrl(url);
            toast.success("Video generated successfully!");
        } catch (e: any) {
            toast.error("Failed to download video");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApiError = async (response: Response) => {
        let errorMessage = 'Failed to generate video';
        try {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
        } catch {
            const text = await response.text();
            if (text.trim().startsWith('<')) {
                errorMessage = "Connection Failed: Colab URL is invalid. Check Settings.";
                setShowSettings(true);
            } else {
                errorMessage = text || errorMessage;
            }
        }
        throw new Error(errorMessage);
    }

    return (
        <div className="h-full flex flex-col max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 relative">

            {/* Settings Modal/Overlay */}
            {showSettings && (
                <div className="absolute top-0 right-0 z-50 p-6 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-96 animate-in slide-in-from-top-5">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-zinc-400" />
                        API Configuration
                    </h3>
                    <div className="space-y-3">
                        <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Colab Ngrok URL</label>
                        <input
                            type="text"
                            value={customApiUrl}
                            onChange={(e) => setCustomApiUrl(e.target.value)}
                            placeholder="https://xxxx.ngrok-free.app"
                            className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500"
                        />
                        <p className="text-[10px] text-zinc-500">
                            Paste the "Public URL" from Google Colab here. Updating this is required whenever Colab restarts.
                        </p>
                        <div className="flex justify-between pt-2">
                            <button
                                onClick={testConnection}
                                disabled={isTesting}
                                className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors border border-zinc-700"
                            >
                                {isTesting ? "Testing..." : "Test Connection 📡"}
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveSettings}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                >
                                    <Save className="w-3 h-3" />
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-purple-400" />
                        AI Video Generator
                    </h2>
                    <p className="text-zinc-400 mt-2">
                        Turn your text into cinematic background videos using Stable Video Diffusion.
                    </p>
                    <p className="text-[10px] text-zinc-600 font-mono mt-1">
                        Active Node: {customApiUrl ? customApiUrl : "Default (Checking...)"}
                    </p>
                </div>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                    title="API Settings"
                >
                    <Settings className="w-6 h-6" />
                </button>
            </div>

            {/* Input Section */}
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe your video (e.g., 'A cyberpunk city in rain')..."
                            className="w-full bg-black/50 border border-zinc-700 rounded-xl px-6 py-4 text-lg focus:outline-none focus:border-purple-500 transition-colors resize-none h-[120px]"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleGenerate();
                                }
                            }}
                        />
                        <button
                            onClick={enhancePrompt}
                            disabled={isEnhancing || !prompt.trim()}
                            className="absolute bottom-3 right-3 text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                            {isEnhancing ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Enhancing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3 h-3" />
                                    Enhance with Gemini
                                </>
                            )}
                        </button>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt.trim()}
                        className="bg-white text-black px-8 py-4 rounded-xl font-bold hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 min-w-[160px] justify-center h-[120px]"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Video className="w-5 h-5" />
                                Generate
                            </>
                        )}
                    </button>
                </div>
                <p className="text-xs text-zinc-500 mt-3 ml-2 flex items-center gap-2">
                    <span>* Generation takes about 60-120s on T4 GPU.</span>
                    {customApiUrl && (
                        <span className="text-green-500 flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            Custom API Connected
                        </span>
                    )}
                </p>
            </div>

            {/* Result Section */}
            <div className="flex-1 min-h-[400px] flex items-center justify-center bg-black/50 rounded-2xl border border-zinc-800 border-dashed relative overflow-hidden group">

                {isGenerating && (
                    <div className="text-center space-y-4">
                        <div className="relative w-24 h-24 mx-auto">
                            <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <p className="text-zinc-400 animate-pulse">{statusMessage}</p>
                        <p className="text-xs text-zinc-600">This might take a few minutes...</p>
                    </div>
                )}

                {!isGenerating && !generatedVideoUrl && (
                    <div className="text-center text-zinc-500">
                        <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>No video generated yet.</p>
                    </div>
                )}

                {generatedVideoUrl && !isGenerating && (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                        <video
                            src={generatedVideoUrl}
                            controls
                            autoPlay
                            loop
                            className="max-h-full max-w-full rounded-lg shadow-2xl"
                        />
                        <div className="absolute bottom-6 right-6 flex gap-3">
                            {onAddToStudio && (
                                <button
                                    onClick={() => {
                                        onAddToStudio({
                                            id: `gen_${Date.now()}`,
                                            url: generatedVideoUrl!,
                                            type: 'video',
                                            title: `AI Video ${new Date().toLocaleTimeString()}`,
                                            LastModified: new Date(),
                                            Size: 0
                                        });
                                    }}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-lg"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Edit in Studio
                                </button>
                            )}
                            <a
                                href={generatedVideoUrl!}
                                download={`ai-video-${Date.now()}.mp4`}
                                className="bg-white text-black px-4 py-2 rounded-lg font-bold hover:bg-zinc-200 transition-all flex items-center gap-2 shadow-lg"
                            >
                                <Download className="w-4 h-4" />
                                Download Video
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
