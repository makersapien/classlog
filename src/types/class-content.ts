// types/class-content.ts

export interface ClassContent {
    id: string
    class_log_id: string
    
    // Topics - simple text fields
    topic_1: string | null
    topic_2: string | null
    topic_3: string | null
    topic_4: string | null
    topic_5: string | null
    
    // Homework - simple fields
    homework_title: string | null
    homework_description: string | null
    homework_due_date: string | null
    
    // Notes - simple text
    teacher_notes: string | null
    student_performance: string | null
    key_points: string | null
    
    // Extension metadata
    duration_minutes: number | null
    participants_count: number | null
    features_used: string | null // comma-separated
    
    created_at: string
    updated_at: string
  }
  
  // Enhanced class log with content
  export interface ClassLogWithContent {
    // All existing class_logs fields
    id: string
    class_id: string | null
    teacher_id: string | null
    date: string
    content: string
    status: string
    attendance_count: number | null
    created_at: string
    updated_at: string
    start_time: string | null
    end_time: string | null
    duration_minutes: number | null
    student_name: string | null
    student_email: string | null
    
    // Content fields (from join)
    topic_1: string | null
    topic_2: string | null
    topic_3: string | null
    topic_4: string | null
    topic_5: string | null
    homework_title: string | null
    homework_description: string | null
    homework_due_date: string | null
    teacher_notes: string | null
    student_performance: string | null
    key_points: string | null
    content_duration_minutes: number | null
    participants_count: number | null
    features_used: string | null
    
    // Computed fields (from view)
    topics_array: string[]
    homework_summary: string | null
  }
  
  // Simple API request types
  export interface SaveClassContentRequest {
    class_log_id: string
    
    // Extension can send simple arrays/strings
    topics?: string[] // Will be mapped to topic_1, topic_2, etc.
    homework?: {
      title?: string
      description?: string
      due_date?: string
    }
    notes?: {
      teacher_notes?: string
      student_performance?: string
      key_points?: string
    }
    
    // Extension metadata
    duration_minutes?: number
    participants_count?: number
    features_used?: string[]
  }
  
  // Helper functions for working with topics
  export function getTopicsFromContent(content: ClassContent): string[] {
    return [
      content.topic_1,
      content.topic_2,
      content.topic_3,
      content.topic_4,
      content.topic_5
    ].filter(Boolean) as string[]
  }
  
  export function mapTopicsToContent(topics: string[]): Partial<ClassContent> {
    return {
      topic_1: topics[0] || null,
      topic_2: topics[1] || null,
      topic_3: topics[2] || null,
      topic_4: topics[3] || null,
      topic_5: topics[4] || null
    }
  }