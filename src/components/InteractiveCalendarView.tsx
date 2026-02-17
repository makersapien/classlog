// src/components/InteractiveCalendarView.tsx
'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import TimeSlotCell from './TimeSlotCell'
import SlotCreationModal from './SlotCreationModal'
import BulkActionsModal from './BulkActionsModal'
import { 
  Clock, 
  MousePointer, 
  RefreshCw,
  Settings,
  Users
} from 'lucide-react'

interface InteractiveCalendarViewProps {
  teacherId: string
  currentWeek: Date
  onSlotUpdate: (slots: TimeSlot[]) => void
  onStudentAssignment: (slotIds: string[], studentId: string) => void
}

interface TimeSlot {
  id: string
  teacherId: string
  date: string
  startTime: string
  endTime: string
  status: 'unavailable' | 'available' | 'assigned' | 'booked'
  assignedStudentId?: string
  assignedStudentName?: string
  assignmentExpiry?: Date
  createdAt: Date
  updatedAt: Date
}

interface Student {
  id: string
  name: string
  email?: string
  theme: string
}

interface ApiSlot {
  id: string
  teacher_id?: string
  date: string
  start_time: string
  end_time: string
  status: 'unavailable' | 'available' | 'assigned' | 'booked'
  assigned_student_id?: string | null
  assigned_student_name?: string | null
  assignment_expiry?: string | null
  created_at?: string | null
  updated_at?: string | null
}

interface ApiStudent {
  student_id?: string
  id?: string
  student_name?: string
  name?: string
  parent_email?: string
  email?: string
}

interface CalendarState {
  timeSlots: TimeSlot[]
  selectedSlots: string[]
  isDragging: boolean
  dragStartSlot: string | null
  assignmentMode: boolean
  students: Student[]
}

