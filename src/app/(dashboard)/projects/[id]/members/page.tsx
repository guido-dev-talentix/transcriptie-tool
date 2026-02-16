'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, Trash2, AlertTriangle, UserPlus, X } from 'lucide-react'

interface Member {
  userId: string
  projectId: string
  role: string
  assignedAt: string
  user: {
    id: string
    email: string
    role: string
  }
}

interface UserOption {
  id: string
  email: string
  role: string
}

const PROJECT_ROLE_LABELS: Record<string, string> = {
  OWNER: 'Eigenaar',
  ADMIN: 'Beheerder',
  MEMBER: 'Lid',
  VIEWER: 'Lezer',
}

const PROJECT_ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']

export default function ProjectMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Add member modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [allUsers, setAllUsers] = useState<UserOption[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('MEMBER')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/projects/${id}/members`)
      if (response.status === 401 || response.status === 403) {
        router.push(`/projects/${id}`)
        return
      }
      if (!response.ok) throw new Error('Failed to fetch members')
      const data = await response.json()
      setMembers(data)
    } catch (err) {
      setError('Kon leden niet laden')
      console.error(err)
    }
  }

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${id}`)
      if (response.ok) {
        const data = await response.json()
        setProjectName(data.name)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    Promise.all([fetchMembers(), fetchProject()]).finally(() => setLoading(false))
  }, [id])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setAllUsers(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleOpenAddModal = async () => {
    setAddError(null)
    setSelectedUserId('')
    setSelectedRole('MEMBER')
    setShowAddModal(true)
    await fetchUsers()
  }

  const handleAddMember = async () => {
    if (!selectedUserId) {
      setAddError('Selecteer een gebruiker')
      return
    }

    setAddLoading(true)
    setAddError(null)

    try {
      const response = await fetch(`/api/projects/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, role: selectedRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kon lid niet toevoegen')
      }

      const newMember = await response.json()
      setMembers([newMember, ...members])
      setShowAddModal(false)
    } catch (err: any) {
      setAddError(err.message)
    } finally {
      setAddLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId)
    try {
      const response = await fetch(`/api/projects/${id}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) throw new Error('Update failed')

      setMembers(members.map(m =>
        m.userId === userId ? { ...m, role: newRole } : m
      ))
    } catch (err) {
      alert('Kon rol niet bijwerken')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveMember = async (userId: string, email: string) => {
    if (!confirm(`Weet je zeker dat je ${email} wilt verwijderen uit dit project?`)) {
      return
    }

    setActionLoading(userId)
    try {
      const response = await fetch(`/api/projects/${id}/members/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Delete failed')

      setMembers(members.filter(m => m.userId !== userId))
    } catch (err) {
      alert('Kon lid niet verwijderen')
    } finally {
      setActionLoading(null)
    }
  }

  // Filter out users who are already members
  const availableUsers = allUsers.filter(
    u => !members.some(m => m.userId === u.id)
  )

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${id}`} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Leden beheren</h1>
            {projectName && (
              <p className="text-sm text-slate-500">{projectName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {members.length} {members.length === 1 ? 'lid' : 'leden'}
          </span>
          <button
            onClick={handleOpenAddModal}
            className="btn-primary flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Lid toevoegen
          </button>
        </div>
      </div>

      {/* Members table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium text-slate-500">Gebruiker</th>
                <th className="px-6 py-3 font-medium text-slate-500">Projectrol</th>
                <th className="px-6 py-3 font-medium text-slate-500">Systeemrol</th>
                <th className="px-6 py-3 font-medium text-slate-500">Toegevoegd</th>
                <th className="px-6 py-3 font-medium text-slate-500 text-right">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {members.map((member) => (
                <tr key={member.userId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                        {member.user.email[0]}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{member.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                      disabled={actionLoading === member.userId}
                      className="text-sm border border-slate-200 rounded-md px-2 py-1 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:opacity-50"
                    >
                      {PROJECT_ROLES.map(role => (
                        <option key={role} value={role}>
                          {PROJECT_ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    {member.user.role === 'ADMIN' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(member.assignedAt).toLocaleDateString('nl-NL')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleRemoveMember(member.userId, member.user.email)}
                      disabled={actionLoading === member.userId}
                      className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-30"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {members.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>Geen leden toegevoegd aan dit project.</p>
              <p className="text-xs mt-1">Voeg leden toe om ze toegang te geven.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add member modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold">Lid toevoegen</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {addError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {addError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Gebruiker
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                >
                  <option value="">Selecteer een gebruiker...</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))}
                </select>
                {availableUsers.length === 0 && allUsers.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    Alle gebruikers zijn al lid van dit project.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Projectrol
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                >
                  {PROJECT_ROLES.map(role => (
                    <option key={role} value={role}>
                      {PROJECT_ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleAddMember}
                disabled={addLoading || !selectedUserId}
                className="btn-primary disabled:opacity-50"
              >
                {addLoading ? 'Toevoegen...' : 'Toevoegen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
