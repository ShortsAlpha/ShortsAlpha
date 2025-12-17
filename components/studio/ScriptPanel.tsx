import { ScrollText, Volume2, Wand2 } from "lucide-react";

interface ScriptPanelProps {
    script: any[];
    onUpdateScript: (script: any[]) => void;
    onAudioGenerated: (url: string) => void;
}

export function ScriptPanel({ script, onUpdateScript, onAudioGenerated }: ScriptPanelProps) {
    return (
        <div className="flex flex-col h-full bg-zinc-950/30">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-bold text-sm text-zinc-300 flex items-center gap-2">
                    <ScrollText className="w-4 h-4" /> Script & Timeline
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {script.map((scene, idx) => (
                    <div key={idx} className="group p-4 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 rounded-xl transition-all">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded">
                                Scene {idx + 1}
                            </span>
                            <span className="text-[10px] text-zinc-600">{scene.time || "00:00"}</span>
                        </div>

                        <textarea
                            className="w-full bg-transparent text-sm text-zinc-200 resize-none outline-none border-b border-transparent focus:border-indigo-500/50 transition-colors"
                            rows={3}
                            value={scene.text}
                            onChange={(e) => {
                                const newScript = [...script];
                                newScript[idx] = { ...scene, text: e.target.value };
                                onUpdateScript(newScript);
                            }}
                        />

                        <div className="mt-3 flex gap-2 opacity-10 group-hover:opacity-100 transition-opacity">
                            <button className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-indigo-400">
                                <Volume2 className="w-3 h-3" /> Preview Voice
                            </button>
                        </div>
                    </div>
                ))}

                {(!script || script.length === 0) && (
                    <div className="text-center py-12 px-4 rounded-xl border border-dashed border-zinc-800 text-zinc-600 text-sm">
                        No script generated. <br /> Use the Create tool to generate a story.
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/20">
                <button
                    onClick={() => onAudioGenerated("mock_audio.mp3")} // Mock for now
                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                >
                    <Wand2 className="w-4 h-4 text-indigo-400" />
                    Generate Full Voiceover
                </button>
            </div>
        </div>
    );
}
