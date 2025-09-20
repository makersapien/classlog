'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { BookOpen, Users, Clock, DollarSign, Calendar, Plus, FileText, User, CheckCircle, AlertCircle } from 'lucide-react'

import StudentCard from '@/components/StudentCard'
import ScheduleSlots from '@/components/ScheduleSlots'

interface TeacherDashboardProps {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface DashboardStats {
  classesScheduled?: number
  classesCompleted?: number
  classesToday?: number
  totalClasses?: number
  totalStudents?: number
  studentsPresent?: number
  attendanceToday?: number
  pendingPayments?: number
  totalRevenue?: number
}

interface ScheduleData {
  start_time?: string
  end_time?: string
}

interface ClassData {
  id: string
  name: string
  subject: string
  grade: string
  schedule: ScheduleData | null
  max_students: number
  fees_per_month: number
  status: string
  enrollments?: EnrollmentData[]
}

interface ClassInfo {
  name: string
  subject: string
  grade: string
}

interface TodayScheduleItem {
  id: string
  date: string
  content: string
  topics_covered: string[]
  homework_assigned: string
  attendance_count: number
  total_students: number
  status: string
  classes: ClassInfo
}

interface ProfileData {
  full_name?: string
}

interface EnrollmentData {
  student_id?: string
  status: string
  profiles: ProfileData
}

interface DashboardData {
  stats: DashboardStats
  classes: ClassData[]
  todaySchedule: TodayScheduleItem[]
  recentMessages: unknown[]
  upcomingPayments: unknown[]
  students?: StudentData[]
}

interface StudentData {
  id: string
  name: string
  grade: string
  subject: string
  lastClass?: string
  status: string
  paymentStatus: string
  creditsRemaining?: number
  totalCredits?: number
  attendanceRate?: number
  nextClass?: string
  profilePicture?: string
  subjects?: string[]
  performance?: 'excellent' | 'good' | 'needs-attention'
  lastPayment?: string
  monthlyFee?: number
  parent_email?: string
  creditData?: {
    balance_hours: number
    total_purchased: number
    total_used: number
  }
}

export default function TeacherDashboard({ user }: TeacherDashboardProps) {
  const [selectedTimeframe] = useState('today')
  const [, setNewClassDialog] = useState(false)
  const [, setNewLogDialog] = useState(false)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null)
  const [studentDetailDialog, setStudentDetailDialog] = useState(false)
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [creditFormData, setCreditFormData] = useState({
    hours: 4,
    amount: 2000,
    note: '',
    parentEmail: ''
  })
  const [activeTab, setActiveTab] = useState('students')

  const { toast } = useToast()

