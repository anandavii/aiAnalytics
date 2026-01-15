'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { UserNav } from '@/components/UserNav'
import { Sparkles, Home } from 'lucide-react'

export function Navbar() {
    const { user, loading } = useAuth()
    const [isSticky, setIsSticky] = useState(false)
    const [isVisible, setIsVisible] = useState(true)
    const lastScrollY = useRef(0)
    const ticking = useRef(false)

    // Smart sticky scroll behavior
    useEffect(() => {
        const handleScroll = () => {
            if (!ticking.current) {
                window.requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY

                    // Become sticky after scrolling past 80px
                    setIsSticky(currentScrollY > 80)

                    // Show navbar when scrolling up, hide when scrolling down (only when sticky)
                    if (currentScrollY > 80) {
                        setIsVisible(currentScrollY < lastScrollY.current || currentScrollY < 100)
                    } else {
                        setIsVisible(true)
                    }

                    lastScrollY.current = currentScrollY
                    ticking.current = false
                })
                ticking.current = true
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Base classes for navbar
    const baseClasses = "left-0 right-0 z-50 transition-all duration-300 ease-out"

    // Dynamic classes based on scroll state
    const stickyClasses = isSticky
        ? `fixed top-0 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`
        : 'absolute top-0'

    // Height classes - reduces from 64px to 56px when sticky
    const heightClasses = isSticky ? 'h-14' : 'h-16'

    // Background classes - glassmorphism when sticky
    const bgClasses = isSticky
        ? 'bg-white/60 backdrop-blur-[14px] border-b border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.04)]'
        : 'bg-transparent'

    // Loading state
    if (loading) {
        return (
            <header className={`${baseClasses} ${stickyClasses} ${bgClasses}`}>
                <div className={`max-w-6xl mx-auto flex ${heightClasses} items-center justify-between px-6 transition-all duration-300`}>
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        <span className="font-semibold text-slate-800 text-lg">AI Analytico</span>
                    </div>
                    <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
                </div>
            </header>
        )
    }

    return (
        <header className={`${baseClasses} ${stickyClasses} ${bgClasses}`}>
            <div className={`max-w-6xl mx-auto flex ${heightClasses} items-center justify-between px-6 transition-all duration-300`}>
                {/* Left section - Logo and nav links */}
                <div className="flex items-center gap-6">
                    {/* Logo */}
                    <Link
                        href="/"
                        className="group flex items-center gap-2 text-slate-800 font-semibold transition-all duration-200 hover:brightness-110"
                    >
                        <Sparkles className="h-5 w-5 text-indigo-500 transition-transform duration-200 group-hover:scale-110" />
                        <span className="text-lg tracking-tight transition-transform duration-200 group-hover:-translate-y-[1px]">
                            AI Analytico
                        </span>
                    </Link>

                    {/* Nav links - only show when logged in */}
                    {user && (
                        <nav className="hidden sm:flex items-center gap-1">
                            <Link
                                href="/"
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 rounded-lg transition-all duration-200 hover:-translate-y-[1px]"
                            >
                                <Home className="h-4 w-4" />
                                <span>Home</span>
                            </Link>
                        </nav>
                    )}
                </div>

                {/* Right side - Only show avatar when logged in */}
                {user && (
                    <div className="flex items-center">
                        <UserNav />
                    </div>
                )}
            </div>
        </header>
    )
}
