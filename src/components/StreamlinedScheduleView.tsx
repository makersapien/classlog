// src/components/StreamlinedScheduleView.tsx
'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import SlotCreationModal from './SlotCreationModal'
import BulkActionsModal from './BulkActionsModal'
import { 
   
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  MousePointer,
  Check,
  X,
  Users,
  Settings
} from 'lucide-react'

interface StreamlinedScheduleViewProps {
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
  status: 'unavailable' | 'available' | 'assigned' | 'booked' | 'cancelled' | 'completed'
  booked_by?: string
  booked_at?: string
  assigned_student_id?: string
  assigned_student_name?: string
  assignment_expiry?: string
  assignment_status?: 'pending' | 'confirmed' | 'declined' | 'expired'
}

interface StudentInfo {
  id: string
  name: string
  email?: string
  theme: string
}

interface ApiStudent {
  student_id?: string
  id?: string
  student_name?: string
  name?: string
  parent_email?: string
  email?: string
}

type InteractionMode = 'select' | 'assign'

export default function StreamlinedScheduleView({ teacherId, user }: StreamlinedScheduleViewProps) {
  void user
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([])
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('select')
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set())
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ row: number, col: number } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ row: number, col: number } | null>(null)

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
      day: 'numeric'
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
      const weekStartStr = start.toISOString().split('T')[0]
      
      console.log('🔄 Fetching schedule data for week:', weekStartStr, 'teacher:', teacherId)
      
      // Fetch schedule slots for the current week
      const response = await fetch(`/api/schedule-slots?teacher_id=${teacherId}&week_start=${weekStartStr}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ Fetched schedule data:', data.slots?.length || 0, 'slots')
      console.log('📊 Slot statuses:', data.slots?.reduce((acc: Record<string, number>, slot: { status?: string }) => {
        const status = slot.status || 'unknown'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {}))
      
      setScheduleSlots(data.slots || [])
      
      // Fetch students for assignment
      const studentsResponse = await fetch('/api/teacher/students')
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json()
        const studentsWithThemes: StudentInfo[] = []
        const rawStudents = (studentsData.students as ApiStudent[] | undefined) || []
        rawStudents.forEach((student, index: number) => {
          const id = student.student_id || student.id
          if (!id) {
            return
          }
          studentsWithThemes.push({
            id,
            name: student.student_name || student.name || 'Unknown',
            email: student.parent_email || student.email,
            theme: ['red', 'blue', 'purple', 'amber', 'emerald', 'pink', 'indigo', 'teal'][index % 8]
          })
        })
        setStudents(studentsWithThemes)
      }
      
    } catch (error) {
      void error
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

  // Get cell coordinates from mouse position
  const getCellCoordinates = (element: HTMLElement, clientX: number, clientY: number) => {
    const rect = element.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    
    // Calculate which cell based on grid layout
    const cellWidth = rect.width / 8 // 8 columns (time + 7 days)
    const cellHeight = 80 // min-h-[80px]
    
    const col = Math.floor(x / cellWidth)
    const row = Math.floor(y / cellHeight) - 1 // -1 for header row
    
    return { row: Math.max(0, row), col: Math.max(1, Math.min(7, col)) } // col 1-7 for days
  }

  // Handle mouse down to start drag selection
  const handleMouseDown = (e: React.MouseEvent, timeIndex: number, dayIndex: number) => {
    if (interactionMode !== 'select') return
    
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ row: timeIndex, col: dayIndex })
    setDragEnd({ row: timeIndex, col: dayIndex })
  }

  // Handle mouse move during drag
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart || interactionMode !== 'select') return
    
    const calendar = calendarRef.current
    if (!calendar) return
    
    const coords = getCellCoordinates(calendar, e.clientX, e.clientY)
    setDragEnd(coords)
  }

  // Handle mouse up to end drag selection
  const handleMouseUp = () => {
    if (!isDragging || !dragStart || !dragEnd) return
    
    setIsDragging(false)
    
    // Calculate selected area
    const minRow = Math.min(dragStart.row, dragEnd.row)
    const maxRow = Math.max(dragStart.row, dragEnd.row)
    const minCol = Math.min(dragStart.col, dragEnd.col)
    const maxCol = Math.max(dragStart.col, dragEnd.col)
    
    // Prepare slots for creation (show modal)
    prepareSlotCreation(minRow, maxRow, minCol, maxCol)
    
    setDragStart(null)
    setDragEnd(null)
  }

  // Prepare slots for creation (show modal instead of creating immediately)
  const prepareSlotCreation = (minRow: number, maxRow: number, minCol: number, maxCol: number) => {
    const { start } = getWeekBoundaries(currentWeek)
    const timeSlots = getTimeSlots()
    
    const slotsToCreate = []
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const date = new Date(start)
        date.setDate(date.getDate() + (col - 1)) // col 1-7 maps to days 0-6
        const dateStr = date.toISOString().split('T')[0]
        const time = timeSlots[row]
        
        if (time) {
          // Check if slot already exists
          const existingSlot = scheduleSlots.find(s => 
            s.date === dateStr && s.start_time === time + ':00'
          )
          
          if (!existingSlot) {
            slotsToCreate.push({
              teacher_id: teacherId,
              date: dateStr,
              start_time: time + ':00',
              end_time: (parseInt(time.split(':')[0]) + 1).toString().padStart(2, '0') + ':00',
              duration_minutes: 60,
              status: 'available'
            })
          }
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
      console.log('🔄 Creating slots:', slotsToCreate)
      
      // Create slots using bulk API
      const response = await fetch('/api/schedule-slots/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: slotsToCreate })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Slots created successfully:', data)
        
        toast({
          title: "Success",
          description: `Created ${slotsToCreate.length} new available time slots!`,
          duration: 3000,
        })
        setShowSlotCreationModal(false)
        setSlotsToCreate([])
        
        // Add a small delay to ensure database transaction is complete
        setTimeout(() => {
          console.log('🔄 Refreshing calendar data...')
          fetchScheduleData() // Refresh to show new slots
        }, 500)
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to create slots:', errorData)
        throw new Error(errorData.error || 'Failed to create slots')
      }
    } catch (error) {
      void error
      console.error('❌ Error creating slots:', error)
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
        fetchScheduleData() // Refresh to show changes
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

  // Delete available slots or toggle unavailable slots
  const toggleSlotStatus = async (slot: ScheduleSlot) => {
    // Delete available slots
    if (slot.status === 'available') {
      // Validate slot ID
      if (!slot.id || typeof slot.id !== 'string') {
        console.error('❌ Invalid slot ID:', slot.id)
        toast({
          title: "Error",
          description: "Invalid slot ID. Please refresh the calendar.",
          variant: "destructive",
          duration: 5000,
        })
        return
      }

      try {
        console.log('🗑️ Deleting available slot:', slot.id)
        console.log('🔍 Slot details:', { 
          id: slot.id, 
          status: slot.status, 
          date: slot.date, 
          start_time: slot.start_time,
          end_time: slot.end_time 
        })
        
        const response = await fetch(`/api/schedule-slots/${slot.id}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          console.log('✅ Slot deleted successfully')
          toast({
            title: "Slot Deleted",
            description: "Available time slot has been deleted.",
            duration: 2000,
          })
          fetchScheduleData() // Refresh to show changes
        } else {
          let errorData
          try {
            errorData = await response.json()
          } catch (parseError) {
            console.error('❌ Failed to parse DELETE error response:', parseError)
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
          }
          console.error('❌ Failed to delete slot:', errorData)
          throw new Error(errorData.error || `Failed to delete slot (${response.status})`)
        }
      } catch (error) {
        void error
        console.error('❌ Error deleting slot:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        toast({
          title: "Delete Failed",
          description: errorMessage.includes('Slot not found') 
            ? "This slot no longer exists. Refreshing calendar..." 
            : `Failed to delete slot: ${errorMessage}`,
          variant: "destructive",
          duration: 5000,
        })
        
        // If slot not found, refresh the calendar to sync with database
        if (errorMessage.includes('Slot not found')) {
          setTimeout(() => {
            fetchScheduleData()
          }, 1000)
        }
      }
      return
    }

    // For unavailable slots, make them available
    if (slot.status === 'unavailable') {
      const newStatus = 'available'
      
      try {
        console.log(`🔄 Making slot ${slot.id} available`)
        
        const response = await fetch(`/api/schedule-slots/${slot.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('✅ Slot status updated:', data)
          
          toast({
            title: "Slot updated",
            description: `Slot marked as ${newStatus}`,
            duration: 2000,
          })
          
          // Refresh calendar to show changes
          fetchScheduleData()
        } else {
          let errorData
          try {
            errorData = await response.json()
          } catch (parseError) {
            console.error('❌ Failed to parse PATCH error response:', parseError)
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
          }
          throw new Error(errorData.error || `Failed to update slot (${response.status})`)
        }
      } catch (error) {
        void error
        console.error('❌ Error updating slot:', error)
        toast({
          title: "Error",
          description: "Failed to update slot status. Please try again.",
          variant: "destructive",
          duration: 5000,
        })
      }
      return
    }

    // For other slot types, show error
    toast({
      title: "Cannot modify slot",
      description: `Cannot modify ${slot.status} slots. Only available slots can be deleted or unavailable slots can be made available.`,
      variant: "destructive",
      duration: 3000,
    })
  }

  // Get week statistics
  const getWeekStats = () => {
    const totalSlots = scheduleSlots.length
    const availableSlots = scheduleSlots.filter(s => s.status === 'available').length
    const assignedSlots = scheduleSlots.filter(s => s.status === 'assigned').length
    const bookedSlots = scheduleSlots.filter(s => s.status === 'booked').length
    
    return { totalSlots, availableSlots, assignedSlots, bookedSlots }
  }

  // Handle slot selection for assignment
  const handleSlotSelection = (slot: ScheduleSlot) => {
    if (interactionMode !== 'assign' || slot.status !== 'available') return
    
    const newSelected = new Set(selectedSlots)
    if (newSelected.has(slot.id)) {
      newSelected.delete(slot.id)
    } else {
      newSelected.add(slot.id)
    }
    setSelectedSlots(newSelected)
  }

  // Assign selected slots to student
  const assignSlotsToStudent = async () => {
    if (selectedSlots.size === 0 || !selectedStudent) {
      toast({
        title: "Error",
        description: "Please select slots and a student to assign.",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    try {
      const response = await fetch('/api/schedule-slots/assign-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_ids: Array.from(selectedSlots),
          student_id: selectedStudent,
          expires_in_hours: 24
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success",
          description: data.message,
          duration: 5000,
        })
        setSelectedSlots(new Set())
        setSelectedStudent('')
        fetchScheduleData()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to assign slots')
      }
    } catch (error) {
      void error
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign slots",
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  // Check if cell is in drag selection
  const isInDragSelection = (timeIndex: number, dayIndex: number) => {
    if (!isDragging || !dragStart || !dragEnd) return false
    
    const minRow = Math.min(dragStart.row, dragEnd.row)
    const maxRow = Math.max(dragStart.row, dragEnd.row)
    const minCol = Math.min(dragStart.col, dragEnd.col)
    const maxCol = Math.max(dragStart.col, dragEnd.col)
    
    return timeIndex >= minRow && timeIndex <= maxRow && dayIndex >= minCol && dayIndex <= maxCol
  }

  // Time slot configuration with evening focus
  const [showMorningSlots, setShowMorningSlots] = useState(false)
  
  // Get time slots based on configuration
  const getTimeSlots = () => {
    const eveningSlots = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00'] // 4 PM - 9 PM
    const morningSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'] // 9 AM - 3 PM
    
    return showMorningSlots ? [...morningSlots, ...eveningSlots] : eveningSlots
  }

  // Render calendar grid with drag selection
  const renderInteractiveCalendarGrid = () => {
    const { start } = getWeekBoundaries(currentWeek)
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const timeSlots = getTimeSlots()
    
    return (
      <div 
        ref={calendarRef}
        className="calendar-grid border border-gray-300 rounded-xl overflow-hidden select-none shadow-sm bg-white"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Header row with colorful styling */}
        <div className="grid grid-cols-8 bg-gradient-to-r from-indigo-500 to-purple-600 border-b border-indigo-300">
          <div className="px-4 py-3 border-r border-indigo-400 font-semibold text-sm text-white bg-indigo-600">
            <div className="flex items-center gap-2 justify-center">
              <Clock className="h-4 w-4 text-indigo-200" />
              <span>Time</span>
            </div>
          </div>
          {days.map((day, index) => {
            const date = new Date(start)
            date.setDate(date.getDate() + index)
            const isToday = date.toDateString() === new Date().toDateString()
            const isSunday = day === 'Sunday'
            const isSaturday = day === 'Saturday'
            
            let bgClass = 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
            
            if (isToday) {
              bgClass = 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
            } else if (isSunday) {
              bgClass = 'bg-gradient-to-br from-red-500 to-pink-600 text-white'
            } else if (isSaturday) {
              bgClass = 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
            }
            
            return (
              <div key={day} className={`px-3 py-3 border-r border-indigo-400 text-center ${bgClass}`}>
                <div className="font-bold text-sm">
                  {day.substring(0, 3)}
                </div>
                <div className="text-xs mt-0.5 opacity-90">
                  {formatDate(date)}
                </div>
                {isToday && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full mx-auto mt-1 animate-pulse"></div>
                )}
                {(isSunday || isSaturday) && !isToday && (
                  <div className="w-1 h-1 bg-white/60 rounded-full mx-auto mt-1"></div>
                )}
              </div>
            )
          })}
        </div>
        
        {/* Time slots with colorful styling */}
        {timeSlots.map((time, timeIndex) => (
          <div key={time} className="grid grid-cols-8 border-t border-slate-100 hover:bg-slate-25 transition-colors">
            <div className="px-4 py-2.5 border-r border-slate-200 text-sm font-semibold bg-gradient-to-r from-slate-600 to-slate-700 text-white">
              <div className="flex items-center justify-center">
                <span className="bg-white/10 px-3 py-1 rounded-lg text-xs font-bold text-white shadow-sm border border-white/20">
                  {formatTime(time)}
                </span>
              </div>
            </div>
            {days.map((day, dayIndex) => {
              const date = new Date(start)
              date.setDate(date.getDate() + dayIndex)
              const dateStr = date.toISOString().split('T')[0]
              const isToday = date.toDateString() === new Date().toDateString()
              
              // Find slot for this time and date
              const slot = scheduleSlots.find(s => 
                s.date === dateStr && 
                s.start_time === time + ':00'
              )
              
              const isSelected = slot && selectedSlots.has(slot.id)
              const isSelectable = interactionMode === 'assign' && slot && slot.status === 'available'
              const isInSelection = isInDragSelection(timeIndex, dayIndex + 1)
              
              return (
                <div 
                  key={`${day}-${time}`} 
                  className={`
                    px-3 py-2 border-r border-slate-200 min-h-[60px] transition-all duration-300 cursor-pointer relative
                    ${isToday ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-200' : 'bg-white hover:bg-slate-25'}
                    ${interactionMode === 'select' ? 'hover:bg-blue-50 hover:border-blue-200' : ''}
                    ${isSelectable ? 'hover:bg-emerald-50 hover:border-emerald-200' : ''}
                    ${isSelected ? 'ring-2 ring-blue-400 bg-blue-50' : ''}
                    ${isInSelection ? 'bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-blue-400 shadow-inner' : ''}
                    ${slot && slot.status === 'available' ? 'hover:shadow-md hover:scale-[1.01]' : ''}
                  `}
                  onMouseDown={(e) => handleMouseDown(e, timeIndex, dayIndex + 1)}
                  onClick={() => slot && handleSlotSelection(slot)}
                  onDoubleClick={() => slot && toggleSlotStatus(slot)}
                  title={slot && slot.status === 'available' ? 
                    '🖱️ Double-click to DELETE this available slot' : 
                    slot && slot.status === 'unavailable' ? 
                    'Double-click to make available' : ''}
                >
                  {slot ? (
                    <div className={`
                      h-full rounded-lg p-2 border-l-3 text-xs relative group shadow-sm transition-all duration-300
                      ${slot.status === 'available' ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-l-emerald-500 hover:from-emerald-100 hover:to-green-100 hover:shadow-lg hover:scale-[1.02]' :
                        slot.status === 'assigned' ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-l-amber-500 hover:shadow-md' :
                        slot.status === 'booked' ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-l-blue-500 hover:shadow-md' :
                        'bg-gradient-to-br from-slate-50 to-gray-50 border-l-slate-400 hover:shadow-md'}
                      ${isSelected ? 'ring-2 ring-blue-400 shadow-lg' : ''}
                    `}>
                      {/* Status indicator dot */}
                      <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                        slot.status === 'available' ? 'bg-emerald-400 animate-pulse' :
                        slot.status === 'assigned' ? 'bg-amber-400' :
                        slot.status === 'booked' ? 'bg-blue-400' :
                        'bg-slate-400'
                      }`}></div>
                      
                      {/* Delete indicator for available slots */}
                      {slot.status === 'available' && (
                        <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:scale-110">
                          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                            ×
                          </div>
                        </div>
                      )}
                      
                      {slot.status === 'available' && (
                        <div className="text-emerald-700 font-semibold relative">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">Available</span>
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      )}
                      
                      {slot.status === 'assigned' && (
                        <div className="text-amber-700 font-semibold">
                          <div className="text-xs">Assigned</div>
                          {slot.assigned_student_name && (
                            <div className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-md mt-1">
                              {slot.assigned_student_name}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {slot.status === 'booked' && (
                        <div className="text-blue-700 font-semibold">
                          <div className="text-xs">Booked</div>
                          <div className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-md mt-1">
                            Confirmed
                          </div>
                        </div>
                      )}
                      
                      {slot.subject && (
                        <div className="text-slate-600 mt-2 text-xs bg-white/50 px-2 py-1 rounded-md">
                          {slot.subject}
                        </div>
                      )}
                      
                      {isSelected && (
                        <div className="absolute top-2 left-2">
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                      {isInSelection ? (
                        <div className="text-blue-600 font-semibold text-sm bg-white/80 px-3 py-1 rounded-lg shadow-sm">
                          New Slot
                        </div>
                      ) : (
                        <div className="text-xs opacity-50">Empty</div>
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
    <div className="space-y-4 p-4">
      {/* Ultra-Compact Header - All Controls in One Row */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Schedule Toggle + Week Navigation */}
          <div className="flex items-center gap-4">
            {/* Compact Schedule Toggle */}
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 mb-1 font-medium">Schedule</span>
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => setShowMorningSlots(false)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    !showMorningSlots 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Evening
                </button>
                <button
                  onClick={() => setShowMorningSlots(true)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    showMorningSlots 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Full Day
                </button>
              </div>
            </div>

            {/* Compact Week Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
                className="h-8 w-8 p-0 border-slate-300"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <div className="text-sm font-semibold text-slate-700 px-3 py-1 bg-slate-50 rounded-md border">
                {(() => {
                  const { start, end } = getWeekBoundaries(currentWeek)
                  return `${formatDate(start)} - ${formatDate(end)}`
                })()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentWeek}
                className="h-8 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
                className="h-8 w-8 p-0 border-slate-300"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Center: Mode Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <Button
              variant={interactionMode === 'select' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setInteractionMode('select')
                setSelectedSlots(new Set())
              }}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                interactionMode === 'select' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <MousePointer className="h-3 w-3 mr-1" />
              Create
            </Button>
            <Button
              variant={interactionMode === 'assign' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setInteractionMode('assign')
                setSelectedSlots(new Set())
              }}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                interactionMode === 'assign' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Users className="h-3 w-3 mr-1" />
              Assign
            </Button>
          </div>

          {/* Right: Actions + Instructions */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkActionsModal(true)}
              className="h-8 px-3 text-xs border-slate-300"
            >
              <Settings className="h-3 w-3 mr-1" />
              Actions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchScheduleData}
              className="h-8 px-3 text-xs border-slate-300"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
            <div className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md border">
              {interactionMode === 'select' ? 'Drag • Dbl-click' : 'Click • Dbl-click'}
            </div>
          </div>
        </div>
      </div>

      {/* Compact Assignment Controls */}
      {interactionMode === 'assign' && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl shadow-sm border border-emerald-200 p-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="h-8 bg-white border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400 text-sm">
                  <SelectValue placeholder="Choose student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full bg-${student.theme}-500`}></div>
                        {student.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 px-2 py-1 text-xs">
              {selectedSlots.size} selected
            </Badge>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={assignSlotsToStudent}
                disabled={selectedSlots.size === 0 || !selectedStudent}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs disabled:opacity-50"
              >
                <Check className="h-3 w-3 mr-1" />
                Assign
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSlots(new Set())}
                disabled={selectedSlots.size === 0}
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}



      {/* Enhanced Calendar Grid */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-6">
          {renderInteractiveCalendarGrid()}
        </div>
      </div>

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
        {...getWeekStats()}
        isProcessing={isProcessingBulkAction}
        shareLink={shareLink}
      />
    </div>
  )
}
