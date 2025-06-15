import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'

export const supabase = createClientComponentClient<Database>()

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Specific table types for convenience
export type Profile = Tables<'profiles'>
export type Class = Tables<'classes'>
export type Enrollment = Tables<'enrollments'>
export type ClassLog = Tables<'class_logs'>
export type Payment = Tables<'payments'>
export type Message = Tables<'messages'>
export type Attendance = Tables<'attendance'>