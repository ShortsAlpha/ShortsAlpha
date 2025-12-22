import Link from "next/link";
import { Plus } from "lucide-react";
import { RenderedVideos } from "@/components/RenderedVideos"; // Reuse existing component

export default function DashboardPage() {
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-zinc-400">Manage your projects and rendered videos.</p>
                </div>
                <Link
                    href="/studio"
                    className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors"
                >
                    <Plus className="w-5 h-5" /> Create New Project
                </Link>
            </div>

            {/* Recent Renders (Reusing the History Grid) */}
            <section className="space-y-4">
                <h2 className="text-xl font-bold text-zinc-200">Recent Renders</h2>
                <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
                    <RenderedVideos />
                </div>
            </section>
        </div>
    );
}
