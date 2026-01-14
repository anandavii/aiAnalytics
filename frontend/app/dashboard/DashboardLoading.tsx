export default function DashboardLoading() {
    return (
        <div className="relative overflow-hidden min-h-screen bg-surface text-slate-900">
            {/* Background effects matching landing page */}
            <div className="hero-aurora" />
            <div className="hero-orb hero-orb-1" />
            <div className="hero-orb hero-orb-2" />
            <div className="hero-orb hero-orb-3" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,144,255,0.18),transparent_25%),radial-gradient(circle_at_80%_10%,rgba(167,139,250,0.2),transparent_30%),radial-gradient(circle_at_40%_80%,rgba(94,234,212,0.16),transparent_28%)]" />

            <div className="relative z-10">
                {/* Navbar skeleton */}
                <div className="h-16 border-b border-neutral-200/50 backdrop-blur-md" />

                <div className="container mx-auto pt-24 pb-10 px-4">
                    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                        {/* Spinner */}
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>

                        {/* Loading text */}
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-lg font-medium text-neutral-700">Loading Dashboard</p>
                            <p className="text-sm text-neutral-500">Preparing your workspace...</p>
                        </div>

                        {/* Skeleton cards */}
                        <div className="w-full max-w-4xl mt-8 space-y-4">
                            <div className="h-12 bg-neutral-200/50 rounded-lg animate-pulse" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="h-32 bg-neutral-200/50 rounded-lg animate-pulse" />
                                <div className="h-32 bg-neutral-200/50 rounded-lg animate-pulse" />
                                <div className="h-32 bg-neutral-200/50 rounded-lg animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
