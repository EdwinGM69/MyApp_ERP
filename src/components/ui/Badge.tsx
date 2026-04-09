import { cn } from '@/lib/utils'

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral'

const variants: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

export default function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', variants[variant], className)}>
      {children}
    </span>
  )
}
