import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCourses } from '../lib/useCourses'
import { errMsg, pct, today } from '../lib/format'
import { Alert, Empty, Loading, PageHeader, PctBadge } from '../components/ui'

export default function Attendance() {
  const { profile } = useAuth()
  const { courses, loading: coursesLoading, error: coursesError } = useCourses()

  const [courseId, setCourseId] = useState('')
  const [date, setDate] = useState(today())
  const [roster, setRoster] = useState([])
  const [status, setStatus] = useState({})
  const [summary, setSummary] = useState({})
  const [alreadyMarked, setAlreadyMarked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!courseId && courses.length) setCourseId(String(courses[0].id))
  }, [courses, courseId])

  const load = useCallback(async () => {
    if (!courseId || !date) return
    setLoading(true)
    setNotice('')
    const { data: enr, error: e1 } = await supabase
      .from('enrollments')
      .select('id, students(id, roll_no, full_name)')
      .eq('course_id', courseId)
    if (e1) {
      setError(errMsg(e1))
      setLoading(false)
      return
    }
    const list = (enr || []).filter((x) => x.students)
    list.sort((a, b) => a.students.roll_no.localeCompare(b.students.roll_no))

    const ids = list.map((x) => x.id)
    let records = []
    if (ids.length) {
      const { data, error: e2 } = await supabase
        .from('attendance')
        .select('enrollment_id, date, status')
        .in('enrollment_id', ids)
      if (e2) setError(errMsg(e2))
      else setError('')
      records = data || []
    } else {
      setError('')
    }

    const sum = {}
    const forDay = {}
    for (const r of records) {
      const s = (sum[r.enrollment_id] ||= { present: 0, total: 0 })
      s.total += 1
      if (r.status === 'present') s.present += 1
      if (r.date === date) forDay[r.enrollment_id] = r.status
    }

    const initial = {}
    for (const en of list) initial[en.id] = forDay[en.id] || 'present'

    setRoster(list)
    setSummary(sum)
    setStatus(initial)
    setAlreadyMarked(Object.keys(forDay).length > 0)
    setLoading(false)
  }, [courseId, date])

  useEffect(() => {
    load()
  }, [load])

  const setAll = (value) =>
    setStatus(Object.fromEntries(roster.map((r) => [r.id, value])))

  const presentCount = roster.filter((r) => status[r.id] === 'present').length

  async function save() {
    setSaving(true)
    setError('')
    setNotice('')
    const rows = roster.map((r) => ({
      enrollment_id: r.id,
      date,
      status: status[r.id] || 'present',
    }))
    const { error: err } = await supabase
      .from('attendance')
      .upsert(rows, { onConflict: 'enrollment_id,date' })
    setSaving(false)
    if (err) {
      setError(errMsg(err))
      return
    }
    setNotice(`Attendance saved for ${date}.`)
    load()
  }

  if (coursesLoading) return <Loading />

  return (
    <>
      <PageHeader title="Attendance" subtitle="Mark attendance for a course and date" />
      <Alert>{coursesError || error}</Alert>
      <Alert type="success">{notice}</Alert>

      {courses.length === 0 ? (
        <Empty>
          {profile.role === 'teacher'
            ? 'No courses are assigned to you yet. Ask an administrator.'
            : 'No courses yet. Add one on the Courses page.'}
        </Empty>
      ) : (
        <>
          <div className="toolbar">
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
            <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
          </div>

          {loading ? (
            <Loading />
          ) : roster.length === 0 ? (
            <Empty>No students are enrolled in this course.</Empty>
          ) : (
            <section className="card">
              <div className="card-head">
                <div>
                  <h3>{date}</h3>
                  <p className="muted small">
                    {alreadyMarked
                      ? 'Already marked for this date. Saving will update it.'
                      : 'Not marked yet for this date. Everyone starts as present.'}
                  </p>
                </div>
                <div className="row-actions">
                  <button className="btn btn-sm" onClick={() => setAll('present')}>
                    All present
                  </button>
                  <button className="btn btn-sm" onClick={() => setAll('absent')}>
                    All absent
                  </button>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Roll no</th>
                      <th>Name</th>
                      <th>Overall</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((r) => {
                      const s = summary[r.id]
                      return (
                        <tr key={r.id}>
                          <td>{r.students.roll_no}</td>
                          <td>{r.students.full_name}</td>
                          <td>
                            <PctBadge value={s ? pct(s.present, s.total) : null} />{' '}
                            <span className="muted small">{s ? `${s.present}/${s.total}` : ''}</span>
                          </td>
                          <td>
                            <div className="seg">
                              <button
                                type="button"
                                className={status[r.id] === 'present' ? 'seg-on seg-present' : ''}
                                onClick={() => setStatus((p) => ({ ...p, [r.id]: 'present' }))}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                className={status[r.id] === 'absent' ? 'seg-on seg-absent' : ''}
                                onClick={() => setStatus((p) => ({ ...p, [r.id]: 'absent' }))}
                              >
                                Absent
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="card-foot">
                <span className="muted">
                  {presentCount} present, {roster.length - presentCount} absent
                </span>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving ? 'Saving...' : 'Save attendance'}
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </>
  )
}
