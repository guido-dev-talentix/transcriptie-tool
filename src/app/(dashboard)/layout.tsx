import DashboardLayout from '@/components/DashboardLayout'
import { getAuthUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Layout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getAuthUser()
    if (user && !user.approved) {
        redirect('/wacht-op-goedkeuring')
    }

    return <DashboardLayout>{children}</DashboardLayout>
}
