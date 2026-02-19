import Link from 'next/link'

export default function AuthCodeErrorPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                    Verificatie mislukt
                </h2>
                <p className="text-slate-500">
                    Er is iets misgegaan bij het verwerken van je verificatie. Probeer het opnieuw.
                </p>
                <div className="flex flex-col gap-3">
                    <Link
                        href="/login"
                        className="inline-flex justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                        Ga naar inloggen
                    </Link>
                    <Link
                        href="/signup"
                        className="text-sm font-medium text-primary hover:text-primary-light"
                    >
                        Nog geen account? Registreer je
                    </Link>
                </div>
            </div>
        </div>
    )
}
