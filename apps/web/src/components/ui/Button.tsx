import { cn } from '../../lib/utils'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
}

export default function Button({
    variant = 'primary', size = 'md', loading, children, className, disabled, ...props
}: Props) {
    const base = [
        'inline-flex items-center justify-center gap-2 font-medium rounded-xl',
        'transition-all duration-200 ease-out',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        'active:scale-[0.97]',
        'cursor-pointer',
    ].join(' ')

    const variants = {
        primary: [
            'bg-[var(--accent-violet)] text-white',
            'hover:bg-[var(--accent-violet-hover)]',
            'shadow-[0_0_20px_rgba(124,92,252,0.2)]',
            'hover:shadow-[0_0_30px_rgba(124,92,252,0.35)]',
        ].join(' '),
        ghost: [
            'bg-transparent text-[var(--text-secondary)]',
            'border border-[var(--border-default)]',
            'hover:bg-white/[0.04] hover:text-white hover:border-[var(--border-hover)]',
        ].join(' '),
        danger: [
            'bg-red-500/10 text-red-400',
            'border border-red-500/20',
            'hover:bg-red-500/20 hover:border-red-500/30',
        ].join(' '),
    }

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3 text-sm',
    }

    return (
        <button
            className={cn(base, variants[variant], sizes[size], className)}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {children}
        </button>
    )
}