import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'ERP/POS Pro — Sistema de Gestión Empresarial',
  description: 'Sistema ERP SaaS modular para gestión empresarial integral',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="font-display antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'text-sm font-medium',
            duration: 3000,
            style: { background: '#1e293b', color: '#f1f5f9', borderRadius: '0.75rem' },
          }}
        />
      </body>
    </html>
  )
}
