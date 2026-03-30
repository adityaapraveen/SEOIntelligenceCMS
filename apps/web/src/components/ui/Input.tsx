import { cn } from '../../lib/utils'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
}

export default function Input({ label, error, className, ...props }: Props) {
    return (
        <div className="flex flex-col gap-2">
            {label && (
                <label className="text-xs font-medium text-[var(--text-secondary)] tracking-wide">
                    {label}
                </label>
            )}
            <input
                className={cn(
                    'w-full bg-white/[0.04] border border-[var(--border-default)] rounded-xl',
                    'px-4 py-3 text-sm text-white',
                    'placeholder:text-[var(--text-muted)]',
                    'focus:outline-none focus:border-[var(--accent-violet)]/50 focus:ring-2 focus:ring-[var(--accent-violet)]/10',
                    'transition-all duration-200',
                    'hover:border-[var(--border-hover)]',
                    error && 'border-red-500/50 focus:border-red-500/60 focus:ring-red-500/10',
                    className
                )}
                {...props}
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    )
}