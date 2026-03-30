import { cn } from '../../lib/utils'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info'

export default function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: Variant }) {
    const variants: Record<Variant, string> = {
        default: 'bg-white/[0.06] text-[var(--text-secondary)] border border-[var(--border-subtle)]',
        success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
        info: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
    }
    return (
        <span className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold tracking-wide',
            variants[variant]
        )}>
            {children}
        </span>
    )
}