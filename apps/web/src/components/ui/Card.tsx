import { cn } from '../../lib/utils'

interface Props {
    children: React.ReactNode
    className?: string
    onClick?: () => void
}

export default function Card({ children, className, onClick }: Props) {
    return (
        <div
            onClick={onClick}
            className={cn(
                'bg-[var(--bg-card)] backdrop-blur-sm',
                'border border-[var(--border-subtle)]',
                'rounded-2xl p-5',
                'transition-all duration-250 ease-out',
                onClick && [
                    'cursor-pointer',
                    'hover:bg-[var(--bg-card-hover)]',
                    'hover:border-[var(--border-hover)]',
                    'hover:shadow-[0_4px_24px_rgba(0,0,0,0.2)]',
                    'hover:-translate-y-0.5',
                    'active:translate-y-0',
                ].join(' '),
                className
            )}
        >
            {children}
        </div>
    )
}