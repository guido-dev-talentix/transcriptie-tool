'use client'

import { useEffect, useState } from 'react'

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const getUser = async () => {
            try {
                const response = await fetch('/api/auth/me')
                if (response.ok) {
                    const data = await response.json()
                    setUser(data)
                }
            } catch (err) {
                console.error('Failed to fetch user:', err)
            } finally {
                setLoading(false)
            }
        }
        getUser()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Mijn Profiel</h1>

            <div className="card space-y-6">
                <div>
                    <h2 className="text-lg font-medium mb-4">Account Informatie</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Email</label>
                            <div className="p-3 bg-slate-50 rounded-lg text-slate-900 border border-slate-200">
                                {user?.email}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Rol</label>
                            <div className="p-3 bg-slate-50 rounded-lg text-slate-900 border border-slate-200 uppercase text-sm font-semibold tracking-wide">
                                {user?.role || 'USER'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Gebruikers ID</label>
                            <div className="p-3 bg-slate-50 rounded-lg text-slate-500 text-xs font-mono border border-slate-200 break-all">
                                {user?.id}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <p className="text-sm text-slate-500">
                        Wilt u uw wachtwoord wijzigen of andere gegevens aanpassen? Neem contact op met de beheerder.
                    </p>
                </div>
            </div>
        </div>
    )
}
