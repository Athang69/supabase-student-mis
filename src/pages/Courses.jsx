import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../lib/format'
import { Alert, Empty, Loading, Modal, PageHeader } from '../components/ui'

const blank = { code: '', name: '', department_id: '', credits: '3', teacher_id: '' }

export default function Courses() {
  const { profile } = useAuth()
  const canEdit = profile?.role === 'admin'

  const [rows, setRows] = useState([])
  const [depts, setDepts] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [c, d, t] = await Promise.all([
      supabase
        .from('courses')
        .select(
          'id, code, name, credits, department_id, teacher_id, departments(name), teacher:profiles!teacher_id(full_name, email), enrollments(count)',
        )
        .order('code'),
      supabase.from('departments').select('id, name').order('name'),
      supabase.from('profiles').select('id, full_name, email').eq('role', 'teacher'),
    ])
    setError(errMsg(c.error || d.error))
    setRows(c.data || [])
    setDepts(d.data || [])
    // The email column exists only after supabase/upgrade.sql; fall back gracefully.
    if (t.error) {
      const fallback = await supabase.from('profiles').select('id, full_name').eq('role', 'teacher')
      setTeachers(fallback.data || [])
    } else {
      setTeachers(t.data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const teacherLabel = (t) => t.full_name || t.email || t.id.slice(0, 8)

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      department_id: form.department_id ? Number(form.department_id) : null,
      credits: Number(form.credits),
      teacher_id: form.teacher_id || null,
    }
    const res = form.id
      ? await supabase.from('courses').update(payload).eq('id', form.id)
      : await supabase.from('courses').insert(payload)
    setSaving(false)
    if (res.error) {
      setFormError(errMsg(res.error))
      return
    }
    setForm(null)
    load()
  }

  async function remove(r) {
    if (!window.confirm(`Delete course ${r.code}? Its enrollments, attendance and marks are deleted too.`)) return
    const { error: err } = await supabase.from('courses').delete().eq('id', r.id)
    if (err) setError(errMsg(err))
    else load()
  }

  function openNew() {
    setFormError('')
    setForm({ ...blank, department_id: depts[0] ? String(depts[0].id) : '' })
  }

  function openEdit(r) {
    setFormError('')
    setForm({
      id: r.id,
      code: r.code,
      name: r.name,
      department_id: r.department_id ? String(r.department_id) : '',
      credits: String(r.credits ?? 3),
      teacher_id: r.teacher_id || '',
    })
  }

  return (
    <>
      <PageHeader title="Courses" subtitle={`${rows.length} total`}>
        {canEdit && (
          <button className="btn btn-primary" onClick={openNew}>
            + Add course
          </button>
        )}
      </PageHeader>
      <Alert>{error}</Alert>

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>No courses yet.</Empty>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Department</th>
                <th>Credits</th>
                <th>Teacher</th>
                <th>Students</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.code}</td>
                  <td>{r.name}</td>
                  <td>{r.departments?.name || '-'}</td>
                  <td>{r.credits}</td>
                  <td>{r.teacher ? r.teacher.full_name || r.teacher.email : '-'}</td>
                  <td>{r.enrollments?.[0]?.count ?? 0}</td>
                  {canEdit && (
                    <td className="actions">
                      <button className="btn btn-sm" onClick={() => openEdit(r)}>
                        Edit
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(r)}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal title={form.id ? 'Edit course' : 'Add course'} onClose={() => setForm(null)}>
          <form className="form" onSubmit={save}>
            <div className="form-grid">
              <label>
                Code
                <input required value={form.code} onChange={set('code')} />
              </label>
              <label>
                Credits
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={form.credits}
                  onChange={set('credits')}
                />
              </label>
              <label className="span-2">
                Course name
                <input required value={form.name} onChange={set('name')} />
              </label>
              <label>
                Department
                <select value={form.department_id} onChange={set('department_id')}>
                  <option value="">None</option>
                  {depts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Teacher
                <select value={form.teacher_id} onChange={set('teacher_id')}>
                  <option value="">Unassigned</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {teacherLabel(t)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {teachers.length === 0 && (
              <p className="muted small">
                No teachers yet. Create a user, then set its role to Teacher on the Users page.
              </p>
            )}
            <Alert>{formError}</Alert>
            <div className="modal-foot">
              <button type="button" className="btn" onClick={() => setForm(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
