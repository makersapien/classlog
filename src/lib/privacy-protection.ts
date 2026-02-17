// src/lib/privacy-protection.ts
import { createServerSupabaseClient } from './supabase-server'

// Privacy filtering for student portal views
export interface PrivacyFilterOptions {
  studentId: string
  teacherId: string
  includePersonalData?: boolean
  includeContactInfo?: boolean
}

type CalendarSlot = {
  id?: string
  date?: string
  start_time?: string
  end_time?: string
  duration_minutes?: number
  subject?: string | null
  status?: string | null
  booked_by?: string | null
  student_name?: string | null
  student_details?: unknown
  notes?: string | null
}

type CalendarSlotView = CalendarSlot & {
  is_my_booking?: boolean
}

type ClientInfo = {
  userAgent?: string | null
  ipAddress?: string | null
  referer?: string | null
  timestamp?: string | null
}

// Data filtering for student portal calendar view
export function filterCalendarDataForStudent(
  slots: CalendarSlot[],
  studentId: string
): CalendarSlotView[] {
  return slots.map(slot => {
    // If this is the student's own booking, show full details
    if (slot.booked_by === studentId) {
      return {
        ...slot,
        status: 'my_booking',
        is_my_booking: true
      }
    }
    
    // If slot is booked by another student, hide personal details
    if (slot.status === 'booked' && slot.booked_by !== studentId) {
      return {
        id: slot.id,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        duration_minutes: slot.duration_minutes,
        subject: slot.subject,
        status: 'booked',
        is_my_booking: false,
        // Remove all personal information
        booked_by: null,
        student_name: null,
        student_details: null,
        notes: null
      }
    }
    
    // Available slots - show basic info only
    return {
      id: slot.id,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      duration_minutes: slot.duration_minutes,
      subject: slot.subject,
      status: slot.status,
      is_my_booking: false
    }
  })
}

// GDPR compliance features
export interface GDPRDataExport {
  personal_data: {
    profile: unknown
    bookings: unknown[]
    share_tokens: unknown[]
    audit_logs: unknown[]
  }
  metadata: {
    export_date: string
    data_retention_period: string
    contact_info: string
  }
}

export async function exportStudentData(
  studentId: string,
  teacherId: string
): Promise<GDPRDataExport> {
  const supabase = await createServerSupabaseClient()
  
  // Get student profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .single()
  
  // Get booking history
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('student_id', studentId)
    .eq('teacher_id', teacherId)
  
  // Get share tokens
  const { data: shareTokens } = await supabase
    .from('share_tokens')
    .select('id, created_at, expires_at, access_count, last_accessed, is_active')
    .eq('student_id', studentId)
    .eq('teacher_id', teacherId)
  
  // Get audit logs (without actual token)
  const { data: auditLogs } = await supabase
    .from('token_audit_logs')
    .select('action, timestamp, client_info')
    .eq('student_id', studentId)
    .eq('teacher_id', teacherId)
  
  return {
    personal_data: {
      profile: profile || {},
      bookings: bookings || [],
      share_tokens: shareTokens || [],
      audit_logs: auditLogs || []
    },
    metadata: {
      export_date: new Date().toISOString(),
      data_retention_period: '7 years from last activity',
      contact_info: 'privacy@classlogger.com'
    }
  }
}

