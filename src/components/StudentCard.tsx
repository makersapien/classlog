// src/components/StudentCard.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { BookOpen, CreditCard, CheckCircle, Plus } from 'lucide-react'
import AwardCreditsModal from '@/components/AwardCreditsModal'

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

  const handleCreditModalSuccess = () => {
    if (onCreditUpdate) {
      onCreditUpdate()
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
                {student.name?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg leading-tight">{student.name || 'Unknown Student'}</h3>
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

      {/* Award Credits Modal */}
      <AwardCreditsModal
        open={showCreditDialog}
        onOpenChange={setShowCreditDialog}
        onSuccess={handleCreditModalSuccess}
        preSelectedStudentId={student.id}
      />
    </>
  )
}
