"use client";
import { LayoutDashboard, Clapperboard, Settings, Home } from "lucide-react";

interface SidebarProps {
    activeView: string;
    setActiveView: (view: string) => void;
}

export function Sidebar({ activeView, setActiveView }: SidebarProps) {
    const menuItems = [
        { id: "dashboard", label: "Home", icon: Home },
        // Analysis Removed
        { id: "studio", label: "Studio", icon: Clapperboard },
    ];

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
                            onClick={() => setActiveView(item.id)}
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
                <div className="bg-zinc-900/50 rounded-lg p-3 text-xs text-zinc-500 text-center">
                    <span className="hidden md:inline">Alpha Build v0.1</span>
                    <span className="md:hidden">v0.1</span>
                </div>
            </div>
        </div>
    );
}
