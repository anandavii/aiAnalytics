"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, Check, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AVAILABLE_ADDONS, AddonId, useAddOns } from "@/components/providers/addons-context"

interface ChatAddOnsMenuProps {
    disabled?: boolean
}

export function ChatAddOnsMenu({ disabled }: ChatAddOnsMenuProps) {
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const { toggleAddon, isAddonActive } = useAddOns()

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }

        if (open) {
            document.addEventListener("mousedown", handleClickOutside)
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [open])

    const handleToggle = (id: AddonId) => {
        toggleAddon(id)
    }

    const getIcon = (addonId: string) => {
        switch (addonId) {
            case "charts":
                return <BarChart3 className="w-4 h-4 text-violet-500" />
            default:
                return <span className="text-sm">{AVAILABLE_ADDONS.find(a => a.id === addonId)?.icon}</span>
        }
    }

    return (
        <div className="relative" ref={menuRef}>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
                onClick={() => setOpen(!open)}
                disabled={disabled}
                title="Add-ons"
            >
                <Plus className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-45" : ""}`} />
            </Button>

            {/* Popover Menu */}
            {open && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border dark:border-neutral-700 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="px-3 py-2 border-b dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
                        <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                            Add-ons
                        </h4>
                    </div>
                    <div className="py-1">
                        {AVAILABLE_ADDONS.map((addon) => {
                            const isActive = isAddonActive(addon.id)
                            return (
                                <button
                                    key={addon.id}
                                    onClick={() => handleToggle(addon.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors ${isActive ? "bg-violet-50 dark:bg-violet-900/20" : ""
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive
                                            ? "bg-violet-100 dark:bg-violet-800/50"
                                            : "bg-neutral-100 dark:bg-neutral-700"
                                        }`}>
                                        {getIcon(addon.id)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                                            {addon.name}
                                        </div>
                                        <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                            {addon.description}
                                        </div>
                                    </div>
                                    {isActive && (
                                        <Check className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

interface ActiveAddonPillsProps {
    onRemove?: (id: AddonId) => void
}

export function ActiveAddonPills({ onRemove }: ActiveAddonPillsProps) {
    const { activeAddons, toggleAddon } = useAddOns()

    if (activeAddons.length === 0) return null

    const handleRemove = (id: AddonId) => {
        if (onRemove) {
            onRemove(id)
        } else {
            toggleAddon(id)
        }
    }

    return (
        <div className="flex items-center gap-1.5">
            {activeAddons.map((addonId) => {
                const addon = AVAILABLE_ADDONS.find(a => a.id === addonId)
                if (!addon) return null

                return (
                    <span
                        key={addonId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border border-violet-200 dark:border-violet-700/50"
                    >
                        <BarChart3 className="w-3 h-3" />
                        {addon.name}
                        <Check className="w-3 h-3" />
                        <button
                            type="button"
                            onClick={() => handleRemove(addonId)}
                            className="ml-0.5 -mr-1 p-0.5 hover:bg-violet-200 dark:hover:bg-violet-800 rounded-full transition-colors"
                            title={`Remove ${addon.name}`}
                        >
                            <Plus className="w-3 h-3 rotate-45" />
                        </button>
                    </span>
                )
            })}
        </div>
    )
}
