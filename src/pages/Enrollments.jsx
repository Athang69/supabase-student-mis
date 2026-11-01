import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCourses } from '../lib/useCourses'
import { errMsg } from '../lib/format'
import { Alert, Empty, Loading, PageHeader } from '../components/ui'

export default function Enrollments() {
  const { profile } = useAuth()
  const canEdit = profile?.role === 'admin'
  const { courses, loading: coursesLoading, error: coursesError } = useCourses()

  const [courseId, setCourseId] = useState('')
  const [enrolled, setEnrolled] = useState([])
  const [allStudents, setAllStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [picked, setPicked] = useState([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!courseId && courses.length) setCourseId(String(courses[0].id))
  }, [courses, courseId])

  const load = useCallback(async () => {
    if (!courseId) return
    setLoading(true)
    const [e, s] = await Promise.all([
      supabase
        .from('enrollments')
        .select('id, students(id, roll_no, full_name, year)')
        .eq('course_id', courseId),
      supabase.from('students').select('id, roll_no, full_name, year').order('roll_no'),
    ])
    setError(errMsg(e.error || s.error))
    const list = (e.data || []).filter((x) => x.students)
    list.sort((a, b) => a.students.roll_no.localeCompare(b.students.roll_no))
    setEnrolled(list)
    setAllStudents(s.data || [])
    setPicked([])
    setLoading(false)
  }, [courseId])

  useEffect(() => {
    load()
  }, [load])

  const candidates = useMemo(() => {
    const taken = new Set(enrolled.map((x) => x.students.id))
    const term = q.trim().toLowerCase()
    return allStudents.filter(
      (s) =>
        !taken.has(s.id) &&
        (!term || s.roll_no.toLowerCase().includes(term) || s.full_name.toLowerCase().includes(term)),
    )
  }, [allStudents, enrolled, q])

  const toggle = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  async function enrollPicked() {
    if (!picked.length) return
    setBusy(true)
    const rows = picked.map((student_id) => ({ student_id, course_id: Number(courseId) }))
    const { error: err } = await supabase.from('enrollments').insert(rows)
    setBusy(false)
    if (err) setError(errMsg(err))
    else load()
  }

  async function unenroll(en) {
    const ok = window.confirm(
      `Remove ${en.students.full_name} from this course? Their attendance and marks for it are deleted too.`,
    )
    if (!ok) return
    const { error: err } = await supabase.from('enrollments').delete().eq('id', en.id)
    if (err) setError(errMsg(err))
    else load()
  }

  if (coursesLoading) return <Loading />

  return (
    <>
      <PageHeader title="Enrollments" subtitle="Choose a course to see and manage its students" />
      <Alert>{coursesError || error}</Alert>

      {courses.length === 0 ? (
        <Empty>
          {profile.role === 'teacher'
            ? 'No courses are assigned to you yet.'
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
          </div>

          <div className={canEdit ? 'grid-2' : ''}>
            <section className="card">
              <h3>Enrolled ({enrolled.length})</h3>
              {loading ? (
                <Loading />
              ) : enrolled.length === 0 ? (
                <Empty>No students enrolled yet.</Empty>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Roll no</th>
                        <th>Name</th>
                        <th>Year</th>
                        {canEdit && <th />}
                      </tr>
                    </thead>
                    <tbody>
                      {enrolled.map((en) => (
                        <tr key={en.id}>
                          <td>{en.students.roll_no}</td>
                          <td>{en.students.full_name}</td>
                          <td>{en.students.year}</td>
                          {canEdit && (
                            <td className="actions">
                              <button className="btn btn-sm btn-danger" onClick={() => unenroll(en)}>
                                Remove
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {canEdit && (
              <section className="card">
                <h3>Add students</h3>
                <input
                  type="search"
                  placeholder="Search roll no or name"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <div className="pick-list">
                  {candidates.length === 0 ? (
                    <Empty>No students available to add.</Empty>
                  ) : (
                    candidates.map((s) => (
                      <label key={s.id} className="pick-row">
                        <input
                          type="checkbox"
                          checked={picked.includes(s.id)}
                          onChange={() => toggle(s.id)}
                        />
                        <span>
                          <strong>{s.roll_no}</strong> {s.full_name}
                        </span>
                        <span className="muted small">Year {s.year}</span>
                      </label>
                    ))
                  )}
                </div>
                <div className="row-actions">
                  <button
                    className="btn"
                    type="button"
                    onClick={() => setPicked(candidates.map((s) => s.id))}
                    disabled={!candidates.length}
                  >
                    Select all shown
                  </button>
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={!picked.length || busy}
                    onClick={enrollPicked}
                  >
                    {busy ? 'Enrolling...' : `Enroll selected (${picked.length})`}
                  </button>
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </>
  )
}
