import { supabase } from '@/lib/supabaseClient'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

interface FetchOptions extends RequestInit {
    headers?: Record<string, string>
}

export async function fetchWithAuth(endpoint: string, options: FetchOptions = {}) {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const headers = {
        ...options.headers,
        'Content-Type': 'application/json',
    }

    if (token) {
        // @ts-ignore
        headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    })

    // Handle common errors like 401
    if (res.status === 401) {
        // Maybe trigger logout or refresh?
        // For now, simple return
    }

    return res
}
