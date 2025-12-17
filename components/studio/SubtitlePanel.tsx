import React from 'react';
import { Sparkles, Type, CheckCircle2 } from 'lucide-react';

interface SubtitlePanelProps {
    onGenerateSubtitles: () => void;
    isGenerating: boolean;
}

export function SubtitlePanel({ onGenerateSubtitles, isGenerating }: SubtitlePanelProps) {
    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] animate-in fade-in duration-300">
            <div className="p-4 border-b border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Type className="w-4 h-4" /> Altyazılar
                </h3>
                <p className="text-[10px] text-zinc-500 mt-1">
                    Videodaki konuşmaları otomatik olarak yazıya dökün.
                </p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center ring-1 ring-white/10">
                    <Sparkles className="w-8 h-8 text-indigo-400" />
                </div>

                <div className="space-y-2">
                    <h4 className="text-zinc-200 font-medium text-sm">Otomatik Altyazı</h4>
                    <p className="text-zinc-500 text-xs max-w-[200px] mx-auto">
                        Yapay zeka ile videonuzu analiz edip senkronize altyazılar oluşturun.
                    </p>
                </div>

                <button
                    onClick={onGenerateSubtitles}
                    disabled={isGenerating}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGenerating ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            <span>Oluşturuluyor...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            <span>Altyazı Oluştur</span>
                        </>
                    )}
                </button>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                <div className="flex items-start gap-2 text-[10px] text-zinc-500">
                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5" />
                    <p>Türkçe ve İngilizce desteği mevcuttur.</p>
                </div>
            </div>
        </div>
    );
}
