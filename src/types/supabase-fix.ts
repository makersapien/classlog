import { createClient } from '@supabase/supabase-js'

export type SupabaseClient = ReturnType<typeof createClient>
export type SupabaseQueryResult<T> = {
  data: T[] | null
  error: { message: string } | null
}
