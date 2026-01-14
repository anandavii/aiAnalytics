'use client'

import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
    baseURL: API_BASE_URL,
})

// This will be set by AuthProvider when session changes
let currentAccessToken: string | null = null

export function setAccessToken(token: string | null) {
    currentAccessToken = token
    console.log('[axios] Access token updated:', token ? 'present' : 'null')
}

api.interceptors.request.use(async (config) => {
    if (currentAccessToken) {
        config.headers.Authorization = `Bearer ${currentAccessToken}`
        console.log('[axios] Attached token to request:', config.url)
    } else {
        console.warn('[axios] No auth token available for request to:', config.url)
    }

    return config
})

export default api
