import { Upload, Wand2, Calculator, ArrowRight, Video, Sparkles } from "lucide-react";

interface DashboardProps {
    onSelectMode: (mode: 'remix' | 'create') => void;
}

export function Dashboard({ onSelectMode }: DashboardProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-7xl mx-auto px-6 animate-in fade-in duration-700">
            {/* Hero Section */}
            <div className="text-center space-y-4 mb-16">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                    Create Viral Shorts.
                </h1>
                <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-light">
                    The all-in-one studio for automated storytelling and video editing.
                </p>
            </div>

            {/* Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">

                {/* Option 1: Remix Existing */}
                <button
                    onClick={() => onSelectMode('remix')}
                    className="group relative flex flex-col items-start p-8 h-80 rounded-3xl bg-zinc-900/40 border border-white/5 hover:border-indigo-500/50 hover:bg-zinc-900/60 transition-all duration-300 overflow-hidden text-left"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="p-4 bg-zinc-800/50 rounded-2xl mb-6 group-hover:scale-110 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-all duration-300">
                        <Video className="w-8 h-8 text-zinc-300 group-hover:text-indigo-400" />
                    </div>

                    <div className="relative z-10 space-y-2">
                        <h2 className="text-3xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                            Remix Clip
                        </h2>
                        <p className="text-zinc-400 group-hover:text-zinc-300 leading-relaxed max-w-sm">
                            Upload an existing video file. Add visualizations, subtitles, and AI-enhanced edits instantly.
                        </p>
                    </div>

                    <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                        <ArrowRight className="w-6 h-6 text-indigo-400" />
                    </div>
                </button>

                {/* Option 2: Create New */}
                <button
                    onClick={() => onSelectMode('create')}
                    className="group relative flex flex-col items-start p-8 h-80 rounded-3xl bg-zinc-900/40 border border-white/5 hover:border-emerald-500/50 hover:bg-zinc-900/60 transition-all duration-300 overflow-hidden text-left"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="p-4 bg-zinc-800/50 rounded-2xl mb-6 group-hover:scale-110 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-all duration-300">
                        <Wand2 className="w-8 h-8 text-zinc-300 group-hover:text-emerald-400" />
                    </div>

                    <div className="relative z-10 space-y-2">
                        <h2 className="text-3xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                            Create New
                        </h2>
                        <p className="text-zinc-400 group-hover:text-zinc-300 leading-relaxed max-w-sm">
                            Start from scratch. Generate viral stories from Reddit, AI prompts, or custom text.
                        </p>
                    </div>

                    <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                        <ArrowRight className="w-6 h-6 text-emerald-400" />
                    </div>
                </button>
            </div>

            {/* Footer Stats / Social Proof */}
            <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-12 text-center opacity-40">
                <div className="space-y-1">
                    <div className="text-2xl font-bold text-white">2.5 Pro</div>
                    <div className="text-xs uppercase tracking-widest text-zinc-500">Model</div>
                </div>
                <div className="space-y-1">
                    <div className="text-2xl font-bold text-white">4K</div>
                    <div className="text-xs uppercase tracking-widest text-zinc-500">Export</div>
                </div>
                <div className="space-y-1">
                    <div className="text-2xl font-bold text-white">Multi</div>
                    <div className="text-xs uppercase tracking-widest text-zinc-500">Sources</div>
                </div>
                <div className="space-y-1">
                    <div className="text-2xl font-bold text-white">Fast</div>
                    <div className="text-xs uppercase tracking-widest text-zinc-500">Render</div>
                </div>
            </div>
        </div>
    );
}
