"use client";
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { CreateSourceView } from "@/components/CreateSourceView";
// AnalysisView removed
import { StudioView } from "@/components/StudioView";

type ViewState = 'dashboard' | 'create_source' | 'studio'; // Removed 'analysis' from ViewState

export default function Home() {
    const [activeView, setActiveView] = useState<ViewState>("dashboard");
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    const handleSelectMode = (mode: 'remix' | 'create') => {
        // user said "analysis screen is unnecessary. Remix clip will send us there".
        // So both modes should probably just go to Studio or Analysis is skipped.
        // If mode is 'remix', we usually go to Studio with empty state?
        // Let's just set View to 'studio' directly for both, or just handle Remix.
        // Actually, if I remove 'analysis', I should just jump to 'studio'.

        // Mock Analysis Result for now to satisfy prop
        const mockAnalysis = {
            script: [],
            metadata: {}
        };
        setAnalysisResult(mockAnalysis);
        setActiveView('studio'); // Corrected from setCurrentView to setActiveView
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
        <main className="min-h-screen bg-zinc-950 text-white flex">
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

                {activeView === "studio" && (
                    <StudioView analysisResult={analysisResult} />
                )}
            </div>
        </main>
    );
}
