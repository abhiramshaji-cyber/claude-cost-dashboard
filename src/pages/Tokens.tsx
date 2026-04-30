import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useStore } from '../store'
import StatCard from '../components/StatCard'
import Panel from '../components/Panel'
import { fmtTokens, fmtExact, CHART_COLORS } from '../utils'
import type { UserSummary } from '../types'

type SortKey = 'totalTokens' | 'input' | 'output' | 'cache_read' | 'cache_creation' | 'costPer1k' | 'displayName'

const PAGE_SIZE = 25

const TOKEN_TYPE_COLORS: Record<string, string> = {
  input: '#6366f1',
  output: '#06b6d4',
  cache_read: '#10b981',
  cache_creation: '#f59e0b',
}

function getCount(u: UserSummary, type: string) {
  return u.tokenTypeCounts[type] ?? 0
}

function costPer1k(u: UserSummary) {
  if (!u.totalTokens) return 0
  return (u.token / u.totalTokens) * 1000
}

export default function Tokens() {
  const data = useStore(s => s.data)!
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('totalTokens')
  const [sortAsc, setSortAsc] = useState(false)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  const tokenTypes = useMemo(() => {
    const types = new Set<string>()
    for (const u of data.users) Object.keys(u.tokenTypeCounts).forEach(t => types.add(t))
    return Array.from(types).sort()
  }, [data.users])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return data.users.filter(u =>
      u.totalTokens > 0 && (!q || u.displayName.toLowerCase().includes(q) || u.user.includes(q))
    )
  }, [data.users, query])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: number, bv: number
      if (sortKey === 'displayName') {
        return sortAsc
          ? a.displayName.localeCompare(b.displayName)
          : b.displayName.localeCompare(a.displayName)
      }
      if (sortKey === 'costPer1k') { av = costPer1k(a); bv = costPer1k(b) }
      else if (sortKey === 'input' || sortKey === 'output' || sortKey === 'cache_read' || sortKey === 'cache_creation') {
        av = getCount(a, sortKey); bv = getCount(b, sortKey)
      }
      else { av = a.totalTokens; bv = b.totalTokens }
      return sortAsc ? av - bv : bv - av
    })
  }, [filtered, sortKey, sortAsc])

  const pageCount = Math.ceil(sorted.length / PAGE_SIZE)
  const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(false) }
    setPage(0)
  }

  function arrow(key: SortKey) {
    if (sortKey !== key) return <span style={{ opacity: 0.3 }}>↕</span>
    return <span>{sortAsc ? '↑' : '↓'}</span>
  }

  const topN = data.users.filter(u => u.totalTokens > 0).slice(0, 15)
  const chartData = topN.map(u => ({
    name: u.displayName.split(' ')[0] + ' ' + (u.displayName.split(' ')[1]?.[0] ?? '') + '.',
    input: getCount(u, 'input'),
    output: getCount(u, 'output'),
    cache_read: getCount(u, 'cache_read'),
    cache_creation: getCount(u, 'cache_creation'),
  }))

  const totalTokens = data.totalTokens
  const usersWithTokens = data.users.filter(u => u.totalTokens > 0)
  const avgTokens = usersWithTokens.length ? totalTokens / usersWithTokens.length : 0
  const topTokenUser = usersWithTokens[0]
  const bestEfficiency = [...usersWithTokens]
    .filter(u => u.token > 0)
    .sort((a, b) => costPer1k(a) - costPer1k(b))[0]

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Tokens" value={fmtTokens(totalTokens)} sub="all users combined" />
        <StatCard label="Avg / User" value={fmtTokens(Math.round(avgTokens))} sub={`across ${usersWithTokens.length} users`} />
        <StatCard
          label="Top Token User"
          value={topTokenUser?.displayName ?? '—'}
          sub={fmtTokens(topTokenUser?.totalTokens ?? 0)}
        />
        <StatCard
          label="Best Efficiency"
          value={bestEfficiency?.displayName ?? '—'}
          sub={bestEfficiency ? `$${costPer1k(bestEfficiency).toFixed(4)}/1k tokens` : '—'}
        />
      </div>

      <Panel title="Token Usage by Type — Top Users" style={{ marginBottom: 20 }}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
            <XAxis
              type="number"
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              tickFormatter={v => fmtTokens(Number(v))}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: 'var(--text)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={90}
            />
            <Tooltip
              contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }}
              labelStyle={{ color: 'var(--text)', fontSize: 12 }}
              formatter={(v) => fmtTokens(Number(v))}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--muted)', paddingTop: 8 }} />
            {tokenTypes.map(t => (
              <Bar
                key={t}
                dataKey={t}
                name={t.replace(/_/g, ' ')}
                stackId="a"
                fill={TOKEN_TYPE_COLORS[t] ?? CHART_COLORS[tokenTypes.indexOf(t) % CHART_COLORS.length]}
                radius={tokenTypes.indexOf(t) === tokenTypes.length - 1 ? [0, 3, 3, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Panel>

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
                <th style={{ ...th, color: sortKey === 'totalTokens' ? 'var(--accent)' : 'var(--muted)' }} onClick={() => toggleSort('totalTokens')}>
                  Total Tokens {arrow('totalTokens')}
                </th>
                {tokenTypes.includes('input') && (
                  <th style={{ ...th, color: sortKey === 'input' ? 'var(--accent)' : 'var(--muted)' }} onClick={() => toggleSort('input')}>
                    Input {arrow('input')}
                  </th>
                )}
                {tokenTypes.includes('output') && (
                  <th style={{ ...th, color: sortKey === 'output' ? 'var(--accent)' : 'var(--muted)' }} onClick={() => toggleSort('output')}>
                    Output {arrow('output')}
                  </th>
                )}
                {tokenTypes.includes('cache_read') && (
                  <th style={{ ...th, color: sortKey === 'cache_read' ? 'var(--accent)' : 'var(--muted)' }} onClick={() => toggleSort('cache_read')}>
                    Cache Read {arrow('cache_read')}
                  </th>
                )}
                {tokenTypes.includes('cache_creation') && (
                  <th style={{ ...th, color: sortKey === 'cache_creation' ? 'var(--accent)' : 'var(--muted)' }} onClick={() => toggleSort('cache_creation')}>
                    Cache Write {arrow('cache_creation')}
                  </th>
                )}
                <th style={{ ...th, color: sortKey === 'costPer1k' ? 'var(--accent)' : 'var(--muted)' }} onClick={() => toggleSort('costPer1k')}>
                  Cost / 1k {arrow('costPer1k')}
                </th>
                <th style={th}>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((u, i) => {
                const c1k = costPer1k(u)
                const inputPct = u.totalTokens ? ((getCount(u, 'input') / u.totalTokens) * 100) : 0
                const outputPct = u.totalTokens ? ((getCount(u, 'output') / u.totalTokens) * 100) : 0
                const cacheReadPct = u.totalTokens ? ((getCount(u, 'cache_read') / u.totalTokens) * 100) : 0
                return (
                  <tr
                    key={u.user}
                    onClick={() => navigate(`/users/${encodeURIComponent(u.user)}`)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...td, color: 'var(--muted)', width: 40 }}>{page * PAGE_SIZE + i + 1}</td>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{u.displayName}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{u.user}</div>
                    </td>
                    <td style={{ ...td, fontWeight: 600 }}>
                      <div>{fmtTokens(u.totalTokens)}</div>
                      <div style={{ display: 'flex', gap: 2, marginTop: 4, height: 4, borderRadius: 2, overflow: 'hidden', width: 80 }}>
                        {inputPct > 0 && <div style={{ width: `${inputPct}%`, background: TOKEN_TYPE_COLORS.input }} />}
                        {outputPct > 0 && <div style={{ width: `${outputPct}%`, background: TOKEN_TYPE_COLORS.output }} />}
                        {cacheReadPct > 0 && <div style={{ width: `${cacheReadPct}%`, background: TOKEN_TYPE_COLORS.cache_read }} />}
                      </div>
                    </td>
                    {tokenTypes.includes('input') && (
                      <td style={{ ...td, color: 'var(--muted)' }}>{fmtTokens(getCount(u, 'input'))}</td>
                    )}
                    {tokenTypes.includes('output') && (
                      <td style={{ ...td, color: 'var(--muted)' }}>{fmtTokens(getCount(u, 'output'))}</td>
                    )}
                    {tokenTypes.includes('cache_read') && (
                      <td style={{ ...td, color: 'var(--muted)' }}>{fmtTokens(getCount(u, 'cache_read'))}</td>
                    )}
                    {tokenTypes.includes('cache_creation') && (
                      <td style={{ ...td, color: 'var(--muted)' }}>{fmtTokens(getCount(u, 'cache_creation'))}</td>
                    )}
                    <td style={{ ...td, color: c1k < 0.001 ? '#10b981' : c1k > 0.01 ? '#ef4444' : 'var(--muted)' }}>
                      ${c1k.toFixed(4)}
                    </td>
                    <td style={{ ...td, color: 'var(--muted)' }}>{fmtExact(u.token)}</td>
                  </tr>
                )
              })}
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
                <PageBtn key={i} label={String(i + 1)} active={i === page} onClick={() => setPage(i)} />
              ))}
              <PageBtn label="Next →" disabled={page >= pageCount - 1} onClick={() => setPage(p => p + 1)} />
            </div>
          </div>
        )}
      </div>
    </div>
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
