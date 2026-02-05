import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'
import './globals.css'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '700'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Transcriptie Tool - Search X',
  description: 'Upload en transcribeer audio- en PDF-bestanden',
  icons: {
    icon: '/images/Logomark X.png',
    apple: '/images/Logomark X.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl" className={roboto.variable}>
      <body className="min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex justify-between h-14 items-center">
              <Link href="/" className="flex items-center">
                <Image
                  src="/images/Searchx-logo-blauw.png"
                  alt="Search X"
                  width={140}
                  height={36}
                  priority
                />
              </Link>

              <div className="flex items-center gap-6">
                <Link href="/" className="text-sm font-body text-brand-blue hover:text-brand-blue-light transition-colors">
                  Upload
                </Link>
                <Link href="/transcripts" className="text-sm font-body text-brand-blue hover:text-brand-blue-light transition-colors">
                  Transcripties
                </Link>
                <Link href="/projects" className="text-sm font-body text-brand-blue hover:text-brand-blue-light transition-colors">
                  Projecten
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
          {children}
        </main>

        {/* Harley mascotte - subtiel rechtsonder */}
        <div className="fixed bottom-4 right-4 opacity-10 pointer-events-none select-none hidden lg:block">
          <Image
            src="/images/Harley met potlood.svg"
            alt=""
            width={120}
            height={160}
            aria-hidden="true"
          />
        </div>
      </body>
    </html>
  )
}
