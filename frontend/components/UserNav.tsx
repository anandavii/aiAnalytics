'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut, Settings } from 'lucide-react'

export function UserNav() {
    const { user, signOut } = useAuth()

    if (!user) return null

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="group relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:-translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                    {/* Gradient ring on hover */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                    {/* Avatar container */}
                    <div className="relative flex h-[calc(100%-3px)] w-[calc(100%-3px)] items-center justify-center rounded-full bg-indigo-50 text-indigo-600 transition-all duration-200 group-hover:bg-white">
                        <User className="h-4 w-4" />
                    </div>
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                className="w-56 rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-lg shadow-lg"
                align="end"
                sideOffset={8}
            >
                {/* Signed in as email */}
                <DropdownMenuLabel className="font-normal px-3 py-2">
                    <div className="flex flex-col space-y-1">
                        <p className="text-xs text-slate-500">Signed in as</p>
                        <p className="text-sm font-medium text-slate-700 truncate">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="bg-slate-100" />

                {/* Settings (future-safe) */}
                <DropdownMenuItem
                    className="cursor-pointer px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg mx-1 transition-colors duration-150"
                    disabled
                >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                    <span className="ml-auto text-xs text-slate-400">Soon</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-slate-100" />

                {/* Sign out */}
                <DropdownMenuItem
                    onClick={signOut}
                    className="cursor-pointer px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg mx-1 mb-1 transition-colors duration-150"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
