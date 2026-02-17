// src/components/RecurringSlotModal.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertTriangle, Calendar,   X } from 'lucide-react'
import { toast } from 'sonner'

interface RecurringSlot {
  day_of_week: string
  start_time: string
  end_time: string
  subject?: string
  duration_minutes: number
}

interface ConflictInfo {
  type: string
  day_of_week: string
  time_range: string
  conflicting_slots: unknown[]
}

interface PreviewData {
  slots_to_create: number
  weeks: number
  start_date: string
  total_schedule_slots: number
  conflicts: ConflictInfo[]
  slot_details: (RecurringSlot & { dates: string[] })[]
}

interface RecurringSlotModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  existingSlot?: Partial<RecurringSlot> & { id?: string; duration_minutes?: number }
  mode: 'create' | 'edit' | 'delete'
}

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
]

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2)
  const minute = i % 2 === 0 ? '00' : '30'
  return `${hour.toString().padStart(2, '0')}:${minute}`
})

export default function RecurringSlotModal({
  isOpen,
  onClose,
  onSuccess,
  existingSlot,
  mode
}: RecurringSlotModalProps) {
  const [activeTab, setActiveTab] = useState('setup')
  const [slots, setSlots] = useState<RecurringSlot[]>([{
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
    subject: '',
    duration_minutes: 60
  }])
  const [weeks, setWeeks] = useState(4)
  const [startDate, setStartDate] = useState('')
  const [createTimeSlots, setCreateTimeSlots] = useState(true)
  const [createScheduleSlots, setCreateScheduleSlots] = useState(true)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Initialize start date to tomorrow
  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setStartDate(tomorrow.toISOString().split('T')[0])
  }, [])

  // Load existing slot data for edit mode
  useEffect(() => {
    if (existingSlot && mode === 'edit') {
      setSlots([{
        day_of_week: existingSlot.day_of_week || 'Monday',
        start_time: existingSlot.start_time || '09:00',
        end_time: existingSlot.end_time || '10:00',
        subject: existingSlot.subject || '',
        duration_minutes: existingSlot.duration_minutes || 60
      }])
    }
  }, [existingSlot, mode])

  const addSlot = () => {
    setSlots([...slots, {
      day_of_week: 'Monday',
      start_time: '09:00',
      end_time: '10:00',
      subject: '',
      duration_minutes: 60
    }])
  }

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index))
  }

  const updateSlot = (index: number, field: keyof RecurringSlot, value: unknown) => {
    const updatedSlots = [...slots]
    updatedSlots[index] = { ...updatedSlots[index], [field]: value }
    
    // Auto-calculate duration when times change
    if (field === 'start_time' || field === 'end_time') {
      const slot = updatedSlots[index]
      const start = new Date(`1970-01-01T${slot.start_time}:00`)
      const end = new Date(`1970-01-01T${slot.end_time}:00`)
      if (end > start) {
        updatedSlots[index].duration_minutes = (end.getTime() - start.getTime()) / (1000 * 60)
      }
    }
    
    setSlots(updatedSlots)
  }

  const generatePreview = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/timeslots/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slots,
          weeks,
          start_date: startDate,
          create_time_slots: createTimeSlots,
          create_schedule_slots: createScheduleSlots,
          preview_only: true
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate preview')
      }

      setPreview(data.preview)
      setActiveTab('preview')
    } catch (error) {
      console.error('Preview error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate preview')
    } finally {
      setIsLoading(false)
    }
  }

  const createRecurringSlots = async () => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/timeslots/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slots,
          weeks,
          start_date: startDate,
          create_time_slots: createTimeSlots,
          create_schedule_slots: createScheduleSlots,
          preview_only: false
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        if (data.code === 'RECURRING_CONFLICTS') {
          toast.error('Conflicts detected. Please review and resolve conflicts first.')
          return
        }
        throw new Error(data.error || 'Failed to create recurring slots')
      }

      toast.success(data.message)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Create error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create recurring slots')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteSeries = async () => {
    if (!existingSlot) return
    
    setIsCreating(true)
    try {
      const response = await fetch('/api/timeslots/recurring', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          time_slot_id: existingSlot.id,
          action: 'delete_series'
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete recurring series')
      }

      toast.success('Recurring series deleted successfully')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete recurring series')
    } finally {
      setIsCreating(false)
    }
  }

  const validateSlots = () => {
    for (const slot of slots) {
      const start = new Date(`1970-01-01T${slot.start_time}:00`)
      const end = new Date(`1970-01-01T${slot.end_time}:00`)
      if (start >= end) {
        toast.error(`Invalid time range for ${slot.day_of_week}: start time must be before end time`)
        return false
      }
    }
    return true
  }

  const getModalTitle = () => {
    switch (mode) {
      case 'create': return 'Create Recurring Time Slots'
      case 'edit': return 'Edit Recurring Series'
      case 'delete': return 'Delete Recurring Series'
      default: return 'Manage Recurring Slots'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {getModalTitle()}
          </DialogTitle>
        </DialogHeader>

        {mode === 'delete' ? (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will delete the recurring time slot template and all future available schedule slots.
                Booked slots will not be affected.
              </AlertDescription>
            </Alert>
            
            {existingSlot && (
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Slot to Delete:</h4>
                <p><strong>Day:</strong> {existingSlot.day_of_week}</p>
                <p><strong>Time:</strong> {existingSlot.start_time} - {existingSlot.end_time}</p>
                <p><strong>Subject:</strong> {existingSlot.subject || 'Not specified'}</p>
              </div>
            )}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="preview" disabled={!preview}>Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-6">
              {/* Time Slots Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Time Slots</h3>
                  <Button onClick={addSlot} variant="outline" size="sm">
                    Add Slot
                  </Button>
                </div>

                {slots.map((slot, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Slot {index + 1}</h4>
                      {slots.length > 1 && (
                        <Button
                          onClick={() => removeSlot(index)}
                          variant="ghost"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Day of Week</Label>
                        <Select
                          value={slot.day_of_week}
                          onValueChange={(value) => updateSlot(index, 'day_of_week', value)}
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
                        <Label>Start Time</Label>
                        <Select
                          value={slot.start_time}
                          onValueChange={(value) => updateSlot(index, 'start_time', value)}
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
                        <Label>End Time</Label>
                        <Select
                          value={slot.end_time}
                          onValueChange={(value) => updateSlot(index, 'end_time', value)}
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
                        <Label>Subject (Optional)</Label>
                        <Input
                          value={slot.subject || ''}
                          onChange={(e) => updateSlot(index, 'subject', e.target.value)}
                          placeholder="e.g., Math, Physics"
                        />
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Duration: {slot.duration_minutes} minutes
                    </div>
                  </div>
                ))}
              </div>

              {/* Recurrence Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Recurrence Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Number of Weeks</Label>
                    <Input
                      type="number"
                      min="1"
                      max="52"
                      value={weeks}
                      onChange={(e) => setWeeks(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Create Options</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="create-time-slots"
                          checked={createTimeSlots}
                          onCheckedChange={(checked) => setCreateTimeSlots(checked === true)}
                        />
                        <Label htmlFor="create-time-slots">Create time slot templates</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="create-schedule-slots"
                          checked={createScheduleSlots}
                          onCheckedChange={(checked) => setCreateScheduleSlots(checked === true)}
                        />
                        <Label htmlFor="create-schedule-slots">Create schedule slots</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-6">
              {preview && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg text-center">
                      <div className="text-2xl font-bold">{preview.slots_to_create}</div>
                      <div className="text-sm text-muted-foreground">Time Slots</div>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <div className="text-2xl font-bold">{preview.weeks}</div>
                      <div className="text-sm text-muted-foreground">Weeks</div>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <div className="text-2xl font-bold">{preview.total_schedule_slots}</div>
                      <div className="text-sm text-muted-foreground">Schedule Slots</div>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <div className={`text-2xl font-bold ${preview.conflicts.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {preview.conflicts.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Conflicts</div>
                    </div>
                  </div>

                  {/* Conflicts */}
                  {preview.conflicts.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-medium">Conflicts detected:</p>
                          {preview.conflicts.map((conflict, index) => (
                            <div key={index} className="text-sm">
                              • {conflict.day_of_week} {conflict.time_range} - {conflict.type}
                            </div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Slot Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Slot Details</h3>
                    {preview.slot_details.map((slot, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">
                            {slot.day_of_week} {slot.start_time} - {slot.end_time}
                          </h4>
                          <Badge variant="outline">
                            {slot.dates.length} occurrences
                          </Badge>
                        </div>
                        {slot.subject && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Subject: {slot.subject}
                          </p>
                        )}
                        <div className="text-sm text-muted-foreground">
                          Dates: {slot.dates.slice(0, 3).join(', ')}
                          {slot.dates.length > 3 && ` ... and ${slot.dates.length - 3} more`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          
          {mode === 'delete' ? (
            <Button
              onClick={handleDeleteSeries}
              disabled={isCreating}
              variant="destructive"
            >
              {isCreating ? 'Deleting...' : 'Delete Series'}
            </Button>
          ) : (
            <>
              {activeTab === 'setup' && (
                <Button
                  onClick={generatePreview}
                  disabled={isLoading || !validateSlots()}
                >
                  {isLoading ? 'Generating...' : 'Preview'}
                </Button>
              )}
              
              {activeTab === 'preview' && (
                <Button
                  onClick={createRecurringSlots}
                  disabled={isCreating || (preview?.conflicts.length || 0) > 0}
                >
                  {isCreating ? 'Creating...' : 'Create Slots'}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
