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
      <div className="flex justify-between items-start mb-3">
        <div className={cn('p-2 rounded-lg', iconBg, iconColor)}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs font-bold px-2 py-1 rounded',
              trend.positive
                ? 'text-green-500 bg-green-500/10'
                : 'text-red-500 bg-red-500/10'
            )}
          >
            {trend.positive ? '+' : ''}{trend.value}
          </span>
        )}
      </div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{value}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  )
}
