import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function timeAgo(date: string | Date): string {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
}

export function seoGradeColor(grade: string): string {
    return { A: 'text-emerald-400', B: 'text-lime-400', C: 'text-amber-400', D: 'text-orange-400', F: 'text-red-400' }[grade] ?? 'text-zinc-400'
}

export function decayRiskColor(risk: string): string {
    return { fresh: 'text-emerald-400', aging: 'text-amber-400', stale: 'text-orange-400', critical: 'text-red-400' }[risk] ?? 'text-zinc-400'
}