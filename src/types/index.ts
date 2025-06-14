// Export all types from here
export * from './razorpay';

// Database types
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: 'teacher' | 'parent' | 'student';
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassSession {
  id: string;
  teacher_id: string;
  student_id: string;
  subject: string;
  duration: number; // in minutes
  date: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  ai_summary?: string;
  created_at: string;
  updated_at: string;
}

export interface Credit {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'purchase' | 'usage' | 'refund';
  description: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  created_at: string;
}

export interface StudentTeacherRelation {
  id: string;
  student_id: string;
  teacher_id: string;
  parent_id: string;
  subject: string;
  rate_per_hour: number;
  created_at: string;
}