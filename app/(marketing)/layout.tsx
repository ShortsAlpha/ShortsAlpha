export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-black text-white">
            {/* Navbar Placeholder */}
            <header className="fixed top-0 w-full z-50 border-b border-zinc-800 bg-black/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between relative">
                    <a href="/" className="font-bold text-xl tracking-tighter">ShortsAlpha</a>

                    {/* Centered Nav */}
                    <div className="absolute left-1/2 -translate-x-1/2">
                        <a href="/pricing" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                            Pricing
                        </a>
                    </div>

                    <div className="flex items-center gap-4">
                        <a href="/sign-in" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
                            Log In
                        </a>
                        <a href="/sign-up" className="text-sm font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors">
                            Sign Up
                        </a>
                    </div>
                </div>
            </header>
            <main className="pt-16">
                {children}
            </main>
        </div>
    );
}
