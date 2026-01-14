'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'

export default function SignInPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            if (error) throw error
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative overflow-hidden min-h-screen bg-surface text-slate-900">
            {/* Background effects */}
            <div className="hero-aurora" />
            <div className="hero-orb hero-orb-1" />
            <div className="hero-orb hero-orb-2" />
            <div className="hero-orb hero-orb-3" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,144,255,0.18),transparent_25%),radial-gradient(circle_at_80%_10%,rgba(167,139,250,0.2),transparent_30%),radial-gradient(circle_at_40%_80%,rgba(94,234,212,0.16),transparent_28%)]" />

            <Navbar variant="marketing" hideNavContent />

            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pt-20 pb-12">
                <div className="w-full max-w-md space-y-8 rounded-2xl bg-white/80 backdrop-blur-xl p-8 shadow-2xl border border-white/60">
                    <div>
                        <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-slate-900">
                            Sign in to your account
                        </h2>
                    </div>
                    <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
                        <div className="-space-y-px rounded-md shadow-sm">
                            <div>
                                <label htmlFor="email-address" className="sr-only">
                                    Email address
                                </label>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="relative block w-full rounded-t-md border-0 py-2.5 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3 bg-white/90"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="sr-only">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="relative block w-full rounded-b-md border-0 py-2.5 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3 bg-white/90"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && <div className="text-sm text-red-600 text-center">{error}</div>}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative flex w-full justify-center rounded-full bg-gradient-to-r from-[#4b6bff] via-[#6c52ff] to-[#8fd9ff] px-4 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 disabled:opacity-50"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </div>
                    </form>

                    <div className="text-center text-sm text-slate-600">
                        Don&apos;t have an account?{' '}
                        <Link href="/auth/sign-up" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                            Sign up
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
