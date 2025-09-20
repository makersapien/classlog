// src/components/ScheduleSlots.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Clock, Plus, Check, X } from 'lucide-react'

interface ScheduleSlot {
  id: string
  teacher_id: string
  date: string
  start_time: string
  end_time: string
  status: 'available' | 'booked' | 'completed' | 'cancelled'
  student_id?: string
  created_at: string
  updated_at: string
}

interface ScheduleSlotsProps {
  teacherId?: string
  studentId?: string
  userRole: 'teacher' | 'student' | 'parent'
  onSlotBooked?: (slotId: string) => void
  onSlotAdded?: (slot: ScheduleSlot) => void
}

export default function ScheduleSlots({
  teacherId,
  studentId,
  userRole,
  onSlotBooked,
  onSlotAdded
}: ScheduleSlotsProps) {
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showBookDialog, setShowBookDialog] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null)
  const [newSlot, setNewSlot] = useState({
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00'
  })

  // Fetch available slots
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        setLoading(true)
        
        // Construct the query parameters based on the user role
        let queryParams = ''
        if (userRole === 'teacher' && teacherId) {
          queryParams = `?teacher_id=${teacherId}`
        } else if ((userRole === 'student' || userRole === 'parent') && teacherId) {
          queryParams = `?teacher_id=${teacherId}`
          if (studentId) {
            queryParams += `&student_id=${studentId}`
          }
        }
        
        const response = await fetch(`/api/schedule-slots${queryParams}`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        setSlots(data.slots || [])
      } catch (error) {
        console.error('Failed to fetch schedule slots:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSlots()
  }, [teacherId, studentId, userRole])

  // Handle adding a new slot (teacher only)
  const handleAddSlot = async () => {
    if (userRole !== 'teacher' || !teacherId) return
    
    try {
      const response = await fetch('/api/schedule-slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teacher_id: teacherId,
          date: newSlot.date,
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
          status: 'available'
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Add the new slot to the list
      setSlots([...slots, data.slot])
      
      // Close the dialog
      setShowAddDialog(false)
      
      // Reset the form
      setNewSlot({
        date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '10:00'
      })
      
      // Call the callback if provided
      if (onSlotAdded) {
        onSlotAdded(data.slot)
      }
    } catch (error) {
      console.error('Failed to add schedule slot:', error)
      alert('Failed to add schedule slot. Please try again.')
    }
  }

  // Handle booking a slot (student/parent only)
  const handleBookSlot = async () => {
    if ((userRole !== 'student' && userRole !== 'parent') || !studentId || !selectedSlot) return
    
    try {
      const response = await fetch(`/api/schedule-slots/${selectedSlot.id}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student_id: studentId
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      await response.json() // Process response but we don't need the data
      
      // Update the slot in the list
      setSlots(slots.map(slot => 
        slot.id === selectedSlot.id ? { ...slot, status: 'booked', student_id: studentId } : slot
      ))
      
      // Close the dialog
      setShowBookDialog(false)
      
      // Reset the selected slot
      setSelectedSlot(null)
      
      // Call the callback if provided
      if (onSlotBooked) {
        onSlotBooked(selectedSlot.id)
      }
      
      alert('Class slot booked successfully!')
    } catch (error) {
      console.error('Failed to book schedule slot:', error)
      alert('Failed to book schedule slot. Please try again.')
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  // Group slots by date
  const groupedSlots = slots.reduce((acc, slot) => {
    const date = slot.date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(slot)
    return acc
  }, {} as Record<string, ScheduleSlot[]>)

  // Sort dates
  const sortedDates = Object.keys(groupedSlots).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Schedule Slots</h2>
        
        {userRole === 'teacher' && (
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Free Slot
          </Button>
        )}
      </div>
      
      {sortedDates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No schedule slots available</h3>
          <p className="text-gray-600">
            {userRole === 'teacher' 
              ? 'Add free slots for your students to book.' 
              : 'No available slots from this teacher yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => (
            <Card key={date} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 py-4">
                <CardTitle className="flex items-center text-lg">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  {formatDate(date)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {groupedSlots[date].map(slot => (
                    <div 
                      key={slot.id} 
                      className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                        slot.status === 'booked' ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {slot.start_time} - {slot.end_time}
                          </p>
                          <p className="text-sm text-gray-600">
                            {slot.status === 'available' ? 'Available' : 
                             slot.status === 'booked' ? 'Booked' : 
                             slot.status === 'completed' ? 'Completed' : 'Cancelled'}
                          </p>
                        </div>
                      </div>
                      
                      {(userRole === 'student' || userRole === 'parent') && 
                       slot.status === 'available' && (
                        <Button
                          variant="outline"
                          className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => {
                            setSelectedSlot(slot)
                            setShowBookDialog(true)
                          }}
                        >
                          Book Slot
                        </Button>
                      )}
                      
                      {userRole === 'teacher' && slot.status === 'available' && (
                        <Button
                          variant="outline"
                          className="border-red-500 text-red-600 hover:bg-red-50"
                          onClick={async () => {
                            if (confirm('Are you sure you want to remove this slot?')) {
                              try {
                                const response = await fetch(`/api/schedule-slots/${slot.id}`, {
                                  method: 'DELETE'
                                })
                                
                                if (response.ok) {
                                  setSlots(slots.filter(s => s.id !== slot.id))
                                } else {
                                  alert('Failed to remove slot')
                                }
                              } catch (error) {
                                console.error('Error removing slot:', error)
                                alert('Error removing slot')
                              }
                            }
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      )}
                      
                      {userRole === 'teacher' && slot.status === 'booked' && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Check className="h-4 w-4 text-green-500 mr-1" />
                          Booked
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Add Slot Dialog (Teacher Only) */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Free Slot</DialogTitle>
            <DialogDescription>
              Create a new free slot for students to book.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={newSlot.date}
                onChange={(e) => setNewSlot({...newSlot, date: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={newSlot.start_time}
                  onChange={(e) => setNewSlot({...newSlot, start_time: e.target.value})}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={newSlot.end_time}
                  onChange={(e) => setNewSlot({...newSlot, end_time: e.target.value})}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSlot}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Slot
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Book Slot Dialog (Student/Parent Only) */}
      <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book Class Slot</DialogTitle>
            <DialogDescription>
              Confirm booking this class slot.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedSlot && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <p className="font-medium text-gray-900">{formatDate(selectedSlot.date)}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <p className="font-medium text-gray-900">
                    {selectedSlot.start_time} - {selectedSlot.end_time}
                  </p>
                </div>
              </div>
            )}
            <p className="text-sm text-gray-600">
              Booking this slot will use 1 credit from your account. Are you sure you want to proceed?
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowBookDialog(false)
                setSelectedSlot(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBookSlot}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              Confirm Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}