"use client"

import { CreateSourceView } from "@/components/CreateSourceView"
import { useRouter } from "next/navigation"
import { useProject } from "@/components/providers/project-provider"

export default function StoryPage() {
    const router = useRouter()
    const { setProjectData } = useProject()

    const handleScriptGenerated = (script: any) => {
        // Construct standard Analysis Result format
        const analysisResult = {
            script: script.script,
            virality_score: script.virality_score,
            keywords: script.keywords || [],
            metadata: script.metadata || {}
        }

        // Save to global context
        setProjectData({ analysisResult })

        // Navigate to Studio Editor
        router.push('/studio')
    }

    return (
        <div className="flex-1 p-6 md:p-12 overflow-y-auto h-screen">
            <CreateSourceView
                onBack={() => router.push("/home")}
                onScriptGenerated={handleScriptGenerated}
            />
        </div>
    )
}
