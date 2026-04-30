import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useStore } from '../store'

const navItems = [
  { to: '/overview', label: 'Overview' },
  { to: '/users', label: 'Users' },
]

export default function Layout() {
  const { filename, clear } = useStore()
  const navigate = useNavigate()

  function handleClear() {
    clear()
    navigate('/')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 32,
        height: 52,
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
          Claude Cost
        </span>
        <nav style={{ display: 'flex', gap: 4 }}>
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                color: isActive ? '#fff' : 'var(--muted)',
                background: isActive ? 'var(--surface2)' : 'transparent',
                transition: 'all 0.15s',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{filename}</span>
          <button
            onClick={handleClear}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Change file
          </button>
        </div>
      </header>
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
