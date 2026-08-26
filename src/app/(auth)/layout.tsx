import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left Panel - Hero / Promotional */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200" />
        
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 py-12 w-full">
          {/* Dashboard image */}
          <div className="mb-10 flex justify-center">
            <div className="relative w-full max-w-lg">
              <div className="absolute -inset-4 bg-blue-500/10 rounded-3xl blur-2xl" />
              <Image
                src="/login-hero.jpg"
                alt="KAMAQ ONE Dashboard Preview"
                width={600}
                height={450}
                className="relative rounded-2xl shadow-2xl w-full h-auto"
                priority
              />
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-slate-800 text-2xl xl:text-3xl font-bold leading-snug mb-3">
            Control total de tus operaciones.
          </h2>
          <p className="text-slate-500 text-base xl:text-lg leading-relaxed mb-8 max-w-md">
            Gestiona ventas, inventario y finanzas desde un solo lugar con precisión milimétrica.
          </p>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-3">
            {[
              { icon: 'check_circle', label: 'Ventas', color: 'text-emerald-600' },
              { icon: 'check_circle', label: 'Almacén', color: 'text-emerald-600' },
              { icon: 'check_circle', label: 'Finanzas', color: 'text-emerald-600' },
            ].map((badge) => (
              <span
                key={badge.label}
                className="inline-flex items-center gap-1.5 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-full px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
              >
                <span className={`material-symbols-outlined text-lg ${badge.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  {badge.icon}
                </span>
                {badge.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form (scrolls internally when content exceeds the screen) */}
      <div className="w-full lg:w-1/2 flex justify-center p-4 sm:p-8 overflow-y-auto h-screen">
        <div className="w-full max-w-4xl m-auto">{children}</div>
      </div>
    </div>
  )
}
