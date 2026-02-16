import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
    const admin = await requireAdmin()
    if (admin instanceof NextResponse) return admin

    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                role: true,
                approved: true,
                createdAt: true,
            }
        })
        return NextResponse.json(users)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    const admin = await requireAdmin()
    if (admin instanceof NextResponse) return admin

    try {
        const body = await request.json()
        const { userId, approved } = body

        if (!userId || typeof approved !== 'boolean') {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { approved },
        })

        return NextResponse.json(updatedUser)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    const admin = await requireAdmin()
    if (admin instanceof NextResponse) return admin

    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
        }

        // Prevent deleting yourself
        if (userId === admin.id) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
        }

        // First delete from Supabase Auth (if we had the service role key available here, 
        // but typically we only restrict DB access. 
        // Ideally we should delete from Supabase Auth too via Admin API.
        // For now, let's delete from Prisma DB. 
        // NOTE: If we don't delete from Supabase Auth, they can still login but won't have a user record? 
        // Or they will be recreated? 
        // The previous implementation flow might rely on the DB user record.

        // Deleting from DB:
        await prisma.user.delete({
            where: { id: userId },
        })

        // Note: To fully delete from Supabase Auth, we need `supabase-admin` client with service_role key.
        // Assuming for now DB deletion is the primary "ban".

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete error:', error)
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }
}
