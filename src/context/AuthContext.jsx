import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(false)
  const currentUserId = useRef(null)

  const loadProfile = useCallback(async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', userId)
      .maybeSingle()
    setProfile(data || null)
  }, [])

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)

      if (!newSession) {
        currentUserId.current = null
        setProfile(null)
        setReady(true)
        return
      }

      // Token refreshes and tab re-focus events fire for the same user.
      // Ignore them so the UI does not flash back to a loading state.
      if (newSession.user.id === currentUserId.current && event !== 'USER_UPDATED') return

      currentUserId.current = newSession.user.id
      setReady(false)
      // Defer the query: calling supabase inside this callback can deadlock.
      setTimeout(async () => {
        await loadProfile(newSession.user.id)
        setReady(true)
      }, 0)
    })
    return () => data.subscription.unsubscribe()
  }, [loadProfile])

  const signIn = useCallback(
    (email, password) => supabase.auth.signInWithPassword({ email, password }),
    [],
  )

  const signUp = useCallback(
    (email, password, fullName) =>
      supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } }),
    [],
  )

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, profile, ready, signIn, signUp, signOut }),
    [session, profile, ready, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
