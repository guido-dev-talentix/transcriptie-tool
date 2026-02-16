'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Trash2, Shield, AlertTriangle } from 'lucide-react'

// User interface matching API response
interface User {
    id: string
    email: string
    role: string
    approved: boolean
    createdAt: string
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const router = useRouter()

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/users')
            if (response.status === 401) {
                // Not admin
                router.push('/dashboard')
                return
            }
            if (!response.ok) throw new Error('Failed to fetch users')
            const data = await response.json()
            setUsers(data)
        } catch (err) {
            setError('Kon gebruikers niet laden')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleToggleApproval = async (userId: string, currentStatus: boolean) => {
        setActionLoading(userId)
        try {
            const response = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, approved: !currentStatus }),
            })

            if (!response.ok) throw new Error('Update failed')

            // Update local state
            setUsers(users.map(u =>
                u.id === userId ? { ...u, approved: !currentStatus } : u
            ))
        } catch (err) {
            alert('Er is een fout opgetreden bij het bijwerken van de status.')
        } finally {
            setActionLoading(null)
        }
    }

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Weet je zeker dat je deze gebruiker wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
            return
        }

        setActionLoading(userId)
        try {
            const response = await fetch(`/api/admin/users?userId=${userId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Delete failed')
            }

            // Remove from local state
            setUsers(users.filter(u => u.id !== userId))
        } catch (err: any) {
            alert(err.message || 'Er is een fout opgetreden bij het verwijderen.')
        } finally {
            setActionLoading(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {error}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Gebruikersbeheer</h1>
                <div className="text-sm text-slate-500">
                    Totaal: {users.length} gebruikers
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 font-medium text-slate-500">Gebruiker</th>
                                <th className="px-6 py-3 font-medium text-slate-500">Rol</th>
                                <th className="px-6 py-3 font-medium text-slate-500">Status</th>
                                <th className="px-6 py-3 font-medium text-slate-500">Lid sinds</th>
                                <th className="px-6 py-3 font-medium text-slate-500 text-right">Acties</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                                                {user.email[0]}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">{user.email}</div>
                                                <div className="text-xs text-slate-400 font-mono">{user.id.substring(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.role === 'ADMIN' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                <Shield className="w-3 h-3" />
                                                Admin
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                User
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.approved ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                                                <CheckCircle className="w-4 h-4" />
                                                Goedgekeurd
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
                                                <XCircle className="w-4 h-4" />
                                                In afwachting
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {new Date(user.createdAt).toLocaleDateString('nl-NL')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleToggleApproval(user.id, user.approved)}
                                                disabled={actionLoading === user.id}
                                                className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${user.approved ? 'text-amber-600' : 'text-emerald-600'
                                                    }`}
                                                title={user.approved ? 'Intrekken' : 'Goedkeuren'}
                                            >
                                                {user.approved ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                            </button>

                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                disabled={actionLoading === user.id || user.role === 'ADMIN'}
                                                className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                                title="Verwijderen"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {users.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            Geen gebruikers gevonden.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
