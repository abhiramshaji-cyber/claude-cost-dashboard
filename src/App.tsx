import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import Layout from './components/Layout'
import Upload from './pages/Upload'
import Overview from './pages/Overview'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'

function Inner() {
  const data = useStore(s => s.data)

  if (!data) return <Upload />

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="users" element={<Users />} />
        <Route path="users/:name" element={<UserDetail />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Inner />
    </BrowserRouter>
  )
}
