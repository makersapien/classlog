// src/components/TeacherScheduleView.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { 
  Calendar, 
  Clock, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Settings,
  Users,
  Eye,
  EyeOff,
  Link,
  BarChart3,
  RefreshCw
} from 'lucide-react'
import AvailabilityModal from './AvailabilityModal'
import StudentManagementPanel from './StudentManagementPanel'
import RecurringSlotModal from './RecurringSlotModal'
import ConflictResolutionModal from './ConflictResolutionModal'
import WaitlistModal from './WaitlistModal'

interface TeacherScheduleViewProps {
  teacherId: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface ScheduleSlot {
  id: string
  date: string
  start_time: string
  end_time: string
  duration_minutes: number
  title?: string
  subject?: string
  status: 'available' | 'booked' | 'cancelled' | 'completed'
  booked_by?: string
  booked_at?: string
  student_name?: string
  student_theme?: string
}

interface TimeSlot {
  id: string
  day_of_week: string
  start_time: string
  end_time: string
  is_available: boolean
  subject?: string
}

interface StudentInfo {
  id: string
  name: string
  email?: string
  theme: string
}

// Color themes for students
const studentThemes = {
  red: { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-800' },
  blue: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800' },
  purple: { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-800' },
  amber: { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-800' },
  emerald: { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-800' },
  pink: { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-800' },
  indigo: { bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-800' },
  teal: { bg: 'bg-teal-100', border: 'border-teal-500', text: 'text-teal-800' }
}

export default function TeacherScheduleView({ teacherId, user }: TeacherScheduleViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null)
  const [blurredStudents, setBlurredStudents] = useState<Set<string>>(new Set())
  const [showRecurringModal, setShowRecurringModal] = useState(false)
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const [conflicts, setConflicts] = useState<any[]>([])
  const [recurringMode, setRecurringMode] = useState<'create' | 'edit' | 'delete'>('create')

  const { toast } = useToast()

  // Get week boundaries
  const getWeekBoundaries = useCallback((date: Date) => {
    const start = new Date(date)
    const dayOfWeek = start.getDay()
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    start.setDate(start.getDate() + daysToMonday)
    
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    
    return { start, end }
  }, [])

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  // Fetch schedule data
  const fetchScheduleData = useCallback(async () => {
    try {
      setLoading(true)
      const { start } = getWeekBoundaries(currentWeek)
      
      // Fetch schedule slots for the current week
      const response = await fetch(`/api/schedule-slots?teacher_id=${teacherId}&week_start=${start.toISOString().split('T')[0]}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setScheduleSlots(data.slots || [])
      
      // Fetch time slots (recurring availability patterns)
      const timeSlotsResponse = await fetch('/api/timeslots')
      if (timeSlotsResponse.ok) {
        const timeSlotsData = await timeSlotsResponse.json()
        setTimeSlots(timeSlotsData.time_slots || [])
      }
      
      // Fetch students for booking assignments
      const studentsResponse = await fetch('/api/teacher/students')
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json()
        // Transform student data to include theme information
        const studentsWithThemes = studentsData.students?.map((student: any, index: number) => ({
          id: student.student_id || student.id,
          name: student.student_name || student.name,
          email: student.parent_email || student.email,
          theme: Object.keys(studentThemes)[index % Object.keys(studentThemes).length]
        })) || []
        setStudents(studentsWithThemes)
      }
      
    } catch (error) {
      console.error('Failed to fetch schedule data:', error)
      toast({
        title: "Error",
        description: "Failed to load schedule data. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }, [teacherId, currentWeek, getWeekBoundaries, toast])

  useEffect(() => {
    fetchScheduleData()
  }, [fetchScheduleData])

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentWeek(newWeek)
  }

  // Go to current week
  const goToCurrentWeek = () => {
    setCurrentWeek(new Date())
  }

  // Toggle student blur
  const toggleStudentBlur = (studentId: string) => {
    const newBlurred = new Set(blurredStudents)
    if (newBlurred.has(studentId)) {
      newBlurred.delete(studentId)
    } else {
      newBlurred.add(studentId)
    }
    setBlurredStudents(newBlurred)
  }

  // Get student theme
  const getStudentTheme = (studentId: string) => {
    const student = students.find(s => s.id === studentId)
    return student ? studentThemes[student.theme as keyof typeof studentThemes] : studentThemes.blue
  }

  // Render calendar grid
  const renderCalendarGrid = () => {
    const { start } = getWeekBoundaries(currentWeek)
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']
    
    return (
      <div className="calendar-grid border border-gray-200 rounded-lg overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-8 bg-gray-50">
          <div className="p-3 border-r border-gray-200 font-medium text-sm text-gray-700">
            Time
          </div>
          {days.map((day, index) => {
            const date = new Date(start)
            date.setDate(date.getDate() + index)
            return (
              <div key={day} className="p-3 border-r border-gray-200 text-center">
                <div className="font-medium text-sm text-gray-900">{day}</div>
                <div className="text-xs text-gray-500">{formatDate(date)}</div>
              </div>
            )
          })}
        </div>
        
        {/* Time slots */}
        {timeSlots.map(time => (
          <div key={time} className="grid grid-cols-8 border-t border-gray-200">
            <div className="p-3 border-r border-gray-200 text-sm text-gray-600 bg-gray-50">
              {formatTime(time)}
            </div>
            {days.map((day, dayIndex) => {
              const date = new Date(start)
              date.setDate(date.getDate() + dayIndex)
              const dateStr = date.toISOString().split('T')[0]
              
              // Find slot for this time and date
              const slot = scheduleSlots.find(s => 
                s.date === dateStr && 
                s.start_time === time + ':00'
              )
              
              return (
                <div 
                  key={`${day}-${time}`} 
                  className="p-2 border-r border-gray-200 min-h-[80px] hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => slot && setSelectedSlot(slot)}
                >
                  {slot && (
                    <div className={`
                      h-full rounded p-2 border-l-4 text-xs
                      ${slot.status === 'available' ? 'bg-green-100 border-l-green-500' :
                        slot.status === 'booked' ? `${getStudentTheme(slot.booked_by || '').bg} ${getStudentTheme(slot.booked_by || '').border}` :
                        'bg-gray-100 border-l-gray-500'}
                    `}>
                      {slot.status === 'available' && (
                        <div className="text-green-700 font-medium">Available</div>
                      )}
                      {slot.status === 'booked' && slot.booked_by && (
                        <div className={`${getStudentTheme(slot.booked_by).text} font-medium ${blurredStudents.has(slot.booked_by) ? 'blur-sm' : ''}`}>
                          {students.find(s => s.id === slot.booked_by)?.name || 'Student'}
                        </div>
                      )}
                      {slot.subject && (
                        <div className="text-gray-600 mt-1">{slot.subject}</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Class Schedule</h2>
          <p className="text-gray-600">Manage your availability and view bookings</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAvailabilityModal(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Manage Availability
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setRecurringMode('create')
              setShowRecurringModal(true)
            }}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Recurring Slots
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowWaitlistModal(true)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Waitlists
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowAnalytics(true)}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Button>
          <Button
            onClick={fetchScheduleData}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentWeek}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Current Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {(() => {
                const { start, end } = getWeekBoundaries(currentWeek)
                return `${formatDate(start)} - ${formatDate(end)}`
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderCalendarGrid()}
        </CardContent>
      </Card>

      {/* Student Management Panel */}
      <StudentManagementPanel
        students={students}
        teacherId={teacherId}
        onStudentUpdate={fetchScheduleData}
      />

      {/* Slot Details Modal */}
      <Dialog open={!!selectedSlot} onOpenChange={() => setSelectedSlot(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Slot Details</DialogTitle>
            <DialogDescription>
              {selectedSlot && `${formatDate(new Date(selectedSlot.date))} at ${formatTime(selectedSlot.start_time)}`}
            </DialogDescription>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Badge className={`mt-1 ${
                    selectedSlot.status === 'available' ? 'bg-green-100 text-green-800' :
                    selectedSlot.status === 'booked' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedSlot.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Duration</label>
                  <div className="text-sm text-gray-900 mt-1">
                    {selectedSlot.duration_minutes} minutes
                  </div>
                </div>
              </div>
              
              {selectedSlot.status === 'booked' && selectedSlot.booked_by && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Student</label>
                  <div className="text-sm text-gray-900 mt-1">
                    {students.find(s => s.id === selectedSlot.booked_by)?.name || 'Unknown Student'}
                  </div>
                </div>
              )}
              
              {selectedSlot.subject && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Subject</label>
                  <div className="text-sm text-gray-900 mt-1">
                    {selectedSlot.subject}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedSlot(null)}
                >
                  Close
                </Button>
                {selectedSlot.status === 'available' && (
                  <Button
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                    onClick={() => {
                      // TODO: Open assign to student modal
                      toast({
                        title: "Assign Student",
                        description: "Student assignment functionality will be implemented in the next task",
                        duration: 3000,
                      })
                    }}
                  >
                    Assign to Student
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Availability Management Modal */}
      <AvailabilityModal
        open={showAvailabilityModal}
        onOpenChange={setShowAvailabilityModal}
        teacherId={teacherId}
        onAvailabilityUpdated={fetchScheduleData}
      />

      {/* Recurring Slot Management Modal */}
      <RecurringSlotModal
        isOpen={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
        onSuccess={fetchScheduleData}
        existingSlot={selectedSlot}
        mode={recurringMode}
      />

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        onResolved={fetchScheduleData}
        conflicts={conflicts}
        proposedSlots={[]}
      />

      {/* Waitlist Management Modal */}
      <WaitlistModal
        isOpen={showWaitlistModal}
        onClose={() => setShowWaitlistModal(false)}
        onUpdate={fetchScheduleData}
        teacherId={teacherId}
        mode="teacher"
      />

      {/* Analytics Modal Placeholder */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Booking Analytics</DialogTitle>
            <DialogDescription>
              Analytics dashboard will be implemented in a later task
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              This modal will show booking analytics including:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-600">
              <li>Booking utilization rates</li>
              <li>Student booking patterns</li>
              <li>Cancellation statistics</li>
              <li>Revenue tracking</li>
            </ul>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowAnalytics(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}