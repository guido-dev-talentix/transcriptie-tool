import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Transcriptie Tool',
  description: 'Audio transcriptie met AssemblyAI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <nav className="bg-white shadow-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <Link
                  href="/"
                  className="flex items-center text-xl font-semibold text-gray-900"
                >
                  Transcriptie Tool
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  href="/"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Upload
                </Link>
                <Link
                  href="/transcripts"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Transcripties
                </Link>
                <Link
                  href="/projects"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Projecten
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
