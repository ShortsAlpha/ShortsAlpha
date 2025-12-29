"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";
// Sources removed - they have their own pages now
import { StudioView } from "@/components/StudioView";
import { AIGenerationView } from "@/components/AIGenerationView";
import { RenderedVideos } from "@/components/RenderedVideos";
import { useProject } from "@/components/providers/project-provider";

type ViewState = 'studio' | 'rendered' | 'stats' | 'settings' | 'ai_generation';

export default function Home() {
    console.log("DEBUG: StudioView Import:", StudioView);

    const searchParams = useSearchParams();
    const router = useRouter();
    const { projectData, setProjectData } = useProject();

    // View Management
    const viewParam = searchParams.get('view') as ViewState;
    const initialView = viewParam || 'studio';
    const [activeView, setActiveView] = useState<ViewState>(initialView);

    // Sync state with URL
    useEffect(() => {
        // If query param exists (e.g. ?view=rendered), respect it.
        // But for 'story', 'fake', etc., they should ideally not land here anymore.
        if (viewParam && viewParam !== activeView) {
            setActiveView(viewParam);
        }
    }, [viewParam]);

    return (
        <main className="min-h-screen bg-zinc-950 text-white flex relative">
            <div className="flex-1 p-6 md:p-12 overflow-y-auto h-screen transition-all">

                {/* Editor View (Default) */}
                {activeView === "studio" && (
                    <StudioView
                        analysisResult={projectData.analysisResult}
                        onBack={() => router.push("/home")}
                        importedAssets={projectData.importedAssets}
                    />
                )}

                {/* Rendered Videos View */}
                {activeView === 'rendered' && (
                    <RenderedVideos />
                )}

                {/* AI Generation View (Asset generation inside studio) */}
                {activeView === 'ai_generation' && (
                    <AIGenerationView
                        onAddToStudio={(asset) => {
                            setProjectData({
                                importedAssets: [...projectData.importedAssets, asset]
                            });
                            setActiveView('studio');
                        }}
                    />
                )}

                {/* Coming Soon Screens */}
                {activeView === 'stats' && (
                    <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in duration-500">
                        <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-4">
                            Coming Soon
                        </h2>
                        <p className="text-zinc-500 max-w-sm text-center">
                            This feature is currently under development. Stay tuned for updates in the next alpha build!
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
