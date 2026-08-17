import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api/upload en api/upload-pdf: routes met grote request-bodies.
         *   De middleware kapt bodies af zodra hij zelf iets awaitt (Supabase-
         *   sessiecheck) — van 16 MB kwam ~10 MB aan. Deze routes doen hun
         *   eigen requireUser(), dus ze hebben de middleware niet nodig.
         */
        '/((?!_next/static|_next/image|favicon.ico|api/upload|api/upload-pdf|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
