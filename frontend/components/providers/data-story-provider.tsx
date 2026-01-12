"use client"

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"

export interface DataStory {
    story: string
    generated_at: string
}

interface DataStoryContextValue {
    getStory: (fileId: string) => DataStory | null
    setStory: (fileId: string, story: DataStory) => void
    clearStory: (fileId: string) => void
    isEnabled: (fileId: string) => boolean
    setEnabled: (fileId: string, enabled: boolean) => void
}

const DataStoryContext = createContext<DataStoryContextValue | null>(null)

const STORAGE_KEY_PREFIX = "data_story_"
const ENABLED_KEY_PREFIX = "data_story_enabled_"

export function useDataStory() {
    const context = useContext(DataStoryContext)
    if (!context) {
        throw new Error("useDataStory must be used within a DataStoryProvider")
    }
    return context
}

interface DataStoryProviderProps {
    children: ReactNode
}

export function DataStoryProvider({ children }: DataStoryProviderProps) {
    // In-memory cache: fileId -> DataStory
    const [cache, setCache] = useState<Record<string, DataStory>>({})
    // Toggle state: fileId -> boolean
    const [enabledState, setEnabledState] = useState<Record<string, boolean>>({})

    // Hydrate from localStorage on mount
    useEffect(() => {
        if (typeof window === "undefined") return

        // We don't eagerly load all stories, just enable states
        const keys = Object.keys(localStorage).filter(k => k.startsWith(ENABLED_KEY_PREFIX))
        const enabled: Record<string, boolean> = {}

        keys.forEach(key => {
            const fileId = key.replace(ENABLED_KEY_PREFIX, "")
            enabled[fileId] = localStorage.getItem(key) === "true"
        })

        setEnabledState(enabled)
    }, [])

    const getStory = useCallback((fileId: string): DataStory | null => {
        // Check in-memory cache first
        if (cache[fileId]) {
            return cache[fileId]
        }

        // Hydrate from localStorage
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem(STORAGE_KEY_PREFIX + fileId)
            if (stored) {
                try {
                    const parsed = JSON.parse(stored) as DataStory
                    setCache(prev => ({ ...prev, [fileId]: parsed }))
                    return parsed
                } catch (e) {
                    localStorage.removeItem(STORAGE_KEY_PREFIX + fileId)
                }
            }
        }

        return null
    }, [cache])

    const setStory = useCallback((fileId: string, story: DataStory) => {
        setCache(prev => ({ ...prev, [fileId]: story }))
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY_PREFIX + fileId, JSON.stringify(story))
        }
    }, [])

    const clearStory = useCallback((fileId: string) => {
        setCache(prev => {
            const { [fileId]: _, ...rest } = prev
            return rest
        })
        setEnabledState(prev => {
            const { [fileId]: _, ...rest } = prev
            return rest
        })
        if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEY_PREFIX + fileId)
            localStorage.removeItem(ENABLED_KEY_PREFIX + fileId)
        }
    }, [])

    const isEnabled = useCallback((fileId: string): boolean => {
        return enabledState[fileId] ?? false
    }, [enabledState])

    const setEnabled = useCallback((fileId: string, enabled: boolean) => {
        setEnabledState(prev => ({ ...prev, [fileId]: enabled }))
        if (typeof window !== "undefined") {
            localStorage.setItem(ENABLED_KEY_PREFIX + fileId, String(enabled))
        }
    }, [])

    const value: DataStoryContextValue = {
        getStory,
        setStory,
        clearStory,
        isEnabled,
        setEnabled
    }

    return (
        <DataStoryContext.Provider value={value}>
            {children}
        </DataStoryContext.Provider>
    )
}
