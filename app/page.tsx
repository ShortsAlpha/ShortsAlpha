"use client";
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { CreateSourceView } from "@/components/CreateSourceView";
import { AnalysisView } from "@/components/AnalysisView";
import { StudioView } from "@/components/StudioView";

type ViewState = 'dashboard' | 'create_source' | 'analysis' | 'studio';

export default function Home() {
    const [activeView, setActiveView] = useState<ViewState>("dashboard");
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    const handleDashboardSelect = (mode: 'remix' | 'create') => {
        if (mode === 'remix') {
            setActiveView('analysis');
        } else {
            setActiveView('create_source');
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
        <main className="min-h-screen bg-zinc-950 text-white flex">
            {/* Left Sidebar */}
            <Sidebar activeView={activeView} setActiveView={(view) => setActiveView(view as ViewState)} />

            {/* Main Content Area */}
            <div className="flex-1 ml-20 md:ml-64 p-6 md:p-12 overflow-y-auto h-screen transition-all">

                {activeView === "dashboard" && (
                    <Dashboard onSelectMode={handleDashboardSelect} />
                )}

                {activeView === "create_source" && (
                    <CreateSourceView
                        onBack={() => setActiveView("dashboard")}
                        onScriptGenerated={handleScriptGenerated}
                    />
                )}

                {activeView === "analysis" && (
                    <AnalysisView
                        analysisResult={analysisResult}
                        setAnalysisResult={setAnalysisResult}
                        onAnalysisComplete={() => setActiveView("studio")}
                    />
                )}

                {activeView === "studio" && (
                    <StudioView analysisResult={analysisResult} />
                )}
            </div>
        </main>
    );
}
