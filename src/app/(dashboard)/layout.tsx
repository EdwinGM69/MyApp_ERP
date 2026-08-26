import Sidebar from '@/components/layout/Sidebar'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { SubscriptionGuard } from '@/components/auth/SubscriptionGuard'
import { SucursalProvider } from '@/contexts/SucursalContext'
import { PermisosProvider } from '@/contexts/PermisosContext'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SubscriptionGuard>
        <SucursalProvider>
          <PermisosProvider>
            <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
              <Sidebar />
              <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
                {children}
              </main>
            </div>
          </PermisosProvider>
        </SucursalProvider>
      </SubscriptionGuard>
    </AuthGuard>
  )
}