export default function InteractiveCalendarView({ 
  teacherId, 
  currentWeek, 
  onSlotUpdate, 
  onStudentAssignment 
}: InteractiveCalendarViewProps) {
  void onStudentAssignment
  const [calendarState, setCalendarState] = useState<CalendarState>({
    timeSlots: [],
    selectedSlots: [],
    isDragging: false,
    dragStartSlot: null,
    assignmentMode: false,
    students: []
  })
  
  const [loading, setLoading] = useState(true)
  const [dragSelection, setDragSelection] = useState<{
    startRow: number
    startCol: number
    endRow: number
    endCol: number
  } | null>(null)
  
  // Modal states
  const [showSlotCreationModal, setShowSlotCreationModal] = useState(false)
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false)
  const [slotsToCreate, setSlotsToCreate] = useState<Array<{
    teacher_id: string
    date: string
    start_time: string
    end_time: string
    duration_minutes: number
    status: string
  }>>([])
  const [isCreatingSlots, setIsCreatingSlots] = useState(false)
  const [isProcessingBulkAction, setIsProcessingBulkAction] = useState(false)
  const [shareLink, setShareLink] = useState<string>('')

  const { toast } = useToast()
  const calendarRef = useRef<HTMLDivElement>(null)

  // Time slots configuration (15-minute intervals)
  const timeSlots = [
    '09:00', '09:15', '09:30', '09:45',
    '10:00', '10:15', '10:30', '10:45',
    '11:00', '11:15', '11:30', '11:45',
    '12:00', '12:15', '12:30', '12:45',
    '13:00', '13:15', '13:30', '13:45',
    '14:00', '14:15', '14:30', '14:45',
    '15:00', '15:15', '15:30', '15:45',
    '16:00', '16:15', '16:30', '16:45',
    '17:00', '17:15', '17:30', '17:45',
    '18:00', '18:15', '18:30', '18:45',
    '19:00', '19:15', '19:30', '19:45',
    '20:00', '20:15', '20:30', '20:45'
  ]

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

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

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    })
  }

  // Fetch time slots and students data
  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true)
      const { start } = getWeekBoundaries(currentWeek)
      
      // Fetch schedule slots for the current week
      const response = await fetch(`/api/schedule-slots?teacher_id=${teacherId}&week_start=${start.toISOString().split('T')[0]}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Transform API data to match our TimeSlot interface
      const transformedSlots: TimeSlot[] = (data.slots || []).map((slot: ApiSlot) => ({
        id: slot.id,
        teacherId: slot.teacher_id || teacherId,
        date: slot.date,
        startTime: slot.start_time,
        endTime: slot.end_time,
        status: slot.status,
        assignedStudentId: slot.assigned_student_id,
        assignedStudentName: slot.assigned_student_name,
        assignmentExpiry: slot.assignment_expiry ? new Date(slot.assignment_expiry) : undefined,
        createdAt: new Date(slot.created_at || Date.now()),
        updatedAt: new Date(slot.updated_at || Date.now())
      }))
      
      // Fetch students for assignment
      const studentsResponse = await fetch('/api/teacher/students')
      let studentsData: Student[] = []
      
      if (studentsResponse.ok) {
        const students = await studentsResponse.json()
        studentsData = (students.students || []).map((student: ApiStudent, index: number) => ({
          id: student.student_id || student.id,
          name: student.student_name || student.name,
          email: student.parent_email || student.email,
          theme: ['red', 'blue', 'purple', 'amber', 'emerald', 'pink', 'indigo', 'teal'][index % 8]
        }))
      }
      
      setCalendarState(prev => ({
        ...prev,
        timeSlots: transformedSlots,
        students: studentsData
      }))
      
      // Notify parent component of slot updates
      onSlotUpdate(transformedSlots)
      
    } catch (error) {
      void error
      console.error('Failed to fetch calendar data:', error)
      toast({
        title: "Error",
        description: "Failed to load calendar data. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }, [teacherId, currentWeek, getWeekBoundaries, toast, onSlotUpdate])

  useEffect(() => {
    fetchCalendarData()
  }, [fetchCalendarData])

  // Get cell coordinates from mouse position
  const getCellCoordinates = (element: HTMLElement, clientX: number, clientY: number) => {
    const rect = element.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    
    // Calculate which cell based on grid layout
    const cellWidth = rect.width / 8 // 8 columns (time + 7 days)
    const cellHeight = 60 // Height of each time slot cell
    
    const col = Math.floor(x / cellWidth)
    const row = Math.floor((y - 60) / cellHeight) // -60 for header row height
    
    return { 
      row: Math.max(0, Math.min(timeSlots.length - 1, row)), 
      col: Math.max(1, Math.min(7, col)) // col 1-7 for days
    }
  }

  // Handle mouse down to start drag selection
  const handleMouseDown = (e: { preventDefault: () => void }, timeIndex: number, dayIndex: number) => {
    if (calendarState.assignmentMode) return
    
    e.preventDefault()
    setCalendarState(prev => ({ ...prev, isDragging: true }))
    setDragSelection({
      startRow: timeIndex,
      startCol: dayIndex,
      endRow: timeIndex,
      endCol: dayIndex
    })
  }

  // Handle slot selection for assignment mode
  const handleSlotSelection = (slotId: string) => {
    if (!calendarState.assignmentMode) return
    
    const newSelected = [...calendarState.selectedSlots]
    const index = newSelected.indexOf(slotId)
    if (index > -1) {
      newSelected.splice(index, 1)
    } else {
      newSelected.push(slotId)
    }
    setCalendarState(prev => ({ ...prev, selectedSlots: newSelected }))
  }

  // Handle mouse move during drag
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!calendarState.isDragging || !dragSelection) return
    
    const calendar = calendarRef.current
    if (!calendar) return
    
    const coords = getCellCoordinates(calendar, e.clientX, e.clientY)
    setDragSelection(prev => prev ? {
      ...prev,
      endRow: coords.row,
      endCol: coords.col
    } : null)
  }

  // Handle mouse up to end drag selection
  const handleMouseUp = () => {
    if (!calendarState.isDragging || !dragSelection) return
    
    setCalendarState(prev => ({ ...prev, isDragging: false }))
    
    // Calculate selected area
    const minRow = Math.min(dragSelection.startRow, dragSelection.endRow)
    const maxRow = Math.max(dragSelection.startRow, dragSelection.endRow)
    const minCol = Math.min(dragSelection.startCol, dragSelection.endCol)
    const maxCol = Math.max(dragSelection.startCol, dragSelection.endCol)
    
    // Prepare slots for creation (show modal)
    prepareSlotCreation(minRow, maxRow, minCol, maxCol)
    
    setDragSelection(null)
  }

  // Prepare slots for creation (show modal instead of creating immediately)
  const prepareSlotCreation = (minRow: number, maxRow: number, minCol: number, maxCol: number) => {
    const { start } = getWeekBoundaries(currentWeek)
    const slotsToCreate = []
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const date = new Date(start)
        date.setDate(date.getDate() + (col - 1)) // col 1-7 maps to days 0-6
        const dateStr = date.toISOString().split('T')[0]
        const startTime = timeSlots[row] + ':00'
        
        // Calculate end time (15 minutes later)
        const [hours, minutes] = timeSlots[row].split(':')
        const endMinutes = parseInt(minutes) + 15
        const endHours = parseInt(hours) + Math.floor(endMinutes / 60)
        const finalMinutes = endMinutes % 60
        const endTime = `${endHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}:00`
        
        // Check if slot already exists
        const existingSlot = calendarState.timeSlots.find(s => 
          s.date === dateStr && s.startTime === startTime
        )
        
        if (!existingSlot) {
          slotsToCreate.push({
            teacher_id: teacherId,
            date: dateStr,
            start_time: startTime,
            end_time: endTime,
            duration_minutes: 15,
            status: 'available'
          })
        }
      }
    }
    
    if (slotsToCreate.length === 0) {
      toast({
        title: "Info",
        description: "No new slots to create in the selected area.",
        duration: 3000,
      })
      return
    }
    
    // Show modal for confirmation
    setSlotsToCreate(slotsToCreate)
    setShowSlotCreationModal(true)
  }

  // Actually create the slots after confirmation
  const confirmSlotCreation = async () => {
    setIsCreatingSlots(true)
    
    try {
      // Create slots using bulk API
      const response = await fetch('/api/schedule-slots/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: slotsToCreate })
      })
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Created ${slotsToCreate.length} new available time slots!`,
          duration: 3000,
        })
        setShowSlotCreationModal(false)
        setSlotsToCreate([])
        fetchCalendarData() // Refresh to show new slots
      } else {
        throw new Error('Failed to create slots')
      }
    } catch (error) {
      void error
      toast({
        title: "Error",
        description: "Failed to create time slots. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsCreatingSlots(false)
    }
  }

  // Check if cell is in drag selection
  const isInDragSelection = (timeIndex: number, dayIndex: number) => {
    if (!calendarState.isDragging || !dragSelection) return false
    
    const minRow = Math.min(dragSelection.startRow, dragSelection.endRow)
    const maxRow = Math.max(dragSelection.startRow, dragSelection.endRow)
    const minCol = Math.min(dragSelection.startCol, dragSelection.endCol)
    const maxCol = Math.max(dragSelection.startCol, dragSelection.endCol)
    
    return timeIndex >= minRow && timeIndex <= maxRow && dayIndex >= minCol && dayIndex <= maxCol
  }

  // Get slot for specific time and date
  const getSlotForCell = (timeIndex: number, dayIndex: number): TimeSlot | null => {
    const { start } = getWeekBoundaries(currentWeek)
    const date = new Date(start)
    date.setDate(date.getDate() + (dayIndex - 1))
    const dateStr = date.toISOString().split('T')[0]
    const startTime = timeSlots[timeIndex] + ':00'
    
    return calendarState.timeSlots.find(s => 
      s.date === dateStr && s.startTime === startTime
    ) || null
  }

  // Clear all slots for the current week
  const clearWeekSlots = async () => {
    setIsProcessingBulkAction(true)
    
    try {
      const { start, end } = getWeekBoundaries(currentWeek)
      
      const response = await fetch('/api/schedule-slots/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: teacherId,
          start_date: start.toISOString().split('T')[0],
          end_date: end.toISOString().split('T')[0]
        })
      })
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "All slots for this week have been cleared.",
          duration: 3000,
        })
        setShowBulkActionsModal(false)
        fetchCalendarData() // Refresh to show changes
      } else {
        throw new Error('Failed to clear slots')
      }
    } catch (error) {
      void error
      toast({
        title: "Error",
        description: "Failed to clear week slots. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsProcessingBulkAction(false)
    }
  }

  // Generate shareable link for students
  const generateShareLink = async () => {
    setIsProcessingBulkAction(true)
    
    try {
      const response = await fetch('/api/teacher/generate-booking-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: teacherId
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        const fullLink = `${window.location.origin}/booking/${data.token}`
        setShareLink(fullLink)
        toast({
          title: "Success",
          description: "Booking link generated successfully!",
          duration: 3000,
        })
      } else {
        throw new Error('Failed to generate link')
      }
    } catch (error) {
      void error
      toast({
        title: "Error",
        description: "Failed to generate booking link. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsProcessingBulkAction(false)
    }
  }

  // Get week statistics
  const getWeekStats = () => {
    const total = calendarState.timeSlots.length
    const available = calendarState.timeSlots.filter(s => s.status === 'available').length
    const assigned = calendarState.timeSlots.filter(s => s.status === 'assigned').length
    const booked = calendarState.timeSlots.filter(s => s.status === 'booked').length
    
    return { total, available, assigned, booked }
  }

  // Render the calendar grid
  const renderCalendarGrid = () => {
    const { start } = getWeekBoundaries(currentWeek)
    
    return (
      <div 
        ref={calendarRef}
        className="calendar-grid border border-gray-200 rounded-lg overflow-hidden select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Header row */}
        <div className="grid grid-cols-8 bg-gray-50 sticky top-0 z-10">
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
        {timeSlots.map((time, timeIndex) => (
          <div key={time} className="grid grid-cols-8 border-t border-gray-200">
            <div className="p-2 border-r border-gray-200 text-xs text-gray-600 bg-gray-50 flex items-center">
              {formatTime(time)}
            </div>
            {days.map((day, dayIndex) => {
              const slot = getSlotForCell(timeIndex, dayIndex + 1)
              const isInSelection = isInDragSelection(timeIndex, dayIndex + 1)
              const isSelected = slot ? calendarState.selectedSlots.includes(slot.id) : false
              
              return (
                <TimeSlotCell
                  key={`${day}-${time}`}
                  slot={slot}
                  isSelected={isSelected}
                  isInDragSelection={isInSelection}
                  onMouseDown={() => {
                    if (!calendarState.assignmentMode) {
                      handleMouseDown({ preventDefault: () => {} }, timeIndex, dayIndex + 1)
                    }
                  }}
                  onMouseEnter={() => {
                    // Handle mouse enter during drag - could be used for drag preview
                  }}
                  onMouseUp={handleMouseUp}
                  onRightClick={() => {
                    // Handle right-click for student assignment
                    if (slot && slot.status === 'available') {
                      // TODO: Open student assignment modal
                      console.log('Right-clicked on slot:', slot.id)
                    }
                  }}
                  onClick={() => {
                    if (slot) {
                      handleSlotSelection(slot.id)
                    }
                  }}
                  interactionMode={calendarState.assignmentMode ? 'assign' : 'select'}
                />
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Interactive Calendar</h3>
          <p className="text-sm text-gray-600">
            {calendarState.assignmentMode 
              ? 'Click available slots to select for assignment' 
              : 'Drag to create available time slots (15-minute intervals)'
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={calendarState.assignmentMode ? 'outline' : 'default'}
            size="sm"
            onClick={() => setCalendarState(prev => ({ 
              ...prev, 
              assignmentMode: false, 
              selectedSlots: [] 
            }))}
            className="flex items-center gap-2"
          >
            <MousePointer className="h-4 w-4" />
            Create Mode
          </Button>
          <Button
            variant={calendarState.assignmentMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCalendarState(prev => ({ 
              ...prev, 
              assignmentMode: true, 
              selectedSlots: [] 
            }))}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Assign Mode
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkActionsModal(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Week Actions
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCalendarData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-blue-800">
            {calendarState.assignmentMode ? (
              <>
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Assignment Mode:</span>
                <span className="text-sm">Click available (green) slots to select them for student assignment</span>
              </>
            ) : (
              <>
                <MousePointer className="h-4 w-4" />
                <span className="text-sm font-medium">Create Mode:</span>
                <span className="text-sm">Click and drag across empty calendar cells to create available time slots</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Selection Summary */}
      {calendarState.assignmentMode && calendarState.selectedSlots.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-800">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {calendarState.selectedSlots.length} slot(s) selected
                </Badge>
                <span className="text-sm">Ready for student assignment</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCalendarState(prev => ({ ...prev, selectedSlots: [] }))}
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            Weekly Schedule - 15 Minute Intervals
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {calendarState.assignmentMode ? 'Click to select slots' : 'Drag to create slots'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {renderCalendarGrid()}
        </CardContent>
      </Card>

      {/* Slot Creation Modal */}
      <SlotCreationModal
        isOpen={showSlotCreationModal}
        onClose={() => {
          setShowSlotCreationModal(false)
          setSlotsToCreate([])
        }}
        onConfirm={confirmSlotCreation}
        slotsToCreate={slotsToCreate.map(slot => ({
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time
        }))}
        isCreating={isCreatingSlots}
      />

      {/* Bulk Actions Modal */}
      <BulkActionsModal
        isOpen={showBulkActionsModal}
        onClose={() => setShowBulkActionsModal(false)}
        onClearWeek={clearWeekSlots}
        onGenerateShareLink={generateShareLink}
        weekStart={getWeekBoundaries(currentWeek).start}
        weekEnd={getWeekBoundaries(currentWeek).end}
        totalSlots={getWeekStats().total}
        availableSlots={getWeekStats().available}
        assignedSlots={getWeekStats().assigned}
        bookedSlots={getWeekStats().booked}
        isProcessing={isProcessingBulkAction}
        shareLink={shareLink}
      />
    </div>
  )
}
