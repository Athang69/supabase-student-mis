import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../lib/format'
import { Alert, Empty, Loading, PageHeader } from '../components/ui'

export default function Users() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [p, s] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('students').select('id, roll_no, full_name, user_id').order('roll_no'),
    ])
    if (p.error && /email/i.test(p.error.message)) {
      setError('The email column is missing. Run supabase/upgrade.sql in the Supabase SQL Editor, then refresh.')
    } else {
      setError(errMsg(p.error || s.error))
    }
    setProfiles(p.data || [])
    setStudents(s.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function changeRole(p, role) {
    setNotice('')
    const { error: err } = await supabase.from('profiles').update({ role }).eq('id', p.id)
    if (err) setError(errMsg(err))
    else {
      setError('')
      setNotice(`${p.full_name || p.email} is now ${role}.`)
      load()
    }
  }

  async function link(p, studentId) {
    if (!studentId) return
    setNotice('')
    const { error: err } = await supabase
      .from('students')
      .update({ user_id: p.id })
      .eq('id', Number(studentId))
    if (err) setError(errMsg(err))
    else {
      setError('')
      setNotice('Student record linked.')
      load()
    }
  }

  async function unlink(student) {
    const { error: err } = await supabase.from('students').update({ user_id: null }).eq('id', student.id)
    if (err) setError(errMsg(err))
    else {
      setError('')
      setNotice('Student record unlinked.')
      load()
    }
  }

  const unlinked = students.filter((s) => !s.user_id)

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Set roles and link student logins to student records"
      />
      <Alert>{error}</Alert>
      <Alert type="success">{notice}</Alert>

      {loading ? (
        <Loading />
      ) : profiles.length === 0 ? (
        <Empty>No users yet.</Empty>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Linked student</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const linked = students.find((s) => s.user_id === p.id)
                const isMe = p.id === user.id
                return (
                  <tr key={p.id}>
                    <td>
                      {p.full_name || '-'} {isMe && <span className="badge">You</span>}
                    </td>
                    <td>{p.email || '-'}</td>
                    <td>
                      <select
                        value={p.role}
                        disabled={isMe}
                        title={isMe ? 'You cannot change your own role' : undefined}
                        onChange={(e) => changeRole(p, e.target.value)}
                      >
                        <option value="student">student</option>
                        <option value="teacher">teacher</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>
                      {linked ? (
                        <span>
                          {linked.roll_no} {linked.full_name}{' '}
                          <button className="btn btn-sm" onClick={() => unlink(linked)}>
                            Unlink
                          </button>
                        </span>
                      ) : p.role === 'student' ? (
                        <select value="" onChange={(e) => link(p, e.target.value)}>
                          <option value="">Link to a student...</option>
                          {unlinked.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.roll_no} - {s.full_name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
