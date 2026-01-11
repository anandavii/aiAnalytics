"use client"

import { useEffect, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { Send, Loader2, Sparkles, Mic, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import dynamic from 'next/dynamic'
import { toast } from "sonner"
import { useChatHistory } from "@/components/providers/chat-history-provider"
import { useAddOns } from "@/components/providers/addons-context"
import { ChatMessage, StructuredChart } from "@/lib/chat-storage"
import { SuggestionChips } from "./chat-suggestions"
import { ChatAddOnsMenu, ActiveAddonPills } from "./chat-addons-menu"
import { ChatChartPreview } from "./chat-chart-preview"
import { DashboardTile } from "@/types/report"

// Dynamically import Plot for Client Side Rendering
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface ChatInterfaceProps {
    fileId: string
}

export function ChatInterface({ fileId }: ChatInterfaceProps) {
    const [query, setQuery] = useState("")
    const { getMessages, setMessages, addMessage, clearMessages } = useChatHistory()
    const { activeAddons, resetAddons } = useAddOns()
    const [messages, setLocalMessages] = useState<ChatMessage[]>([])
    const scrollAnchorRef = useRef<HTMLDivElement | null>(null)
    const recognitionRef = useRef<any>(null)
    const [isListening, setIsListening] = useState(false)
    const [speechSupported, setSpeechSupported] = useState(false)
    // Track dictated text without duplicating previous content
    const dictationBaseRef = useRef<string>("")
    const interimRef = useRef<string>("")

    // Track tiles added to report from this chat session
    const [addedTileIds, setAddedTileIds] = useState<Set<string>>(new Set())
    const [pendingTileId, setPendingTileId] = useState<string | null>(null)

    const queryClient = useQueryClient()

    // Hydrate messages from context/localStorage on mount or fileId change
    useEffect(() => {
        const stored = getMessages(fileId)
        setLocalMessages(stored)
        // Reset added tiles when switching datasets
        setAddedTileIds(new Set())
    }, [fileId, getMessages])

    useEffect(() => {
        if (typeof window === "undefined") return
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) {
            setSpeechSupported(false)
            return
        }
        setSpeechSupported(true)
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = "en-US"

        recognition.onresult = (event: any) => {
            let finalChunk = ""
            let interimChunk = ""

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const res = event.results[i]
                if (res.isFinal) {
                    finalChunk += res[0].transcript
                } else {
                    interimChunk += res[0].transcript
                }
            }

            if (finalChunk) {
                dictationBaseRef.current = `${dictationBaseRef.current} ${finalChunk}`.trim()
                interimRef.current = ""
            } else {
                interimRef.current = interimChunk
            }

            const combined = `${dictationBaseRef.current} ${interimRef.current}`.trim()
            setQuery(combined)
        }

        recognition.onend = () => {
            setIsListening(false)
        }

        recognition.onerror = (event: any) => {
            setIsListening(false)
            console.error("Speech recognition error", event)
            toast.error("Voice input error. Please try again.")
        }

        recognitionRef.current = recognition

        return () => {
            recognition.stop?.()
        }
    }, [])

    const mutation = useMutation({
        mutationFn: async (userQuery: string) => {
            const res = await axios.post("/api/v1/chat/query", {
                file_id: fileId,
                query: userQuery,
                addons: activeAddons.length > 0 ? activeAddons : undefined
            })
            return res.data
        },
        onSuccess: (data) => {
            const assistantMsg: ChatMessage = {
                role: "assistant",
                content: data.answer || "Here is the result.",
                chartType: data.chart_type
            }

            // Handle structured chart from charts addon
            if (data.chart) {
                assistantMsg.structuredChart = {
                    title: data.chart.title,
                    chart_type: data.chart.chart_type,
                    x: data.chart.x,
                    y: data.chart.y,
                    data: data.chart.data
                }
            }
            // Fallback: Handle legacy chart_data format
            else if (data.chart_data && data.chart_data.length > 0) {
                const keys = Object.keys(data.chart_data[0]);
                if (keys.length >= 2) {
                    const xKey = keys[0];
                    const yKey = keys[1];

                    assistantMsg.chart = {
                        data: [{
                            x: data.chart_data.map((d: any) => d[xKey]),
                            y: data.chart_data.map((d: any) => d[yKey]),
                            type: data.chart_type || 'bar',
                            marker: { color: '#8884d8' }
                        }],
                        layout: {
                            title: "Analysis Visualization",
                            autosize: true,
                            paper_bgcolor: 'rgba(0,0,0,0)',
                            plot_bgcolor: 'rgba(0,0,0,0)',
                        }
                    };
                }
            }

            const updated = [...messages, assistantMsg]
            setLocalMessages(updated)
            setMessages(fileId, updated)

            // Generate follow-up suggestions
            fetchSuggestions(updated.slice(-4))
        },
        onError: () => {
            toast.error("Failed to generate insight.")
            const errorMsg: ChatMessage = { role: "assistant", content: "Sorry, I encountered an error analyzing your data." }
            const updated = [...messages, errorMsg]
            setLocalMessages(updated)
            setMessages(fileId, updated)
        }
    })

    const [suggestions, setSuggestions] = useState<string[]>([])
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)

    // Load suggestions from local storage or API
    const fetchSuggestions = async (contextMessages: ChatMessage[] = [], forceRefresh = false) => {
        const storageKey = `chat_suggestions_${fileId}`

        // 1. Try local storage if not refreshing
        if (!forceRefresh && contextMessages.length === 0) {
            const cached = localStorage.getItem(storageKey)
            if (cached) {
                try {
                    setSuggestions(JSON.parse(cached))
                    return
                } catch (e) {
                    localStorage.removeItem(storageKey)
                }
            }
        }

        setIsLoadingSuggestions(true)
        try {
            // Prepare context for API
            const apiContext = contextMessages.map(m => ({
                role: m.role,
                content: typeof m.content === 'string' ? m.content : "Chart/Data Response"
            }))

            const res = await axios.post("/api/v1/suggestions", {
                file_id: fileId,
                chat_context: apiContext,
                count: 6
            })

            const newSuggestions = res.data.suggestions || []
            setSuggestions(newSuggestions)
            localStorage.setItem(storageKey, JSON.stringify(newSuggestions))
        } catch (err) {
            console.error("Failed to fetch suggestions", err)
            // Fallback is handled by backend, but if network fails:
            if (!suggestions.length) {
                setSuggestions(["Show summary statistics", "Count total rows"])
            }
        } finally {
            setIsLoadingSuggestions(false)
        }
    }

    // Initial load of suggestions
    useEffect(() => {
        // If chat is empty or we have no suggestions yet, fetch them
        // We defer slightly to ensure hydration
        const timer = setTimeout(() => {
            fetchSuggestions(messages)
        }, 500)
        return () => clearTimeout(timer)
    }, [fileId]) // Only re-run if fileId changes (dataset switch)

    const handleSuggestionClick = (question: string) => {
        if (mutation.isPending) return
        setQuery(question)

        const userMsg: ChatMessage = { role: "user", content: question }
        const updated = [...messages, userMsg]
        setLocalMessages(updated)
        setMessages(fileId, updated)

        mutation.mutate(question)
        setQuery("")
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        const userMsg: ChatMessage = { role: "user", content: query }
        const updated = [...messages, userMsg]
        setLocalMessages(updated)
        setMessages(fileId, updated)

        mutation.mutate(query)
        setQuery("")
    }

    const handleClearChat = () => {
        clearMessages(fileId)
        setLocalMessages([])
        setSuggestions([])
        setAddedTileIds(new Set())
        resetAddons() // Reset add-ons on chat clear
        localStorage.removeItem(`chat_suggestions_${fileId}`)
        toast.success("Chat history cleared")
        fetchSuggestions([], true)
    }

    // Handler for adding chart to Custom Report
    const handleAddToReport = async (tile: DashboardTile) => {
        if (addedTileIds.has(tile.tile_id)) {
            toast.info("This chart is already in your Custom Report")
            return
        }

        setPendingTileId(tile.tile_id)

        try {
            // Get or create report for this file
            const reportsRes = await axios.get(`/api/v1/reports?file_id=${fileId}`)
            let reportId: string

            if (reportsRes.data.length > 0) {
                reportId = reportsRes.data[0].report_id
            } else {
                // Create new report
                const createRes = await axios.post("/api/v1/reports", {
                    title: "Custom Report",
                    file_id: fileId
                })
                reportId = createRes.data.report_id
            }

            // Add tile to report via API
            await axios.post(`/api/v1/reports/${reportId}/tiles`, tile)

            setAddedTileIds(prev => new Set([...prev, tile.tile_id]))

            // Invalidate BOTH the reports list AND the specific report query
            // This ensures Custom Report tab fetches fresh data when navigated to
            queryClient.invalidateQueries({ queryKey: ["reports", fileId] })
            queryClient.invalidateQueries({ queryKey: ["report", reportId] })
            // Also invalidate any report query to catch edge cases
            queryClient.invalidateQueries({ queryKey: ["report"] })

            toast.success("Chart added to Custom Report")
        } catch (error) {
            console.error("Failed to add chart to report:", error)
            toast.error("Failed to add chart to report")
        } finally {
            setPendingTileId(null)
        }
    }


    // Keep the most recent message in view
    useEffect(() => {
        scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, mutation.isPending, suggestions])

    const toggleListening = () => {
        if (!speechSupported || !recognitionRef.current) {
            toast.error("Voice input is not supported in this browser.")
            return
        }
        if (isListening) {
            recognitionRef.current.stop()
            setIsListening(false)
        } else {
            try {
                dictationBaseRef.current = query
                interimRef.current = ""
                recognitionRef.current.start()
                setIsListening(true)
            } catch (err) {
                console.error("Failed to start speech recognition", err)
                toast.error("Unable to start voice input.")
            }
        }
    }

    return (
        <div className="flex flex-col h-[70vh] max-h-[720px] min-h-0 border rounded-3xl overflow-hidden bg-white/90 dark:bg-neutral-900 shadow-sm">
            {/* Header with Clear Chat button */}
            {messages.length > 0 && (
                <div className="flex items-center justify-end px-4 py-2 border-b bg-neutral-50/80 dark:bg-neutral-800/50">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearChat}
                        className="text-neutral-500 hover:text-red-500 gap-1.5"
                    >
                        <Trash2 className="w-4 h-4" />
                        Clear Chat
                    </Button>
                </div>
            )}
            <div className="flex-1 min-h-0 px-4 py-6 overflow-hidden flex flex-col bg-gradient-to-b from-neutral-50/80 via-white to-white dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-900">
                <ScrollArea className="flex-1 min-h-0">
                    <div className="max-w-3xl mx-auto w-full space-y-4 pb-4">
                        {messages.length === 0 && (
                            <div className="text-center text-neutral-600 dark:text-neutral-300 mt-12 min-h-[360px] flex flex-col items-center justify-center space-y-3">
                                <Sparkles className="w-10 h-10 mx-auto text-violet-400 opacity-70" />
                                <h3 className="text-2xl font-semibold">What can I help with?</h3>
                                <p className="text-sm text-neutral-500">Ask anything about your dataset and I'll build the analysis.</p>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-neutral-800 border'}`}>
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                                    {/* Structured Chart Preview (from charts addon) */}
                                    {msg.structuredChart && (
                                        <ChatChartPreview
                                            chart={msg.structuredChart}
                                            fileId={fileId}
                                            onAddToReport={handleAddToReport}
                                            isAddedToReport={addedTileIds.has(`chart_${msg.structuredChart.title.replace(/\s+/g, '_').toLowerCase()}`)}
                                            isPending={pendingTileId !== null}
                                        />
                                    )}

                                    {/* Legacy Chart Rendering */}
                                    {msg.chart && !msg.structuredChart && (
                                        <div className="w-full h-[300px] bg-white dark:bg-neutral-900 rounded-lg p-2 border mt-3">
                                            <Plot
                                                data={msg.chart.data}
                                                layout={{ ...msg.chart.layout, autosize: true, width: undefined, height: undefined }}
                                                useResizeHandler={true}
                                                style={{ width: "100%", height: "100%" }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {mutation.isPending && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-neutral-800 border rounded-2xl px-4 py-3 flex items-center gap-2 text-neutral-500 shadow-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Thinking...</span>
                                </div>
                            </div>
                        )}
                        {!mutation.isPending && (
                            <SuggestionChips
                                suggestions={suggestions}
                                onSelect={handleSuggestionClick}
                                onRefresh={() => fetchSuggestions(messages.slice(-4), true)}
                                isLoading={isLoadingSuggestions}
                                className="pt-2 pl-1"
                            />
                        )}
                        <div ref={scrollAnchorRef} />
                    </div>
                </ScrollArea>
            </div>
            <div className="p-4 border-t bg-white/95 dark:bg-neutral-900">
                <div className="max-w-3xl mx-auto w-full">
                    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2 rounded-full border bg-white shadow-sm dark:bg-neutral-800 dark:border-neutral-700">
                        {/* Add-Ons Menu Button */}
                        <ChatAddOnsMenu disabled={mutation.isPending} />

                        {/* Active Add-On Pills */}
                        <ActiveAddonPills />

                        <div className="relative flex-1 flex items-center">
                            <Input
                                placeholder="Ask anything about your data..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                disabled={mutation.isPending}
                                className="border-0 shadow-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                            {isListening && (
                                <div className="absolute inset-y-0 right-2 flex items-center gap-1 pointer-events-none">
                                    {[0, 1, 2, 3].map((idx) => (
                                        <span
                                            key={idx}
                                            className="w-1.5 h-4 rounded-full bg-blue-500/80 animate-pulse"
                                            style={{ animationDelay: `${idx * 0.12}s`, animationDuration: "0.9s" }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                        <Button
                            type="button"
                            variant={isListening ? "secondary" : "ghost"}
                            size="icon"
                            className="rounded-full"
                            onClick={toggleListening}
                            disabled={!speechSupported || mutation.isPending}
                            title={speechSupported ? "Toggle voice input" : "Voice input not supported"}
                        >
                            <Mic className={`w-4 h-4 ${isListening ? "text-blue-600" : ""}`} />
                        </Button>
                        <Button type="submit" disabled={mutation.isPending} className="rounded-full">
                            <Send className="w-4 h-4" />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}
