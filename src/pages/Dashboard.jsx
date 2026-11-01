import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fmtPct, pct } from '../lib/format'
import { Alert, Empty, Loading, PageHeader, PctBadge, StatCard } from '../components/ui'

export default function Dashboard() {
  const { profile } = useAuth()
  if (profile?.role === 'student') return <StudentDashboard profile={profile} />
  return <StaffDashboard profile={profile} />
}

function StaffDashboard({ profile }) {
  const [counts, setCounts] = useState(null)
  const [myCourses, setMyCourses] = useState([])
  const [recent, setRecent] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const head = (table) => supabase.from(table).select('*', { count: 'exact', head: true })
      const [s, c, e, d, mine, rec] = await Promise.all([
        head('students'),
        head('courses'),
        head('enrollments'),
        head('departments'),
        supabase
          .from('courses')
          .select('id, code, name, enrollments(count)')
          .eq('teacher_id', profile.id)
          .order('code'),
        supabase
          .from('students')
          .select('id, roll_no, full_name, year, departments(name)')
          .order('created_at', { ascending: false })
          .limit(5),
      ])
      if (cancelled) return
      const firstError = [s, c, e, d, mine, rec].find((r) => r.error)
      if (firstError) setError(firstError.error.message)
      setCounts({ students: s.count, courses: c.count, enrollments: e.count, departments: d.count })
      setMyCourses(mine.data || [])
      setRecent(rec.data || [])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [profile.id])

  if (!counts) return <Loading />

  return (
    <>
      <PageHeader
        title={`Welcome, ${profile.full_name || 'there'}`}
        subtitle={profile.role === 'admin' ? 'Administrator overview' : 'Teacher overview'}
      />
      <Alert>{error}</Alert>

      <div className="stats">
        <StatCard label="Students" value={counts.students ?? 0} />
        <StatCard label="Courses" value={counts.courses ?? 0} />
        <StatCard label="Enrollments" value={counts.enrollments ?? 0} />
        <StatCard label="Departments" value={counts.departments ?? 0} />
      </div>

      <div className="grid-2">
        <section className="card">
          <h3>My courses</h3>
          {myCourses.length === 0 ? (
            <Empty>
              No courses are assigned to you yet.
              {profile.role === 'admin' ? ' Assign a teacher on the Courses page.' : ' Ask an administrator.'}
            </Empty>
          ) : (
            <ul className="plain-list">
              {myCourses.map((c) => (
                <li key={c.id}>
                  <strong>{c.code}</strong> {c.name}
                  <span className="muted"> - {c.enrollments?.[0]?.count ?? 0} students</span>
                </li>
              ))}
            </ul>
          )}
          <div className="row-actions">
            <Link className="btn" to="/attendance">Take attendance</Link>
            <Link className="btn" to="/marks">Enter marks</Link>
          </div>
        </section>

        <section className="card">
          <h3>Recently added students</h3>
          {recent.length === 0 ? (
            <Empty>No students yet.</Empty>
          ) : (
            <ul className="plain-list">
              {recent.map((s) => (
                <li key={s.id}>
                  <strong>{s.roll_no}</strong> {s.full_name}
                  <span className="muted">
                    {' '}
                    - {s.departments?.name || 'No department'}, year {s.year}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

function StudentDashboard({ profile }) {
  const [student, setStudent] = useState(undefined)
  const [enrollments, setEnrollments] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [s, e] = await Promise.all([
        supabase
          .from('students')
          .select('id, roll_no, full_name, year, departments(name)')
          .limit(1)
          .maybeSingle(),
        supabase
          .from('enrollments')
          .select(
            'id, courses(code, name, credits), attendance(status), marks(exam_type, max_marks, obtained)',
          ),
      ])
      if (cancelled) return
      if (s.error) setError(s.error.message)
      if (e.error) setError(e.error.message)
      setStudent(s.data || null)
      setEnrollments(e.data || [])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (student === undefined) return <Loading />

  if (!student) {
    return (
      <>
        <PageHeader title={`Welcome, ${profile.full_name || 'student'}`} />
        <Alert type="info">
          Your account is not linked to a student record yet. Ask an administrator to link it
          (Users page). Your attendance and marks will appear here once that is done.
        </Alert>
      </>
    )
  }

  const rows = enrollments.map((en) => {
    const total = en.attendance.length
    const present = en.attendance.filter((a) => a.status === 'present').length
    const maxSum = en.marks.reduce((t, m) => t + Number(m.max_marks), 0)
    const gotSum = en.marks.reduce((t, m) => t + Number(m.obtained), 0)
    return {
      id: en.id,
      course: en.courses,
      total,
      present,
      attendance: pct(present, total),
      marksPct: pct(gotSum, maxSum),
      gotSum,
      maxSum,
    }
  })

  const totalAll = rows.reduce((t, r) => t + r.total, 0)
  const presentAll = rows.reduce((t, r) => t + r.present, 0)
  const gotAll = rows.reduce((t, r) => t + r.gotSum, 0)
  const maxAll = rows.reduce((t, r) => t + r.maxSum, 0)
  const overallAtt = pct(presentAll, totalAll)
  const overallMarks = pct(gotAll, maxAll)

  return (
    <>
      <PageHeader
        title={student.full_name}
        subtitle={`${student.roll_no} - ${student.departments?.name || 'No department'} - Year ${student.year}`}
      >
        <Link className="btn" to="/my-records">Detailed records</Link>
      </PageHeader>
      <Alert>{error}</Alert>

      <div className="stats">
        <StatCard label="Courses" value={rows.length} />
        <StatCard
          label="Overall attendance"
          value={fmtPct(overallAtt)}
          hint={totalAll ? `${presentAll} of ${totalAll} classes` : 'No classes recorded'}
          tone={overallAtt === null ? undefined : overallAtt >= 75 ? 'good' : 'bad'}
        />
        <StatCard
          label="Overall marks"
          value={fmtPct(overallMarks)}
          hint={maxAll ? `${gotAll} of ${maxAll}` : 'No marks yet'}
        />
      </div>

      <section className="card">
        <h3>Course summary</h3>
        {rows.length === 0 ? (
          <Empty>You are not enrolled in any course yet.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Course</th>
                  <th>Credits</th>
                  <th>Attendance</th>
                  <th>Marks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.course?.code}</td>
                    <td>{r.course?.name}</td>
                    <td>{r.course?.credits}</td>
                    <td>
                      <PctBadge value={r.attendance} />{' '}
                      <span className="muted small">
                        {r.total ? `${r.present}/${r.total}` : ''}
                      </span>
                    </td>
                    <td>
                      {r.maxSum ? `${r.gotSum}/${r.maxSum} (${r.marksPct}%)` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small">Attendance below 75% is highlighted.</p>
      </section>
    </>
  )
}
