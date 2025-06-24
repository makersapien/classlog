// src/types/api.ts
// Comprehensive TypeScript types to replace 'any' usage

// Database row types
export interface Teacher {
    id: string;
    email: string;
    full_name: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface Student {
    id: string;
    student_id: string;
    student_name: string;
    parent_name: string;
    parent_email: string;
    subject: string;
    year_group: string;
    classes_per_week: number;
    classes_per_recharge: number;
    tentative_schedule: TentativeSchedule | null;
    whatsapp_group_url: string | null;
    google_meet_url: string | null;
    setup_completed: boolean;
    enrollment_date: string;
    status: string;
    class_name: string;
  }
  
  export interface ClassLog {
    id: string;
    teacher_id: string;
    student_id: string;
    class_id: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    content: string | null;
    topics_covered: string | null;
    homework_assigned: string | null;
    student_name: string;
    student_email: string;
    google_meet_link: string | null;
    detected_automatically: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface Enrollment {
    id: string;
    teacher_id: string;
    student_id: string;
    class_id: string;
    google_meet_url: string;
    status: 'active' | 'inactive' | 'completed';
    tentative_schedule: TentativeSchedule | null;
    classes_per_week: number;
    student_profile?: {
      full_name: string;
      email: string;
    } | null;
    class_info?: {
      subject: string;
      name: string;
    } | null;
  }
  
  // Complex object types
  export interface TentativeSchedule {
    note?: string;
    days?: Array<{
      day: string;
      time: string;
    }>;
    [key: string]: unknown;
  }
  
  // API Request/Response types
  export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  }
  
  export interface DashboardData {
    totalStudents: number;
    totalClasses: number;
    upcomingClasses: ClassLog[];
    recentActivity: ClassLog[];
    monthlyStats: {
      completed: number;
      scheduled: number;
      cancelled: number;
    };
  }
  
  export interface StudentFormData {
    student_name: string;
    parent_name: string;
    parent_email: string;
    subject: string;
    year_group: string;
    classes_per_week: number;
    classes_per_recharge: number;
    tentative_schedule: string;
    whatsapp_group_url: string;
    google_meet_url: string;
    setup_completed: boolean;
  }
  
  // Event handler types
  export interface FormEvent extends React.FormEvent<HTMLFormElement> {}
  export interface ChangeEvent extends React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {}
  export interface ClickEvent extends React.MouseEvent<HTMLButtonElement | HTMLDivElement> {}
  
  // Component prop types
  export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
  }
  
  export interface StudentModalProps extends ModalProps {
    student: Student | null;
    onUpdate: (student: Student) => void;
  }
  
  // Database query result types
  export interface SupabaseResponse<T> {
    data: T | null;
    error: {
      message: string;
      details?: string;
      hint?: string;
    } | null;
  }
  
  export interface ClassQueryResult {
    id: string;
    teacher_id: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    status: string;
    student_name: string;
    student_email: string;
    google_meet_link: string | null;
    content: string | null;
    topics_covered: string | null;
    homework_assigned: string | null;
  }
  
  // Form validation types
  export interface FormErrors {
    [key: string]: string;
  }
  
  export interface ValidationResult {
    isValid: boolean;
    errors: FormErrors;
  }
  
  // Hook return types
  export interface UseToastReturn {
    toast: (options: ToastOptions) => void;
    toasts: Toast[];
    dismiss: (toastId?: string) => void;
  }
  
  export interface ToastOptions {
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success';
    duration?: number;
    action?: {
      altText: string;
      onClick: () => void;
    };
  }
  
  export interface Toast extends ToastOptions {
    id: string;
    createdAt: Date;
  }
  
  // Authentication types
  export interface AuthUser {
    id: string;
    email: string;
    role: 'teacher' | 'student' | 'parent';
    full_name: string;
  }
  
  export interface LoginCredentials {
    email: string;
    password: string;
  }
  
  // File upload types
  export interface FileUploadResult {
    success: boolean;
    url?: string;
    error?: string;
  }
  
  // Search and filter types
  export interface SearchFilters {
    query?: string;
    subject?: string;
    status?: string;
    dateRange?: {
      start: string;
      end: string;
    };
  }
  
  // Utility types for replacing any
  export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
  export interface JsonObject {
    [key: string]: JsonValue;
  }
  export type JsonArray = JsonValue[];
  
  // For cases where the type is truly dynamic but needs to be constrained
  export type DatabaseValue = string | number | boolean | null | Date;
  export type FormValue = string | number | boolean;
  
  // Event types for specific use cases
  export type StudentUpdateEvent = CustomEvent<{
    studentId: string;
    changes: Partial<Student>;
  }>;
  
  export type ClassStatusChangeEvent = CustomEvent<{
    classId: string;
    newStatus: ClassLog['status'];
    timestamp: string;
  }>;
  
  // Razorpay specific types (to replace any in razorpay.ts)
  export interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    handler: (response: RazorpayResponse) => void;
    prefill: {
      name: string;
      email: string;
      contact: string;
    };
    theme: {
      color: string;
    };
  }
  
  export interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }
  
  export interface RazorpayInstance {
    open(): void;
    close(): void;
    on(event: string, handler: (response: RazorpayResponse) => void): void;
  }