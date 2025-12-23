
import { useState, useEffect } from "react";
import { ArrowLeft, MessageSquare, Plus, Trash2, GripVertical, User, Sparkles, RotateCw } from "lucide-react";
import axios from "axios";
import { DualVoiceSelector } from "@/components/DualVoiceSelector";

interface FakeChatSourceProps {
    onBack: () => void;
    onGenerate: (script: any) => void;
}

interface ChatMessage {
    id: string;
    speaker: 'A' | 'B';
    text: string;
}

export function FakeChatSource({ onBack, onGenerate }: FakeChatSourceProps) {
    // --- State ---
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: '1', speaker: 'A', text: "Hey! Did you see the new update?" },
        { id: '2', speaker: 'B', text: "Yeah, it looks amazing! Can't wait to try it." }
    ]);
    const [title, setTitle] = useState("My Chat Story");

    // Steps: choice -> (manual->edit) OR (ai_input->generating_script->edit) -> voice -> generating_video
    const [step, setStep] = useState<'choice' | 'ai_input' | 'edit' | 'voice' | 'generating'>('choice');

    const [progress, setProgress] = useState("");
    const [aiTopic, setAiTopic] = useState("");
    const [isAiGenerated, setIsAiGenerated] = useState(false);

    // --- Viral Hooks / Suggestions state (Moved to top level) ---
    const [suggestions, setSuggestions] = useState<string[]>([]);

    useEffect(() => {
        if (step === 'ai_input') {
            refreshSuggestions();
        }
    }, [step]);

    const refreshSuggestions = () => {
        const VIRAL_HOOKS = [
            "A time traveler trying to warn someone about 2025 without scaring them.",
            "Someone accidentally sending a breakup text to their boss instead of partner.",
            "Two cats plotting to knock over the Christmas tree.",
            "A nice guy trying to return a wrong food order but the waiter is too aggressive.",
            "A scammer realizing he called another scammer.",
            "Explaining what 'Skibidi Toilet' is to a Victorian child.",
            "Your future self texting you to NOT eat that sandwich.",
            "A dog trying to explain why he barked at the empty corner.",
            "Texts between a student and teacher after accidentally calling her 'Mom'.",
            "Someone trying to cancel a gym membership over text vs. the AI bot.",
            "Two aliens confused by human birthday traditions.",
            "A person pretending to be sick but posting stories on Instagram."
        ];
        const shuffled = [...VIRAL_HOOKS].sort(() => 0.5 - Math.random());
        setSuggestions(shuffled.slice(0, 3));
    }


    // --- Actions ---
    const addMessage = () => {
        const lastSpeaker = messages.length > 0 ? messages[messages.length - 1].speaker : 'B';
        setMessages([
            ...messages,
            {
                id: Math.random().toString(36).substr(2, 9),
                speaker: lastSpeaker === 'A' ? 'B' : 'A',
                text: ""
            }
        ]);
    };

    const updateMessage = (id: string, text: string) => {
        setMessages(messages.map(m => m.id === id ? { ...m, text } : m));
    };

    const toggleSpeaker = (id: string) => {
        setMessages(messages.map(m => m.id === id ? { ...m, speaker: m.speaker === 'A' ? 'B' : 'A' } : m));
    };

    const removeMessage = (id: string) => {
        if (messages.length <= 1) return;
        setMessages(messages.filter(m => m.id !== id));
    };

    // --- Navigation Handlers ---
    const handleSelectManual = () => {
        setIsAiGenerated(false);
        setStep('edit');
    };

    const handleSelectAI = () => {
        setStep('ai_input');
    };

    const handleAiGenerateScript = async () => {
        if (!aiTopic.trim()) return;

        setStep('generating');
        setProgress("Asking Gemini to write your story...");

        try {
            const res = await axios.post("/api/ai-chat", {
                topic: aiTopic
            });

            if (res.data.messages && Array.isArray(res.data.messages)) {
                const newMessages = res.data.messages.map((m: any) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    speaker: m.speaker,
                    text: m.text
                }));
                setMessages(newMessages);
                setIsAiGenerated(true);
                setTitle(aiTopic.substring(0, 20) + "...");
                setStep('edit'); // Go to editor to review
            } else {
                alert("AI returned invalid format. Please try again.");
                setStep('ai_input');
            }
        } catch (e) {
            console.error(e);
            alert("Failed to generate script. Please try again.");
            setStep('ai_input');
        }
    };

    const handleProceedToVoice = () => {
        setStep('voice');
    };

    const handleGenerateVideo = async (voiceA: { id: string, speed: number }, voiceB: { id: string, speed: number }) => {
        setStep('generating');
        setProgress("Initializing production...");

        try {
            const finalScript: any[] = [];

            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                if (!msg.text.trim()) continue;

                setProgress(`Processing message ${i + 1}/${messages.length}...`);

                // 1. Generate Audio
                const voice = msg.speaker === 'A' ? voiceA : voiceB;
                const ttsRes = await axios.post("/api/tts", {
                    text: msg.text,
                    voice: voice.id,
                    speed: voice.speed
                });

                // 2. Generate Visual (Bubble)
                const bubbleUrl = `/api/render-bubble?text=${encodeURIComponent(msg.text)}&type=${msg.speaker === 'A' ? 'received' : 'sent'}&style=imessage`;

                finalScript.push({
                    text: msg.text,
                    type: 'image',
                    speaker: msg.speaker,
                    audioUrl: ttsRes.data.url,
                    imageUrl: bubbleUrl,
                    duration: 5
                });
            }

            setProgress("Finalizing project...");

            setTimeout(() => {
                onGenerate({
                    script: finalScript,
                    metadata: {
                        title,
                        type: 'fake_chat',
                        template: 'imessage'
                    }
                });
            }, 500);

        } catch (error: any) {
            console.error("Generation failed", error);
            alert("Failed to generate video assets.");
            setStep('voice'); // Go back
        }
    };

    // --- Render Steps ---

    if (step === 'generating') {
        return (
            <div className="flex flex-col items-center justify-center h-[600px] space-y-6 text-white animate-in fade-in">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-zinc-800 border-t-indigo-500 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <User className="w-8 h-8 text-indigo-400 animate-pulse" />
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Gemini is Working...</h2>
                    <p className="text-zinc-400 font-mono">{progress}</p>
                </div>
            </div>
        );
    }

    if (step === 'choice') {
        return (
            <div className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500 py-12">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-3xl font-bold text-white">Choose Your Path</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Manual */}
                    <button onClick={handleSelectManual} className="group relative p-8 rounded-3xl bg-zinc-900/40 border border-white/5 hover:border-zinc-500/50 hover:bg-zinc-900/60 transition-all text-left">
                        <div className="p-4 bg-zinc-800/50 rounded-2xl mb-6 w-fit group-hover:scale-110 transition-transform">
                            <MessageSquare className="w-8 h-8 text-zinc-300" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Write Yourself</h2>
                        <p className="text-zinc-400">Manually type out the conversation message by message.</p>
                    </button>

                    {/* AI */}
                    <button onClick={handleSelectAI} className="group relative p-8 rounded-3xl bg-zinc-900/40 border border-white/5 hover:border-indigo-500/50 hover:bg-zinc-900/60 transition-all text-left">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                        <div className="p-4 bg-indigo-500/20 rounded-2xl mb-6 w-fit group-hover:scale-110 transition-transform">
                            <User className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-indigo-300">Generate with Gemini</h2>
                        <p className="text-zinc-400">Give a topic, and let AI write the perfect viral script for you.</p>
                    </button>
                </div>
            </div>
        )
    }

    // --- Viral Hooks logic moved to top ---

    if (step === 'ai_input') {
        return (
            <div className="max-w-3xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500 py-12">
                <div className="flex items-center gap-4">
                    <button onClick={() => setStep('choice')} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-3xl font-bold text-white">What's the story about?</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Input Area */}
                    <div className="lg:col-span-3 bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-sm font-medium text-zinc-400">Your Prompt</label>
                            <div className="text-xs text-indigo-400 font-medium px-2 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">Using Gemini 2.5 Pro</div>
                        </div>
                        <textarea
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                            className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500 text-lg resize-none placeholder:text-zinc-600"
                            placeholder="Describe your conversation concept here..."
                            autoFocus
                        />
                        <button
                            onClick={handleAiGenerateScript}
                            disabled={!aiTopic.trim()}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                        >
                            <Sparkles className="w-5 h-5" /> Generate Script
                        </button>
                    </div>

                    {/* Suggestions Area */}
                    <div className="lg:col-span-3 space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-sm font-medium text-zinc-500">Need inspiration? Try these:</span>
                            <button onClick={refreshSuggestions} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                <RotateCw className="w-3 h-3" /> Refresh
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {suggestions.map((hook, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setAiTopic(hook);
                                        // Optional: Auto-generate? User said "tıklayınca generate ekranına geçsin" which might mean populate OR populate+submit.
                                        // Let's populate for safety so they can edit.
                                        // "Generate ekranı" here means THIS screen populated, or the "Generating..." spinner?
                                        // Assuming populate. user can click Generate.
                                    }}
                                    className="text-left p-4 rounded-xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-800 hover:border-indigo-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
                                >
                                    <p className="text-sm text-zinc-300 group-hover:text-white leading-relaxed">"{hook}"</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (step === 'voice') {
        return (
            <DualVoiceSelector
                onBack={() => setStep('edit')}
                onGenerate={handleGenerateVideo}
            />
        );
    }

    // MAIN EDITOR (Existing UI)
    return (
        <div className="max-w-4xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setStep('choice')}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Editor</h1>
                        <p className="text-zinc-400 text-sm">Review and tweak your script</p>
                    </div>
                </div>

                {isAiGenerated && (
                    <button
                        onClick={() => setStep('ai_input')}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors border border-white/5 flex items-center gap-2"
                    >
                        <User className="w-4 h-4" /> Regenerate
                    </button>
                )}
            </div>

            {/* Conversation Editor */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-6">

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-zinc-400">Story Title</label>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        placeholder="e.g. The Wrong Number"
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-medium text-zinc-400 flex justify-between items-center">
                        <span>Messages</span>
                        <span className="text-xs text-zinc-500">{messages.length} lines</span>
                    </label>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {messages.map((msg, index) => (
                            <div key={msg.id} className="flex items-start gap-3 group animate-in slide-in-from-left duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                                <div className="mt-3 text-zinc-600 cursor-grab active:cursor-grabbing hover:text-zinc-400">
                                    <GripVertical className="w-5 h-5" />
                                </div>

                                <button
                                    onClick={() => toggleSpeaker(msg.id)}
                                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${msg.speaker === 'A'
                                        ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                                        : 'bg-indigo-600 border-indigo-500 text-white'
                                        }`}
                                    title={msg.speaker === 'A' ? "Speaker A (Them)" : "Speaker B (Me)"}
                                >
                                    {msg.speaker === 'A' ? 'A' : 'B'}
                                </button>

                                <div className="flex-1 relative">
                                    <textarea
                                        value={msg.text}
                                        onChange={(e) => updateMessage(msg.id, e.target.value)}
                                        className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors resize-none h-[52px] ${msg.speaker === 'A' ? 'border-white/10 focus:border-zinc-500' : 'border-indigo-500/30 focus:border-indigo-500'
                                            }`}
                                        placeholder="Type a message..."
                                    />
                                </div>

                                <button
                                    onClick={() => removeMessage(msg.id)}
                                    className="mt-3 p-2 text-zinc-600 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={addMessage}
                        className="w-full py-3 border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-2 transition-all hover:bg-zinc-900/50"
                    >
                        <Plus className="w-4 h-4" /> Add Message
                    </button>
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-end">
                    <button
                        onClick={handleProceedToVoice}
                        className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"
                    >
                        Next: Select Voices
                        <MessageSquare className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
