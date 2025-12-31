
import { useState } from "react";
import { Bot, Type, MessageSquare, ArrowLeft, Loader2 } from "lucide-react";
import axios from "axios";
import { AIStorySource } from "./sources/AIStorySource";
import { RedditSource } from "./sources/RedditSource";
import { CustomTextSource } from "./sources/CustomTextSource";
import { VoiceSelector } from "./VoiceSelector";
// import { GlowCard } from "@/components/ui/spotlight-card";

interface CreateSourceViewProps {
    onBack: () => void;
    onScriptGenerated: (script: any) => void;
}

type SourceType = 'ai' | 'reddit' | 'text' | null;

export function CreateSourceView({ onBack, onScriptGenerated }: CreateSourceViewProps) {
    const [selectedSource, setSelectedSource] = useState<SourceType>(null);
    const [generatedScript, setGeneratedScript] = useState<any>(null);
    const [isVoiceStep, setIsVoiceStep] = useState(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [progress, setProgress] = useState("");

    const handleSourceGenerate = (script: any) => {
        setGeneratedScript(script);
        setIsVoiceStep(true);
    };

    const handleVoiceSelect = async (voice: string, speed: number) => {
        if (!generatedScript || !generatedScript.script) return;

        setIsGeneratingAudio(true);
        setProgress("Initializing audio engine...");

        try {
            const updatedScript = { ...generatedScript };
            updatedScript.voice = voice;
            updatedScript.speed = speed;

            // Generate audio for each segment
            const segments = updatedScript.script; // expecting array of { text, type, ... }

            let lastErrorMsg = "";
            let successCount = 0;

            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                if (segment.text) {
                    setProgress(`Synthesizing segment ${i + 1} of ${segments.length}...`);
                    try {
                        const res = await axios.post("/api/tts", {
                            text: segment.text,
                            voice: voice,
                            speed: speed
                        });
                        if (res.data.url) {
                            segment.audioUrl = res.data.url;
                            successCount++;
                        }
                    } catch (err: any) {
                        console.error(`Failed to generate audio for segment ${i}`, err);
                        lastErrorMsg = err.response?.data?.error || err.message;
                    }
                }
            }

            if (successCount === 0 && segments.length > 0) {
                throw new Error(lastErrorMsg || "No audio could be generated. Please check your API Keys (GEMINI_API_KEY) and R2 Configuration.");
            }

            setProgress("Finalizing...");
            // Allow a brief moment to see 100%
            setTimeout(() => {
                onScriptGenerated(updatedScript);
            }, 500);

        } catch (error: any) {
            console.error("Voice generation process failed", error);
            alert(`Failed to generate voiceover: ${error.message || "Unknown error"}`);
            setIsGeneratingAudio(false);
        }
    };

    if (isGeneratingAudio) {
        return (
            <div className="flex flex-col items-center justify-center h-[600px] space-y-6 text-foreground animate-in fade-in">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-zinc-800 border-t-indigo-500 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 bg-indigo-500 rounded-full animate-pulse"></div>
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Creating Voiceover</h2>
                    <p className="text-muted-foreground font-mono">{progress}</p>
                </div>
            </div>
        );
    }

    if (isVoiceStep) {
        return <VoiceSelector onBack={() => setIsVoiceStep(false)} onSelect={handleVoiceSelect} />;
    }

    // If a specific source is active, show that component
    if (selectedSource === 'ai') {
        return <AIStorySource onBack={() => setSelectedSource(null)} onGenerate={handleSourceGenerate} />;
    }
    if (selectedSource === 'reddit') {
        return <RedditSource onBack={() => setSelectedSource(null)} onGenerate={handleSourceGenerate} />;
    }
    if (selectedSource === 'text') {
        return <CustomTextSource onBack={() => setSelectedSource(null)} onGenerate={handleSourceGenerate} />;
    }

    return (
        <div className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Select Content Source</h1>
                    <p className="text-muted-foreground">Where should we get the story from?</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* AI Story Generator */}
                <div onClick={() => setSelectedSource('ai')} className="cursor-pointer group h-80 w-full bg-card border border-border rounded-2xl p-4 hover:border-indigo-500/50 hover:bg-accent/50 hover:shadow-lg transition-all relative overflow-hidden">
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 text-center relative z-10">
                        <div className="h-20 w-20 flex items-center justify-center bg-indigo-500/10 rounded-2xl group-hover:bg-indigo-500/20 text-indigo-400 transition-colors group-hover:scale-110 duration-300">
                            <Bot className="w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-foreground tracking-tight">AI Generator</h3>
                            <p className="text-sm text-muted-foreground max-w-[12rem] mx-auto leading-relaxed">Generate unique stories from a prompt</p>
                        </div>
                    </div>
                </div>

                {/* Reddit Scraper */}
                <div onClick={() => setSelectedSource('reddit')} className="cursor-pointer group h-80 w-full bg-card border border-border rounded-2xl p-4 hover:border-orange-500/50 hover:bg-accent/50 hover:shadow-lg transition-all relative overflow-hidden">
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 text-center relative z-10">
                        <div className="h-20 w-20 flex items-center justify-center bg-orange-500/10 rounded-2xl group-hover:bg-orange-500/20 text-orange-400 transition-colors group-hover:scale-110 duration-300">
                            <MessageSquare className="w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-foreground tracking-tight">Reddit</h3>
                            <p className="text-sm text-muted-foreground max-w-[12rem] mx-auto leading-relaxed">Fetch viral posts from subreddits</p>
                        </div>
                    </div>
                </div>

                {/* Custom Text */}
                <div onClick={() => setSelectedSource('text')} className="cursor-pointer group h-80 w-full bg-card border border-border rounded-2xl p-4 hover:border-purple-500/50 hover:bg-accent/50 hover:shadow-lg transition-all relative overflow-hidden">
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 text-center relative z-10">
                        <div className="h-20 w-20 flex items-center justify-center bg-purple-500/10 rounded-2xl group-hover:bg-purple-500/20 text-purple-400 transition-colors group-hover:scale-110 duration-300">
                            <Type className="w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-foreground tracking-tight">Custom Text</h3>
                            <p className="text-sm text-muted-foreground max-w-[12rem] mx-auto leading-relaxed">Paste your own script or story</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
