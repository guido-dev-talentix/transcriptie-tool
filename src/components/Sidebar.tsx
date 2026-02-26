'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
    Upload,
    FileText,
    Folder,
    User,
    Settings,
    LogOut,
    Shield
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isAdmin, setIsAdmin] = useState(false)
    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [loadError, setLoadError] = useState(false)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const checkUser = async () => {
            try {
                const response = await fetch('/api/auth/me')
                if (response.ok) {
                    const data = await response.json()
                    setUserEmail(data.email)
                    if (data.role === 'ADMIN') {
                        setIsAdmin(true)
                    }
                } else {
                    setLoadError(true)
                }
            } catch (err) {
                console.error('Failed to fetch user:', err)
                setLoadError(true)
            }
        }
        checkUser()
    }, [])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const navItems = [
        { href: '/', label: 'Upload', icon: Upload },
        { href: '/transcripts', label: 'Transcripties', icon: FileText },
        { href: '/projects', label: 'Projecten', icon: Folder },
    ]

    return (
        <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col z-30">
            {/* Logo Area */}
            <div className="h-16 flex items-center px-6 border-b border-slate-200">
                <Link href="/" className="flex items-center">
                    <Image
                        src="/images/Searchx-logo-blauw.png"
                        alt="Search X"
                        width={120}
                        height={32}
                        priority
                        className="w-auto h-8"
                    />
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive
                                    ? 'bg-slate-100 text-brand-blue'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-brand-blue' : 'text-slate-400'}`} />
                            {item.label}
                        </Link>
                    )
                })}

                <div className="pt-4 mt-4 border-t border-slate-200">
                    <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Account
                    </p>
                    <Link
                        href="/profile"
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${pathname === '/profile'
                                ? 'bg-slate-100 text-brand-blue'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <User className="w-5 h-5 text-slate-400" />
                        Profiel
                    </Link>

                    {isAdmin && (
                        <Link
                            href="/admin/users"
                            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${pathname?.startsWith('/admin')
                                    ? 'bg-slate-100 text-brand-blue'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <Shield className="w-5 h-5 text-slate-400" />
                            Gebruikersbeheer
                        </Link>
                    )}
                </div>
            </nav>

            {/* User Profile Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-bold">
                        {userEmail ? userEmail[0].toUpperCase() : 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                            {userEmail || (loadError ? 'Fout bij laden' : 'Laden...')}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                            {isAdmin ? 'Administrator' : 'Gebruiker'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Uitloggen
                </button>
            </div>
        </aside>
    )
}
