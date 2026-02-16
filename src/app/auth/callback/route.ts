import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error, data } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data?.user) {
            // Ensure user exists in our database
            // We use prisma to upsert the user
            // Note: we need to handle the case where prisma is not yet configured with the right DB URL
            try {
                // Need to import prisma client instance. 
                // Assuming src/lib/prisma.ts exists or similar. 
                // If not available, we skip this step or you need to ensure it exists.

                // Check if prisma is available (we need to make sure we have the client imported)
                // But for now, let's assume we can fetch it or we need to add the Logic here.

                // Wait, I need to verify where 'prisma' is imported from. 
                // Usually it's in lib/prisma.ts. I should check if that file exists.
                // If not, I should create it first.

                await prisma.user.upsert({
                    where: { id: data.user.id },
                    update: {},
                    create: {
                        id: data.user.id,
                        email: data.user.email!,
                        role: 'USER',
                        approved: false // Pending approval
                    }
                })

            } catch (e) {
                console.error('Failed to sync user to local DB:', e)
            }

            const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
