'use client';

import Link from 'next/link';
import { Zap, ZapOff, ArrowRight } from "lucide-react";

interface GlassNavbarProps {
    isLiteMode: boolean;
    toggleLiteMode: () => void;
}

export function GlassNavbar({ isLiteMode, toggleLiteMode }: GlassNavbarProps) {
    return (
        <nav className="relative z-20 w-full pt-4">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Brand Name */}
                    <div className="flex items-center">
                        <Link href="/">
                            <span className="text-xl font-bold text-white">ShortsAlpha</span>
                        </Link>
                    </div>

                    {/* Glassmorphic Pills */}
                    <div className="hidden md:flex items-center space-x-1 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 p-1">
                        <Link href="/" className="rounded-full px-4 py-2 text-sm font-medium text-white/90 transition-all hover:bg-white/10 hover:text-white">
                            Home
                        </Link>
                        <Link href="/pricing" className="rounded-full px-4 py-2 text-sm font-medium text-white/90 transition-all hover:bg-white/10 hover:text-white">
                            Pricing
                        </Link>
                        <Link href="/about" className="rounded-full px-4 py-2 text-sm font-medium text-white/90 transition-all hover:bg-white/10 hover:text-white">
                            About Us
                        </Link>
                        {/* Lite Mode Toggle in Navbar */}
                        <button
                            onClick={toggleLiteMode}
                            className="rounded-full px-3 py-2 text-sm font-medium text-white/90 transition-all hover:bg-white/10 hover:text-white flex items-center gap-2"
                            title={isLiteMode ? "Enable Animation" : "Lite Mode (Save Battery)"}
                        >
                            {isLiteMode ? <ZapOff size={16} /> : <Zap size={16} />}
                        </button>
                    </div>

                    {/* CTA Button */}
                    <div className="flex items-center space-x-4">
                        <Link href="/sign-in" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                            Log In
                        </Link>
                        <Link href="/studio" className="rounded-full bg-white text-black px-6 py-2 text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2">
                            Get Started <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
