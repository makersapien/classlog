// types/database.ts - COMPLETE UPDATE to match your actual schemas

// Type for schedule JSON data
export interface ScheduleData {
  [key: string]: unknown;
}

// Type for tentative schedule JSON data
export interface TentativeScheduleData {
  note?: string;
  days?: Array<{
    day: string;
    time: string;
  }>;
  [key: string]: unknown;
}

// Type for class_logs attachments JSONB field
export interface ClassLogAttachments {
  auto_detected?: boolean;
  features_used?: string[];
  session_type?: string;
  detection_timestamp?: string;
  duration_minutes?: number;
  manual_notes?: {
    class_description?: string | null;
    topics_covered?: string | null;
    homework_assigned?: string | null;
    key_points?: string | null;
    notes_last_saved?: string | null;
  };
  screenshots?: Array<{
    timestamp: string;
    type: 'manual' | 'auto';
    format: string;
    size: number;
  }>;
  last_screenshot?: {
    timestamp: string;
    type: 'manual' | 'auto';
    format: string;
    size: number;
  };
  total_screenshots?: number;
  [key: string]: unknown;
}

// Type for auto_detected_classes meeting_data JSONB field
export interface MeetingData {
  participants?: Array<{
    name?: string;
    email?: string;
    join_time?: string;
    leave_time?: string;
  }>;
  duration_minutes?: number;
  recording_available?: boolean;
  screen_sharing_used?: boolean;
  chat_messages?: Array<{
    sender?: string;
    message?: string;
    timestamp?: string;
  }>;
  meeting_quality?: {
    audio_quality?: 'good' | 'fair' | 'poor';
    video_quality?: 'good' | 'fair' | 'poor';
    connection_issues?: number;
  };
  [key: string]: unknown;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'teacher' | 'student' | 'parent'
          created_at: string
          updated_at: string
          parent_id: string | null
          phone: string | null
          address: string | null
          date_of_birth: string | null
          grade: string | null
          school: string | null
          emergency_contact: string | null
          status: 'active' | 'inactive'
          upi_id: string | null
          qr_code_url: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'teacher' | 'student' | 'parent'
          created_at?: string
          updated_at?: string
          parent_id?: string | null
          phone?: string | null
          address?: string | null
          date_of_birth?: string | null
          grade?: string | null
          school?: string | null
          emergency_contact?: string | null
          status?: 'active' | 'inactive'
          upi_id?: string | null
          qr_code_url?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'teacher' | 'student' | 'parent'
          created_at?: string
          updated_at?: string
          parent_id?: string | null
          phone?: string | null
          address?: string | null
          date_of_birth?: string | null
          grade?: string | null
          school?: string | null
          emergency_contact?: string | null
          status?: 'active' | 'inactive'
          upi_id?: string | null
          qr_code_url?: string | null
        }
      }
      classes: {
        Row: {
          id: string
          teacher_id: string | null
          name: string
          subject: string
          grade: string | null
          description: string | null
          schedule: ScheduleData | null
          max_students: number | null
          fees_per_month: number | null
          status: 'active' | 'inactive' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id?: string | null
          name: string
          subject: string
          grade?: string | null
          description?: string | null
          schedule?: ScheduleData | null
          max_students?: number | null
          fees_per_month?: number | null
          status?: 'active' | 'inactive' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string | null
          name?: string
          subject?: string
          grade?: string | null
          description?: string | null
          schedule?: ScheduleData | null
          max_students?: number | null
          fees_per_month?: number | null
          status?: 'active' | 'inactive' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      enrollments: {
        Row: {
          id: string
          student_id: string | null
          class_id: string | null
          status: 'active' | 'inactive' | 'completed' | 'dropped'
          enrollment_date: string | null
          completion_date: string | null
          final_grade: string | null
          created_at: string
          updated_at: string
          classes_per_week: number | null
          classes_per_recharge: number | null
          tentative_schedule: TentativeScheduleData | null
          whatsapp_group_url: string | null
          google_meet_url: string | null
          setup_completed: boolean | null
          teacher_id: string | null
          subject: string | null
          year_group: string | null
        }
        Insert: {
          id?: string
          student_id?: string | null
          class_id?: string | null
          status?: 'active' | 'inactive' | 'completed' | 'dropped'
          enrollment_date?: string | null
          completion_date?: string | null
          final_grade?: string | null
          created_at?: string
          updated_at?: string
          classes_per_week?: number | null
          classes_per_recharge?: number | null
          tentative_schedule?: TentativeScheduleData | null
          whatsapp_group_url?: string | null
          google_meet_url?: string | null
          setup_completed?: boolean | null
          teacher_id?: string | null
          subject?: string | null
          year_group?: string | null
        }
        Update: {
          id?: string
          student_id?: string | null
          class_id?: string | null
          status?: 'active' | 'inactive' | 'completed' | 'dropped'
          enrollment_date?: string | null
          completion_date?: string | null
          final_grade?: string | null
          created_at?: string
          updated_at?: string
          classes_per_week?: number | null
          classes_per_recharge?: number | null
          tentative_schedule?: TentativeScheduleData | null
          whatsapp_group_url?: string | null
          google_meet_url?: string | null
          setup_completed?: boolean | null
          teacher_id?: string | null
          subject?: string | null
          year_group?: string | null
        }
      }
      class_logs: {
        Row: {
          id: string
          class_id: string | null
          teacher_id: string | null
          date: string
          content: string
          topics_covered: string[] | null
          homework_assigned: string | null
          attendance_count: number | null
          total_students: number | null
          status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'in_progress'
          attachments: ClassLogAttachments | null
          created_at: string
          updated_at: string
          start_time: string | null
          end_time: string | null
          duration_minutes: number | null
          google_meet_link: string | null
          detected_automatically: boolean | null
          student_name: string | null
          student_email: string | null
          enrollment_id: string | null
        }
        Insert: {
          id?: string
          class_id?: string | null
          teacher_id?: string | null
          date: string
          content: string
          topics_covered?: string[] | null
          homework_assigned?: string | null
          attendance_count?: number | null
          total_students?: number | null
          status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'in_progress'
          attachments?: ClassLogAttachments | null
          created_at?: string
          updated_at?: string
          start_time?: string | null
          end_time?: string | null
          duration_minutes?: number | null
          google_meet_link?: string | null
          detected_automatically?: boolean | null
          student_name?: string | null
          student_email?: string | null
          enrollment_id?: string | null
        }
        Update: {
          id?: string
          class_id?: string | null
          teacher_id?: string | null
          date?: string
          content?: string
          topics_covered?: string[] | null
          homework_assigned?: string | null
          attendance_count?: number | null
          total_students?: number | null
          status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'in_progress'
          attachments?: ClassLogAttachments | null
          created_at?: string
          updated_at?: string
          start_time?: string | null
          end_time?: string | null
          duration_minutes?: number | null
          google_meet_link?: string | null
          detected_automatically?: boolean | null
          student_name?: string | null
          student_email?: string | null
          enrollment_id?: string | null
        }
      }
      extension_tokens: {
        Row: {
          id: string
          teacher_id: string
          token_hash: string
          expires_at: string
          created_at: string | null
          last_used_at: string | null
          usage_count: number | null
          is_active: boolean | null
        }
        Insert: {
          id?: string
          teacher_id: string
          token_hash: string
          expires_at: string
          created_at?: string | null
          last_used_at?: string | null
          usage_count?: number | null
          is_active?: boolean | null
        }
        Update: {
          id?: string
          teacher_id?: string
          token_hash?: string
          expires_at?: string
          created_at?: string | null
          last_used_at?: string | null
          usage_count?: number | null
          is_active?: boolean | null
        }
      }
      attendance: {
        Row: {
          id: string
          student_id: string | null
          class_log_id: string | null
          status: 'present' | 'absent' | 'late'
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          student_id?: string | null
          class_log_id?: string | null
          status?: 'present' | 'absent' | 'late'
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          student_id?: string | null
          class_log_id?: string | null
          status?: 'present' | 'absent' | 'late'
          notes?: string | null
          created_at?: string | null
        }
      }
      student_invitations: {
        Row: {
          id: string
          teacher_id: string | null
          invitation_token: string
          student_name: string
          parent_name: string
          parent_email: string
          subject: string
          year_group: string
          classes_per_week: number | null
          classes_per_recharge: number | null
          tentative_schedule: TentativeScheduleData | null
          whatsapp_group_url: string | null
          google_meet_url: string | null
          status: 'pending' | 'completed' | 'expired' | 'cancelled' | null
          expires_at: string | null
          completed_at: string | null
          created_at: string | null
          updated_at: string | null
          student_email: string | null
        }
        Insert: {
          id?: string
          teacher_id?: string | null
          invitation_token?: string
          student_name: string
          parent_name: string
          parent_email: string
          subject: string
          year_group: string
          classes_per_week?: number | null
          classes_per_recharge?: number | null
          tentative_schedule?: TentativeScheduleData | null
          whatsapp_group_url?: string | null
          google_meet_url?: string | null
          status?: 'pending' | 'completed' | 'expired' | 'cancelled' | null
          expires_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          student_email?: string | null
        }
        Update: {
          id?: string
          teacher_id?: string | null
          invitation_token?: string
          student_name?: string
          parent_name?: string
          parent_email?: string
          subject?: string
          year_group?: string
          classes_per_week?: number | null
          classes_per_recharge?: number | null
          tentative_schedule?: TentativeScheduleData | null
          whatsapp_group_url?: string | null
          google_meet_url?: string | null
          status?: 'pending' | 'completed' | 'expired' | 'cancelled' | null
          expires_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          student_email?: string | null
        }
      }
      class_files: {
        Row: {
          id: string
          class_log_id: string | null
          teacher_id: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          uploaded_by: string | null
          uploaded_by_role: 'teacher' | 'student' | 'parent'
          description: string | null
          is_homework: boolean | null
          is_public: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          class_log_id?: string | null
          teacher_id?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          uploaded_by?: string | null
          uploaded_by_role: 'teacher' | 'student' | 'parent'
          description?: string | null
          is_homework?: boolean | null
          is_public?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          class_log_id?: string | null
          teacher_id?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          uploaded_by?: string | null
          uploaded_by_role?: 'teacher' | 'student' | 'parent'
          description?: string | null
          is_homework?: boolean | null
          is_public?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      share_tokens: {
        Row: {
          id: string
          student_id: string
          teacher_id: string
          token: string
          is_active: boolean
          access_count: number
          last_accessed: string | null
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          student_id: string
          teacher_id: string
          token: string
          is_active?: boolean
          access_count?: number
          last_accessed?: string | null
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          teacher_id?: string
          token?: string
          is_active?: boolean
          access_count?: number
          last_accessed?: string | null
          created_at?: string
          expires_at?: string
        }
      }
      time_slots: {
        Row: {
          id: string
          teacher_id: string
          day_of_week: string
          start_time: string
          end_time: string
          is_available: boolean
          is_recurring: boolean
          recurrence_end_date: string | null
          subject: string | null
          duration_minutes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          day_of_week: string
          start_time: string
          end_time: string
          is_available?: boolean
          is_recurring?: boolean
          recurrence_end_date?: string | null
          subject?: string | null
          duration_minutes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          day_of_week?: string
          start_time?: string
          end_time?: string
          is_available?: boolean
          is_recurring?: boolean
          recurrence_end_date?: string | null
          subject?: string | null
          duration_minutes?: number
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          teacher_id: string
          student_id: string
          schedule_slot_id: string | null
          time_slot_id: string | null
          booking_date: string
          start_time: string
          end_time: string
          status: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          booked_at: string
          cancelled_at: string | null
          completed_at: string | null
          notes: string | null
          cancellation_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          student_id: string
          schedule_slot_id?: string | null
          time_slot_id?: string | null
          booking_date: string
          start_time: string
          end_time: string
          status?: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          booked_at?: string
          cancelled_at?: string | null
          completed_at?: string | null
          notes?: string | null
          cancellation_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          student_id?: string
          schedule_slot_id?: string | null
          time_slot_id?: string | null
          booking_date?: string
          start_time?: string
          end_time?: string
          status?: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          booked_at?: string
          cancelled_at?: string | null
          completed_at?: string | null
          notes?: string | null
          cancellation_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      blocked_slots: {
        Row: {
          id: string
          teacher_id: string
          day_of_week: string | null
          start_time: string
          end_time: string
          date: string | null
          is_recurring: boolean
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          day_of_week?: string | null
          start_time: string
          end_time: string
          date?: string | null
          is_recurring?: boolean
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          day_of_week?: string | null
          start_time?: string
          end_time?: string
          date?: string | null
          is_recurring?: boolean
          reason?: string | null
          created_at?: string
        }
      }
      student_themes: {
        Row: {
          id: string
          student_id: string
          teacher_id: string
          color_theme: 'red' | 'blue' | 'purple' | 'amber' | 'emerald' | 'pink' | 'indigo' | 'teal'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          teacher_id: string
          color_theme?: 'red' | 'blue' | 'purple' | 'amber' | 'emerald' | 'pink' | 'indigo' | 'teal'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          teacher_id?: string
          color_theme?: 'red' | 'blue' | 'purple' | 'amber' | 'emerald' | 'pink' | 'indigo' | 'teal'
          created_at?: string
          updated_at?: string
        }
      }
      schedule_slots: {
        Row: {
          id: string
          teacher_id: string
          date: string
          start_time: string
          end_time: string
          duration_minutes: number
          title: string | null
          description: string | null
          subject: string | null
          max_students: number
          status: 'available' | 'booked' | 'cancelled' | 'completed'
          booked_by: string | null
          booked_at: string | null
          google_meet_url: string | null
          meeting_notes: string | null
          is_recurring: boolean
          recurrence_type: 'daily' | 'weekly' | 'monthly' | null
          recurrence_end_date: string | null
          parent_slot_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          date: string
          start_time: string
          end_time: string
          duration_minutes?: number
          title?: string | null
          description?: string | null
          subject?: string | null
          max_students?: number
          status?: 'available' | 'booked' | 'cancelled' | 'completed'
          booked_by?: string | null
          booked_at?: string | null
          google_meet_url?: string | null
          meeting_notes?: string | null
          is_recurring?: boolean
          recurrence_type?: 'daily' | 'weekly' | 'monthly' | null
          recurrence_end_date?: string | null
          parent_slot_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          date?: string
          start_time?: string
          end_time?: string
          duration_minutes?: number
          title?: string | null
          description?: string | null
          subject?: string | null
          max_students?: number
          status?: 'available' | 'booked' | 'cancelled' | 'completed'
          booked_by?: string | null
          booked_at?: string | null
          google_meet_url?: string | null
          meeting_notes?: string | null
          is_recurring?: boolean
          recurrence_type?: 'daily' | 'weekly' | 'monthly' | null
          recurrence_end_date?: string | null
          parent_slot_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      credit_transactions: {
        Row: {
          id: string
          credit_account_id: string
          transaction_type: 'purchase' | 'deduction' | 'adjustment' | 'refund'
          hours_amount: number
          balance_after: number
          description: string
          reference_id: string | null
          reference_type: 'payment' | 'class_log' | 'manual_adjustment' | 'system' | null
          performed_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          credit_account_id: string
          transaction_type: 'purchase' | 'deduction' | 'adjustment' | 'refund'
          hours_amount: number
          balance_after: number
          description: string
          reference_id?: string | null
          reference_type?: 'payment' | 'class_log' | 'manual_adjustment' | 'system' | null
          performed_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          credit_account_id?: string
          transaction_type?: 'purchase' | 'deduction' | 'adjustment' | 'refund'
          hours_amount?: number
          balance_after?: number
          description?: string
          reference_id?: string | null
          reference_type?: 'payment' | 'class_log' | 'manual_adjustment' | 'system' | null
          performed_by?: string | null
          created_at?: string | null
        }
      }
      credits: {
        Row: {
          id: string
          parent_id: string | null
          teacher_id: string | null
          student_id: string | null
          balance_hours: number | null
          total_purchased: number | null
          total_used: number | null
          created_at: string | null
          updated_at: string | null
          rate_per_hour: number | null
          subject: string | null
          notes: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          parent_id?: string | null
          teacher_id?: string | null
          student_id?: string | null
          balance_hours?: number | null
          total_purchased?: number | null
          total_used?: number | null
          created_at?: string | null
          updated_at?: string | null
          rate_per_hour?: number | null
          subject?: string | null
          notes?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          parent_id?: string | null
          teacher_id?: string | null
          student_id?: string | null
          balance_hours?: number | null
          total_purchased?: number | null
          total_used?: number | null
          created_at?: string | null
          updated_at?: string | null
          rate_per_hour?: number | null
          subject?: string | null
          notes?: string | null
          is_active?: boolean
        }
      }
      booking_waitlist: {
        Row: {
          id: string
          teacher_id: string
          student_id: string
          schedule_slot_id: string | null
          time_slot_id: string | null
          preferred_date: string | null
          day_of_week: string | null
          start_time: string
          end_time: string
          priority: number
          status: 'waiting' | 'notified' | 'expired' | 'fulfilled'
          created_at: string
          expires_at: string | null
          notified_at: string | null
          fulfilled_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          teacher_id: string
          student_id: string
          schedule_slot_id?: string | null
          time_slot_id?: string | null
          preferred_date?: string | null
          day_of_week?: string | null
          start_time: string
          end_time: string
          priority?: number
          status?: 'waiting' | 'notified' | 'expired' | 'fulfilled'
          created_at?: string
          expires_at?: string | null
          notified_at?: string | null
          fulfilled_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          teacher_id?: string
          student_id?: string
          schedule_slot_id?: string | null
          time_slot_id?: string | null
          preferred_date?: string | null
          day_of_week?: string | null
          start_time?: string
          end_time?: string
          priority?: number
          status?: 'waiting' | 'notified' | 'expired' | 'fulfilled'
          created_at?: string
          expires_at?: string | null
          notified_at?: string | null
          fulfilled_at?: string | null
          notes?: string | null
        }
      }
      parent_child_relationships: {
        Row: {
          id: string
          parent_id: string | null
          child_id: string | null
          relationship_type: 'parent' | 'guardian' | null
          created_at: string | null
        }
        Insert: {
          id?: string
          parent_id?: string | null
          child_id?: string | null
          relationship_type?: 'parent' | 'guardian' | null
          created_at?: string | null
        }
        Update: {
          id?: string
          parent_id?: string | null
          child_id?: string | null
          relationship_type?: 'parent' | 'guardian' | null
          created_at?: string | null
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
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          user_role: 'teacher' | 'student' | 'parent'
          email_booking_confirmation: boolean
          email_booking_cancellation: boolean
          email_class_reminders: boolean
          email_weekly_summary: boolean
          inapp_booking_activity: boolean
          inapp_class_reminders: boolean
          inapp_system_notifications: boolean
          reminder_24h_enabled: boolean
          reminder_1h_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_role: 'teacher' | 'student' | 'parent'
          email_booking_confirmation?: boolean
          email_booking_cancellation?: boolean
          email_class_reminders?: boolean
          email_weekly_summary?: boolean
          inapp_booking_activity?: boolean
          inapp_class_reminders?: boolean
          inapp_system_notifications?: boolean
          reminder_24h_enabled?: boolean
          reminder_1h_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          user_role?: 'teacher' | 'student' | 'parent'
          email_booking_confirmation?: boolean
          email_booking_cancellation?: boolean
          email_class_reminders?: boolean
          email_weekly_summary?: boolean
          inapp_booking_activity?: boolean
          inapp_class_reminders?: boolean
          inapp_system_notifications?: boolean
          reminder_24h_enabled?: boolean
          reminder_1h_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          user_role: 'teacher' | 'student' | 'parent'
          type: 'booking_created' | 'booking_cancelled' | 'class_reminder' | 'system' | 'booking_activity'
          title: string
          message: string
          priority: 'low' | 'medium' | 'high'
          data: any | null
          read: boolean
          read_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_role: 'teacher' | 'student' | 'parent'
          type: 'booking_created' | 'booking_cancelled' | 'class_reminder' | 'system' | 'booking_activity'
          title: string
          message: string
          priority?: 'low' | 'medium' | 'high'
          data?: any | null
          read?: boolean
          read_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          user_role?: 'teacher' | 'student' | 'parent'
          type?: 'booking_created' | 'booking_cancelled' | 'class_reminder' | 'system' | 'booking_activity'
          title?: string
          message?: string
          priority?: 'low' | 'medium' | 'high'
          data?: any | null
          read?: boolean
          read_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      class_files_with_info: {
        Row: {
          id: string
          class_log_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          uploaded_by: string
          uploaded_by_role: string
          description: string | null
          is_homework: boolean
          created_at: string
          uploaded_by_name: string | null
          class_date: string | null
          student_name: string | null
          teacher_name: string | null
        }
      }
      credit_balances: {
        Row: {
          id: string
          teacher_id: string
          student_id: string
          enrollment_id: string
          current_balance: number
          total_purchased: number
          total_used: number
          last_recharge_date: string | null
          created_at: string
          updated_at: string
        }
      }
      auto_detected_classes: {
        Row: {
          id: string
          teacher_id: string
          student_email: string
          google_meet_url: string
          detected_at: string
          confidence_score: number
          status: 'pending' | 'processed' | 'ignored'
          class_log_id: string | null
          meeting_data: MeetingData | null
          processed_at: string | null
          created_at: string
        }
      }
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
          tentative_schedule: TentativeScheduleData
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