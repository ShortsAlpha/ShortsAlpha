"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

interface ProjectData {
    analysisResult: any | null
    importedAssets: any[]
}

interface ProjectContextType {
    projectData: ProjectData
    setProjectData: (data: Partial<ProjectData>) => void
    clearProject: () => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: React.ReactNode }) {
    const [projectData, setProjectDataState] = useState<ProjectData>({
        analysisResult: null,
        importedAssets: []
    })

    // Load from LocalStorage on mount to persist across navigation/refreshes
    useEffect(() => {
        const saved = localStorage.getItem('shorts_alpha_project')
        if (saved) {
            try {
                setProjectDataState(JSON.parse(saved))
            } catch (e) {
                console.error("Failed to load project from storage", e)
            }
        }
    }, [])

    // Save to LocalStorage whenever it changes
    const setProjectData = (data: Partial<ProjectData>) => {
        setProjectDataState(prev => {
            const newState = { ...prev, ...data }
            localStorage.setItem('shorts_alpha_project', JSON.stringify(newState))
            return newState
        })
    }

    const clearProject = () => {
        const resetState = { analysisResult: null, importedAssets: [] }
        setProjectDataState(resetState)
        localStorage.removeItem('shorts_alpha_project')
    }

    return (
        <ProjectContext.Provider value={{ projectData, setProjectData, clearProject }}>
            {children}
        </ProjectContext.Provider>
    )
}

export function useProject() {
    const context = useContext(ProjectContext)
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider')
    }
    return context
}
