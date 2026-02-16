import Sidebar from '@/components/Sidebar'
import Image from 'next/image'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar />

            {/* Main Content Area - Offset by sidebar width */}
            <div className="pl-64 min-h-screen flex flex-col">
                <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
                    {children}
                </main>

            </div>
        </div>
    )
}
