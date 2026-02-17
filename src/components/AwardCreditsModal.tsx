'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { DollarSign, Loader2, Search } from 'lucide-react'

interface StudentData {
  id: string
  student_id: string
  student_name: string
  parent_name: string
  parent_email: string
  subject: string
  year_group: string
  status: string
  class_name: string
}

interface AwardCreditsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  preSelectedStudentId?: string
}

interface CreditFormData {
  studentId: string
  hours: number
  amount: number
  note: string
}

export default function AwardCreditsModal({ 
  open, 
  onOpenChange, 
  onSuccess,
  preSelectedStudentId 
}: AwardCreditsModalProps) {
  const [students, setStudents] = useState<StudentData[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [creditFormData, setCreditFormData] = useState<CreditFormData>({
    studentId: preSelectedStudentId || '',
    hours: 4,
    amount: 2000,
    note: ''
  })

  const { toast } = useToast()

  const fetchStudents = async () => {
    try {
      setLoadingStudents(true)
      const response = await fetch('/api/teacher/students')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch students: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.students) {
        setStudents(data.students)
      } else {
        throw new Error(data.error || 'Failed to load students')
      }
    } catch (error) {
      console.error('Error fetching students:', error)
      toast({
        title: "Error Loading Students",
        description: error instanceof Error ? error.message : "Failed to load student list",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoadingStudents(false)
    }
  }

  // Fetch enrolled students when modal opens
  useEffect(() => {
    if (open) {
      fetchStudents()
    }
  }, [open])

  // Set pre-selected student when provided
  useEffect(() => {
    if (preSelectedStudentId) {
      setCreditFormData(prev => ({ ...prev, studentId: preSelectedStudentId }))
    }
  }, [preSelectedStudentId])

  const handleSubmit = async () => {
    try {
      // Validate input
      if (!creditFormData.studentId) {
        toast({
          title: "Validation Error",
          description: "Please select a student",
          variant: "destructive",
          duration: 3000,
        })
        return
      }

      if (!creditFormData.hours || creditFormData.hours <= 0) {
        toast({
          title: "Validation Error",
          description: "Credit hours must be greater than 0",
          variant: "destructive",
          duration: 3000,
        })
        return
      }

      if (creditFormData.amount < 0) {
        toast({
          title: "Validation Error",
          description: "Payment amount cannot be negative",
          variant: "destructive",
          duration: 3000,
        })
        return
      }

      setSubmitting(true)

      // Find selected student data
      const selectedStudent = students.find(s => s.student_id === creditFormData.studentId)
      if (!selectedStudent) {
        throw new Error('Selected student not found')
      }

      // First create a payment record
      const paymentResponse = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'award_credits',
          parent_email: selectedStudent.parent_email,
          credit_hours: creditFormData.hours,
          payment_amount: creditFormData.amount,
          payment_note: creditFormData.note || `Payment for ${selectedStudent.subject} classes`,
          student_id: selectedStudent.student_id
        })
      })

      const paymentData = await paymentResponse.json()

      if (!paymentResponse.ok) {
        let errorMessage = paymentData.error || 'Failed to create payment record'
        
        if (paymentResponse.status === 400) {
          errorMessage = `Payment validation failed: ${errorMessage}`
        } else if (paymentResponse.status === 401 || paymentResponse.status === 403) {
          errorMessage = 'You do not have permission to record payments'
        } else if (paymentResponse.status === 404) {
          errorMessage = 'Student or parent account not found'
        } else if (paymentResponse.status === 409) {
          errorMessage = 'A payment record with these details already exists'
        }

        throw new Error(errorMessage)
      }

      // Then call the credits API to award credits
      const creditsResponse = await fetch('/api/credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'purchase',
          studentId: selectedStudent.student_id,
          hours: creditFormData.hours,
          description: creditFormData.note || `Payment for ${selectedStudent.subject} classes`,
          referenceType: 'payment',
          referenceId: paymentData.payment?.id || null
        })
      })

      const creditsData = await creditsResponse.json()

      if (!creditsResponse.ok) {
        let errorMessage = 'Failed to award credits'
        
        if (creditsResponse.status === 400) {
          errorMessage = `Credit validation failed: ${creditsData.error || 'Invalid credit data'}`
        } else if (creditsResponse.status === 401 || creditsResponse.status === 403) {
          errorMessage = 'You do not have permission to award credits'
        } else if (creditsResponse.status === 404) {
          errorMessage = 'Student account not found'
        }

        // Payment was recorded but credits failed
        toast({
          title: "Payment Recorded, Credits Not Updated",
          description: `Payment recorded successfully, but ${errorMessage}`,
          variant: "default",
          duration: 8000,
        })
        
        // Still close modal and call success callback
        onOpenChange(false)
        onSuccess?.()
        return
      }

      // Success
      toast({
        title: "Credits Awarded Successfully",
        description: `${creditFormData.hours} credits have been awarded to ${selectedStudent.student_name}`,
        duration: 5000,
      })

      // Reset form and close modal
      setCreditFormData({
        studentId: '',
        hours: 4,
        amount: 2000,
        note: ''
      })
      onOpenChange(false)
      onSuccess?.()

    } catch (error) {
      console.error('Error awarding credits:', error)
      
      let errorMessage = 'An unexpected error occurred. Please try again.'
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.'
        } else {
          errorMessage = error.message
        }
      }

      toast({
        title: "Error Awarding Credits",
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Filter students based on search term
  const filteredStudents = students.filter(student =>
    student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.parent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.parent_email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedStudent = students.find(s => s.student_id === creditFormData.studentId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Award Class Credits</DialogTitle>
          <DialogDescription>
            Select a student and confirm payment received to award credits
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Student Selection */}
          <div className="space-y-2">
            <Label htmlFor="student-select">Select Student</Label>
            {loadingStudents ? (
              <div className="flex items-center justify-center p-4 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading students...
              </div>
            ) : (
              <>
                <Select
                  value={creditFormData.studentId}
                  onValueChange={(value) => setCreditFormData({ ...creditFormData, studentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a student..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search students..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    {filteredStudents.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        {searchTerm ? 'No students match your search' : 'No enrolled students found'}
                      </div>
                    ) : (
                      filteredStudents.map((student) => (
                        <SelectItem key={student.student_id} value={student.student_id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{student.student_name}</span>
                            <span className="text-sm text-muted-foreground">
                              {student.subject} • {student.parent_name} • {student.parent_email}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                
                {selectedStudent && (
                  <div className="p-3 bg-muted rounded-md">
                    <div className="text-sm">
                      <div><strong>Student:</strong> {selectedStudent.student_name}</div>
                      <div><strong>Parent:</strong> {selectedStudent.parent_name}</div>
                      <div><strong>Email:</strong> {selectedStudent.parent_email}</div>
                      <div><strong>Subject:</strong> {selectedStudent.subject}</div>
                      <div><strong>Class:</strong> {selectedStudent.class_name}</div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Credit Hours */}
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

          {/* Amount */}
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

          {/* Note */}
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
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !creditFormData.studentId}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <DollarSign className="h-4 w-4 mr-2" />
            )}
            Award Credits
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}