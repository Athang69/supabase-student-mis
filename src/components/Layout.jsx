import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = {
  admin: [
    ['/', 'Dashboard'],
    ['/students', 'Students'],
    ['/departments', 'Departments'],
    ['/courses', 'Courses'],
    ['/enrollments', 'Enrollments'],
    ['/attendance', 'Attendance'],
    ['/marks', 'Marks'],
    ['/users', 'Users'],
  ],
  teacher: [
    ['/', 'Dashboard'],
    ['/students', 'Students'],
    ['/courses', 'Courses'],
    ['/enrollments', 'Enrollments'],
    ['/attendance', 'Attendance'],
    ['/marks', 'Marks'],
  ],
  student: [
    ['/', 'Dashboard'],
    ['/my-records', 'My Records'],
  ],
}

export default function Layout() {
  const { profile, user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const links = NAV[profile?.role] || NAV.student

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">S</span>
          <span>Student MIS</span>
        </div>
        <nav onClick={() => setOpen(false)}>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className="nav-link">
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">
            <div className="who-name">{profile?.full_name || user?.email}</div>
            <div className="who-role">{profile?.role}</div>
          </div>
          <button type="button" className="btn btn-ghost btn-block" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            &#9776;
          </button>
          <span className="topbar-title">Student MIS</span>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
