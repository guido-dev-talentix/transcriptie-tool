'use client'

import { useEffect, useState } from 'react'

interface ApiToken {
    id: string
    name: string
    createdAt: string
    lastUsedAt: string | null
}

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [tokens, setTokens] = useState<ApiToken[]>([])
    const [newToken, setNewToken] = useState<string | null>(null)
    const [tokenName, setTokenName] = useState('')
    const [creating, setCreating] = useState(false)
    const [copied, setCopied] = useState(false)

    const fetchTokens = async () => {
        try {
            const response = await fetch('/api/tokens')
            if (response.ok) setTokens(await response.json())
        } catch (err) {
            console.error('Failed to fetch tokens:', err)
        }
    }

    const handleCreateToken = async () => {
        setCreating(true)
        try {
            const response = await fetch('/api/tokens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: tokenName.trim() || 'CLI-token' }),
            })
            const data = await response.json()
            if (response.ok) {
                setNewToken(data.token)
                setTokenName('')
                fetchTokens()
            }
        } catch (err) {
            console.error('Failed to create token:', err)
        } finally {
            setCreating(false)
        }
    }

    const handleRevoke = async (id: string) => {
        if (!confirm('Dit token intrekken? Apparaten die het gebruiken verliezen toegang.')) return
        try {
            const response = await fetch(`/api/tokens/${id}`, { method: 'DELETE' })
            if (response.ok) fetchTokens()
        } catch (err) {
            console.error('Failed to revoke token:', err)
        }
    }

    const handleCopy = async () => {
        if (!newToken) return
        await navigator.clipboard.writeText(newToken)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

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
        fetchTokens()
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

            <div className="card mt-6 space-y-4">
                <div>
                    <h2 className="text-lg font-medium">CLI-tokens</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Om transcripties op te halen in de terminal. Een token geeft toegang tot
                        precies wat jij ook in de app ziet.
                    </p>
                </div>

                {newToken && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                        <p className="text-sm font-medium text-amber-900">
                            Kopieer dit token nu — het is hierna niet meer op te vragen.
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 p-2 bg-white border border-amber-200 rounded text-xs font-mono break-all">
                                {newToken}
                            </code>
                            <button onClick={handleCopy} className="btn-secondary whitespace-nowrap text-sm">
                                {copied ? 'Gekopieerd!' : 'Kopieer'}
                            </button>
                        </div>
                        <button
                            onClick={() => setNewToken(null)}
                            className="text-xs text-amber-700 underline"
                        >
                            Verbergen
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={tokenName}
                        onChange={(e) => setTokenName(e.target.value)}
                        placeholder="Naam, bijv. laptop Guido"
                        className="input flex-1"
                    />
                    <button
                        onClick={handleCreateToken}
                        disabled={creating}
                        className="btn-primary whitespace-nowrap"
                    >
                        {creating ? 'Aanmaken...' : 'Nieuw token'}
                    </button>
                </div>

                {tokens.length > 0 && (
                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                        {tokens.map((t) => (
                            <div key={t.id} className="py-3 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">{t.name}</p>
                                    <p className="text-xs text-slate-400">
                                        Aangemaakt {new Date(t.createdAt).toLocaleDateString('nl-NL')}
                                        {t.lastUsedAt
                                            ? ` · laatst gebruikt ${new Date(t.lastUsedAt).toLocaleDateString('nl-NL')}`
                                            : ' · nog niet gebruikt'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleRevoke(t.id)}
                                    className="text-xs text-red-600 hover:text-red-700 ml-4"
                                >
                                    Intrekken
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
