import type { CSSProperties, ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  style?: CSSProperties
}

export default function Panel({ title, children, style }: Props) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px',
      ...style,
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--muted)',
        marginBottom: 16,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}
