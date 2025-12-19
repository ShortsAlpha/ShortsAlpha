
import { useState, useRef } from "react";
import { ArrowLeft, Play, Check, Volume2, Loader2, Mic, Gauge, Pause } from "lucide-react";
import axios from "axios";

interface VoiceSelectorProps {
    onBack: () => void;
    onSelect: (voice: string, speed: number) => void;
}

const VOICES = [
    { id: "en-US-ChristopherNeural", name: "Christopher (US)", gender: "Male", description: "Deep & Narrative" },
    { id: "en-US-AriaNeural", name: "Aria (US)", gender: "Female", description: "Clear & Professional" },
    { id: "en-GB-SoniaNeural", name: "Sonia (UK)", gender: "Female", description: "British & Sophisticated" },
    { id: "en-US-GuyNeural", name: "Guy (US)", gender: "Male", description: "Casual & Friendly" },
    { id: "en-US-JennyNeural", name: "Jenny (US)", gender: "Female", description: "Warm & Conversational" },
];

export function VoiceSelector({ onBack, onSelect }: VoiceSelectorProps) {
    const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
    const [speed, setSpeed] = useState(1.0);
    const [playingPreview, setPlayingPreview] = useState<string | null>(null);
    const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handlePreview = async (voice: typeof VOICES[0], e: React.MouseEvent) => {
        e.stopPropagation();

        // Stop if currently playing this voice
        if (playingPreview === voice.id) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            setPlayingPreview(null);
            return;
        }

        // Stop any other playback
        if (audioRef.current) {
            audioRef.current.pause();
        }

        setLoadingPreview(voice.id);

        try {
            console.log("Requesting preview for:", voice.name, "Speed:", speed);
            const res = await axios.post("/api/tts", {
                text: "Hello! I can tell your story with this voice settings.",
                voice: voice.id,
                speed: speed
            });

            if (res.data.url) {
                if (audioRef.current) audioRef.current.pause();

                const audio = new Audio(res.data.url);
                audioRef.current = audio;

                await audio.play();
                setPlayingPreview(voice.id);

                audio.onended = () => {
                    setPlayingPreview(null);
                    setLoadingPreview(null);
                };
            }
        } catch (error: any) {
            console.error("Preview generation failed", error);
            const msg = error.response?.data?.error || error.response?.data?.message || error.message || "Unknown error";
            alert(`Preview failed: ${msg}`);
        } finally {
            setLoadingPreview(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Select a Voice</h1>
                    <p className="text-zinc-400">Choose your narrator and adjust the pacing</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Voice List */}
                <div className="md:col-span-2 space-y-4">
                    {VOICES.map((voice) => (
                        <div
                            key={voice.id}
                            onClick={() => setSelectedVoice(voice.id)}
                            className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${selectedVoice === voice.id
                                ? "bg-indigo-900/20 border-indigo-500 shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]"
                                : "bg-zinc-900/40 border-white/5 hover:bg-zinc-900 hover:border-white/10"
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedVoice === voice.id ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-400"
                                    }`}>
                                    <Mic className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className={`font-bold ${selectedVoice === voice.id ? "text-indigo-300" : "text-white"}`}>
                                        {voice.name}
                                    </h3>
                                    <p className="text-zinc-500 text-xs flex items-center gap-2">
                                        <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] uppercase tracking-wider">{voice.gender}</span>
                                        {voice.description}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={(e) => handlePreview(voice, e)}
                                    className={`p-3 rounded-full transition-colors ${playingPreview === voice.id
                                        ? "bg-white text-black"
                                        : "hover:bg-white/10 text-zinc-400 hover:text-white"
                                        }`}
                                    title="Play Preview"
                                >
                                    {loadingPreview === voice.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : playingPreview === voice.id ? (
                                        <div className="flex gap-0.5 h-3 justify-center items-end">
                                            <div className="w-1 bg-current animate-[pulse_0.5s_ease-in-out_infinite] h-2"></div>
                                            <div className="w-1 bg-current animate-[pulse_0.5s_ease-in-out_infinite_0.1s] h-3"></div>
                                            <div className="w-1 bg-current animate-[pulse_0.5s_ease-in-out_infinite_0.2s] h-1"></div>
                                        </div>
                                    ) : (
                                        <Play className="w-5 h-5 fill-current" />
                                    )}
                                </button>

                                {selectedVoice === voice.id && (
                                    <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                                        <Check className="w-3.5 h-3.5 text-white" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Settings Panel */}
                <div className="space-y-6">
                    <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl space-y-6">
                        <div className="flex items-center gap-2 text-white font-semibold">
                            <Gauge className="w-5 h-5 text-indigo-400" />
                            <h3>Voice Settings</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <label className="text-zinc-400">Speed</label>
                                <span className="font-mono text-indigo-300">{speed.toFixed(1)}x</span>
                            </div>

                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={speed}
                                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                                className="w-full accent-indigo-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                            />

                            <div className="flex justify-between text-xs text-zinc-600">
                                <span>Slow</span>
                                <span>Normal</span>
                                <span>Fast</span>
                            </div>
                        </div>

                        <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
                            <p>
                                ⚡ <strong>Pro Tip:</strong> For Shorts/TikToks, a speed of <strong>1.2x - 1.3x</strong> is recommended to keep viewers engaged.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => selectedVoice && onSelect(selectedVoice, speed)}
                        disabled={!selectedVoice}
                        className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                    >
                        Create Voiceover
                        <Volume2 className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
