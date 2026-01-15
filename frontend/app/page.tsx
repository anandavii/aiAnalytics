'use client'

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Upload, BarChart3, MessageSquare, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { useActiveDataset } from "@/components/providers/active-dataset-provider";
import { Navbar } from "@/components/Navbar";

const highlights = [
  "Drag-and-drop uploads",
  "AI-powered cleaning",
  "Plain-English insights",
];

export default function Home() {
  const { user, loading } = useAuth();
  const { hasActiveDataset, activeFileName, clearActiveDataset } = useActiveDataset();
  const router = useRouter();

  // Create workspace actions based on dataset state
  const workspaceActions = hasActiveDataset
    ? [
      {
        icon: FolderOpen,
        title: "Continue Analysis",
        description: activeFileName ? `Resume: ${activeFileName}` : "Continue where you left off",
        onClick: () => router.push('/dashboard'),
      },
      {
        icon: BarChart3,
        title: "View Analytics",
        description: "Explore your insights",
        onClick: () => router.push('/dashboard?tab=overview'),
      },
      {
        icon: MessageSquare,
        title: "Ask Questions",
        description: "Chat with your data",
        onClick: () => router.push('/dashboard?tab=chat'),
      },
    ]
    : [
      {
        icon: Upload,
        title: "Upload Data",
        description: "Start with a new dataset",
        onClick: () => router.push('/dashboard'),
      },
      {
        icon: BarChart3,
        title: "View Analytics",
        description: "Upload first to explore insights",
        onClick: () => router.push('/dashboard'),
      },
      {
        icon: MessageSquare,
        title: "Ask Questions",
        description: "Upload first to chat with data",
        onClick: () => router.push('/dashboard'),
      },
    ];

  return (
    <div className="relative overflow-hidden min-h-screen bg-surface text-slate-900">
      <div className="hero-aurora" />
      <div className="hero-orb hero-orb-1" />
      <div className="hero-orb hero-orb-2" />
      <div className="hero-orb hero-orb-3" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,144,255,0.18),transparent_25%),radial-gradient(circle_at_80%_10%,rgba(167,139,250,0.2),transparent_30%),radial-gradient(circle_at_40%_80%,rgba(94,234,212,0.16),transparent_28%)]" />

      {/* Unified Navbar */}
      <Navbar />

      {/* Content - different for logged-in vs logged-out */}
      {loading ? (
        <main className="relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-20">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="h-8 w-48 animate-pulse rounded-full bg-slate-200 mb-4" />
            <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
          </div>
        </main>
      ) : user ? (
        /* ========== WORKSPACE GATEWAY (Logged-in) ========== */
        <main className="relative z-10 max-w-4xl mx-auto px-6 pt-32 pb-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm text-slate-600 shadow-sm backdrop-blur mb-6">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <span>Your AI Analytics Workspace</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-slate-900 mb-4">
              Welcome back
            </h1>
            <p className="text-lg text-slate-600 mb-2">
              {hasActiveDataset ? "Continue where you left off" : "Get started by uploading your data"}
            </p>
            <p className="text-sm text-slate-500">
              Signed in as <span className="font-medium text-slate-700">{user.email}</span>
            </p>
          </div>

          {/* Primary CTA */}
          <div className="flex flex-col items-center gap-4 mb-12">
            <Button
              size="lg"
              className="rounded-full px-8 py-4 text-base bg-gradient-to-r from-[#4b6bff] via-[#6c52ff] to-[#8fd9ff] text-white shadow-lg hover:shadow-2xl hover:scale-[1.03] active:scale-[0.99] transition-all duration-200 border-0 ring-2 ring-transparent hover:ring-[#6c52ff]/30"
              asChild
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                {hasActiveDataset ? "Go to Dashboard" : "Upload Dataset"}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>

            {/* New dataset button - only show if there's an active dataset */}
            {hasActiveDataset && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearActiveDataset();
                  router.push('/dashboard');
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload new dataset
              </Button>
            )}
          </div>

          {/* Quick actions grid */}
          <div className="grid sm:grid-cols-3 gap-4">
            {workspaceActions.map((action) => (
              <button
                key={action.title}
                onClick={action.onClick}
                className="group p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/40 shadow-sm hover:shadow-lg hover:bg-white/80 hover:scale-[1.02] transition-all duration-200 text-left"
              >
                <action.icon className="h-8 w-8 text-indigo-500 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-slate-900 mb-1">{action.title}</h3>
                <p className="text-sm text-slate-600">{action.description}</p>
              </button>
            ))}
          </div>
        </main>
      ) : (
        /* ========== MARKETING LANDING (Logged-out) ========== */
        <main className="relative z-10 max-w-6xl mx-auto px-6 pb-30 pt-32 sm:pt-36">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm text-slate-600 shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <span>Next-gen AI analytics workspace</span>
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl font-bold leading-tight text-slate-900">
                  AI Analytics Dashboard
                </h1>
                <p className="text-lg text-slate-600 max-w-xl">
                  Upload your data, clean it with AI, and ask questions in plain
                  English. Experience the future of data analytics with beautiful,
                  guided workflows.
                </p>
              </div>

              {/* Marketing CTAs */}
              <div className="flex flex-wrap gap-4 items-center">
                <Button
                  size="lg"
                  className="rounded-full px-7 py-3 text-base bg-gradient-to-r from-[#4b6bff] via-[#6c52ff] to-[#8fd9ff] text-white shadow-lg hover:shadow-2xl hover:scale-[1.03] active:scale-[0.99] transition-all duration-200 border-0 ring-2 ring-transparent hover:ring-[#6c52ff]/30"
                  asChild
                >
                  <Link href="/auth/sign-in" className="flex items-center gap-2">
                    Get Started
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>


              <div className="flex flex-wrap gap-3">
                {highlights.map((item) => (
                  <div
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-sm text-slate-600 shadow-sm backdrop-blur"
                  >
                    <span className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute -left-6 -top-6 w-20 h-20 bg-gradient-to-br from-[#9fd4ff] to-[#d0c4ff] rounded-full blur-2xl opacity-70" />
              <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-gradient-to-br from-[#8b5cf6] to-[#4f46e5] rounded-full blur-3xl opacity-40" />

              <div className="glass-panel rounded-3xl p-4 shadow-2xl border border-white/60 backdrop-blur-xl relative">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/60 via-white/40 to-white/30 pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="h-2 w-2 rounded-full bg-amber-300" />
                      <span className="h-2 w-2 rounded-full bg-rose-300" />
                      <span className="ml-2 text-slate-600">Dashboard preview</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      My Workspace
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/50 shadow-[0_24px_60px_rgba(99,102,241,0.18)]">
                    <Image
                      src="/dashboard-preview.svg"
                      alt="Dashboard Preview"
                      width={1200}
                      height={800}
                      priority
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
