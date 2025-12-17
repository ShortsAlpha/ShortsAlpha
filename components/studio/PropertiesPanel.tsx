import { useState, useEffect } from "react";
import { Volume2, VolumeX, RotateCw, RefreshCcw, Monitor, Eraser, Wand2 } from "lucide-react";

interface PropertiesPanelProps {
    selectedClip: any;
    onUpdateClip: (id: string, updates: any) => void;
}

export function PropertiesPanel({ selectedClip, onUpdateClip }: PropertiesPanelProps) {
    const [activeTab, setActiveTab] = useState<'basic' | 'remove_bg' | 'mask' | 'retouch'>('basic');

    // Convert Volume 0-1 to dB (-60 to 0)
    // Formula: dB = 20 * log10(amplitude)
    // Reverse: amplitude = 10 ^ (dB / 20)
    const getDbFromVolume = (vol: number) => {
        if (vol <= 0.001) return -60;
        return Math.max(-60, Math.round(20 * Math.log10(vol)));
    };

    const [dbValue, setDbValue] = useState(getDbFromVolume(selectedClip?.volume ?? 1));

    useEffect(() => {
        setDbValue(getDbFromVolume(selectedClip?.volume ?? 1));
    }, [selectedClip?.volume]);

    const handleDbChange = (newDb: number) => {
        setDbValue(newDb);
        // Convert dB to Amplitude
        // If -60, treat as mute (0)
        let newVol = newDb <= -60 ? 0 : Math.pow(10, newDb / 20);
        if (newVol > 2) newVol = 2; // Cap at 2x if needed, though dB logic usually implies standard range
        // If user wants > 0dB (amplification), formula works. 6dB ~= 2x.

        onUpdateClip(selectedClip.id, { volume: newVol });
    };

    if (!selectedClip) return null;

    const isVideo = selectedClip.type === 'video';

    return (
        <div className="w-80 border-l border-zinc-800 bg-[#1e1e1e] flex flex-col h-full animate-in slide-in-from-right-5 duration-200">
            {/* Tabs */}
            {isVideo && (
                <div className="flex items-center p-1 bg-zinc-900 m-2 rounded-lg border border-zinc-800 overflow-x-auto">
                    {[
                        { id: 'basic', label: 'Temel', icon: null },
                        { id: 'remove_bg', label: 'Arka planı kaldır', icon: Eraser },
                        { id: 'mask', label: 'Maske', icon: Wand2 },
                        { id: 'retouch', label: 'Rötuş yap', icon: Monitor }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 px-3 py-1.5 text-[10px] whitespace-nowrap font-medium rounded-md transition-all ${activeTab === tab.id
                                ? 'bg-[#333] text-white shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">

                {activeTab === 'basic' && (
                    <div className="space-y-6">

                        {/* Video Transformation Section */}
                        {isVideo && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between group cursor-pointer">
                                    <h3 className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                                        <span className={activeTab === 'basic' ? "rotate-90" : ""}>▶</span> Dönüştürme
                                    </h3>
                                    <div title="Reset">
                                        <RefreshCcw className="w-3 h-3 text-zinc-500 hover:text-white cursor-pointer"
                                            onClick={() => onUpdateClip(selectedClip.id, { scale: 1, positionX: 0, positionY: 0, rotation: 0 })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pl-2 border-l border-zinc-800 ml-1">
                                    {/* Scale */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                            <span>Ölçek</span>
                                            <div className="flex items-center gap-1 bg-zinc-900 rounded px-1.5 py-0.5 border border-zinc-800">
                                                <input
                                                    type="number"
                                                    value={Math.round((selectedClip.scale ?? 1) * 100)}
                                                    onChange={(e) => onUpdateClip(selectedClip.id, { scale: parseFloat(e.target.value) / 100 })}
                                                    className="w-8 bg-transparent text-right focus:outline-none text-white appearance-none"
                                                />
                                                <span>%</span>
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="200"
                                            value={(selectedClip.scale ?? 1) * 100}
                                            onChange={(e) => onUpdateClip(selectedClip.id, { scale: parseFloat(e.target.value) / 100 })}
                                            className="w-full accent-teal-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>

                                    {/* Position */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] text-zinc-500 mb-1">
                                            <span>Konum</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1 flex items-center gap-2 bg-zinc-900 rounded px-2 py-1.5 border border-zinc-800">
                                                <span className="text-zinc-600 text-[10px] font-bold">X</span>
                                                <input
                                                    type="number"
                                                    value={Math.round(selectedClip.positionX ?? 0)}
                                                    onChange={(e) => onUpdateClip(selectedClip.id, { positionX: parseFloat(e.target.value) })}
                                                    className="w-full bg-transparent focus:outline-none text-white text-[11px]"
                                                />
                                            </div>
                                            <div className="flex-1 flex items-center gap-2 bg-zinc-900 rounded px-2 py-1.5 border border-zinc-800">
                                                <span className="text-zinc-600 text-[10px] font-bold">Y</span>
                                                <input
                                                    type="number"
                                                    value={Math.round(selectedClip.positionY ?? 0)}
                                                    onChange={(e) => onUpdateClip(selectedClip.id, { positionY: parseFloat(e.target.value) })}
                                                    className="w-full bg-transparent focus:outline-none text-white text-[11px]"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rotation */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                            <span>Döndür</span>
                                            <div className="flex items-center gap-1 bg-zinc-900 rounded px-1.5 py-0.5 border border-zinc-800">
                                                <input
                                                    type="number"
                                                    value={Math.round(selectedClip.rotation ?? 0)}
                                                    onChange={(e) => onUpdateClip(selectedClip.id, { rotation: parseFloat(e.target.value) })}
                                                    className="w-8 bg-transparent text-right focus:outline-none text-white appearance-none"
                                                />
                                                <span>°</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <RotateCw className="w-4 h-4 text-zinc-600" />
                                            <input
                                                type="range"
                                                min="-180"
                                                max="180"
                                                value={selectedClip.rotation ?? 0}
                                                onChange={(e) => onUpdateClip(selectedClip.id, { rotation: parseFloat(e.target.value) })}
                                                className="w-full accent-teal-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Volume Section (For both Audio and Video) */}
                        <div className="space-y-4 pt-4 border-t border-zinc-800">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                                    <Volume2 className="w-3.5 h-3.5" /> Ses
                                </h3>
                            </div>

                            <div className="space-y-2 pl-2 border-l border-zinc-800 ml-1">
                                <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                    <span>Ses Düzeyi (dB)</span>
                                    <span className="font-mono text-white">{dbValue} dB</span>
                                </div>
                                <input
                                    type="range"
                                    min="-60"
                                    max="10" // Allow up to +10dB
                                    step="1"
                                    value={dbValue}
                                    onChange={(e) => handleDbChange(parseInt(e.target.value))}
                                    className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-[9px] text-zinc-600 font-medium px-0.5">
                                    <span>-60dB</span>
                                    <span>0dB</span>
                                    <span>+10dB</span>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {activeTab !== 'basic' && (
                    <div className="flex flex-col items-center justify-center h-40 text-zinc-500 space-y-2">
                        <Wand2 className="w-8 h-8 opacity-20" />
                        <span className="text-xs">Bu özellik yakında eklenecek</span>
                    </div>
                )}
            </div>
        </div>
    );
}
