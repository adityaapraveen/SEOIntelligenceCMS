// apps/web/src/components/ScoreRing.jsx

export default function ScoreRing({ score, size = 44, strokeWidth = 3.5, label }) {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (score / 100) * circumference

    const getColor = (s) => {
        if (s >= 80) return 'var(--green)'
        if (s >= 60) return 'var(--yellow)'
        if (s >= 40) return '#f97316'
        return 'var(--red)'
    }

    return (
        <div className="score-ring" title={label || `Score: ${score}`}>
            <svg width={size} height={size}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={getColor(score)}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
            </svg>
            <span className="score-value" style={{ color: getColor(score), fontSize: size < 40 ? 10 : 13 }}>
                {score ?? '—'}
            </span>
        </div>
    )
}
