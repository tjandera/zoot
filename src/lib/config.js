/** Runtime flags derived from env. Import these instead of reading import.meta.env everywhere. */
const env = import.meta.env || {}

export const SUPABASE_URL = env.VITE_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || ''
export const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const CITY = { name: 'Singapore', lat: 1.2903, lng: 103.8519, tz: 'Asia/Singapore', utcOffsetMin: 480 }
