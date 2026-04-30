import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import Layout from './components/Layout'
import Upload from './pages/Upload'
import Overview from './pages/Overview'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'

export default function App() {
  const data = useStore(s => s.data)

  if (!data) return <Upload />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:name" element={<UserDetail />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
