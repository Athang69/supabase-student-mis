import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Alert, Loading } from '../components/ui'

export default function Login() {
  const { session, ready, signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  if (!ready) return <div className="center-screen"><Loading /></div>
  if (session) return <Navigate to="/" replace />

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')

    if (mode === 'signin') {
      const { error: err } = await signIn(email.trim(), password)
      if (err) setError(err.message)
    } else {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        setBusy(false)
        return
      }
      const { data, error: err } = await signUp(email.trim(), password, fullName.trim())
      if (err) {
        setError(err.message)
      } else if (!data.session) {
        setInfo('Account created. Check your email to confirm it, then sign in.')
        setMode('signin')
      }
    }
    setBusy(false)
  }

  return (
    <div className="center-screen">
      <div className="card auth-card">
        <div className="brand brand-lg">
          <span className="brand-mark">S</span>
          <span>Student MIS</span>
        </div>
        <p className="muted center">
          {mode === 'signin' ? 'Sign in to continue' : 'Create a student account'}
        </p>

        <form onSubmit={submit} className="form">
          {mode === 'signup' && (
            <label>
              Full name
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </label>

          <Alert>{error}</Alert>
          <Alert type="success">{info}</Alert>

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="muted center small">
          {mode === 'signin' ? 'New student? ' : 'Already have an account? '}
          <button
            type="button"
            className="link"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError('')
              setInfo('')
            }}
          >
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
        {mode === 'signup' && (
          <p className="muted center small">
            After signing up, an administrator links your account to your student record.
          </p>
        )}
      </div>
    </div>
  )
}
