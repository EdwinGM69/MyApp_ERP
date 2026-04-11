import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  icon: string
  iconColor?: string
  iconBg?: string
  trend?: { value: string; positive: boolean }
  subtitle?: string
}

export default function StatsCard({
  title,
  value,
  icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  trend,
  subtitle,
}: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-4">
        <div className={cn('p-2.5 rounded-xl flex-shrink-0', iconBg, iconColor)}>
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{title}</p>
            {trend && (
              <span
                className={cn(
                  'text-xs font-bold px-2 py-0.5 rounded flex-shrink-0',
                  trend.positive
                    ? 'text-green-500 bg-green-500/10'
                    : 'text-red-500 bg-red-500/10'
                )}
              >
                {trend.positive ? '+' : ''}{trend.value}
              </span>
            )}
          </div>
          <h3 className="text-2xl font-black mt-0.5 text-slate-900 dark:text-white">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}
