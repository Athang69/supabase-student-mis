import { Navigate, Route, Routes } from 'react-router-dom'
import { configured } from './lib/supabase'
import Layout from './components/Layout.jsx'
import RoleRoute from './components/RoleRoute.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Students from './pages/Students.jsx'
import Departments from './pages/Departments.jsx'
import Courses from './pages/Courses.jsx'
import Enrollments from './pages/Enrollments.jsx'
import Attendance from './pages/Attendance.jsx'
import Marks from './pages/Marks.jsx'
import Users from './pages/Users.jsx'
import MyRecords from './pages/MyRecords.jsx'

export default function App() {
  if (!configured) {
    return (
      <div className="center-screen">
        <div className="card narrow">
          <h2>Supabase is not configured</h2>
          <p className="muted">
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to a
            <code> .env</code> file (locally) or to your hosting provider's environment variables,
            then restart or redeploy.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RoleRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />

          <Route element={<RoleRoute roles={['admin', 'teacher']} />}>
            <Route path="students" element={<Students />} />
            <Route path="courses" element={<Courses />} />
            <Route path="enrollments" element={<Enrollments />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="marks" element={<Marks />} />
          </Route>

          <Route element={<RoleRoute roles={['admin']} />}>
            <Route path="departments" element={<Departments />} />
            <Route path="users" element={<Users />} />
          </Route>

          <Route element={<RoleRoute roles={['student']} />}>
            <Route path="my-records" element={<MyRecords />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
