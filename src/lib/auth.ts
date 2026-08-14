import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'node:crypto'

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

// CLI-tokens: alleen de hash gaat de database in, zodat een datalek geen
// bruikbare tokens oplevert.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateToken(): string {
  return `txt_${randomBytes(32).toString('hex')}`
}

// Authenticatie voor /api/cli/* — Bearer-token in plaats van een sessiecookie.
// Geeft dezelfde AuthUser terug als een ingelogde sessie, zodat de
// privacy-filters hieronder identiek werken.
export async function getUserFromToken(request: Request): Promise<AuthUser | null> {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null

  const token = header.slice('Bearer '.length).trim()
  if (!token) return null

  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  })

  if (!apiToken || !apiToken.user.approved) return null

  // Bijhouden wanneer een token voor het laatst gebruikt is (best effort)
  prisma.apiToken
    .update({ where: { id: apiToken.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {})

  return {
    id: apiToken.user.id,
    email: apiToken.user.email,
    role: apiToken.user.role,
    approved: apiToken.user.approved,
  }
}

export async function requireToken(request: Request): Promise<AuthUser | NextResponse> {
  const user = await getUserFromToken(request)
  if (!user) {
    return NextResponse.json(
      { error: 'Ongeldig of ontbrekend token' },
      { status: 401 }
    )
  }
  return user
}

// Standaard-gate voor alle data-API-routes: ingelogd én goedgekeurd.
// De middleware weert alleen niet-ingelogde bezoekers; zonder deze check zou
// iedereen die zich aanmeldt (approved=false) direct bij de data kunnen.
export async function requireUser(): Promise<AuthUser | NextResponse> {
  const user = await getAuthUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
  }

  if (!user.approved) {
    return NextResponse.json({ error: 'Account wacht op goedkeuring' }, { status: 403 })
  }

  return user
}

export interface TranscriptViewer {
  authId: string // Supabase auth-id (waarde die in Transcript.userId staat)
  dbId: string
  isAdmin: boolean
}

export async function getTranscriptViewer(): Promise<TranscriptViewer | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  let dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  })
  if (!dbUser && user.email) {
    dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, role: true },
    })
  }

  return {
    authId: user.id,
    dbId: dbUser?.id ?? user.id,
    isAdmin: dbUser?.role === 'ADMIN',
  }
}

// Where-filter dat privé-transcripties van anderen verbergt — ook voor admins
export function transcriptPrivacyWhere(viewer: TranscriptViewer) {
  return {
    OR: [
      { isPrivate: false },
      { userId: { in: [viewer.authId, viewer.dbId] } },
    ],
  }
}

export function canViewTranscript(
  transcript: { isPrivate: boolean; userId: string | null },
  viewer: TranscriptViewer | null
): boolean {
  if (!transcript.isPrivate) return true
  if (!viewer || !transcript.userId) return false
  return transcript.userId === viewer.authId || transcript.userId === viewer.dbId
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
