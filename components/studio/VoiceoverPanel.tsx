import React, { useState, useRef } from 'react';
import { Mic, Play, Pause, Plus, Wand2 } from 'lucide-react';
import axios from 'axios';

interface VoiceoverPanelProps {
    onAddTrack: (url: string, type: 'audio', duration: number, title: string) => void;
}

export function VoiceoverPanel({ onAddTrack }: VoiceoverPanelProps) {
    const [text, setText] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Default duration until we know better from metadata
    const [duration, setDuration] = useState(10);

    const audioRef = useRef<HTMLAudioElement>(null);

    const handleGenerate = async () => {
        if (!text.trim()) return;
        setIsGenerating(true);
        setPreviewUrl(null); // Reset

        try {
            const res = await axios.post('/api/tts', { text });
            if (res.data.url) {
                setPreviewUrl(res.data.url);
                // We might get duration from backend if it calculates it, 
                // otherwise we load it to find out.
            }
        } catch (error: any) {
            console.error(error);
            const serverError = error.response?.data?.error || error.response?.data?.details || error.message;
            alert(`Voiceover Generation Error: ${JSON.stringify(serverError)}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePlayPause = () => {
        if (!audioRef.current || !previewUrl) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleAddToTimeline = () => {
        if (previewUrl) {
            // Use the actual duration from the audio element if possible
            const finalDuration = audioRef.current?.duration || 10;
            onAddTrack(previewUrl, 'audio', finalDuration, "Voiceover");
            setText("");
            setPreviewUrl(null);
        }
    };

    return (
        <div className="h-full flex flex-col bg-zinc-950 border-r border-zinc-800">
            <div className="p-4 border-b border-zinc-800">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Mic className="w-4 h-4 text-indigo-400" />
                    AI Voiceover
                </h2>
            </div>

            <div className="p-4 flex-1 flex flex-col gap-4">
                <textarea
                    className="w-full h-40 bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 resize-none"
                    placeholder="Type your script here..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !text.trim()}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20"
                >
                    {isGenerating ? (
                        <>Generating...</>
                    ) : (
                        <>
                            <Wand2 className="w-4 h-4" /> Generate Speech
                        </>
                    )}
                </button>

                {previewUrl && (
                    <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 space-y-3 animation-fade-in">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-zinc-400">Preview</span>
                            {/* Hidden Audio Element */}
                            <audio
                                ref={audioRef}
                                src={previewUrl}
                                onEnded={() => setIsPlaying(false)}
                                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handlePlayPause}
                                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2"
                            >
                                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                {isPlaying ? "Pause" : "Play"}
                            </button>
                            <button
                                onClick={handleAddToTimeline}
                                className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2"
                            >
                                <Plus className="w-3 h-3" /> Add to Timeline
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 text-xs text-zinc-600 text-center">
                Powered by Gemini 2.5 Pro TTS
            </div>
        </div>
    );
}
