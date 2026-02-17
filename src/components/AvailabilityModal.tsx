// src/components/AvailabilityModal.tsx
'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { 
  Plus, 
  Trash2, 
  Clock, 
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface AvailabilityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacherId: string
  onAvailabilityUpdated: () => void
  prefilledData?: {
    selectedDays: string[]
    startTime: string
    endTime: string
    dragSelection?: string[]
  } | null
}

interface TimeSlot {
  id?: string
  day_of_week: string
  start_time: string
  end_time: string
  subject?: string
  is_recurring: boolean
  is_available: boolean
  duration_minutes: number
}

interface RecurringSlotData {
  day_of_week: string
  start_time: string
  end_time: string
  subject?: string
  duration_minutes: number
}

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
]

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0')
  return [`${hour}:00`, `${hour}:30`]
}).flat()

export default function AvailabilityModal({ 
  open, 
  onOpenChange, 
   
  onAvailabilityUpdated,
  prefilledData 
}: AvailabilityModalProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'recurring'>('single')
  const [loading, setLoading] = useState(false)
  const [existingSlots, setExistingSlots] = useState<TimeSlot[]>([])
  
  // Single slot form
  const [singleSlot, setSingleSlot] = useState<TimeSlot>({
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
    subject: '',
    is_recurring: false,
    is_available: true,
    duration_minutes: 60
  })
  
  // Recurring slots form
  const [recurringSlots, setRecurringSlots] = useState<RecurringSlotData[]>([])
  const [recurringWeeks, setRecurringWeeks] = useState(4)
  const [startDate, setStartDate] = useState('')
  
  const { toast } = useToast()

  // Handle prefilled data from drag selection
  useEffect(() => {
    if (prefilledData && open) {
      if (prefilledData.selectedDays.length === 1) {
        // Single day selection - use single slot tab
        setActiveTab('single')
        setSingleSlot(prev => ({
          ...prev,
          day_of_week: prefilledData.selectedDays[0],
          start_time: prefilledData.startTime,
          end_time: prefilledData.endTime,
          duration_minutes: calculateDurationMinutes(prefilledData.startTime, prefilledData.endTime)
        }))
      } else {
        // Multiple days - use recurring slots
        setActiveTab('recurring')
        const newRecurringSlots = prefilledData.selectedDays.map(day => ({
          day_of_week: day,
          start_time: prefilledData.startTime,
          end_time: prefilledData.endTime,
          subject: '',
          duration_minutes: calculateDurationMinutes(prefilledData.startTime, prefilledData.endTime)
        }))
        setRecurringSlots(newRecurringSlots)
      }
      
      toast({
        title: "Drag Selection Applied",
        description: `Pre-filled availability for ${prefilledData.selectedDays.length} day(s) from ${prefilledData.startTime} to ${prefilledData.endTime}`,
        duration: 3000,
      })
    }
  }, [prefilledData, open, toast])

  // Helper function to calculate duration for prefilled data
  const calculateDurationMinutes = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    return endMinutes - startMinutes
  }

  // Load existing time slots
  useEffect(() => {
    if (open) {
      fetchExistingSlots()
      // Set default start date to tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setStartDate(tomorrow.toISOString().split('T')[0])
    }
  }, [open])

  const fetchExistingSlots = async () => {
    try {
      const response = await fetch('/api/timeslots')
      if (response.ok) {
        const data = await response.json()
        setExistingSlots(data.time_slots || [])
      }
    } catch (error) {
      console.error('Failed to fetch existing slots:', error)
    }
  }

  // Calculate duration when times change
  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(`1970-01-01T${startTime}:00`)
    const end = new Date(`1970-01-01T${endTime}:00`)
    return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60))
  }

  // Update single slot duration
  const updateSingleSlotTimes = (field: 'start_time' | 'end_time', value: string) => {
    const updated = { ...singleSlot, [field]: value }
    updated.duration_minutes = calculateDuration(updated.start_time, updated.end_time)
    setSingleSlot(updated)
  }

  // Add recurring slot
  const addRecurringSlot = () => {
    setRecurringSlots([...recurringSlots, {
      day_of_week: 'Monday',
      start_time: '09:00',
      end_time: '10:00',
      subject: '',
      duration_minutes: 60
    }])
  }

  // Remove recurring slot
  const removeRecurringSlot = (index: number) => {
    setRecurringSlots(recurringSlots.filter((_, i) => i !== index))
  }

  // Update recurring slot
  const updateRecurringSlot = (index: number, field: keyof RecurringSlotData, value: string | number) => {
    const updated = [...recurringSlots]
    updated[index] = { ...updated[index], [field]: value }
    
    if (field === 'start_time' || field === 'end_time') {
      updated[index].duration_minutes = calculateDuration(
        updated[index].start_time, 
        updated[index].end_time
      )
    }
    
    setRecurringSlots(updated)
  }

  // Check for conflicts
  const checkConflicts = (newSlot: { day_of_week: string; start_time: string; end_time: string }) => {
    return existingSlots.some(existing => {
      if (existing.day_of_week !== newSlot.day_of_week) return false
      
      const existingStart = new Date(`1970-01-01T${existing.start_time}:00`)
      const existingEnd = new Date(`1970-01-01T${existing.end_time}:00`)
      const newStart = new Date(`1970-01-01T${newSlot.start_time}:00`)
      const newEnd = new Date(`1970-01-01T${newSlot.end_time}:00`)
      
      return (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      )
    })
  }

  // Create single time slot
  const createSingleSlot = async () => {
    if (singleSlot.start_time >= singleSlot.end_time) {
      toast({
        title: "Invalid Time Range",
        description: "Start time must be before end time",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    if (checkConflicts(singleSlot)) {
      toast({
        title: "Time Conflict",
        description: "This time slot conflicts with existing availability",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/timeslots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(singleSlot)
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Time slot created successfully",
          duration: 3000,
        })
        await fetchExistingSlots()
        onAvailabilityUpdated()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create time slot')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create time slot',
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  // Create recurring slots
  const createRecurringSlots = async () => {
    if (recurringSlots.length === 0) {
      toast({
        title: "No Slots",
        description: "Please add at least one recurring slot",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    // Validate all slots
    for (const slot of recurringSlots) {
      if (slot.start_time >= slot.end_time) {
        toast({
          title: "Invalid Time Range",
          description: `Invalid time range for ${slot.day_of_week}`,
          variant: "destructive",
          duration: 3000,
        })
        return
      }

      if (checkConflicts(slot)) {
        toast({
          title: "Time Conflict",
          description: `Time conflict detected for ${slot.day_of_week} ${slot.start_time}-${slot.end_time}`,
          variant: "destructive",
          duration: 3000,
        })
        return
      }
    }

    try {
      setLoading(true)
      const response = await fetch('/api/timeslots/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slots: recurringSlots,
          weeks: recurringWeeks,
          start_date: startDate,
          create_time_slots: true,
          create_schedule_slots: true
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Success",
          description: `Created ${result.results.time_slots_created} time slots and ${result.results.schedule_slots_created} schedule slots`,
          duration: 5000,
        })
        await fetchExistingSlots()
        onAvailabilityUpdated()
        setRecurringSlots([])
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create recurring slots')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create recurring slots',
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  // Delete existing slot
  const deleteSlot = async (slotId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/timeslots/${slotId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Time slot deleted successfully",
          duration: 3000,
        })
        await fetchExistingSlots()
        onAvailabilityUpdated()
      } else {
        const error = await response.json()
        if (error.code === 'HAS_RELATED_SLOTS') {
          // Ask for confirmation
          if (confirm(`This time slot has ${error.related_slots.length} related schedule slots. Delete anyway?`)) {
            const forceResponse = await fetch(`/api/timeslots/${slotId}?force=true`, {
              method: 'DELETE'
            })
            if (forceResponse.ok) {
              toast({
                title: "Success",
                description: "Time slot and related slots deleted successfully",
                duration: 3000,
              })
              await fetchExistingSlots()
              onAvailabilityUpdated()
            }
          }
        } else {
          throw new Error(error.error || 'Failed to delete time slot')
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete time slot',
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            Manage Availability
          </DialogTitle>
          <DialogDescription>
            Create time slots for students to book classes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'single'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Single Slot
            </button>
            <button
              onClick={() => setActiveTab('recurring')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'recurring'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Recurring Slots
            </button>
          </div>

          {/* Single Slot Tab */}
          {activeTab === 'single' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="day">Day of Week</Label>
                  <Select
                    value={singleSlot.day_of_week}
                    onValueChange={(value) => setSingleSlot({ ...singleSlot, day_of_week: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(day => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subject">Subject (Optional)</Label>
                  <Input
                    id="subject"
                    value={singleSlot.subject || ''}
                    onChange={(e) => setSingleSlot({ ...singleSlot, subject: e.target.value })}
                    placeholder="e.g., Mathematics"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="start-time">Start Time</Label>
                  <Select
                    value={singleSlot.start_time}
                    onValueChange={(value) => updateSingleSlotTimes('start_time', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="end-time">End Time</Label>
                  <Select
                    value={singleSlot.end_time}
                    onValueChange={(value) => updateSingleSlotTimes('end_time', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration</Label>
                  <div className="flex items-center h-10 px-3 border rounded-md bg-gray-50">
                    <Clock className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm">{singleSlot.duration_minutes} min</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={createSingleSlot}
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Time Slot
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Recurring Slots Tab */}
          {activeTab === 'recurring' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weeks">Number of Weeks</Label>
                  <Select
                    value={recurringWeeks.toString()}
                    onValueChange={(value) => setRecurringWeeks(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 weeks</SelectItem>
                      <SelectItem value="4">4 weeks (1 month)</SelectItem>
                      <SelectItem value="8">8 weeks (2 months)</SelectItem>
                      <SelectItem value="12">12 weeks (3 months)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Recurring Time Slots</h4>
                  <Button
                    onClick={addRecurringSlot}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Slot
                  </Button>
                </div>

                {recurringSlots.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No recurring slots added yet</p>
                    <p className="text-sm">Click &quot;Add Slot&quot; to create your first recurring time slot</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recurringSlots.map((slot, index) => (
                      <div key={index} className="p-4 border rounded-lg bg-gray-50">
                        <div className="grid grid-cols-5 gap-3 items-end">
                          <div>
                            <Label className="text-xs">Day</Label>
                            <Select
                              value={slot.day_of_week}
                              onValueChange={(value) => updateRecurringSlot(index, 'day_of_week', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DAYS_OF_WEEK.map(day => (
                                  <SelectItem key={day} value={day}>{day.slice(0, 3)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Start</Label>
                            <Select
                              value={slot.start_time}
                              onValueChange={(value) => updateRecurringSlot(index, 'start_time', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.map(time => (
                                  <SelectItem key={time} value={time}>{time}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">End</Label>
                            <Select
                              value={slot.end_time}
                              onValueChange={(value) => updateRecurringSlot(index, 'end_time', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.map(time => (
                                  <SelectItem key={time} value={time}>{time}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Subject</Label>
                            <Input
                              value={slot.subject || ''}
                              onChange={(e) => updateRecurringSlot(index, 'subject', e.target.value)}
                              placeholder="Subject"
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Button
                              onClick={() => removeRecurringSlot(index)}
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-600">
                          Duration: {slot.duration_minutes} minutes
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {recurringSlots.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Preview</p>
                        <p className="text-sm text-blue-700">
                          This will create {recurringSlots.length * recurringWeeks} schedule slots 
                          ({recurringSlots.length} slots × {recurringWeeks} weeks)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {recurringSlots.length > 0 && (
                  <Button
                    onClick={createRecurringSlots}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating Recurring Slots...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Create {recurringSlots.length * recurringWeeks} Schedule Slots
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Existing Slots */}
          {existingSlots.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Existing Time Slots ({existingSlots.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {existingSlots.map(slot => (
                  <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <div>
                      <div className="font-medium text-sm">
                        {slot.day_of_week} {slot.start_time}-{slot.end_time}
                      </div>
                      {slot.subject && (
                        <div className="text-xs text-gray-600">{slot.subject}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={slot.is_available ? "default" : "secondary"} className="text-xs">
                          {slot.is_available ? 'Available' : 'Unavailable'}
                        </Badge>
                        {slot.is_recurring && (
                          <Badge variant="outline" className="text-xs">Recurring</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => slot.id && deleteSlot(slot.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
