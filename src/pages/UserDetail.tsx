import { useNavigate, useParams } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts'
import { useStore } from '../store'
import Panel from '../components/Panel'
import StatCard from '../components/StatCard'
import { fmt, fmtExact, fmtTokens, CHART_COLORS } from '../utils'

export default function UserDetail() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const data = useStore(s => s.data)!

  const user = data.users.find(u => u.user === decodeURIComponent(name ?? ''))
  if (!user) return (
    <div style={{ padding: 40, color: 'var(--muted)' }}>
      User not found. <button onClick={() => navigate('/users')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Back</button>
    </div>
  )

  const allDates = data.dates
  const dailyData = allDates.map(d => ({
    date: d.slice(5),
    cost: +(user.dailyCost[d] ?? 0).toFixed(2),
  }))

  const modelData = Object.entries(user.models)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({
      name: name.replace('Claude ', '').replace(' (Latest)', ''),
      value: +value.toFixed(2),
    }))

  const tokenTypeData = Object.entries(user.tokenTypes)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value: +value.toFixed(2),
    }))

  const shareOfTotal = ((user.total / data.totalCost) * 100).toFixed(1)
  const rankAmong = data.users.findIndex(u => u.user === user.user) + 1

  return (
    <div style={{ padding: '24px 32px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/users')}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--muted)',
            cursor: 'pointer',
            padding: '7px 14px',
            fontSize: 13,
          }}
        >
          ← Back
        </button>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
            {user.displayName}
          </h2>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>{user.user}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Cost" value={fmt(user.total)} sub={`Rank #${rankAmong}`} />
        <StatCard label="Token Cost" value={fmt(user.token)} sub={`${((user.token / user.total) * 100).toFixed(1)}% of spend`} />
        <StatCard label="Web Search" value={fmtExact(user.ws)} sub={`${((user.ws / user.total) * 100).toFixed(1)}% of spend`} />
        <StatCard label="Share of Total" value={shareOfTotal + '%'} sub={fmtExact(data.totalCost) + ' total'} />
        <StatCard label="Models Used" value={String(Object.keys(user.models).length)} sub="distinct models" />
        <StatCard label="Active Days" value={String(Object.keys(user.dailyCost).length)} sub="days with spend" />
        {user.totalTokens > 0 && (
          <StatCard
            label="Total Tokens"
            value={fmtTokens(user.totalTokens)}
            sub={`$${(user.token / user.totalTokens * 1000).toFixed(4)} per 1k`}
          />
        )}
      </div>

      <Panel title="Daily Spend" style={{ marginBottom: 20 }}>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={dailyData} margin={{ left: 0, right: 20, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(46,50,72,0.6)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={52} />
            <Tooltip
              contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }}
              formatter={(v) => [fmtExact(Number(v)), 'Cost']}
            />
            <Line type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Panel title="Cost by Model">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={modelData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {modelData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }}
                formatter={(v) => [fmtExact(Number(v))]}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: 'var(--muted)' }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Token Type Breakdown">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={tokenTypeData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={v => `$${v}`} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text)', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip
                contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }}
                formatter={(v) => [fmtExact(Number(v))]}
              />
              <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  )
}
