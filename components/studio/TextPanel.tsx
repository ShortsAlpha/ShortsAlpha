import React from 'react';
import { Type, Heading, AlignLeft, Palette, Sparkles, Zap, Monitor, Terminal } from 'lucide-react';

interface TextPanelProps {
    onAddText: (text: string, stylePreset: any) => void;
}

const PRESETS = [
    {
        name: "Heading",
        label: "Default Heading",
        icon: Heading,
        style: {
            fontSize: 80,
            fontFamily: "Montserrat",
            fontWeight: "900",
            fill: "#ffffff",
            stroke: "#000000",
            strokeWidth: 2,
            shadowColor: "rgba(0,0,0,0.5)",
            shadowBlur: 10
        }
    },
    {
        name: "Subheading",
        label: "Subheading",
        icon: Type,
        style: {
            fontSize: 50,
            fontFamily: "Roboto",
            fontWeight: "700",
            fill: "#fbbf24", // Amber
            stroke: "transparent",
            strokeWidth: 0,
            shadowColor: "rgba(0,0,0,0.5)",
            shadowBlur: 4
        }
    },
    {
        name: "Body Text",
        label: "Normal Text",
        icon: AlignLeft,
        style: {
            fontSize: 32,
            fontFamily: "Inter",
            fontWeight: "400",
            fill: "#e4e4e7", // Zinc 200
            stroke: "transparent",
            strokeWidth: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: 10
        }
    },
    {
        name: "Neon Glow",
        label: "Neon",
        icon: Zap,
        style: {
            fontSize: 70,
            fontFamily: "Montserrat",
            fontWeight: "900",
            fill: "#ffffff",
            stroke: "#ec4899", // Pink
            strokeWidth: 2,
            shadowColor: "#ec4899",
            shadowBlur: 20
        }
    },
    {
        name: "Retro",
        label: "80s Retro",
        icon: Monitor,
        style: {
            fontSize: 60,
            fontFamily: "Bebas Neue",
            fontWeight: "400",
            fill: "#ef4444", // Red
            stroke: "#3b82f6", // Blue stroke
            strokeWidth: 3,
            shadowColor: "rgba(0,0,0,0.8)",
            shadowBlur: 0
        }
    },
    {
        name: "Glitch",
        label: "Cyberpunk",
        icon: Terminal,
        style: {
            fontSize: 65,
            fontFamily: "Oswald",
            fontWeight: "700",
            fill: "#22c55e", // Green
            stroke: "#000000",
            strokeWidth: 1,
            backgroundColor: "#000000",
            padding: 5
        }
    },
    {
        name: "Cinematic",
        label: "Cinematic",
        icon: Sparkles,
        style: {
            fontSize: 55,
            fontFamily: "Garamond", // Fallback if not loaded
            fontWeight: "400",
            fill: "#e2e8f0",
            stroke: "transparent",
            strokeWidth: 0,
            letterSpacing: "5px",
            textTransform: "uppercase"
        }
    },
    {
        name: "Boxed",
        label: "Boxed Highlight",
        icon: Palette,
        style: {
            fontSize: 45,
            fontFamily: "Inter",
            fontWeight: "800",
            fill: "#000000",
            stroke: "none",
            backgroundColor: "#fbbf24", // Amber bg
            padding: 10,
            borderRadius: 8
        }
    }
];

export function TextPanel({ onAddText }: TextPanelProps) {
    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] animate-in fade-in duration-300">
            <div className="p-4 border-b border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Type className="w-4 h-4" /> Text / Titles
                </h3>
                <p className="text-[10px] text-zinc-500 mt-1">
                    Click a style to add text. Edit content in Properties.
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                <div className="grid grid-cols-2 gap-3">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.name}
                            onClick={() => onAddText(preset.name, preset.style)}
                            className="flex flex-col items-center justify-center gap-3 p-6 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 rounded-xl transition-all group active:scale-95"
                        >
                            <preset.icon className="w-8 h-8 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                            <div className="text-center">
                                <span className="block text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">{preset.label}</span>
                                <span className="block text-[10px] text-zinc-600 mt-1">{preset.name}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