export async function deleteStudentData(
  studentId: string,
  teacherId: string,
  options: {
    deleteBookings?: boolean
    deleteAuditLogs?: boolean
    anonymizeData?: boolean
  } = {}
): Promise<{ success: boolean; deletedRecords: number; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()
    let deletedRecords = 0
    
    // Deactivate share tokens
    const { error: tokenError } = await supabase
      .from('share_tokens')
      .update({ is_active: false })
      .eq('student_id', studentId)
      .eq('teacher_id', teacherId)
    
    if (tokenError) throw tokenError
    deletedRecords++
    
    // Handle bookings based on options
    if (options.deleteBookings) {
      // Cancel future bookings
      const { error: cancelError } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          cancellation_reason: 'Data deletion request'
        })
        .eq('student_id', studentId)
        .eq('teacher_id', teacherId)
        .gte('booking_date', new Date().toISOString().split('T')[0])
      
      if (cancelError) throw cancelError
      deletedRecords++
    }
    
    // Anonymize or delete audit logs
    if (options.deleteAuditLogs) {
      const { error: auditError } = await supabase
        .from('token_audit_logs')
        .delete()
        .eq('student_id', studentId)
        .eq('teacher_id', teacherId)
      
      if (auditError) throw auditError
      deletedRecords++
    } else if (options.anonymizeData) {
      // Anonymize audit logs by removing client info
      const { error: anonymizeError } = await supabase
        .from('token_audit_logs')
        .update({ client_info: null })
        .eq('student_id', studentId)
        .eq('teacher_id', teacherId)
      
      if (anonymizeError) throw anonymizeError
      deletedRecords++
    }
    
    return { success: true, deletedRecords }
  } catch (error) {
    console.error('Data deletion error:', error)
    return { 
      success: false, 
      deletedRecords: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Privacy settings for teachers
export interface TeacherPrivacySettings {
  id: string
  teacher_id: string
  hide_student_names_in_calendar: boolean
  allow_student_notes: boolean
  share_booking_analytics: boolean
  data_retention_days: number
  require_booking_confirmation: boolean
  allow_late_cancellations: boolean
  created_at: string
  updated_at: string
}

export async function getTeacherPrivacySettings(
  teacherId: string
): Promise<TeacherPrivacySettings | null> {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('teacher_privacy_settings')
    .select('*')
    .eq('teacher_id', teacherId)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching privacy settings:', error)
    return null
  }
  
  // Return default settings if none exist
  if (!data) {
    return {
      id: '',
      teacher_id: teacherId,
      hide_student_names_in_calendar: false,
      allow_student_notes: true,
      share_booking_analytics: false,
      data_retention_days: 2555, // 7 years
      require_booking_confirmation: false,
      allow_late_cancellations: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
  
  return data
}

export async function updateTeacherPrivacySettings(
  teacherId: string,
  settings: Partial<TeacherPrivacySettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { error } = await supabase
      .from('teacher_privacy_settings')
      .upsert({
        teacher_id: teacherId,
        ...settings,
        updated_at: new Date().toISOString()
      })
    
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('Error updating privacy settings:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Data anonymization utilities
export function anonymizeClientInfo(clientInfo: unknown): ClientInfo | null {
  if (!clientInfo) return null

  const info = clientInfo as ClientInfo
  return {
    userAgent: info.userAgent ? 'anonymized' : null,
    ipAddress: info.ipAddress
      ? info.ipAddress.split('.').slice(0, 2).join('.') + '.xxx.xxx'
      : null,
    referer: info.referer ? 'anonymized' : null,
    timestamp: info.timestamp || new Date().toISOString()
  }
}

// Secure data validation
export function validateDataAccess(
  requestingUserId: string,
  dataOwnerId: string,
  userRole: string
): boolean {
  // Users can access their own data
  if (requestingUserId === dataOwnerId) {
    return true
  }
  
  // Teachers can access their students' booking-related data
  if (userRole === 'teacher') {
    // Additional validation would be needed to verify teacher-student relationship
    return true
  }
  
  // Parents can access their children's data
  if (userRole === 'parent') {
    // Additional validation would be needed to verify parent-child relationship
    return true
  }
  
  // Admins can access all data
  if (userRole === 'admin') {
    return true
  }
  
  return false
}

// Data masking for different user roles
export function maskSensitiveData(data: unknown, viewerRole: string, isOwner: boolean): unknown {
  if (isOwner || viewerRole === 'admin') {
    return data // Full access
  }

  if (!data || typeof data !== 'object') {
    return data
  }
  
  // Mask sensitive fields for non-owners
  const masked = { ...(data as Record<string, unknown>) }
  
  if (typeof masked.email === 'string') {
    masked.email = masked.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
  }
  
  if (typeof masked.phone === 'string') {
    masked.phone = masked.phone.replace(/(.{3})(.*)(.{2})/, '$1***$3')
  }
  
  if (typeof masked.address === 'string') {
    masked.address = 'Address hidden for privacy'
  }
  
  // Remove internal IDs and sensitive metadata
  delete masked.internal_notes
  delete masked.payment_info
  delete masked.parent_contact
  
  return masked
}
