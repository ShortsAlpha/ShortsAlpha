import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Clapperboard, Settings, Home, Video, Sparkles, Shield } from "lucide-react";

interface SidebarProps {
    activeView: string;
    setActiveView: (view: string) => void;
}

export function Sidebar({ activeView, setActiveView }: SidebarProps) {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const menuItems = [
        { id: "dashboard", label: "Home", icon: Home },
        { id: "studio", label: "Studio", icon: Clapperboard },
        { id: "ai_generation", label: "AI Generation", icon: Sparkles },
        { id: "rendered", label: "Rendered Videos", icon: Video },
        { id: "stats", label: "Channel Stats", icon: LayoutDashboard },
    ];

    // Check for Admin
    if (isLoaded && user?.publicMetadata?.plan === 'admin') {
        menuItems.push({ id: "admin", label: "Admin Panel", icon: Shield });
        // Insert Admin Panel or handle distinct route
        // Since Sidebar usually handles view switching within "/app", we might need to link to /admin directly
        // But here we are using `setActiveView` which implies client-side view switching.
        // However, /admin is a separate page file. 
        // Let's verify Sidebar context. It seems Sidebar controls views in /studio?
        // No, Sidebar is in layout or page? checking file...
        // Sidebar is used in `app/(main)/layout.tsx` ? No, likely used in Dashboard or new Layout.
        // Wait, the user asked for an "Admin Panel". The Sidebar seems to switch "views" inside a main container.
        // If I add "admin", I either need a view for it OR a link.
        // Let's add it as a link-like button or verify if we can switch to "admin" view.
        // Actually, I made `app/(main)/admin/page.tsx` which is a route.
        // The Sidebar items use `setActiveView`.
        // Let's check `Sidebar` usage source.
    }

    if (!mounted) return null;

    return (
        <div className="w-20 md:w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col h-screen fixed left-0 top-0 z-50">
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg flex-shrink-0"></div>
                <span className="font-bold text-xl tracking-tight hidden md:block bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                    ShortsAlpha
                </span>
            </div>

            <nav className="flex-1 px-4 py-8 space-y-2">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.id === 'admin') {
                                    router.push('/admin');
                                } else {
                                    setActiveView(item.id);
                                }
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? "bg-indigo-600/10 text-indigo-400 shadow-lg shadow-indigo-900/20 ring-1 ring-indigo-500/20"
                                : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? "text-indigo-400" : "group-hover:text-white"}`} />
                            <span className="font-medium hidden md:block">{item.label}</span>
                            {isActive && (
                                <div className="absolute right-0 w-1 h-8 bg-indigo-500 rounded-l-full hidden md:block opacity-0 lg:opacity-100" />
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-zinc-900">
                <button
                    onClick={() => setActiveView("settings")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${activeView === "settings"
                        ? "bg-indigo-600/10 text-indigo-400 shadow-lg shadow-indigo-900/20 ring-1 ring-indigo-500/20"
                        : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                        }`}
                >
                    <Settings className={`w-5 h-5 transition-transform ${activeView === "settings" ? "rotate-90 text-indigo-400" : "group-hover:rotate-90"}`} />
                    <span className="font-medium hidden md:block">Settings</span>
                </button>
                <div className="mt-4 bg-zinc-900/50 rounded-lg p-3 text-xs text-zinc-500 text-center">
                    <span className="hidden md:inline">Alpha Build v0.1</span>
                    <span className="md:hidden">v0.1</span>
                </div>
            </div>
        </div>
    );
}
