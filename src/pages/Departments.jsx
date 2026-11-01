import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { errMsg } from '../lib/format'
import { Alert, Empty, Loading, Modal, PageHeader } from '../components/ui'

export default function Departments() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('departments')
      .select('id, name, students(count), courses(count)')
      .order('name')
    setError(errMsg(err))
    setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    const name = form.name.trim()
    const res = form.id
      ? await supabase.from('departments').update({ name }).eq('id', form.id)
      : await supabase.from('departments').insert({ name })
    setSaving(false)
    if (res.error) {
      setFormError(errMsg(res.error))
      return
    }
    setForm(null)
    load()
  }

  async function remove(r) {
    if (!window.confirm(`Delete department "${r.name}"?`)) return
    const { error: err } = await supabase.from('departments').delete().eq('id', r.id)
    if (err) {
      setError(
        err.code === '23503'
          ? `"${r.name}" still has students or courses. Move or delete them first.`
          : errMsg(err),
      )
    } else {
      setError('')
      load()
    }
  }

  return (
    <>
      <PageHeader title="Departments" subtitle={`${rows.length} total`}>
        <button className="btn btn-primary" onClick={() => { setFormError(''); setForm({ name: '' }) }}>
          + Add department
        </button>
      </PageHeader>
      <Alert>{error}</Alert>

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>No departments yet. Add the first one.</Empty>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Students</th>
                <th>Courses</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.students?.[0]?.count ?? 0}</td>
                  <td>{r.courses?.[0]?.count ?? 0}</td>
                  <td className="actions">
                    <button
                      className="btn btn-sm"
                      onClick={() => { setFormError(''); setForm({ id: r.id, name: r.name }) }}
                    >
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(r)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal title={form.id ? 'Edit department' : 'Add department'} onClose={() => setForm(null)}>
          <form className="form" onSubmit={save}>
            <label>
              Name
              <input
                required
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
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
