export function today() {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
}

export function pct(part, total) {
  if (!total) return null
  return Math.round((part / total) * 1000) / 10
}

export function fmtPct(value) {
  return value === null || value === undefined ? '-' : `${value}%`
}

export function errMsg(error) {
  if (!error) return ''
  const msg = error.message || String(error)
  if (error.code === '23505') return 'That value already exists (duplicate). Check roll number, code or name.'
  if (error.code === '23503') return 'This record is linked to other records. Remove those first, then try again.'
  if (error.code === '23514') return 'A value is outside the allowed range.'
  if (error.code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return 'You do not have permission to do that.'
  }
  return msg
}
