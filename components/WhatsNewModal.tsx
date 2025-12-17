import { useState, useEffect } from "react";
import { X, Sparkles, CheckCircle2, Zap } from "lucide-react";

const CURRENT_VERSION = "beta-v1.2.0"; // Increment this on deployments

export function WhatsNewModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const lastVersion = localStorage.getItem("shorts_alpha_version");
        if (lastVersion !== CURRENT_VERSION) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem("shorts_alpha_version", CURRENT_VERSION);
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-[500px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header with Gradient */}
                <div className="h-32 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                    <Sparkles className="w-16 h-16 text-white/20 absolute -bottom-4 -right-4 rotate-12" />
                    <div className="text-center relative z-10">
                        <h2 className="text-2xl font-bold text-white mb-1">What's New</h2>
                        <span className="text-xs font-medium text-white/80 bg-white/20 px-2 py-0.5 rounded-full border border-white/10">
                            {CURRENT_VERSION}
                        </span>
                    </div>
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <Item
                            icon={<Zap className="w-4 h-4 text-amber-400" />}
                            title="Touch Experience Refined"
                            desc="New 'Long Press' to drag assets prevents accidental drops. Timeline dragging is now smoother and drift-free on tablets."
                        />
                        <Item
                            icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                            title="Production Ready Export"
                            desc="Fixed public export issues with a new optimized backend. Volume controls now render accurately without crashing."
                        />
                        <Item
                            icon={<Sparkles className="w-4 h-4 text-indigo-400" />}
                            title="Visual Upgrades"
                            desc="Video thumbnails now play on hover. UI layout cleaned up for a professional workflow."
                        />
                    </div>

                    <button
                        onClick={handleClose}
                        className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-900 font-bold rounded-xl transition-colors"
                    >
                        Got it, Let's Create!
                    </button>
                </div>
            </div>
        </div>
    );
}

function Item({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                {icon}
            </div>
            <div>
                <h3 className="text-sm font-bold text-zinc-200 mb-1">{title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-sm">{desc}</p>
            </div>
        </div>
    );
}
