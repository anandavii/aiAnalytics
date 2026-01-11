"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

/**
 * Available add-ons in the system
 */
export const AVAILABLE_ADDONS = [
    {
        id: "charts",
        name: "Charts",
        icon: "📊",
        description: "Generate charts from your data"
    }
] as const

export type AddonId = typeof AVAILABLE_ADDONS[number]["id"]

interface AddOnsContextValue {
    activeAddons: AddonId[]
    toggleAddon: (id: AddonId) => void
    isAddonActive: (id: AddonId) => boolean
    resetAddons: () => void
}

const AddOnsContext = createContext<AddOnsContextValue | null>(null)

export function useAddOns() {
    const context = useContext(AddOnsContext)
    if (!context) {
        throw new Error("useAddOns must be used within an AddOnsProvider")
    }
    return context
}

interface AddOnsProviderProps {
    children: ReactNode
}

/**
 * Provider for managing chat add-ons state.
 * State is session-scoped (not persisted to localStorage).
 * Should be reset on dataset upload or chat clear.
 */
export function AddOnsProvider({ children }: AddOnsProviderProps) {
    const [activeAddons, setActiveAddons] = useState<AddonId[]>([])

    const toggleAddon = useCallback((id: AddonId) => {
        setActiveAddons(prev => {
            if (prev.includes(id)) {
                return prev.filter(a => a !== id)
            }
            return [...prev, id]
        })
    }, [])

    const isAddonActive = useCallback((id: AddonId) => {
        return activeAddons.includes(id)
    }, [activeAddons])

    const resetAddons = useCallback(() => {
        setActiveAddons([])
    }, [])

    const value: AddOnsContextValue = {
        activeAddons,
        toggleAddon,
        isAddonActive,
        resetAddons
    }

    return (
        <AddOnsContext.Provider value={value}>
            {children}
        </AddOnsContext.Provider>
    )
}
