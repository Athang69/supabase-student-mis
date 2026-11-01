import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configured = Boolean(url && key)

// Placeholder values keep the app from crashing on import when env vars are
// missing; App.jsx shows a clear setup message in that case.
export const supabase = createClient(url || 'http://localhost', key || 'missing-key')
