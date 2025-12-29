import { useState } from 'react';
import Link from 'next/link';
import { Zap, ZapOff, ArrowRight, Menu, X } from "lucide-react";

interface GlassNavbarProps {
    isLiteMode: boolean;
    toggleLiteMode: () => void;
}

export function GlassNavbar({ isLiteMode, toggleLiteMode }: GlassNavbarProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

                    {/* Desktop Navigation (Pills) */}
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

                    {/* CTA Button & Mobile Toggle */}
                    <div className="flex items-center space-x-4">
                        <Link href="/sign-in" className="hidden md:block text-sm font-medium text-white/80 hover:text-white transition-colors">
                            Log In
                        </Link>
                        <Link href="/studio" className="hidden md:flex rounded-full bg-white text-black px-6 py-2 text-sm font-medium hover:bg-gray-200 transition-colors items-center gap-2">
                            Get Started <ArrowRight size={16} />
                        </Link>

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMobileMenuOpen && (
                    <div className="md:hidden absolute top-20 left-4 right-4 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col space-y-2 animate-in slide-in-from-top-2 fade-in duration-200 shadow-2xl z-30">
                        <Link
                            href="/"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block px-4 py-3 rounded-xl hover:bg-white/10 text-white font-medium"
                        >
                            Home
                        </Link>
                        <Link
                            href="/pricing"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block px-4 py-3 rounded-xl hover:bg-white/10 text-white font-medium"
                        >
                            Pricing
                        </Link>
                        <Link
                            href="/about"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block px-4 py-3 rounded-xl hover:bg-white/10 text-white font-medium"
                        >
                            About Us
                        </Link>
                        <div className="h-px bg-white/10 my-2" />
                        <div className="flex items-center justify-between px-4 py-3">
                            <span className="text-white font-medium">Animations</span>
                            <button
                                onClick={toggleLiteMode}
                                className="p-2 bg-white/5 rounded-full"
                            >
                                {isLiteMode ? <ZapOff size={20} className="text-white" /> : <Zap size={20} className="text-white" />}
                            </button>
                        </div>
                        <div className="h-px bg-white/10 my-2" />
                        <Link
                            href="/sign-in"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block px-4 py-3 rounded-xl text-center text-white/80 hover:text-white font-medium"
                        >
                            Log In
                        </Link>
                        <Link
                            href="/studio"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block px-4 py-3 rounded-xl bg-white text-black text-center font-bold"
                        >
                            Get Started
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
}
