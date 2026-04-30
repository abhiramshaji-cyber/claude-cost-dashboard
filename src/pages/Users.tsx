import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { fmt, fmtExact, fmtTokens } from '../utils'
import type { UserSummary } from '../types'

type SortKey = 'total' | 'token' | 'ws' | 'totalTokens' | 'displayName'

const PAGE_SIZE = 25

export default function Users() {
  const data = useStore(s => s.data)!
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(0)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(false) }
    setPage(0)
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return data.users.filter(u =>
      !q || u.displayName.toLowerCase().includes(q) || u.user.includes(q)
    )
  }, [data.users, query])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] as string | number
      const bv = b[sortKey] as string | number
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [filtered, sortKey, sortAsc])

  const pageCount = Math.ceil(sorted.length / PAGE_SIZE)
  const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function arrow(key: SortKey) {
    if (sortKey !== key) return <span style={{ opacity: 0.3 }}>↕</span>
    return <span>{sortAsc ? '↑' : '↓'}</span>
  }

  const th: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    color: 'var(--muted)',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  }

  const td: React.CSSProperties = {
    padding: '11px 14px',
    borderBottom: '1px solid rgba(46,50,72,0.4)',
    fontSize: 13,
    fontVariantNumeric: 'tabular-nums',
  }

  return (
    <div style={{ padding: '24px 32px 48px' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(0) }}
          placeholder="Search by name…"
          style={{
            flex: 1,
            padding: '9px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text)',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <span style={{ color: 'var(--muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
          {sorted.length} users
        </span>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={{ ...th, color: sortKey === 'displayName' ? 'var(--accent)' : 'var(--muted)' }} onClick={() => toggleSort('displayName')}>
                  Name {arrow('displayName')}
                </th>
                <th style={{ ...th, color: sortKey === 'total' ? 'var(--accent)' : 'var(--muted)' }} onClick={() => toggleSort('total')}>
                  Total Cost {arrow('total')}
                </th>
                <th style={{ ...th, color: sortKey === 'token' ? 'var(--accent)' : 'var(--muted)' }} onClick={() => toggleSort('token')}>
                  Token Cost {arrow('token')}
                </th>
                <th style={{ ...th, color: sortKey === 'ws' ? 'var(--accent)' : 'var(--muted)' }} onClick={() => toggleSort('ws')}>
                  Web Search {arrow('ws')}
                </th>
                {data.totalTokens > 0 && (
                  <th style={{ ...th, color: sortKey === 'totalTokens' ? 'var(--accent)' : 'var(--muted)' }} onClick={() => toggleSort('totalTokens')}>
                    Total Tokens {arrow('totalTokens')}
                  </th>
                )}
                <th style={th}>Share of Total</th>
                <th style={th}>Models</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((u, i) => (
                <UserRow
                  key={u.user}
                  rank={page * PAGE_SIZE + i + 1}
                  user={u}
                  totalCost={data.totalCost}
                  showTokens={data.totalTokens > 0}
                  td={td}
                  onClick={() => navigate(`/users/${encodeURIComponent(u.user)}`)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {pageCount > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderTop: '1px solid var(--border)',
          }}>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>
              Page {page + 1} of {pageCount} · {sorted.length} users
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <PageBtn label="← Prev" disabled={page === 0} onClick={() => setPage(p => p - 1)} />
              {Array.from({ length: pageCount }, (_, i) => i).map(i => (
                <PageBtn
                  key={i}
                  label={String(i + 1)}
                  active={i === page}
                  onClick={() => setPage(i)}
                />
              ))}
              <PageBtn label="Next →" disabled={page >= pageCount - 1} onClick={() => setPage(p => p + 1)} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function UserRow({
  rank, user, totalCost, showTokens, td, onClick,
}: {
  rank: number
  user: UserSummary
  totalCost: number
  showTokens: boolean
  td: React.CSSProperties
  onClick: () => void
}) {
  const sharePct = (user.total / totalCost) * 100
  const barWidth = Math.max(sharePct * 2.2, 2)

  const topModels = Object.entries(user.models)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([m]) => m.replace('Claude ', '').replace(' (Latest)', ''))

  return (
    <tr
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <td style={{ ...td, color: 'var(--muted)', width: 40 }}>{rank}</td>
      <td style={td}>
        <div style={{ fontWeight: 600 }}>{user.displayName}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{user.user}</div>
      </td>
      <td style={{ ...td, fontWeight: 600 }}>{fmt(user.total)}</td>
      <td style={{ ...td, color: 'var(--muted)' }}>{fmt(user.token)}</td>
      <td style={{ ...td, color: 'var(--muted)' }}>{fmtExact(user.ws)}</td>
      {showTokens && (
        <td style={{ ...td, color: 'var(--muted)' }}>
          <div>{fmtTokens(user.totalTokens)}</div>
          {user.totalTokens > 0 && (
            <div style={{ fontSize: 11, marginTop: 2, color: 'var(--muted)', opacity: 0.7 }}>
              ${(user.token / user.totalTokens * 1000).toFixed(4)}/1k
            </div>
          )}
        </td>
      )}
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            height: 6,
            width: barWidth,
            borderRadius: 3,
            background: 'var(--accent)',
            minWidth: 2,
          }} />
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>{sharePct.toFixed(1)}%</span>
        </div>
      </td>
      <td style={td}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {topModels.map(m => (
            <span key={m} style={{
              padding: '2px 7px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              background: 'rgba(99,102,241,0.15)',
              color: 'var(--accent)',
            }}>{m}</span>
          ))}
        </div>
      </td>
    </tr>
  )
}

function PageBtn({ label, onClick, disabled, active }: {
  label: string; onClick: () => void; disabled?: boolean; active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 10px',
        borderRadius: 6,
        border: '1px solid var(--border)',
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? '#fff' : disabled ? 'var(--border)' : 'var(--muted)',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 12,
      }}
    >
      {label}
    </button>
  )
}
