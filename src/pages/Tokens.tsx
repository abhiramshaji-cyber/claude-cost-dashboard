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

// Colors keyed to actual CSV token_type values
const TYPE_COLOR: Record<string, string> = {
  input_no_cache:       '#6366f1',
  input_cache_read:     '#10b981',
  input_cache_write_5m: '#f59e0b',
  input_cache_write_1h: '#f97316',
  output:               '#06b6d4',
}

function typeLabel(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getCount(u: UserSummary, type: string) {
  return u.tokenTypeCounts[type] ?? 0
}

function costPer1k(u: UserSummary) {
  return u.totalTokens > 0 ? (u.token / u.totalTokens) * 1000 : 0
}

type BaseSortKey = 'totalTokens' | 'costPer1k' | 'displayName'
type SortKey = BaseSortKey | string

const PAGE_SIZE = 25

export default function Tokens() {
  const data = useStore(s => s.data)!
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('totalTokens')
  const [sortAsc, setSortAsc] = useState(false)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  // Discover all token types present in the data, in a logical display order
  const tokenTypes = useMemo(() => {
    const order = ['input_no_cache', 'input_cache_read', 'input_cache_write_5m', 'input_cache_write_1h', 'output']
    const present = new Set<string>()
    for (const u of data.users) Object.keys(u.tokenTypeCounts).forEach(t => present.add(t))
    const ordered = order.filter(t => present.has(t))
    for (const t of present) if (!ordered.includes(t)) ordered.push(t)
    return ordered
  }, [data.users])

  const usersWithTokens = useMemo(() =>
    data.users.filter(u => u.totalTokens > 0),
    [data.users]
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return usersWithTokens.filter(u =>
      !q || u.displayName.toLowerCase().includes(q) || u.user.includes(q)
    )
  }, [usersWithTokens, query])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: number | string, bv: number | string
      if (sortKey === 'displayName') { av = a.displayName; bv = b.displayName }
      else if (sortKey === 'costPer1k') { av = costPer1k(a); bv = costPer1k(b) }
      else if (sortKey === 'totalTokens') { av = a.totalTokens; bv = b.totalTokens }
      else { av = getCount(a, sortKey); bv = getCount(b, sortKey) }
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
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

  const chartData = usersWithTokens.slice(0, 15).map(u => {
    const entry: Record<string, string | number> = {
      name: u.displayName.split(' ')[0] + ' ' + (u.displayName.split(' ')[1]?.[0] ?? '') + '.',
    }
    for (const t of tokenTypes) entry[t] = getCount(u, t)
    return entry
  })

  const avgTokens = usersWithTokens.length ? data.totalTokens / usersWithTokens.length : 0
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

  if (data.totalTokens === 0) {
    return (
      <div style={{ padding: '48px 32px', color: 'var(--muted)', textAlign: 'center' }}>
        <div style={{ fontSize: 15, marginBottom: 8 }}>No token data available</div>
        <div style={{ fontSize: 13 }}>Token counts are derived from model pricing. Ensure the CSV contains recognised model names.</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 32px 48px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Tokens" value={fmtTokens(data.totalTokens)} sub="derived from model pricing" />
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
        <ResponsiveContainer width="100%" height={Math.max(260, usersWithTokens.slice(0, 15).length * 22 + 60)}>
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
              formatter={(v, name) => [fmtTokens(Number(v)), typeLabel(String(name))]}
            />
            <Legend
              formatter={v => typeLabel(String(v))}
              wrapperStyle={{ fontSize: 11, color: 'var(--muted)', paddingTop: 8 }}
            />
            {tokenTypes.map((t, i) => (
              <Bar
                key={t}
                dataKey={t}
                name={t}
                stackId="a"
                fill={TYPE_COLOR[t] ?? CHART_COLORS[i % CHART_COLORS.length]}
                radius={i === tokenTypes.length - 1 ? [0, 3, 3, 0] : [0, 0, 0, 0]}
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
                {tokenTypes.map(t => (
                  <th
                    key={t}
                    style={{ ...th, color: sortKey === t ? 'var(--accent)' : 'var(--muted)' }}
                    onClick={() => toggleSort(t)}
                  >
                    {typeLabel(t)} {arrow(t)}
                  </th>
                ))}
                <th style={{ ...th, color: sortKey === 'costPer1k' ? 'var(--accent)' : 'var(--muted)' }} onClick={() => toggleSort('costPer1k')}>
                  Cost / 1k {arrow('costPer1k')}
                </th>
                <th style={th}>Token Cost</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((u, i) => {
                const c1k = costPer1k(u)
                const barSegments = tokenTypes.map(t => ({
                  type: t,
                  pct: u.totalTokens ? (getCount(u, t) / u.totalTokens) * 100 : 0,
                }))
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
                      <div style={{ display: 'flex', marginTop: 4, height: 4, borderRadius: 2, overflow: 'hidden', width: 80 }}>
                        {barSegments.map(s => s.pct > 0 && (
                          <div
                            key={s.type}
                            style={{ width: `${s.pct}%`, background: TYPE_COLOR[s.type] ?? '#6366f1' }}
                          />
                        ))}
                      </div>
                    </td>
                    {tokenTypes.map(t => (
                      <td key={t} style={{ ...td, color: 'var(--muted)' }}>
                        {fmtTokens(getCount(u, t))}
                      </td>
                    ))}
                    <td style={{
                      ...td,
                      color: c1k < 0.0005 ? '#10b981' : c1k > 0.005 ? '#ef4444' : 'var(--muted)',
                    }}>
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
