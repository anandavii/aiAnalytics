/**
 * Chat History Storage Utilities
 * Provides localStorage persistence for chat messages keyed by file_id
 */

export interface StructuredChart {
    title: string
    chart_type: 'bar' | 'line' | 'pie' | 'table'
    x: string
    y: string
    data: Array<{ x: any; y: any }>
}

export interface ChatMessage {
    role: "user" | "assistant"
    content: string
    chart?: any
    chartType?: string
    structuredChart?: StructuredChart
}

const STORAGE_KEY_PREFIX = "chat_history:"

/**
 * Gets the localStorage key for a specific file's chat history
 */
function getStorageKey(fileId: string): string {
    return `${STORAGE_KEY_PREFIX}${fileId}`
}

/**
 * Retrieves chat history for a given file from localStorage
 * Returns empty array if not found or on parse error
 */
export function getChatHistory(fileId: string): ChatMessage[] {
    if (typeof window === "undefined") return []

    try {
        const key = getStorageKey(fileId)
        const stored = localStorage.getItem(key)
        if (!stored) return []

        const parsed = JSON.parse(stored)
        if (!Array.isArray(parsed)) return []

        return parsed
    } catch (error) {
        console.warn(`Failed to parse chat history for file ${fileId}:`, error)
        return []
    }
}

/**
 * Saves chat history for a given file to localStorage
 */
export function setChatHistory(fileId: string, messages: ChatMessage[]): void {
    if (typeof window === "undefined") return
    if (!fileId) return

    try {
        const key = getStorageKey(fileId)
        localStorage.setItem(key, JSON.stringify(messages))
    } catch (error) {
        console.error(`Failed to save chat history for file ${fileId}:`, error)
    }
}

/**
 * Clears chat history for a specific file from localStorage
 */
export function clearChatHistory(fileId: string): void {
    if (typeof window === "undefined") return
    if (!fileId) return

    try {
        const key = getStorageKey(fileId)
        localStorage.removeItem(key)
    } catch (error) {
        console.error(`Failed to clear chat history for file ${fileId}:`, error)
    }
}
