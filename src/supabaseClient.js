import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// login
const { error } = await supabase.auth.signInWithPassword({ email, password })

// get current user's role after login
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('profiles')
  .select('role, full_name')
  .eq('id', user.id)
  .single()

// listen for session changes (put in a useEffect in App.jsx)
supabase.auth.onAuthStateChange((_event, session) => { /* update state */ })

// logout
await supabase.auth.signOut()

// list students with department name
const { data } = await supabase
  .from('students')
  .select('id, roll_no, full_name, year, departments(name)')
  .order('roll_no')

// add student (admin only)
await supabase.from('students').insert({
  roll_no: '2022ET002', full_name: 'Name', email: 'a@b.com', department_id: 1, year: 4
})

// update / delete
await supabase.from('students').update({ phone: '9999999999' }).eq('id', 1)
await supabase.from('students').delete().eq('id', 1)

// enroll a student in a course
await supabase.from('enrollments').insert({ student_id: 1, course_id: 1 })

// mark attendance (upsert so re-marking the same day just updates)
await supabase.from('attendance').upsert(
  { enrollment_id: 1, date: '2026-11-01', status: 'present' },
  { onConflict: 'enrollment_id,date' }
)

// enter marks
await supabase.from('marks').upsert(
  { enrollment_id: 1, exam_type: 'Midterm', max_marks: 30, obtained: 24 },
  { onConflict: 'enrollment_id,exam_type' }
)

// student's own marks (RLS automatically filters to their own rows)
const { data: myMarks } = await supabase
  .from('marks')
  .select('exam_type, max_marks, obtained, enrollments(courses(name, code))')

