'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { UserNav } from '@/components/UserNav'
import { Sparkles, Home, LayoutDashboard, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NavbarProps {
    variant?: 'marketing' | 'app'
    /** Hide all navigation content (logo only) - for auth pages */
    hideNavContent?: boolean
    /** Hide the Dashboard link - for home page when logged in */
    hideDashboardLink?: boolean
}

export function Navbar({ variant = 'marketing', hideNavContent = false, hideDashboardLink = false }: NavbarProps) {
    const { user, loading } = useAuth()
    const [scrolled, setScrolled] = useState(false)

    // Handle scroll effect for marketing navbar
    useEffect(() => {
        if (variant !== 'marketing' || user) return

        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [variant, user])

    // Determine the actual mode based on auth state
    const isAppMode = !!user
    const showScrollEffect = variant === 'marketing' && !isAppMode

    // Loading state
    if (loading) {
        return (
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isAppMode
                ? 'bg-white/80 backdrop-blur-md border-b border-neutral-200/60'
                : 'bg-transparent'
                }`}>
                <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-6">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        <span className="font-semibold text-slate-800">AI Analytics</span>
                    </div>
                    {!hideNavContent && (
                        <div className="h-8 w-24 animate-pulse rounded-full bg-slate-200" />
                    )}
                </div>
            </header>
        )
    }

    // App mode navbar (logged in)
    if (isAppMode) {
        return (
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200/60">
                <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-6">
                    <div className="flex items-center gap-6">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2 text-slate-800 font-semibold">
                            <Sparkles className="h-5 w-5 text-indigo-500" />
                            <span>AI Analytics</span>
                        </Link>

                        {/* Nav links - hidden when hideNavContent is true */}
                        {!hideNavContent && (
                            <nav className="hidden sm:flex items-center gap-1">
                                <Link
                                    href="/"
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <Home className="h-4 w-4" />
                                    <span>Home</span>
                                </Link>
                                {!hideDashboardLink && (
                                    <Link
                                        href="/dashboard"
                                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <LayoutDashboard className="h-4 w-4" />
                                        <span>Dashboard</span>
                                    </Link>
                                )}
                            </nav>
                        )}
                    </div>

                    {/* User section - hidden when hideNavContent is true */}
                    {!hideNavContent && (
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-500 hidden md:inline">
                                {user.email}
                            </span>
                            <UserNav />
                        </div>
                    )}
                </div>
            </header>
        )
    }

    // Marketing mode navbar (logged out)
    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${showScrollEffect && scrolled
            ? 'bg-white/70 backdrop-blur-md border-b border-neutral-200/40 shadow-sm'
            : 'bg-transparent'
            }`}>
            <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-6">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 text-slate-800 font-semibold">
                    <Sparkles className="h-5 w-5 text-indigo-500" />
                    <span>AI Analytics</span>
                </Link>

                {/* Auth buttons - hidden when hideNavContent is true */}
                {!hideNavContent && (
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-600 hover:text-slate-900"
                            asChild
                        >
                            <Link href="/auth/sign-in">Sign in</Link>
                        </Button>
                    </div>
                )}
            </div>
        </header>
    )
}
