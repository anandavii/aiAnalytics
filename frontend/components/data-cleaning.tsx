"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import axios from "@/lib/axios"
import { Check, Loader2, Sparkles, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface DataCleaningProps {
    fileId: string
    onCleanComplete: (newFileId: string) => void
}

interface Suggestion {
    action: string
    column?: string
    value?: any
    reason: string
}

export function DataCleaning({ fileId, onCleanComplete }: DataCleaningProps) {
    const [selectedSuggestions, setSelectedSuggestions] = useState<number[]>([])

    const { data: suggestions, isLoading, isError } = useQuery({
        queryKey: ['cleaning-suggestions', fileId],
        queryFn: async () => {
            const res = await axios.post("/api/v1/clean/suggest", { file_id: fileId })
            const data = res.data

            if (data?.error) {
                throw new Error(data.error)
            }

            const parsed = Array.isArray(data?.suggestions)
                ? data.suggestions
                : Array.isArray(data)
                    ? data
                    : null

            if (!Array.isArray(parsed)) {
                throw new Error("Invalid suggestions response")
            }

            return parsed as Suggestion[]
        },
        enabled: !!fileId
    })

    const mutation = useMutation({
        mutationFn: async () => {
            // Filter suggestions based on index
            const selected = suggestions?.filter((_, i) => selectedSuggestions.includes(i))
            const res = await axios.post("/api/v1/clean/apply", {
                file_id: fileId,
                selected_suggestions: selected
            })
            return res.data
        },
        onSuccess: (data) => {
            toast.success("Data cleaned successfully!")
            onCleanComplete(data.new_file_id)
        },
        onError: () => {
            toast.error("Failed to apply cleaning operations.")
        }
    })

    const toggleSuggestion = (index: number) => {
        setSelectedSuggestions(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        )
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <h3 className="text-xl font-semibold">AI is analyzing your data...</h3>
                <p className="text-neutral-500 max-w-md">
                    Gemini is looking for missing values, duplicates, and inconsistencies.
                </p>
            </div>
        )
    }

    if (isError || !suggestions) {
        return (
            <div className="p-8 text-center text-red-500 border border-red-200 bg-red-50 rounded-lg">
                <AlertTriangle className="w-10 h-10 mx-auto mb-4" />
                <p>Failed to analyze data. Please try again or check API keys.</p>
            </div>
        )
    }

    if (suggestions.length === 0) {
        return (
            <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold">Your data looks clean!</h3>
                <p className="text-neutral-500">Gemini didn't find any obvious issues to fix.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-500" />
                <h2 className="text-xl font-semibold">AI Cleanup Suggestions</h2>
            </div>

            <div className="grid gap-4">
                {suggestions.map((suggestion, idx) => (
                    <Card key={idx} className={`transition-all border-l-4 cursor-pointer hover:shadow-md ${selectedSuggestions.includes(idx) ? 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-l-transparent'}`}
                        onClick={() => toggleSuggestion(idx)}>
                        <CardContent className="p-4 flex items-start gap-4">
                            <Checkbox checked={selectedSuggestions.includes(idx)} onCheckedChange={() => toggleSuggestion(idx)} />
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline">{suggestion.action}</Badge>
                                    {suggestion.column && <span className="font-mono text-sm bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">{suggestion.column}</span>}
                                </div>
                                <p className="text-neutral-600 dark:text-neutral-300">
                                    {suggestion.reason}
                                    {suggestion.value && <span className="font-semibold"> (Value: {String(suggestion.value)})</span>}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setSelectedSuggestions(suggestions.map((_, i) => i))}>
                    Select All
                </Button>
                <Button onClick={() => mutation.mutate()} disabled={selectedSuggestions.length === 0 || mutation.isPending}>
                    {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Apply Selected Fixes
                </Button>
            </div>
        </div>
    )
}
