'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function WachtOpGoedkeuringPage() {
    const router = useRouter()

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                    Wacht op goedkeuring
                </h2>
                <p className="text-slate-500">
                    Je account wacht op goedkeuring door een beheerder. Je krijgt toegang zodra je account is goedgekeurd.
                </p>
                <button
                    onClick={handleLogout}
                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                    Uitloggen
                </button>
            </div>
        </div>
    )
}
