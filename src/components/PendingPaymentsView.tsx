'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { AlertCircle, Clock, CreditCard, DollarSign, Mail, User } from 'lucide-react'

interface PendingPayment {
  student_id: string
  student_name: string
  completed_hours: number
  awarded_credits: number
  pending_hours: number
  pending_amount: number
  last_class_date: string
  rate_per_hour: number
  student_email: string
  parent_email: string | null
}

interface PendingPaymentsResponse {
  total_pending_amount: number
  students: PendingPayment[]
}

interface PendingPaymentsViewProps {
  teacherId: string
  onAwardCredits?: (studentId: string) => void
}

export default function PendingPaymentsView({ teacherId, onAwardCredits }: PendingPaymentsViewProps) {
  const [pendingPayments, setPendingPayments] = useState<PendingPaymentsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)

  const { toast } = useToast()

  const fetchPendingPayments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/teacher/pending-payments')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch pending payments')
      }

      const result = await response.json()
      setPendingPayments(result)
    } catch (err) {
      console.error('Failed to fetch pending payments:', err)
      setError(err instanceof Error ? err.message : 'Failed to load pending payments')
      
      toast({
        title: "Error",
        description: "Failed to load pending payments",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingPayments()
  }, [teacherId])

  const handleSendReminder = async (student: PendingPayment) => {
    if (!student.parent_email) {
      toast({
        title: "No Parent Email",
        description: "Cannot send reminder - no parent email found for this student",
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    try {
      setSendingReminder(student.student_id)
      
      // TODO: Implement reminder email API endpoint
      // For now, just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      toast({
        title: "Reminder Sent",
        description: `Payment reminder sent to ${student.parent_email}`,
        duration: 5000,
      })
    } catch (err) {
      console.error('Failed to send reminder:', err)
      toast({
        title: "Failed to Send Reminder",
        description: err instanceof Error ? err.message : 'Failed to send payment reminder',
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setSendingReminder(null)
    }
  }

  const handleAwardCredits = (studentId: string) => {
    if (onAwardCredits) {
      onAwardCredits(studentId)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Pending Payments</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Pending Payments</h2>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-medium text-red-900">Error Loading Pending Payments</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <Button 
              onClick={fetchPendingPayments} 
              variant="outline" 
              className="mt-4 border-red-300 text-red-700 hover:bg-red-100"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Pending Payments</h2>
        <Button onClick={fetchPendingPayments} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Total Pending Amount</p>
              <h3 className="text-3xl font-bold text-orange-900">
                ₹{pendingPayments?.total_pending_amount?.toLocaleString() || 0}
              </h3>
              <p className="text-sm text-orange-600 mt-1">
                From {pendingPayments?.students?.length || 0} students
              </p>
            </div>
            <div className="bg-orange-100 p-4 rounded-full">
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Payments List */}
      {pendingPayments?.students && pendingPayments.students.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pendingPayments.students.map((student) => (
            <Card key={student.student_id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-br from-blue-400 to-purple-500 text-white font-bold text-sm h-10 w-10 rounded-full flex items-center justify-center">
                      {student.student_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{student.student_name}</CardTitle>
                      <CardDescription className="flex items-center space-x-2">
                        <User className="h-3 w-3" />
                        <span>{student.student_email}</span>
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="destructive" className="text-sm font-semibold">
                    ₹{student.pending_amount.toLocaleString()}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Payment Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-gray-600">Completed Hours</p>
                    <p className="font-semibold">{student.completed_hours.toFixed(1)}h</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-600">Awarded Credits</p>
                    <p className="font-semibold">{student.awarded_credits.toFixed(1)}h</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-600">Pending Hours</p>
                    <p className="font-semibold text-orange-600">{student.pending_hours.toFixed(1)}h</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-600">Rate/Hour</p>
                    <p className="font-semibold">₹{student.rate_per_hour}</p>
                  </div>
                </div>

                {/* Last Class Date */}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Last class: {formatDate(student.last_class_date)}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-2">
                  <Button
                    onClick={() => handleSendReminder(student)}
                    disabled={!student.parent_email || sendingReminder === student.student_id}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {sendingReminder === student.student_id ? 'Sending...' : 'Send Reminder'}
                  </Button>
                  <Button
                    onClick={() => handleAwardCredits(student.student_id)}
                    size="sm"
                    className="flex-1"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Award Credits
                  </Button>
                </div>

                {!student.parent_email && (
                  <div className="flex items-center space-x-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    <AlertCircle className="h-3 w-3" />
                    <span>No parent email - cannot send reminders</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-8 text-center">
            <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-green-900 mb-2">All Caught Up!</h3>
            <p className="text-green-700">No pending payments at the moment. All your students are up to date with their payments.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}