'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'ai-analytics-active-dataset'

interface ActiveDatasetState {
    fileId: string | null
    fileName: string | null
}

interface ActiveDatasetContextType {
    activeFileId: string | null
    activeFileName: string | null
    setActiveDataset: (fileId: string, fileName: string) => void
    clearActiveDataset: () => void
    hasActiveDataset: boolean
}

const ActiveDatasetContext = createContext<ActiveDatasetContextType>({
    activeFileId: null,
    activeFileName: null,
    setActiveDataset: () => { },
    clearActiveDataset: () => { },
    hasActiveDataset: false,
})

export const useActiveDataset = () => useContext(ActiveDatasetContext)

export function ActiveDatasetProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<ActiveDatasetState>({
        fileId: null,
        fileName: null,
    })
    const [hydrated, setHydrated] = useState(false)

    // Hydrate from localStorage on mount (client-side only)
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                const parsed = JSON.parse(stored) as ActiveDatasetState
                if (parsed.fileId) {
                    setState(parsed)
                    console.log('[ActiveDataset] Restored from storage:', parsed.fileId)
                }
            }
        } catch (e) {
            console.error('[ActiveDataset] Failed to restore from storage:', e)
        }
        setHydrated(true)
    }, [])

    // Persist to localStorage whenever state changes (after hydration)
    useEffect(() => {
        if (!hydrated) return
        try {
            if (state.fileId) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
                console.log('[ActiveDataset] Saved to storage:', state.fileId)
            } else {
                localStorage.removeItem(STORAGE_KEY)
                console.log('[ActiveDataset] Cleared from storage')
            }
        } catch (e) {
            console.error('[ActiveDataset] Failed to persist to storage:', e)
        }
    }, [state, hydrated])

    const setActiveDataset = useCallback((fileId: string, fileName: string) => {
        console.log('[ActiveDataset] Setting active dataset:', fileId, fileName)
        setState({ fileId, fileName })
    }, [])

    const clearActiveDataset = useCallback(() => {
        console.log('[ActiveDataset] Clearing active dataset')
        setState({ fileId: null, fileName: null })
    }, [])

    const value: ActiveDatasetContextType = {
        activeFileId: state.fileId,
        activeFileName: state.fileName,
        setActiveDataset,
        clearActiveDataset,
        hasActiveDataset: !!state.fileId,
    }

    return (
        <ActiveDatasetContext.Provider value={value}>
            {children}
        </ActiveDatasetContext.Provider>
    )
}

// Export for use in AuthProvider logout
export function clearActiveDatasetStorage() {
    try {
        localStorage.removeItem(STORAGE_KEY)
        console.log('[ActiveDataset] Storage cleared on logout')
    } catch (e) {
        console.error('[ActiveDataset] Failed to clear storage:', e)
    }
}
