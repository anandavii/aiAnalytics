'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { UserNav } from '@/components/UserNav'
import { Home, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AppHeader() {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur-sm">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
                </div>
            </header>
        )
    }

    if (!user) return null

    return (
        <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur-sm">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <Home className="h-4 w-4" />
                        <span>Home</span>
                    </Link>
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500 hidden sm:inline">
                        {user.email}
                    </span>
                    <UserNav />
                </div>
            </div>
        </header>
    )
}
