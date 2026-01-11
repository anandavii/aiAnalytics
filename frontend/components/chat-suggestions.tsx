import { Button } from "@/components/ui/button"
import { Sparkles, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface SuggestionChipsProps {
    suggestions: string[]
    onSelect: (suggestion: string) => void
    onRefresh: () => void
    isLoading: boolean
    className?: string
}

export function SuggestionChips({ suggestions, onSelect, onRefresh, isLoading, className }: SuggestionChipsProps) {
    if (!suggestions || suggestions.length === 0) return null

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-sm text-neutral-500 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                    <span>Try asking:</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    onClick={onRefresh}
                    disabled={isLoading}
                    title="Regenerate suggestions"
                >
                    <RefreshCw className={`w-3.5 h-3.5 text-neutral-400 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
            </div>

            <div className="flex flex-wrap gap-2">
                <AnimatePresence mode="popLayout">
                    {suggestions.map((suggestion, idx) => (
                        <motion.button
                            key={`${suggestion}-${idx}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2, delay: idx * 0.05 }}
                            onClick={() => onSelect(suggestion)}
                            className="text-left bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 
                                     hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20 
                                     text-neutral-700 dark:text-neutral-300 text-sm px-3.5 py-1.5 rounded-full 
                                     transition-colors duration-200 shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {suggestion}
                        </motion.button>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}
