import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import { useStore } from '../store'
import StatCard from '../components/StatCard'
import Panel from '../components/Panel'
import { fmt, fmtExact, CHART_COLORS } from '../utils'

export default function Overview() {
  const data = useStore(s => s.data)!

  const topUsers = data.users.slice(0, 18).map(u => ({
    name: u.displayName.split(' ')[0] + ' ' + (u.displayName.split(' ')[1]?.[0] ?? '') + '.',
    token: +u.token.toFixed(2),
    ws: +u.ws.toFixed(2),
  }))

  const modelData = Object.entries(data.modelTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({
      name: name.replace('Claude ', '').replace(' (Latest)', ''),
      value: +value.toFixed(2),
      fullName: name,
    }))

  const dailyData = data.dates.map(d => ({
    date: d.slice(5),
    cost: +data.dailyTotals[d].toFixed(2),
  }))

  const avg = data.totalCost / data.users.length

  return (
    <div style={{ padding: '24px 32px 48px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Cost" value={fmt(data.totalCost)} sub={`${data.periodStart} – ${data.periodEnd}`} />
        <StatCard label="Users" value={String(data.users.length)} sub="unique API keys" />
        <StatCard label="Top Spender" value={data.users[0]?.displayName ?? '—'} sub={fmtExact(data.users[0]?.total ?? 0)} />
        <StatCard label="Avg / User" value={fmt(avg)} sub="per month" />
        <StatCard
          label="Token Cost"
          value={fmt(data.tokenCost)}
          sub={`${((data.tokenCost / data.totalCost) * 100).toFixed(1)}% of total`}
        />
        <StatCard
          label="Web Search"
          value={fmt(data.wsCost)}
          sub={`${((data.wsCost / data.totalCost) * 100).toFixed(1)}% of total`}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <Panel title="Top Users by Cost">
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={topUsers} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
              <XAxis
                type="number"
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                tickFormatter={v => `$${v}`}
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
                formatter={(v: number) => fmtExact(v)}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--muted)', paddingTop: 8 }} />
              <Bar dataKey="token" name="Token" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
              <Bar dataKey="ws" name="Web Search" stackId="a" fill="#f59e0b" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Cost by Model">
          <ResponsiveContainer width="100%" height={380}>
            <PieChart>
              <Pie
                data={modelData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={2}
              >
                {modelData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }}
                formatter={(v: number, _: string, entry: { payload: { fullName: string } }) => [
                  fmtExact(v) + ` (${((v / data.totalCost) * 100).toFixed(1)}%)`,
                  entry.payload.fullName,
                ]}
              />
              <Legend
                iconSize={10}
                wrapperStyle={{ fontSize: 11, color: 'var(--muted)', paddingTop: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="Daily Spend Trend">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={dailyData} margin={{ left: 0, right: 20, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(46,50,72,0.6)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `$${v}`}
              width={52}
            />
            <Tooltip
              contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }}
              formatter={(v: number) => [fmtExact(v), 'Cost']}
            />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  )
}
