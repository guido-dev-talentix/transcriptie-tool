import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    // Validate that next parameter is a relative path
    if (!next.startsWith('/')) {
        return NextResponse.redirect(`${origin}/`)
    }

    if (code) {
        const supabase = await createClient()
        const { error, data } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data?.user) {
            try {
                const email = data.user.email!
                const isSearchX = email.endsWith('@searchxrecruitment.com')

                await prisma.user.upsert({
                    where: { id: data.user.id },
                    update: { email },
                    create: {
                        id: data.user.id,
                        email,
                        role: 'USER',
                        approved: isSearchX,
                    },
                })
            } catch (e) {
                console.error('Failed to sync user to local DB:', e)
            }

            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    }

    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
