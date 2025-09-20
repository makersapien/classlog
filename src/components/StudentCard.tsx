// src/components/StudentCard.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BookOpen, CreditCard, CheckCircle, Plus, DollarSign } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

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

interface StudentCardProps {
  student: StudentData
  onClick?: (student: StudentData) => void
  onCreditUpdate?: () => void
}

export default function StudentCard({ student, onClick, onCreditUpdate }: StudentCardProps) {
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [, setIsSubmitting] = useState(false)
  const [creditFormData, setCreditFormData] = useState({
    hours: 4,
    amount: 2000,
    note: ''
  })
  const { toast } = useToast()

  const handleAwardCredits = async () => {
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
      
      // Check if student ID is valid
      if (!student.id) {
        toast({
          title: "Invalid Student Data",
          description: "Invalid student information. Please refresh the page and try again.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
      
      // Check if parent email is available for payment tracking
      if (!student.parent_email) {
        toast({
          title: "Missing Information",
          description: "Parent email is required for payment tracking. Please update student information first.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
      
      // Set loading state
      setIsSubmitting(true);
      
      try {
        // First create a payment record
        const paymentResponse = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'award_credits',
            parent_email: student.parent_email,
            credit_hours: creditFormData.hours,
            payment_amount: creditFormData.amount,
            payment_note: creditFormData.note || `Payment for ${student.subject} classes`,
            student_id: student.id
          })
        });
        
        const paymentData = await paymentResponse.json();
        
        if (!paymentResponse.ok) {
          // Handle specific payment errors
          if (paymentResponse.status === 400) {
            throw new Error(`Payment validation failed: ${paymentData.error || 'Invalid payment data'}`);
          } else if (paymentResponse.status === 401 || paymentResponse.status === 403) {
            throw new Error('You do not have permission to record payments');
          } else if (paymentResponse.status === 404) {
            throw new Error('Parent account not found. Please check the email address');
          } else if (paymentResponse.status === 500) {
            throw new Error(`Server error: ${paymentData.details || 'Unknown server error'}`);
          } else {
            throw new Error(paymentData.error || 'Failed to create payment record');
          }
        }
        
        // Then call the credits API to award credits
        const response = await fetch('/api/credits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'purchase',
            studentId: student.id,
            hours: creditFormData.hours,
            description: creditFormData.note || `Payment for ${student.subject} classes`,
            referenceType: 'payment',
            referenceId: paymentData.payment?.id || null
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Close the dialog and refresh data
          setShowCreditDialog(false);
          
          // Show success toast notification
          toast({
            title: "Credits Added Successfully",
            description: `${creditFormData.hours} credits have been awarded to ${student.name}`,
            variant: "default",
            duration: 5000,
          });
          
          // Call the callback if provided
          if (onCreditUpdate) {
            onCreditUpdate();
          }
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
          
          console.error('Credits API error:', data);
          
          // Payment was recorded but credits failed - we should notify the user but not block them
          setShowCreditDialog(false);
          
          // Show warning toast notification
          toast({
            title: "Payment Recorded, Credits Not Updated",
            description: `Payment recorded successfully, but ${errorMessage} The system administrator has been notified.`,
            variant: "default",
            duration: 8000,
          });
          
          // Still refresh data since payment was recorded
          if (onCreditUpdate) {
            onCreditUpdate();
          }
        }
      } finally {
        // Reset loading state
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error awarding credits:', error);
      
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
      setIsSubmitting(false);
    }
  }

  const getPerformanceColor = (performance?: string) => {
    switch (performance) {
      case 'excellent': return 'text-green-600 bg-green-100'
      case 'good': return 'text-blue-600 bg-blue-100'
      case 'needs-attention': return 'text-orange-600 bg-orange-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <>
      <Card 
        className="border-2 border-gray-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 bg-gradient-to-br from-white to-gray-50"
        onClick={() => onClick && onClick(student)}
      >
        <CardContent className="p-6">
          {/* Student Header */}
          <div className="flex items-center space-x-4 mb-4">
            <Avatar className="h-14 w-14 border-3 border-indigo-300 shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-bold text-lg">
                {student.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg leading-tight">{student.name}</h3>
              <p className="text-sm text-gray-600 font-medium">{student.grade}</p>
              <div className="flex items-center mt-1">
                <Badge 
                  className={`text-xs px-2 py-1 ${getPerformanceColor(student.performance)}`}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  <span className="capitalize">{student.performance || 'Good'}</span>
                </Badge>
              </div>
            </div>
          </div>

          {/* Credits & Progress */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">Class Credits</span>
                </div>
                <span className="text-sm font-bold text-blue-800">
                  {student.creditData?.balance_hours || student.creditsRemaining || 0}/
                  {student.creditData?.total_purchased || student.totalCredits || 0}
                </span>
              </div>
              <Progress 
                value={(student.creditData?.balance_hours || student.creditsRemaining || 0) && 
                       (student.creditData?.total_purchased || student.totalCredits || 0) > 0 ? 
                  ((student.creditData?.balance_hours || student.creditsRemaining || 0) / 
                   (student.creditData?.total_purchased || student.totalCredits || 0)) * 100 : 0} 
                className="h-2 bg-blue-200"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-blue-700 font-medium">
                  {student.creditData?.balance_hours || student.creditsRemaining || 0} classes remaining
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-blue-700 hover:text-blue-900 p-1 h-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreditDialog(true);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Credits
                </Button>
              </div>
            </div>

            {/* Attendance Rate */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-900">Attendance</span>
                </div>
                <span className="text-sm font-bold text-emerald-800">
                  {student.attendanceRate || 0}%
                </span>
              </div>
              <Progress 
                value={student.attendanceRate || 0} 
                className="h-2 bg-emerald-200"
              />
            </div>

            {/* Subjects */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-semibold text-gray-700">Subjects</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(student.subjects || [student.subject]).map((subject, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                    {subject}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Award Dialog */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Award Class Credits</DialogTitle>
            <DialogDescription>
              Confirm payment received and award credits to {student.name}&apos;s parent
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
                onChange={(e) => setCreditFormData({...creditFormData, hours: parseInt(e.target.value) || 0})}
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
                onChange={(e) => setCreditFormData({...creditFormData, amount: parseInt(e.target.value) || 0})}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Payment for Mathematics classes..."
                value={creditFormData.note}
                onChange={(e) => setCreditFormData({...creditFormData, note: e.target.value})}
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
    </>
  )
}