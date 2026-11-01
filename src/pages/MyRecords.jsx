import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { errMsg } from '../lib/format'
import { Alert, Empty, Loading, PageHeader } from '../components/ui'

export default function MyRecords() {
  const [enrollments, setEnrollments] = useState(null)
  const [error, setError] = useState('')
  const [courseFilter, setCourseFilter] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: err } = await supabase
        .from('enrollments')
        .select(
          'id, courses(code, name), attendance(id, date, status), marks(id, exam_type, max_marks, obtained)',
        )
      if (cancelled) return
      setError(errMsg(err))
      setEnrollments(data || [])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const { log, marks } = useMemo(() => {
    const logRows = []
    const markRows = []
    for (const en of enrollments || []) {
      if (courseFilter && String(en.id) !== courseFilter) continue
      const label = `${en.courses?.code} - ${en.courses?.name}`
      for (const a of en.attendance) logRows.push({ ...a, course: label })
      for (const m of en.marks) markRows.push({ ...m, course: label })
    }
    logRows.sort((a, b) => b.date.localeCompare(a.date))
    markRows.sort((a, b) => a.course.localeCompare(b.course))
    return { log: logRows, marks: markRows }
  }, [enrollments, courseFilter])

  if (enrollments === null) return <Loading />

  return (
    <>
      <PageHeader title="My records" subtitle="Your attendance log and marks" />
      <Alert>{error}</Alert>

      {enrollments.length === 0 ? (
        <Empty>
          Nothing to show yet. Either your account is not linked to a student record or you are
          not enrolled in any course.
        </Empty>
      ) : (
        <>
          <div className="toolbar">
            <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
              <option value="">All courses</option>
              {enrollments.map((en) => (
                <option key={en.id} value={en.id}>
                  {en.courses?.code} - {en.courses?.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid-2">
            <section className="card">
              <h3>Marks</h3>
              {marks.length === 0 ? (
                <Empty>No marks recorded yet.</Empty>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Exam</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marks.map((m) => (
                        <tr key={m.id}>
                          <td>{m.course}</td>
                          <td>{m.exam_type}</td>
                          <td>
                            {m.obtained}/{m.max_marks}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card">
              <h3>Attendance log</h3>
              {log.length === 0 ? (
                <Empty>No attendance recorded yet.</Empty>
              ) : (
                <div className="table-wrap tall">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Course</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {log.map((a) => (
                        <tr key={a.id}>
                          <td>{a.date}</td>
                          <td>{a.course}</td>
                          <td>
                            <span
                              className={`badge ${a.status === 'present' ? 'badge-good' : 'badge-bad'}`}
                            >
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  )
}
