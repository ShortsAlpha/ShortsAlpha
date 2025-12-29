"use client";

import { GlassNavbar } from "@/components/ui/glass-navbar";
import { ShaderBackground } from "@/components/ui/shader-background";
import { useLiteMode } from "@/hooks/use-lite-mode";

export default function AboutPage() {
    const { isLiteMode, toggleLiteMode } = useLiteMode();

    return (
        <main className="relative min-h-screen bg-black overflow-hidden selection:bg-white/20">
            {/* Background Shader */}
            <div className="fixed inset-0 z-0">
                <ShaderBackground isLiteMode={isLiteMode} />
            </div>

            {/* Content Container */}
            <div className="relative z-10 flex flex-col min-h-screen">
                <GlassNavbar isLiteMode={isLiteMode} toggleLiteMode={toggleLiteMode} />

                <section className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-4xl mx-auto space-y-8">
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white">
                        About <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">ShortsAlpha</span>
                    </h1>

                    <p className="text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed">
                        We are building the future of content creation. ShortsAlpha allows you to generate viral short-form videos in seconds using the power of advanced AI. Our mission is to empower creators to tell their stories without technical barriers.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left mt-12">
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                            <h3 className="text-xl font-semibold text-white mb-2">Innovation</h3>
                            <p className="text-white/60">Constantly pushing the boundaries of what AI can generate.</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                            <h3 className="text-xl font-semibold text-white mb-2">Speed</h3>
                            <p className="text-white/60">From idea to publish-ready video in less than a minute.</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                            <h3 className="text-xl font-semibold text-white mb-2">Quality</h3>
                            <p className="text-white/60">Professional grade visuals and audio, every single time.</p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