  // Extension token handshake - send token to extension after dashboard loads
  useEffect(() => {
    const sendTokenToExtension = async () => {
      try {
        console.log('🔗 Dashboard auto-connecting extension...')
        
        // Use the utility function from extension bridge
        const { sendTokenToExtension } = await import('../extension-bridge')
        const success = await sendTokenToExtension()
        
        if (success) {
          console.log('✅ Extension token sent from dashboard')
          
          // Show success toast
          toast({
            title: "Extension Connected",
            description: "ClassLogger extension can now access your account",
            duration: 3000,
          })
        } else {
          console.log('⚠️ Failed to send extension token from dashboard')
        }
      } catch (error) {
        console.error('❌ Failed to send extension token:', error)
      }
    }

    // Send token after a short delay to ensure extension is loaded
    const timeoutId = setTimeout(sendTokenToExtension, 1000)
    
    return () => clearTimeout(timeoutId)
  }, [toast])

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/dashboard?role=teacher')

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`

        throw new Error(errorMessage)
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)

      // Set error state for UI display
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')

      // Show toast notification
      toast({
        title: "Dashboard Error",
        description: err instanceof Error ? err.message : 'Failed to load dashboard data',
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchDashboardData()
  }, [selectedTimeframe, fetchDashboardData])

  // Initialize parent email when the credit dialog opens
  useEffect(() => {
    if (selectedStudent && showCreditDialog) {
      setCreditFormData(prev => ({
        ...prev,
        parentEmail: selectedStudent.parent_email || ''
      }));
    }
  }, [selectedStudent, showCreditDialog])

  const handleStudentClick = (student: StudentData) => {
    try {
      setSelectedStudent(student)
      setStudentDetailDialog(true)
    } catch (error) {
      console.error('Error opening student details:', error)
      toast({
        title: "Error",
        description: "Failed to open student details. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  const handleAwardCredits = async () => {
    if (!selectedStudent) return

    try {
      // Validate input with more detailed error messages
      if (!creditFormData.hours || creditFormData.hours <= 0) {
        toast({
          title: "Validation Error",
          description: "Credit hours must be greater than 0",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      if (creditFormData.amount < 0) {
        toast({
          title: "Validation Error",
          description: "Payment amount cannot be negative",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      // Check if parent email is available or provided
      const parentEmail = selectedStudent.parent_email || creditFormData.parentEmail;
      if (!parentEmail) {
        toast({
          title: "Missing Information",
          description: "Parent email is required for payment tracking. Please provide a parent email.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(parentEmail)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid email address for the parent.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      // First create a payment record
      const paymentResponse = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'award_credits',
          parent_email: parentEmail, // Use the validated parent email
          credit_hours: creditFormData.hours,
          payment_amount: creditFormData.amount,
          payment_note: creditFormData.note || `Payment for ${selectedStudent.subject} classes`,
          student_id: selectedStudent.id
        })
      })

      const paymentData = await paymentResponse.json()

      if (!paymentResponse.ok) {
        // Handle specific payment errors with improved error messages
        let errorMessage = paymentData.error || 'Failed to create payment record';
        let errorDetails = '';

        if (paymentResponse.status === 400) {
          errorMessage = `Payment validation failed: ${errorMessage}`;
        } else if (paymentResponse.status === 401 || paymentResponse.status === 403) {
          errorMessage = 'You do not have permission to record payments';
        } else if (paymentResponse.status === 404) {
          errorMessage = 'Parent account not found. Please check the email address';
        } else if (paymentResponse.status === 409) {
          errorMessage = 'A payment record with these details already exists';
        } else if (paymentResponse.status === 500) {
          errorMessage = `Server error: ${paymentData.details || 'Unknown server error'}`;
          
          // Check for specific database errors
          if (paymentData.code === '42501') {
            errorDetails = 'Permission denied: The system cannot create the payment record due to security restrictions.';
          } else if (paymentData.code === '23505') {
            errorDetails = 'A duplicate payment record was detected.';
          } else if (paymentData.code === '23503') {
            errorDetails = 'Referenced record does not exist. Please check student information.';
          } else if (paymentData.hint) {
            errorDetails = `Hint: ${paymentData.hint}`;
          }
        }

        console.error('Payment error:', {
          status: paymentResponse.status,
          error: errorMessage,
          details: paymentData.details || '',
          code: paymentData.code || '',
          hint: paymentData.hint || ''
        });

        toast({
          title: "Payment Error",
          description: errorDetails ? `${errorMessage}\n\n${errorDetails}` : errorMessage,
          variant: "destructive",
          duration: 8000,
        });

        return;
      }

      // Then call the credits API to award credits
      const response = await fetch('/api/credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'purchase',
          studentId: selectedStudent.id,
          hours: creditFormData.hours,
          description: creditFormData.note || `Payment for ${selectedStudent.subject} classes`,
          referenceType: 'payment',
          referenceId: paymentData.payment?.id || null
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Close the dialog and refresh data
        setShowCreditDialog(false)

        toast({
          title: "Credits Added Successfully",
          description: `${creditFormData.hours} credits have been awarded to ${selectedStudent.name}`,
          duration: 5000,
        });

        fetchDashboardData()
      } else {
        // Handle specific credit API errors
        let errorMessage = 'There was an issue updating credits.';

        if (response.status === 400) {
          errorMessage = `Credit validation failed: ${data.error || 'Invalid credit data'}`;
        } else if (response.status === 401 || response.status === 403) {
          errorMessage = 'You do not have permission to award credits';
        } else if (response.status === 404) {
          errorMessage = 'Student account not found';
        } else if (response.status === 500) {
          errorMessage = `Server error: ${data.details || 'Unknown server error'}`;

          // Check for specific database function errors
          if (data.code === '42883') {
            errorMessage = 'Credit function not found. Please contact system administrator.';
          } else if (data.code === '23503') {
            errorMessage = 'Referenced record does not exist. Please check student information.';
          }
        }

        // Payment was recorded but credits failed - we should notify the user
        setShowCreditDialog(false)

        toast({
          title: "Payment Recorded, Credits Not Updated",
          description: `Payment recorded successfully, but ${errorMessage} The system administrator has been notified.`,
          variant: "default",
          duration: 8000,
        });

        // Still refresh data since payment was recorded
        fetchDashboardData()
      }
    } catch (error) {
      console.error('Error awarding credits:', error)

      // Provide more helpful error message based on the error
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (error.message.includes('validation')) {
          errorMessage = error.message; // Use the validation error message directly
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Dashboard</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={fetchDashboardData}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setNewClassDialog(true)}
          >
            <Plus className="h-4 w-4" />
            New Class
          </Button>
          <Button
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center gap-2"
            onClick={() => setNewLogDialog(true)}
          >
            <FileText className="h-4 w-4" />
            Create Log
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Classes Today</p>
                <h3 className="text-2xl font-bold text-blue-900">{data?.stats.classesToday || 0}</h3>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={data?.stats.classesToday && data?.stats.totalClasses ?
                (data.stats.classesToday / data.stats.totalClasses) * 100 : 0}
                className="h-2 bg-blue-200"
              />
              <p className="text-xs text-blue-700 mt-1">
                {data?.stats.classesToday || 0} of {data?.stats.totalClasses || 0} total classes
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Students Present</p>
                <h3 className="text-2xl font-bold text-green-900">{data?.stats.studentsPresent || 0}</h3>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={data?.stats.attendanceToday || 0} className="h-2 bg-green-200" />
              <p className="text-xs text-green-700 mt-1">
                {data?.stats.attendanceToday || 0}% attendance today
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Classes Completed</p>
                <h3 className="text-2xl font-bold text-purple-900">{data?.stats.classesCompleted || 0}</h3>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={data?.stats.classesCompleted && data?.stats.classesScheduled ?
                (data.stats.classesCompleted / data.stats.classesScheduled) * 100 : 0}
                className="h-2 bg-purple-200"
              />
              <p className="text-xs text-purple-700 mt-1">
                {data?.stats.classesCompleted || 0} of {data?.stats.classesScheduled || 0} scheduled
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Revenue</p>
                <h3 className="text-2xl font-bold text-amber-900">₹{data?.stats.totalRevenue?.toLocaleString() || 0}</h3>
              </div>
              <div className="bg-amber-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-amber-700">
                  {data?.stats.pendingPayments || 0} pending payments
                </p>
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                  This Month
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-indigo-600" />
            Today's Schedule
          </CardTitle>
          <CardDescription>Your classes and appointments for today</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.todaySchedule && data.todaySchedule.length > 0 ? (
            <div className="space-y-4">
              {data.todaySchedule.map((item) => (
                <div key={item.id} className="flex items-start p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="bg-indigo-100 p-2 rounded-full mr-4">
                    <BookOpen className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{item.classes.name}</h4>
                      <Badge
                        className={
                          item.status === 'completed' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                            item.status === 'in_progress' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                              'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        }
                      >
                        {item.status === 'completed' ? 'Completed' :
                          item.status === 'in_progress' ? 'In Progress' :
                            'Upcoming'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{item.classes.subject} - {item.classes.grade}</p>
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <Users className="h-3 w-3 mr-1" />
                      <span>{item.attendance_count}/{item.total_students} students</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p>No classes scheduled for today</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="students" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-2 lg:w-[300px]">
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">My Students</h2>
            <Button
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </div>

          {data?.students && data.students.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.students.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  onClick={handleStudentClick}
                  onCreditUpdate={fetchDashboardData}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No students yet</h3>
              <p className="text-gray-600 mb-4">You haven't added any students to your classes yet.</p>
              <Button>Add Your First Student</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <ScheduleSlots
            teacherId={user.id}
            userRole="teacher"
            onSlotAdded={() => fetchDashboardData()}
          />
        </TabsContent>
      </Tabs>

      {/* Student Detail Dialog */}
      <Dialog open={studentDetailDialog} onOpenChange={setStudentDetailDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Student Details</DialogTitle>
            <DialogDescription>
              View and manage details for {selectedStudent?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6 py-4">
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-bold text-lg h-16 w-16 rounded-full flex items-center justify-center">
                  {selectedStudent.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{selectedStudent.name}</h3>
                  <p className="text-sm text-gray-600">{selectedStudent.grade} &bull; {selectedStudent.subject}</p>
                  <Badge
                    className={`mt-1 text-xs px-2 py-1 ${selectedStudent.performance === 'excellent' ? 'text-green-600 bg-green-100' :
                      selectedStudent.performance === 'needs-attention' ? 'text-orange-600 bg-orange-100' :
                        'text-blue-600 bg-blue-100'
                      }`}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    <span className="capitalize">{selectedStudent.performance || 'Good'}</span>
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {selectedStudent.creditData?.balance_hours || selectedStudent.creditsRemaining || 0}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setStudentDetailDialog(false)
                          setShowCreditDialog(true)
                        }}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Credits
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Total credits purchased: {selectedStudent.creditData?.total_purchased || selectedStudent.totalCredits || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Total credits used: {selectedStudent.creditData?.total_used || 0}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{selectedStudent.attendanceRate || 0}%</span>
                    </div>
                    <Progress
                      value={selectedStudent.attendanceRate || 0}
                      className="h-2 mt-2 bg-emerald-200"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Credit Award Dialog */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Award Class Credits</DialogTitle>
            <DialogDescription>
              Confirm payment received and award credits to {selectedStudent?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="credit-hours">Credit Hours</Label>
              <Input
                id="credit-hours"
                type="number"
                min="1"
                value={creditFormData.hours}
                onChange={(e) => setCreditFormData({ ...creditFormData, hours: parseInt(e.target.value) || 0 })}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                value={creditFormData.amount}
                onChange={(e) => setCreditFormData({ ...creditFormData, amount: parseInt(e.target.value) || 0 })}
                className="w-full"
              />
            </div>
            {/* Add parent email field */}
            <div className="space-y-2">
              <Label htmlFor="parent-email">Parent Email{selectedStudent?.parent_email ? ' (Pre-filled)' : ' (Required)'}</Label>
              <Input
                id="parent-email"
                type="email"
                placeholder="parent@example.com"
                value={creditFormData.parentEmail}
                onChange={(e) => setCreditFormData({ ...creditFormData, parentEmail: e.target.value })}
                className="w-full"
                required={!selectedStudent?.parent_email}
              />
              {!selectedStudent?.parent_email && (
                <p className="text-xs text-amber-600 mt-1">No parent email found for this student. Please provide one.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Payment for Mathematics classes..."
                value={creditFormData.note}
                onChange={(e) => setCreditFormData({ ...creditFormData, note: e.target.value })}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowCreditDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAwardCredits}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Award Credits
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}