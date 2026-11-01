import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCourses } from '../lib/useCourses'
import { errMsg } from '../lib/format'
import { Alert, Empty, Loading, PageHeader } from '../components/ui'

const PRESETS = ['Quiz 1', 'Quiz 2', 'Midterm', 'Assignment', 'Practical', 'Endsem']

export default function Marks() {
  const { profile } = useAuth()
  const { courses, loading: coursesLoading, error: coursesError } = useCourses()

  const [courseId, setCourseId] = useState('')
  const [exam, setExam] = useState('Midterm')
  const [max, setMax] = useState('30')
  const [roster, setRoster] = useState([])
  const [allMarks, setAllMarks] = useState([])
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!courseId && courses.length) setCourseId(String(courses[0].id))
  }, [courses, courseId])

  const load = useCallback(async () => {
    if (!courseId) return
    setLoading(true)
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

    let marks = []
    if (list.length) {
      const { data, error: e2 } = await supabase
        .from('marks')
        .select('id, enrollment_id, exam_type, max_marks, obtained')
        .in('enrollment_id', list.map((x) => x.id))
      setError(errMsg(e2))
      marks = data || []
    } else {
      setError('')
    }
    setRoster(list)
    setAllMarks(marks)
    setLoading(false)
  }, [courseId])

  useEffect(() => {
    load()
  }, [load])

  // Fill the input boxes with saved values whenever the exam or data changes.
  const examKey = exam.trim()
  useEffect(() => {
    const filled = {}
    let savedMax = null
    for (const m of allMarks) {
      if (m.exam_type === examKey) {
        filled[m.enrollment_id] = String(m.obtained)
        savedMax = m.max_marks
      }
    }
    setValues(filled)
    if (savedMax !== null) setMax(String(savedMax))
  }, [allMarks, examKey])

  const examTypes = useMemo(() => {
    const set = new Set(allMarks.map((m) => m.exam_type))
    return [...set]
  }, [allMarks])

  const marksByKey = useMemo(() => {
    const map = {}
    for (const m of allMarks) map[`${m.enrollment_id}|${m.exam_type}`] = m
    return map
  }, [allMarks])

  async function save() {
    setError('')
    setNotice('')
    const maxNum = Number(max)
    if (!examKey) return setError('Enter an exam name.')
    if (!(maxNum > 0)) return setError('Maximum marks must be greater than 0.')

    const upserts = []
    const deletes = []
    for (const r of roster) {
      const raw = (values[r.id] ?? '').trim()
      const existing = marksByKey[`${r.id}|${examKey}`]
      if (raw === '') {
        if (existing) deletes.push(existing.id)
        continue
      }
      const num = Number(raw)
      if (Number.isNaN(num) || num < 0 || num > maxNum) {
        return setError(`Marks for ${r.students.full_name} must be a number from 0 to ${maxNum}.`)
      }
      upserts.push({ enrollment_id: r.id, exam_type: examKey, max_marks: maxNum, obtained: num })
    }

    setSaving(true)
    if (upserts.length) {
      const { error: err } = await supabase
        .from('marks')
        .upsert(upserts, { onConflict: 'enrollment_id,exam_type' })
      if (err) {
        setSaving(false)
        return setError(errMsg(err))
      }
    }
    if (deletes.length) {
      const { error: err } = await supabase.from('marks').delete().in('id', deletes)
      if (err) {
        setSaving(false)
        return setError(errMsg(err))
      }
    }
    setSaving(false)
    setNotice(`Saved ${upserts.length} mark(s) for ${examKey}.`)
    load()
  }

  if (coursesLoading) return <Loading />

  return (
    <>
      <PageHeader title="Marks" subtitle="Enter marks per exam. Leave a box empty for no mark." />
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
            <input
              list="exam-presets"
              value={exam}
              onChange={(e) => setExam(e.target.value)}
              placeholder="Exam name"
              aria-label="Exam name"
            />
            <datalist id="exam-presets">
              {[...new Set([...PRESETS, ...examTypes])].map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <input
              type="number"
              min="1"
              step="any"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              aria-label="Maximum marks"
              className="narrow-input"
            />
            <span className="muted small">max marks</span>
          </div>

          {loading ? (
            <Loading />
          ) : roster.length === 0 ? (
            <Empty>No students are enrolled in this course.</Empty>
          ) : (
            <>
              <section className="card">
                <h3>{examKey || 'Exam'}</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Roll no</th>
                        <th>Name</th>
                        <th>Obtained (out of {max || '?'})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((r) => (
                        <tr key={r.id}>
                          <td>{r.students.roll_no}</td>
                          <td>{r.students.full_name}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="narrow-input"
                              value={values[r.id] ?? ''}
                              onChange={(e) => setValues((v) => ({ ...v, [r.id]: e.target.value }))}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="card-foot">
                  <span />
                  <button className="btn btn-primary" onClick={save} disabled={saving}>
                    {saving ? 'Saving...' : 'Save marks'}
                  </button>
                </div>
              </section>

              {examTypes.length > 0 && (
                <section className="card">
                  <h3>All results for this course</h3>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Roll no</th>
                          <th>Name</th>
                          {examTypes.map((t) => (
                            <th key={t}>{t}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {roster.map((r) => (
                          <tr key={r.id}>
                            <td>{r.students.roll_no}</td>
                            <td>{r.students.full_name}</td>
                            {examTypes.map((t) => {
                              const m = marksByKey[`${r.id}|${t}`]
                              return <td key={t}>{m ? `${m.obtained}/${m.max_marks}` : '-'}</td>
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}
