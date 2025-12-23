
import { useState, useRef } from "react";
import { ArrowLeft, Play, Check, Volume2, Mic, Pause, Loader2 } from "lucide-react";
import axios from "axios";

interface DualVoiceSelectorProps {
    onBack: () => void;
    onGenerate: (voiceA: { id: string, speed: number }, voiceB: { id: string, speed: number }) => void;
}

const VOICES = [
    { id: "en-US-ChristopherNeural", name: "Christopher", gender: "Male", description: "Deep & Narrative" },
    { id: "en-US-AriaNeural", name: "Aria", gender: "Female", description: "Clear & Professional" },
    { id: "en-GB-SoniaNeural", name: "Sonia", gender: "Female", description: "British & Sophisticated" },
    { id: "en-US-GuyNeural", name: "Guy", gender: "Male", description: "Casual & Friendly" },
    { id: "en-US-JennyNeural", name: "Jenny", gender: "Female", description: "Warm & Conversational" },
    { id: "en-US-EricNeural", name: "Eric", gender: "Male", description: "Energetic & Youthful" },
    { id: "en-US-MichelleNeural", name: "Michelle", gender: "Female", description: "Soft & Soothing" }
];

export function DualVoiceSelector({ onBack, onGenerate }: DualVoiceSelectorProps) {
    const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');
    const [voiceA, setVoiceA] = useState({ id: "en-US-GuyNeural", speed: 1.1 });
    const [voiceB, setVoiceB] = useState({ id: "en-US-JennyNeural", speed: 1.1 });
    const [playingPreview, setPlayingPreview] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handlePreview = async (voiceId: string, speed: number) => {
        if (playingPreview === voiceId) {
            audioRef.current?.pause();
            setPlayingPreview(null);
            return;
        }

        try {
            const res = await axios.post("/api/tts", {
                text: "Hello! This is how I sound.",
                voice: voiceId,
                speed: speed
            });

            if (res.data.url) {
                if (audioRef.current) audioRef.current.pause();
                const audio = new Audio(res.data.url);
                audioRef.current = audio;
                await audio.play();
                setPlayingPreview(voiceId);
                audio.onended = () => setPlayingPreview(null);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const currentVoice = activeTab === 'A' ? voiceA : voiceB;
    const setCurrentVoice = (updates: any) => {
        if (activeTab === 'A') setVoiceA({ ...voiceA, ...updates });
        else setVoiceB({ ...voiceB, ...updates });
    };

    return (
        <div className="max-w-5xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white">Select Voices</h1>
                    <p className="text-zinc-400">Choose a distinct voice for each speaker</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Visual Representation & Tab Selection */}
                <div className="md:col-span-4 space-y-6">
                    <div
                        onClick={() => setActiveTab('A')}
                        className={`cursor-pointer p-6 rounded-2xl border transition-all ${activeTab === 'A' ? 'bg-zinc-800 border-indigo-500 shadow-xl' : 'bg-zinc-900/50 border-white/5 opacity-50 hover:opacity-100'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="px-3 py-1 bg-zinc-700 rounded-lg text-xs font-bold text-zinc-300">SPEAKER A (Them)</span>
                            {activeTab === 'A' && <Check className="w-5 h-5 text-indigo-400" />}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center">
                                <span className="text-xl font-bold text-white">A</span>
                            </div>
                            <div>
                                <div className="text-white font-bold">{VOICES.find(v => v.id === voiceA.id)?.name}</div>
                                <div className="text-xs text-zinc-400">Speed: {voiceA.speed}x</div>
                            </div>
                        </div>
                    </div>

                    <div
                        onClick={() => setActiveTab('B')}
                        className={`cursor-pointer p-6 rounded-2xl border transition-all ${activeTab === 'B' ? 'bg-zinc-800 border-indigo-500 shadow-xl' : 'bg-zinc-900/50 border-white/5 opacity-50 hover:opacity-100'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="px-3 py-1 bg-indigo-600 rounded-lg text-xs font-bold text-white">SPEAKER B (Me)</span>
                            {activeTab === 'B' && <Check className="w-5 h-5 text-indigo-400" />}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center">
                                <span className="text-xl font-bold text-white">B</span>
                            </div>
                            <div>
                                <div className="text-white font-bold">{VOICES.find(v => v.id === voiceB.id)?.name}</div>
                                <div className="text-xs text-zinc-400">Speed: {voiceB.speed}x</div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => onGenerate(voiceA, voiceB)}
                        className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 mt-8"
                    >
                        Generate Audio & Video
                        <Volume2 className="w-5 h-5" />
                    </button>
                </div>

                {/* Voice List for Active Tab */}
                <div className="md:col-span-8 bg-zinc-900/30 border border-white/5 rounded-2xl p-6">
                    <div className="mb-6 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">
                            Choose Voice for Speaker {activeTab}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400">Speed: {currentVoice.speed}x</span>
                            <input
                                type="range"
                                min="0.8"
                                max="1.5"
                                step="0.1"
                                value={currentVoice.speed}
                                onChange={(e) => setCurrentVoice({ speed: parseFloat(e.target.value) })}
                                className="w-24 accent-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {VOICES.map(voice => (
                            <div
                                key={voice.id}
                                onClick={() => setCurrentVoice({ id: voice.id })}
                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${currentVoice.id === voice.id
                                        ? 'bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500'
                                        : 'bg-black/20 border-white/5 hover:bg-black/40'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentVoice.id === voice.id ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-500'
                                        }`}>
                                        <Mic className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className={`font-medium ${currentVoice.id === voice.id ? 'text-white' : 'text-zinc-400'}`}>
                                            {voice.name}
                                        </div>
                                        <div className="text-xs text-zinc-500">{voice.gender} • {voice.description}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handlePreview(voice.id, currentVoice.speed); }}
                                    className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                >
                                    {playingPreview === voice.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
