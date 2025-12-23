"use client";
import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { CreateSourceView } from "@/components/CreateSourceView";
import { FakeChatSource } from "@/components/sources/FakeChatSource";
// AnalysisView removed
import { StudioView } from "@/components/StudioView";
import { AIGenerationView } from "@/components/AIGenerationView";
import { RenderedVideos } from "@/components/RenderedVideos";

type ViewState = 'dashboard' | 'create_source' | 'studio' | 'rendered' | 'stats' | 'settings' | 'ai_generation' | 'fake_chat';

export default function Home() {
    console.log("DEBUG: StudioView Import:", StudioView); // Check if undefined
    const [activeView, setActiveView] = useState<ViewState>("dashboard");
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [importedAssets, setImportedAssets] = useState<any[]>([]); // Bridge for AI Assets

    const handleSelectMode = (mode: 'remix' | 'create' | 'chat') => {
        if (mode === 'create') {
            setActiveView('create_source');
        } else if (mode === 'chat') {
            setActiveView('fake_chat');
        } else {
            // Remix / Create From Zero -> Go straight to Studio (Empty)
            setAnalysisResult({ script: [], metadata: {} }); // Reset/Empty
            setActiveView('studio');
        }
    };

    const handleScriptGenerated = (script: any) => {
        console.log("Script Generated:", script);
        // Normalize the script structure if needed so it matches backend result
        setAnalysisResult({
            script: script.script,
            virality_score: script.virality_score,
            keywords: script.keywords || []
        });
        setActiveView('studio');
    };

    return (
        <main className="min-h-screen bg-zinc-950 text-white flex relative">
            {/* Clerk User Button Overlay */}
            <div className="absolute top-4 right-4 z-50">
                <UserButton afterSignOutUrl="/" />
            </div>

            {/* Left Sidebar */}
            <Sidebar activeView={activeView} setActiveView={(view) => setActiveView(view as ViewState)} />

            {/* Main Content Area */}
            <div className="flex-1 ml-20 md:ml-64 p-6 md:p-12 overflow-y-auto h-screen transition-all">

                {activeView === "dashboard" && (
                    <Dashboard onSelectMode={handleSelectMode} />
                )}

                {activeView === "create_source" && (
                    <CreateSourceView
                        onBack={() => setActiveView("dashboard")}
                        onScriptGenerated={handleScriptGenerated}
                    />
                )}

                {/* Analysis View Removed */}

                {activeView === "fake_chat" && (
                    <FakeChatSource
                        onBack={() => setActiveView("dashboard")}
                        onGenerate={handleScriptGenerated}
                    />
                )}

                {activeView === "studio" && (
                    <StudioView
                        analysisResult={analysisResult}
                        onBack={() => setActiveView("dashboard")}
                        importedAssets={importedAssets}
                    />
                )}

                {/* Rendered Videos View */}
                {activeView === 'rendered' && (
                    <RenderedVideos />
                )}

                {/* AI Generation View */}
                {activeView === 'ai_generation' && (
                    <AIGenerationView
                        onAddToStudio={(asset) => {
                            setImportedAssets(prev => [...prev, asset]);
                            setActiveView('studio');
                        }}
                    />
                )}

                {/* Coming Soon Screens */}
                {(activeView === 'stats' || activeView === 'settings') && (
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
