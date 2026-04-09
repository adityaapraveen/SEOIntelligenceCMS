import { cn } from '../../lib/utils'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
}

export default function Input({ label, error, className, ...props }: Props) {
    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    {label}
                </label>
            )}
            <input
                className={cn(
                    'w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl',
                    'px-4 py-2.5 text-sm text-white',
                    'placeholder:text-[var(--text-muted)]',
                    'focus:outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--accent-violet)]/10',
                    'transition-all duration-200',
                    'hover:border-[var(--border-hover)]',
                    error && 'border-red-500/50 focus:border-red-500/60 focus:ring-red-500/10',
                    className
                )}
                {...props}
            />
            {error && <p className="text-[11px] text-red-400">{error}</p>}
        </div>
    )
}