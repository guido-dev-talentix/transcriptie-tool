import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export interface AuthUser {
  id: string
  email: string
  role: string
  approved: boolean
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  let dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  })

  if (!dbUser && user.email) {
    dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })
  }

  // Auto-create user in Prisma if they exist in Supabase but not in the DB
  // This handles cases where the auth callback upsert failed or was bypassed
  // (e.g. email/password login doesn't go through /auth/callback)
  if (!dbUser && user.email) {
    try {
      const isSearchX = user.email.endsWith('@searchxrecruitment.com')
      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          role: 'USER',
          approved: isSearchX,
        },
      })
    } catch (e) {
      console.error('Failed to auto-create user in DB:', e)
      return null
    }
  }

  if (!dbUser) {
    return null
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    approved: dbUser.approved,
  }
}

export async function requireAdmin(): Promise<AuthUser | NextResponse> {
  const user = await getAuthUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
  }

  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Geen beheerdersrechten' }, { status: 403 })
  }

  return user
}

export async function checkProjectAccess(
  projectId: string,
  requiredRoles?: string[]
): Promise<{ user: AuthUser; projectRole: string | null } | NextResponse> {
  const user = await getAuthUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
  }

  // Admins always have access
  if (user.role === 'ADMIN') {
    return { user, projectRole: 'ADMIN' }
  }

  const membership = await prisma.userProject.findUnique({
    where: {
      userId_projectId: {
        userId: user.id,
        projectId,
      },
    },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Geen toegang tot dit project' }, { status: 403 })
  }

  if (requiredRoles && !requiredRoles.includes(membership.role)) {
    return NextResponse.json({ error: 'Onvoldoende rechten' }, { status: 403 })
  }

  return { user, projectRole: membership.role }
}
