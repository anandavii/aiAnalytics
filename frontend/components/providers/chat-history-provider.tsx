"use client"

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"
import { getChatHistory, setChatHistory, clearChatHistory as clearStoredHistory, ChatMessage } from "@/lib/chat-storage"

interface ChatHistoryContextValue {
    getMessages: (fileId: string) => ChatMessage[]
    setMessages: (fileId: string, messages: ChatMessage[]) => void
    addMessage: (fileId: string, message: ChatMessage) => void
    clearMessages: (fileId: string) => void
}

const ChatHistoryContext = createContext<ChatHistoryContextValue | null>(null)

export function useChatHistory() {
    const context = useContext(ChatHistoryContext)
    if (!context) {
        throw new Error("useChatHistory must be used within a ChatHistoryProvider")
    }
    return context
}

interface ChatHistoryProviderProps {
    children: ReactNode
}

export function ChatHistoryProvider({ children }: ChatHistoryProviderProps) {
    // In-memory cache: fileId -> messages
    const [cache, setCache] = useState<Record<string, ChatMessage[]>>({})

    const getMessages = useCallback((fileId: string): ChatMessage[] => {
        // Check in-memory cache first
        if (cache[fileId] !== undefined) {
            return cache[fileId]
        }

        // Hydrate from localStorage
        const stored = getChatHistory(fileId)
        if (stored.length > 0) {
            setCache(prev => ({ ...prev, [fileId]: stored }))
        }
        return stored
    }, [cache])

    const setMessages = useCallback((fileId: string, messages: ChatMessage[]) => {
        setCache(prev => ({ ...prev, [fileId]: messages }))
        setChatHistory(fileId, messages)
    }, [])

    const addMessage = useCallback((fileId: string, message: ChatMessage) => {
        setCache(prev => {
            const current = prev[fileId] || getChatHistory(fileId)
            const updated = [...current, message]
            setChatHistory(fileId, updated)
            return { ...prev, [fileId]: updated }
        })
    }, [])

    const clearMessages = useCallback((fileId: string) => {
        setCache(prev => {
            const { [fileId]: _, ...rest } = prev
            return rest
        })
        clearStoredHistory(fileId)
    }, [])

    const value: ChatHistoryContextValue = {
        getMessages,
        setMessages,
        addMessage,
        clearMessages
    }

    return (
        <ChatHistoryContext.Provider value={value}>
            {children}
        </ChatHistoryContext.Provider>
    )
}
