import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../lib/format'
import { Alert, Empty, Loading, Modal, PageHeader } from '../components/ui'

const blank = { roll_no: '', full_name: '', email: '', phone: '', department_id: '', year: '1' }

export default function Students() {
  const { profile } = useAuth()
  const canEdit = profile?.role === 'admin'

  const [rows, setRows] = useState([])
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [form, setForm] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [s, d] = await Promise.all([
      supabase
        .from('students')
        .select('id, roll_no, full_name, email, phone, year, department_id, user_id, departments(name)')
        .order('roll_no'),
      supabase.from('departments').select('id, name').order('name'),
    ])
    setError(errMsg(s.error || d.error))
    setRows(s.data || [])
    setDepts(d.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (deptFilter && String(r.department_id) !== deptFilter) return false
      if (yearFilter && String(r.year) !== yearFilter) return false
      if (!term) return true
      return (
        r.roll_no.toLowerCase().includes(term) ||
        r.full_name.toLowerCase().includes(term) ||
        (r.email || '').toLowerCase().includes(term)
      )
    })
  }, [rows, q, deptFilter, yearFilter])

  function openNew() {
    setFormError('')
    setForm({ ...blank, department_id: depts[0] ? String(depts[0].id) : '' })
  }

  function openEdit(r) {
    setFormError('')
    setForm({
      id: r.id,
      roll_no: r.roll_no,
      full_name: r.full_name,
      email: r.email || '',
      phone: r.phone || '',
      department_id: r.department_id ? String(r.department_id) : '',
      year: String(r.year || 1),
    })
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    const payload = {
      roll_no: form.roll_no.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      department_id: form.department_id ? Number(form.department_id) : null,
      year: Number(form.year),
    }
    const res = form.id
      ? await supabase.from('students').update(payload).eq('id', form.id)
      : await supabase.from('students').insert(payload)
    setSaving(false)
    if (res.error) {
      setFormError(errMsg(res.error))
      return
    }
    setForm(null)
    load()
  }

  async function remove(r) {
    const ok = window.confirm(
      `Delete ${r.full_name} (${r.roll_no})? Their enrollments, attendance and marks will also be deleted.`,
    )
    if (!ok) return
    const { error: err } = await supabase.from('students').delete().eq('id', r.id)
    if (err) setError(errMsg(err))
    else load()
  }

  return (
    <>
      <PageHeader title="Students" subtitle={`${rows.length} total`}>
        {canEdit && (
          <button className="btn btn-primary" onClick={openNew}>
            + Add student
          </button>
        )}
      </PageHeader>
      <Alert>{error}</Alert>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search roll no, name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">All departments</option>
          {depts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
          <option value="">All years</option>
          {[1, 2, 3, 4].map((y) => (
            <option key={y} value={y}>
              Year {y}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <Empty>No students found.</Empty>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Roll no</th>
                <th>Name</th>
                <th>Department</th>
                <th>Year</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Login</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.roll_no}</td>
                  <td>{r.full_name}</td>
                  <td>{r.departments?.name || '-'}</td>
                  <td>{r.year}</td>
                  <td>{r.email || '-'}</td>
                  <td>{r.phone || '-'}</td>
                  <td>
                    <span className={`badge ${r.user_id ? 'badge-good' : ''}`}>
                      {r.user_id ? 'Linked' : 'Not linked'}
                    </span>
                  </td>
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
        <Modal title={form.id ? 'Edit student' : 'Add student'} onClose={() => setForm(null)}>
          <form className="form" onSubmit={save}>
            <div className="form-grid">
              <label>
                Roll number
                <input required value={form.roll_no} onChange={set('roll_no')} />
              </label>
              <label>
                Full name
                <input required value={form.full_name} onChange={set('full_name')} />
              </label>
              <label>
                Email
                <input type="email" value={form.email} onChange={set('email')} />
              </label>
              <label>
                Phone
                <input value={form.phone} onChange={set('phone')} />
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
                Year
                <select value={form.year} onChange={set('year')}>
                  {[1, 2, 3, 4].map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </select>
              </label>
            </div>
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
