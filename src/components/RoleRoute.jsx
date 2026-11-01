import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loading } from './ui'

// Wraps routes that need a signed-in user. Pass `roles` to restrict further.
export default function RoleRoute({ roles }) {
  const { session, profile, ready } = useAuth()

  if (!ready) return <div className="center-screen"><Loading /></div>
  if (!session) return <Navigate to="/login" replace />

  if (!profile) {
    return (
      <div className="center-screen">
        <div className="card narrow">
          <h2>Profile not found</h2>
          <p className="muted">
            Your account has no profile row yet. Ask an administrator, or run
            supabase/upgrade.sql in the Supabase SQL Editor, then sign in again.
          </p>
        </div>
      </div>
    )
  }

  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />
  return <Outlet />
}
