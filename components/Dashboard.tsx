import { Video, Sparkles, ArrowRight, Wand2, Layers, Lock, Crown, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface DashboardProps {
    onSelectMode: (mode: 'remix' | 'create' | 'chat' | 'split' | 'auto_shorts') => void;
}

export function Dashboard({ onSelectMode }: DashboardProps) {
    const [mounted, setMounted] = useState(false);
    const { user, isLoaded } = useUser();
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !isLoaded) return null;

    const plan = user?.publicMetadata?.plan as string || 'free';
    const isFree = plan === 'free';

    const handleLockedAction = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push('/pricing');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-7xl mx-auto px-6 animate-in fade-in duration-700">
            {/* Hero Section */}
            <div className="text-center space-y-4 mb-12">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-white dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent">
                    Create Viral Shorts.
                </h1>
                <p className="text-xl text-muted-foreground dark:text-zinc-400 max-w-2xl mx-auto font-light">
                    The all-in-one studio for automated storytelling and video editing.
                </p>

                {isFree && (
                    <div className="pt-4">
                        <Link href="/pricing" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity">
                            <Crown className="w-4 h-4" />
                            Upgrade to Pro
                        </Link>
                    </div>
                )}
            </div>

            {/* Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">

                {/* Option 1: Create From Zero (Always Free) */}
                <button
                    id="tour-card-remix"
                    onClick={() => onSelectMode('remix')}
                    className="group relative flex flex-col items-start p-8 h-80 rounded-3xl bg-card border border-border dark:bg-zinc-900/40 dark:border-white/5 hover:border-indigo-500/50 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 transition-all duration-300 overflow-hidden text-left shadow-sm dark:shadow-none"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl mb-6 group-hover:scale-110 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-all duration-300">
                        <Video className="w-8 h-8 text-zinc-600 dark:text-zinc-300 group-hover:text-indigo-400" />
                    </div>

                    <div className="relative z-10 space-y-2">
                        <h2 className="text-3xl font-bold text-foreground dark:text-white group-hover:text-indigo-500 dark:group-hover:text-indigo-300 transition-colors">
                            Create from Zero
                        </h2>
                        <p className="text-muted-foreground dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 leading-relaxed max-w-sm">
                            Start a fresh project. Upload your own assets and edit manually on the timeline.
                        </p>
                    </div>

                    <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                        <ArrowRight className="w-6 h-6 text-indigo-400" />
                    </div>
                </button>

                {/* Option 2: Create Reddit Story (Gated) */}
                <button
                    id="tour-card-create"
                    onClick={(e) => isFree ? handleLockedAction(e) : onSelectMode('create')}
                    className={`group relative flex flex-col items-start p-8 h-80 rounded-3xl border transition-all duration-300 overflow-hidden text-left shadow-sm dark:shadow-none
                        ${isFree
                            ? 'bg-zinc-100/50 dark:bg-zinc-900/20 border-border dark:border-white/5 opacity-75 hover:opacity-100 hover:border-purple-500/30'
                            : 'bg-card dark:bg-zinc-900/40 border-border dark:border-white/5 hover:border-emerald-500/50 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
                        }`}
                >
                    <div className={`absolute inset-0 bg-gradient-to-br transition-opacity opacity-0 group-hover:opacity-100 
                        ${isFree ? 'from-purple-500/5' : 'from-emerald-500/5'}`} />

                    <div className="flex justify-between w-full">
                        <div className={`p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl mb-6 group-hover:scale-110 transition-all duration-300
                            ${isFree ? 'group-hover:text-purple-400' : 'group-hover:bg-emerald-500/20 group-hover:text-emerald-400'}`}>
                            <Sparkles className={`w-8 h-8 text-zinc-600 dark:text-zinc-300 ${isFree ? 'group-hover:text-purple-400' : 'group-hover:text-emerald-400'}`} />
                        </div>
                        {isFree && <Lock className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />}
                    </div>

                    <div className="relative z-10 space-y-2">
                        <h2 className={`text-3xl font-bold text-foreground dark:text-white transition-colors ${isFree ? 'group-hover:text-purple-500 dark:group-hover:text-purple-300' : 'group-hover:text-emerald-500 dark:group-hover:text-emerald-300'}`}>
                            Create Reddit Story
                        </h2>
                        <p className="text-muted-foreground dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 leading-relaxed max-w-sm">
                            Generate viral stories automatically from Reddit posts, AI prompts, or custom text.
                        </p>
                    </div>

                    <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                        {isFree ? <Crown className="w-6 h-6 text-purple-400" /> : <ArrowRight className="w-6 h-6 text-emerald-400" />}
                    </div>
                </button>

                {/* Option 3: Create Fake Chat (Gated) */}
                <button
                    id="tour-card-chat"
                    onClick={(e) => isFree ? handleLockedAction(e) : onSelectMode('chat')}
                    className={`group relative flex flex-col items-start p-8 h-80 rounded-3xl border transition-all duration-300 overflow-hidden text-left shadow-sm dark:shadow-none
                        ${isFree
                            ? 'bg-zinc-100/50 dark:bg-zinc-900/20 border-border dark:border-white/5 opacity-75 hover:opacity-100 hover:border-purple-500/30'
                            : 'bg-card dark:bg-zinc-900/40 border-border dark:border-white/5 hover:border-blue-500/50 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
                        }`}
                >
                    <div className={`absolute inset-0 bg-gradient-to-br transition-opacity opacity-0 group-hover:opacity-100 
                        ${isFree ? 'from-purple-500/5' : 'from-blue-500/5'}`} />

                    <div className="flex justify-between w-full">
                        <div className={`p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl mb-6 group-hover:scale-110 transition-all duration-300
                            ${isFree ? 'group-hover:text-purple-400' : 'group-hover:bg-blue-500/20 group-hover:text-blue-400'}`}>
                            <Wand2 className={`w-8 h-8 text-zinc-600 dark:text-zinc-300 ${isFree ? 'group-hover:text-purple-400' : 'group-hover:text-blue-400'}`} />
                        </div>
                        {isFree && <Lock className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />}
                    </div>

                    <div className="relative z-10 space-y-2">
                        <h2 className={`text-3xl font-bold text-foreground dark:text-white transition-colors ${isFree ? 'group-hover:text-purple-500 dark:group-hover:text-purple-300' : 'group-hover:text-blue-500 dark:group-hover:text-blue-300'}`}>
                            Fake Chat Story
                        </h2>
                        <p className="text-muted-foreground dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 leading-relaxed max-w-sm">
                            Turn text conversations into viral videos. Choose voices & auto-generate visuals.
                        </p>
                    </div>

                    <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                        {isFree ? <Crown className="w-6 h-6 text-purple-400" /> : <ArrowRight className="w-6 h-6 text-blue-400" />}
                    </div>
                </button>

                {/* Option 4: Split Gameplay (Always Free for now) */}
                <button
                    id="tour-card-split"
                    onClick={() => onSelectMode('split')}
                    className="group relative flex flex-col items-start p-8 h-80 rounded-3xl bg-card border border-border dark:bg-zinc-900/40 dark:border-white/5 hover:border-orange-500/50 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 transition-all duration-300 overflow-hidden text-left shadow-sm dark:shadow-none"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl mb-6 group-hover:scale-110 group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-all duration-300">
                        <Layers className="w-8 h-8 text-zinc-600 dark:text-zinc-300 group-hover:text-orange-400" />
                    </div>

                    <div className="relative z-10 space-y-2">
                        <h2 className="text-3xl font-bold text-foreground dark:text-white group-hover:text-orange-500 dark:group-hover:text-orange-300 transition-colors">
                            Gameplay Split
                        </h2>
                        <p className="text-muted-foreground dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 leading-relaxed max-w-sm">
                            Combine your video with viral gameplay clips (Minecraft, GTA) for max retention.
                        </p>
                    </div>

                    <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                        <ArrowRight className="w-6 h-6 text-orange-400" />
                    </div>
                </button>
                {/* Option 5: Auto Podcast Shorts (Gated) */}
                <button
                    id="tour-card-auto_shorts"
                    onClick={(e) => isFree ? handleLockedAction(e) : onSelectMode('auto_shorts')}
                    className={`group relative flex flex-col items-start p-8 h-80 rounded-3xl border transition-all duration-300 overflow-hidden text-left md:col-span-2 shadow-sm dark:shadow-none
                        ${isFree
                            ? 'bg-zinc-100/50 dark:bg-zinc-900/20 border-border dark:border-white/5 opacity-75 hover:opacity-100 hover:border-pink-500/30'
                            : 'bg-card dark:bg-zinc-900/40 border-border dark:border-white/5 hover:border-pink-500/50 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
                        }`}
                >
                    <div className={`absolute inset-0 bg-gradient-to-br transition-opacity opacity-0 group-hover:opacity-100 
                        ${isFree ? 'from-pink-500/5' : 'from-pink-500/10'}`} />

                    <div className="flex justify-between w-full">
                        <div className={`p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl mb-6 group-hover:scale-110 transition-all duration-300
                            ${isFree ? 'group-hover:text-pink-400' : 'group-hover:bg-pink-500/20 group-hover:text-pink-400'}`}>
                            <Users className={`w-8 h-8 text-zinc-600 dark:text-zinc-300 ${isFree ? 'group-hover:text-pink-400' : 'group-hover:text-pink-400'}`} />
                        </div>
                        {isFree && <Lock className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />}
                    </div>

                    <div className="relative z-10 space-y-2">
                        <h2 className={`text-3xl font-bold text-foreground dark:text-white transition-colors ${isFree ? 'group-hover:text-pink-300' : 'group-hover:text-pink-300'}`}>
                            Auto Podcast Shorts (Face Crop)
                        </h2>
                        <p className="text-muted-foreground dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 leading-relaxed max-w-xl">
                            Turn horizontal podcasts into vertical shorts instantly. AI detects faces and auto-crops speakers.
                        </p>
                    </div>

                    <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                        {isFree ? <Crown className="w-6 h-6 text-purple-400" /> : <ArrowRight className="w-6 h-6 text-pink-400" />}
                    </div>
                </button>
            </div>

            {/* Footer Stats / Social Proof */}
            <div className="mt-16 text-center space-y-8 animate-in slide-in-from-bottom-5 duration-1000">

            </div>
        </div>
    );
}
