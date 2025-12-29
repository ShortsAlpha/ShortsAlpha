"use client"

import { FakeChatSource } from "@/components/sources/FakeChatSource"
import { useRouter } from "next/navigation"
import { useProject } from "@/components/providers/project-provider"

export default function FakeChatPage() {
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
            <FakeChatSource
                onBack={() => router.push("/home")}
                onGenerate={handleScriptGenerated}
            />
        </div>
    )
}
