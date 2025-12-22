"use client";
import Link from "next/link";
import { ArrowRight, Video, Zap, Type, Play } from "lucide-react";
import { useState, useEffect } from "react";

export default function LandingPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;
    return (
        <div className="flex flex-col min-h-[calc(100vh-64px)]">
            {/* Hero Section */}
            <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 space-y-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800 via-black to-black">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
                    Create Viral Shorts<br />in Seconds.
                </h1>
                <p className="max-w-2xl text-lg text-zinc-400">
                    Professional AI Video Editor for creators. Generate captions and add stock footage with one click.
                </p>
                <Link
                    href="/studio"
                    className="group flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-zinc-200 transition-all hover:scale-105"
                >
                    Get Started Free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
            </section>

            {/* Features Grid */}
            <section className="py-24 px-4 max-w-7xl mx-auto w-full grid md:grid-cols-3 gap-8">
                <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                        <Type className="w-6 h-6 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Auto-Captions</h3>
                    <p className="text-zinc-400">Generate 99% accurate captions automatically. Style them like pro creators.</p>
                </div>
                <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4">
                        <Video className="w-6 h-6 text-purple-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Stock Library</h3>
                    <p className="text-zinc-400">Access millions of royalty-free stock videos and images instantly.</p>
                </div>
                <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                        <Zap className="w-6 h-6 text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">AI Voiceover</h3>
                    <p className="text-zinc-400">Turn text into lifelike speech with ultra-realistic AI voices.</p>
                </div>
            </section>
        </div>
    );
}
