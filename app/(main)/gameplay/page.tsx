"use client"

import { SplitScreenSetup } from "@/components/sources/SplitScreenSetup"
import { useRouter } from "next/navigation"
import { useProject } from "@/components/providers/project-provider"

export default function GameplayPage() {
    const router = useRouter()
    const { setProjectData } = useProject()

    const handleScriptGenerated = (script: any) => {
        const analysisResult = {
            script: script.script,
            virality_score: script.virality_score,
            keywords: script.keywords || [],
            metadata: script.metadata || {}
        }

        setProjectData({ analysisResult })
        router.push('/studio')
    }

    return (
        <div className="flex-1 p-6 md:p-12 overflow-y-auto h-screen">
            <SplitScreenSetup
                onBack={() => router.push("/home")}
                onGenerate={handleScriptGenerated}
            />
        </div>
    )
}
