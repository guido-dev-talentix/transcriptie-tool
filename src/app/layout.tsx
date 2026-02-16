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
        {children}

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
