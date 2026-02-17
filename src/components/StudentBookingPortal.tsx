// src/components/StudentBookingPortal.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { AlertCircle, BookOpen, Calendar, CheckCircle, ChevronLeft, ChevronRight, Clock, RefreshCw, User, Users, X } from 'lucide-react'
import WaitlistModal from './WaitlistModal'

interface StudentBookingPortalProps {
  shareToken: string
}

interface BookingSlot {
  id: string
  date: string
  start_time: string
  end_time: string
  duration_minutes: number
  subject?: string
  status: 'available' | 'my_booking' | 'booked'
  is_my_booking: boolean
  booking_id?: string
}

interface UpcomingBooking {
  id: string
  date: string
  start_time: string
  end_time: string
  status: string
  notes?: string
}

interface StudentInfo {
  student_name: string
  teacher_name: string
}

export default function StudentBookingPortal({ shareToken }: StudentBookingPortalProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [slots, setSlots] = useState<BookingSlot[]>([])
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([])
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [bookingInProgress, setBookingInProgress] = useState(false)
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const [waitlistSlot, setWaitlistSlot] = useState<BookingSlot | null>(null)

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

  // Format full date for display
  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Fetch calendar data
  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true)
      const { start } = getWeekBoundaries(currentWeek)
      
      const response = await fetch(`/api/booking/${shareToken}/calendar?week_start=${start.toISOString().split('T')[0]}`)
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid or expired booking link')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setSlots(data.slots || [])
      setUpcomingBookings(data.upcoming_bookings || [])
      setStudentInfo({
        student_name: data.student_name,
        teacher_name: data.teacher_name
      })
      
    } catch (error) {
      console.error('Failed to fetch calendar data:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load calendar data",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }, [shareToken, currentWeek, getWeekBoundaries, toast])

  useEffect(() => {
    fetchCalendarData()
  }, [fetchCalendarData])

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

  // Handle slot click
  const handleSlotClick = (slot: BookingSlot) => {
    setSelectedSlot(slot)
    if (slot.status === 'available') {
      setShowBookingModal(true)
    } else if (slot.is_my_booking) {
      setShowCancelModal(true)
    }
  }

  // Book a slot
  const bookSlot = async () => {
    if (!selectedSlot) return

    try {
      setBookingInProgress(true)
      const response = await fetch(`/api/booking/${shareToken}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_slot_id: selectedSlot.id,
          notes: ''
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Class booked successfully",
          duration: 5000,
        })
        setShowBookingModal(false)
        setSelectedSlot(null)
        await fetchCalendarData()
      } else {
        // Check if slot is full and offer waitlist
        if (data.code === 'SLOT_UNAVAILABLE' || data.code === 'SLOT_FULL') {
          setWaitlistSlot(selectedSlot)
          setShowBookingModal(false)
          setShowWaitlistModal(true)
          return
        }
        throw new Error(data.error || 'Failed to book slot')
      }
    } catch (error) {
      console.error('Booking error:', error)
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : 'Failed to book class',
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setBookingInProgress(false)
    }
  }

  // Join waitlist for a slot
  const joinWaitlist = async (slot: BookingSlot) => {
    try {
      const response = await fetch('/api/timeslots/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_slot_id: slot.id,
          preferred_date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          share_token: shareToken
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Added to Waitlist",
          description: `You are #${data.position} in line for this slot`,
          duration: 5000,
        })
        setShowWaitlistModal(false)
        setWaitlistSlot(null)
      } else {
        if (data.code === 'ALREADY_ON_WAITLIST') {
          toast({
            title: "Already on Waitlist",
            description: "You are already waiting for this time slot",
            variant: "destructive",
            duration: 5000,
          })
        } else if (data.code === 'SLOT_AVAILABLE') {
          toast({
            title: "Slot Available",
            description: "This slot is now available for booking!",
            duration: 5000,
          })
          await fetchCalendarData()
        } else {
          throw new Error(data.error || 'Failed to join waitlist')
        }
      }
    } catch (error) {
      console.error('Waitlist error:', error)
      toast({
        title: "Waitlist Failed",
        description: error instanceof Error ? error.message : 'Failed to join waitlist',
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  // Cancel a booking
  const cancelBooking = async () => {
    if (!selectedSlot?.booking_id) return

    try {
      setBookingInProgress(true)
      const response = await fetch(`/api/booking/${shareToken}/cancel/${selectedSlot.booking_id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Student cancellation'
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Cancelled",
          description: "Class booking cancelled successfully",
          duration: 5000,
        })
        setShowCancelModal(false)
        setSelectedSlot(null)
        await fetchCalendarData()
      } else {
        throw new Error(data.error || 'Failed to cancel booking')
      }
    } catch (error) {
      console.error('Cancellation error:', error)
      toast({
        title: "Cancellation Failed",
        description: error instanceof Error ? error.message : 'Failed to cancel booking',
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setBookingInProgress(false)
    }
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
              const slot = slots.find(s => 
                s.date === dateStr && 
                s.start_time === time + ':00'
              )
              
              return (
                <div 
                  key={`${day}-${time}`} 
                  className="p-2 border-r border-gray-200 min-h-[80px] hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => slot && handleSlotClick(slot)}
                >
                  {slot && (
                    <div className={`
                      h-full rounded p-2 border-l-4 text-xs transition-all hover:shadow-md
                      ${slot.status === 'available' ? 'bg-green-100 border-l-green-500 hover:bg-green-200' :
                        slot.is_my_booking ? 'bg-blue-100 border-l-blue-500 hover:bg-blue-200' :
                        'bg-gray-200 border-l-gray-500 blur-sm'}
                    `}>
                      {slot.status === 'available' && (
                        <>
                          <div className="text-green-700 font-medium mb-1">Available</div>
                          <div className="text-green-600 text-xs">📅 Click to book</div>
                        </>
                      )}
                      {slot.is_my_booking && (
                        <>
                          <div className="text-blue-700 font-medium mb-1">YOUR CLASS</div>
                          <div className="text-blue-600 text-xs">❌ Click to cancel</div>
                        </>
                      )}
                      {slot.status === 'booked' && !slot.is_my_booking && (
                        <>
                          <div className="text-gray-700 font-medium mb-1 select-none">•••••••</div>
                          <div className="text-gray-600 text-xs">BOOKED</div>
                        </>
                      )}
                      {slot.subject && slot.status !== 'booked' && (
                        <div className="text-gray-600 mt-1 text-xs">{slot.subject}</div>
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your booking portal...</p>
        </div>
      </div>
    )
  }

  if (!studentInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Invalid Booking Link</h2>
          <p className="text-gray-600">This booking link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ClassLogger</h1>
              <p className="text-gray-600 mt-1">
                Hi, {studentInfo.student_name}! 👋 Book your classes with {studentInfo.teacher_name}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setShowWaitlistModal(true)}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                My Waitlists
              </Button>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-600" />
                <span className="text-sm font-medium text-gray-700">{studentInfo.student_name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
              <Button
                onClick={fetchCalendarData}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Weekly Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderCalendarGrid()}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">Legend:</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border-l-4 border-l-green-500 rounded"></div>
                <span className="text-sm text-gray-700">🟢 Available - Click to book</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border-l-4 border-l-blue-500 rounded"></div>
                <span className="text-sm text-gray-700">🔵 YOUR CLASS - Your booked slots (click ❌ to cancel)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 border-l-4 border-l-gray-500 rounded blur-sm"></div>
                <span className="text-sm text-gray-700">⚫ BOOKED - Other students (names hidden)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Classes */}
        {upcomingBookings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                Your Upcoming Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingBookings.map(booking => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <div className="font-medium text-blue-900">
                        {formatFullDate(booking.date)}
                      </div>
                      <div className="text-sm text-blue-700">
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {booking.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Booking Confirmation Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Booking</DialogTitle>
            <DialogDescription>
              Book this class slot?
            </DialogDescription>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-4 py-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">
                    {formatFullDate(selectedSlot.date)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">
                    {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">
                    with {studentInfo.teacher_name}
                  </span>
                </div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  You can cancel up to 24 hours before the class starts.
                </p>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowBookingModal(false)}
              disabled={bookingInProgress}
            >
              Cancel
            </Button>
            <Button
              onClick={bookSlot}
              disabled={bookingInProgress}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white"
            >
              {bookingInProgress ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Booking
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancellation Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Class?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this class booking?
            </DialogDescription>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-4 py-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-900">
                    {formatFullDate(selectedSlot.date)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-900">
                    {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
                  </span>
                </div>
              </div>
              
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    This action cannot be undone. Your credit will be refunded if cancelled more than 24 hours before the class.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              disabled={bookingInProgress}
            >
              Go Back
            </Button>
            <Button
              onClick={cancelBooking}
              disabled={bookingInProgress}
              variant="destructive"
            >
              {bookingInProgress ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Yes, Cancel Class
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Waitlist Modal */}
      <WaitlistModal
        isOpen={showWaitlistModal}
        onClose={() => setShowWaitlistModal(false)}
        onUpdate={fetchCalendarData}
        shareToken={shareToken}
        mode="student"
      />

      {/* Join Waitlist Dialog */}
      <Dialog open={!!waitlistSlot} onOpenChange={() => setWaitlistSlot(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Slot Full - Join Waitlist?</DialogTitle>
            <DialogDescription>
              This time slot is currently full. Would you like to join the waitlist? 
              You&apos;ll be notified if a spot becomes available.
            </DialogDescription>
          </DialogHeader>
          
          {waitlistSlot && (
            <div className="py-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  <span className="font-medium">
                    {new Date(waitlistSlot.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  <span>{waitlistSlot.start_time} - {waitlistSlot.end_time}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setWaitlistSlot(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => waitlistSlot && joinWaitlist(waitlistSlot)}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              Join Waitlist
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
