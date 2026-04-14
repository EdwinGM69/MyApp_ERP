import Sidebar from '@/components/layout/Sidebar'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { SucursalProvider } from '@/contexts/SucursalContext'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SucursalProvider>
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            {children}
          </main>
        </div>
      </SucursalProvider>
    </AuthGuard>
  )
}
