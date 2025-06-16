// types/database.ts

export interface Database {
    public: {
      Tables: {
        profiles: {
          Row: {
            id: string
            full_name: string | null
            email: string | null
            role: 'teacher' | 'student' | 'parent' | null
            parent_id: string | null
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            full_name?: string | null
            email?: string | null
            role?: 'teacher' | 'student' | 'parent' | null
            parent_id?: string | null
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            full_name?: string | null
            email?: string | null
            role?: 'teacher' | 'student' | 'parent' | null
            parent_id?: string | null
            created_at?: string
            updated_at?: string
          }
        }
        classes: {
          Row: {
            id: string
            teacher_id: string
            name: string
            subject: string
            grade: string
            status: 'active' | 'inactive' | 'archived'
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            teacher_id: string
            name: string
            subject: string
            grade: string
            status?: 'active' | 'inactive' | 'archived'
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            teacher_id?: string
            name?: string
            subject?: string
            grade?: string
            status?: 'active' | 'inactive' | 'archived'
            created_at?: string
            updated_at?: string
          }
        }
        enrollments: {
          Row: {
            id: string
            class_id: string
            student_id: string
            status: 'active' | 'inactive' | 'pending'
            enrollment_date: string | null
            classes_per_week: number | null
            classes_per_recharge: number | null
            tentative_schedule: any | null
            whatsapp_group_url: string | null
            google_meet_url: string | null
            setup_completed: boolean | null
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            class_id: string
            student_id: string
            status?: 'active' | 'inactive' | 'pending'
            enrollment_date?: string | null
            classes_per_week?: number | null
            classes_per_recharge?: number | null
            tentative_schedule?: any | null
            whatsapp_group_url?: string | null
            google_meet_url?: string | null
            setup_completed?: boolean | null
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            class_id?: string
            student_id?: string
            status?: 'active' | 'inactive' | 'pending'
            enrollment_date?: string | null
            classes_per_week?: number | null
            classes_per_recharge?: number | null
            tentative_schedule?: any | null
            whatsapp_group_url?: string | null
            google_meet_url?: string | null
            setup_completed?: boolean | null
            created_at?: string
            updated_at?: string
          }
        }
        student_invitations: {
          Row: {
            id: string
            teacher_id: string
            invitation_token: string
            student_name: string
            parent_name: string
            parent_email: string
            subject: string
            year_group: string
            classes_per_week: number | null
            classes_per_recharge: number | null
            tentative_schedule: any | null
            whatsapp_group_url: string | null
            google_meet_url: string | null
            status: 'pending' | 'completed' | 'expired' | 'cancelled'
            expires_at: string | null
            completed_at: string | null
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            teacher_id: string
            invitation_token?: string
            student_name: string
            parent_name: string
            parent_email: string
            subject: string
            year_group: string
            classes_per_week?: number | null
            classes_per_recharge?: number | null
            tentative_schedule?: any | null
            whatsapp_group_url?: string | null
            google_meet_url?: string | null
            status?: 'pending' | 'completed' | 'expired' | 'cancelled'
            expires_at?: string | null
            completed_at?: string | null
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            teacher_id?: string
            invitation_token?: string
            student_name?: string
            parent_name?: string
            parent_email?: string
            subject?: string
            year_group?: string
            classes_per_week?: number | null
            classes_per_recharge?: number | null
            tentative_schedule?: any | null
            whatsapp_group_url?: string | null
            google_meet_url?: string | null
            status?: 'pending' | 'completed' | 'expired' | 'cancelled'
            expires_at?: string | null
            completed_at?: string | null
            created_at?: string
            updated_at?: string
          }
        }
        class_logs: {
          Row: {
            id: string
            class_id: string
            teacher_id: string
            date: string
            attendance_count: number | null
            notes: string | null
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            class_id: string
            teacher_id: string
            date: string
            attendance_count?: number | null
            notes?: string | null
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            class_id?: string
            teacher_id?: string
            date?: string
            attendance_count?: number | null
            notes?: string | null
            created_at?: string
            updated_at?: string
          }
        }
        payments: {
          Row: {
            id: string
            class_id: string
            student_id: string
            amount: string
            status: 'pending' | 'paid' | 'failed' | 'cancelled'
            due_date: string | null
            paid_date: string | null
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            class_id: string
            student_id: string
            amount: string
            status?: 'pending' | 'paid' | 'failed' | 'cancelled'
            due_date?: string | null
            paid_date?: string | null
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            class_id?: string
            student_id?: string
            amount?: string
            status?: 'pending' | 'paid' | 'failed' | 'cancelled'
            due_date?: string | null
            paid_date?: string | null
            created_at?: string
            updated_at?: string
          }
        }
        attendance: {
          Row: {
            id: string
            student_id: string
            class_log_id: string
            status: 'present' | 'absent' | 'late'
            notes: string | null
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            student_id: string
            class_log_id: string
            status: 'present' | 'absent' | 'late'
            notes?: string | null
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            student_id?: string
            class_log_id?: string
            status?: 'present' | 'absent' | 'late'
            notes?: string | null
            created_at?: string
            updated_at?: string
          }
        }
        messages: {
          Row: {
            id: string
            sender_id: string
            recipient_id: string
            class_id: string | null
            subject: string | null
            message: string
            is_read: boolean
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            sender_id: string
            recipient_id: string
            class_id?: string | null
            subject?: string | null
            message: string
            is_read?: boolean
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            sender_id?: string
            recipient_id?: string
            class_id?: string | null
            subject?: string | null
            message?: string
            is_read?: boolean
            created_at?: string
            updated_at?: string
          }
        }
        parent_child_relationships: {
          Row: {
            id: string
            parent_id: string
            child_id: string
            created_at: string
          }
          Insert: {
            id?: string
            parent_id: string
            child_id: string
            created_at?: string
          }
          Update: {
            id?: string
            parent_id?: string
            child_id?: string
            created_at?: string
          }
        }
      }
      Views: {
        [_ in never]: never
      }
      Functions: {
        get_teacher_students: {
          Args: {
            teacher_id: string
          }
          Returns: {
            id: string
            student_id: string
            student_name: string
            parent_name: string
            parent_email: string
            subject: string
            year_group: string
            classes_per_week: number
            classes_per_recharge: number
            tentative_schedule: any
            whatsapp_group_url: string
            google_meet_url: string
            setup_completed: boolean
            enrollment_date: string
            status: string
            class_name: string
          }[]
        }
      }
      Enums: {
        [_ in never]: never
      }
      CompositeTypes: {
        [_ in never]: never
      }
    }
  }