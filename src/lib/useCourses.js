import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../context/AuthContext'
import { errMsg } from './format'

// Courses the current user works with: all courses for admins,
// only assigned courses for teachers.
export function useCourses() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      let query = supabase.from('courses').select('id, code, name, department_id').order('code')
      if (profile.role === 'teacher') query = query.eq('teacher_id', profile.id)
      const { data, error: err } = await query
      if (cancelled) return
      setError(errMsg(err))
      setCourses(data || [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [profile.id, profile.role])

  return { courses, loading, error }
}
