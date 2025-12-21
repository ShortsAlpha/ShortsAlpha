import React from 'react';
import { TEXT_ANIMATIONS } from './constants';

interface AnimationPanelProps {
    selectedClip: any;
    onUpdateClip: (id: string, updates: any) => void;
}

export function AnimationPanel({ selectedClip, onUpdateClip }: AnimationPanelProps) {

    if (!selectedClip || selectedClip.type !== 'text') {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500 text-sm text-center px-6">
                <p>Select a Text Clip to browse animations.</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4 animate-in fade-in duration-300">
            <h3 className="text-white font-bold text-sm">Subtitle Animations</h3>
            <div className="grid grid-cols-2 gap-3">
                {TEXT_ANIMATIONS.map(anim => {
                    const isSelected = (selectedClip.style?.animation || 'none') === anim.value;

                    // Map value to CSS class
                    // Using the "preview" classes defined in globals.css which avoid positional translation
                    const animClassMap: Record<string, string> = {
                        'pop': 'anim-preview-pop',
                        'fade': 'anim-preview-fade',
                        'slide_up': 'anim-preview-slide',
                        'typewriter': 'anim-preview-typewriter',
                        'bounce': 'anim-preview-bounce',
                        'shake': 'anim-preview-shake',
                        'swing': 'anim-preview-swing',
                        'glitch': 'anim-preview-glitch'
                    };
                    const animClass = animClassMap[anim.value] || '';

                    return (
                        <button
                            key={anim.value}
                            onClick={() => onUpdateClip(selectedClip.id, {
                                style: { ...selectedClip.style, animation: anim.value }
                            })}
                            className={`relative h-24 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all overflow-hidden ${isSelected
                                    ? 'bg-indigo-500/20 border-indigo-500 ring-1 ring-indigo-500/50'
                                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800'
                                }`}
                        >
                            {/* Animation Preview */}
                            <div className="h-10 flex items-center justify-center">
                                <span
                                    className={`text-lg font-black text-white ${animClass}`}
                                    style={anim.value !== 'none' ? {
                                        animationIterationCount: 'infinite',
                                        animationDuration: anim.value === 'typewriter' ? '2s' : '1.5s',
                                        animationDelay: '0s' // Immediate
                                    } : {}}
                                >
                                    Abc
                                </span>
                            </div>
                            {/* Label */}
                            <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-indigo-300' : 'text-zinc-500'}`}>
                                {anim.label.split(' ')[0]} {/* Shorten Label */}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
