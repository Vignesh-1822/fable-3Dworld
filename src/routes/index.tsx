import { Routes, Route } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { WorldPage } from '@/pages'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<WorldPage />} />
      <Route path="*" element={<div>404 - Page Not Found</div>} />
    </Routes>
  )
}
