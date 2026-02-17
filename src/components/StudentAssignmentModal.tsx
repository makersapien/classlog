// src/components/StudentAssignmentModal.tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { AlertCircle, Calendar, Check, Clock, User } from 'lucide-react'

interface ScheduleSlot {
  id: string
  date: string
  start_time: string
  end_time: string
  subject?: string
  status: string
}

interface StudentInfo {
  id: string
  name: string
  email?: string
  theme: string
}

interface StudentAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  slots: ScheduleSlot[]
  students: StudentInfo[]
  onAssign: (studentId: string, expiryHours: number, notes?: string) => Promise<void>
}

export default function StudentAssignmentModal({
  isOpen,
  onClose,
  slots,
  students,
  onAssign
}: StudentAssignmentModalProps) {
  const [selectedStudent, setSelectedStudent] = useState('')
  const [expiryHours, setExpiryHours] = useState(24)
  const [notes, setNotes] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)

  const { toast } = useToast()

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    })
  }

  const handleAssign = async () => {
    if (!selectedStudent) {
      toast({
        title: "Error",
        description: "Please select a student to assign the slots to.",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    setIsAssigning(true)
    try {
      await onAssign(selectedStudent, expiryHours, notes)
      
      // Reset form
      setSelectedStudent('')
      setNotes('')
      setExpiryHours(24)
      onClose()
      
      toast({
        title: "Success",
        description: `Successfully assigned ${slots.length} slot(s) to student!`,
        duration: 5000,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign slots",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const selectedStudentInfo = students.find(s => s.id === selectedStudent)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600" />
            Assign Slots to Student
          </DialogTitle>
          <DialogDescription>
            Assign the selected time slots to a student. They will receive a notification to confirm or decline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selected Slots Summary */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Selected Slots ({slots.length})
            </Label>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {slots.map(slot => (
                <div key={slot.id} className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      {formatDate(slot.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700">
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Student Selection */}
          <div className="space-y-2">
            <Label htmlFor="student-select" className="text-sm font-medium text-gray-700">
              Select Student
            </Label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger id="student-select">
                <SelectValue placeholder="Choose a student to assign these slots to..." />
              </SelectTrigger>
              <SelectContent>
                {students.map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-${student.theme}-500`}></div>
                      {student.name}
                      {student.email && (
                        <span className="text-xs text-gray-500">({student.email})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignment Expiry */}
          <div className="space-y-2">
            <Label htmlFor="expiry-select" className="text-sm font-medium text-gray-700">
              Assignment Expires In
            </Label>
            <Select value={expiryHours.toString()} onValueChange={(value) => setExpiryHours(parseInt(value))}>
              <SelectTrigger id="expiry-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Hour</SelectItem>
                <SelectItem value="6">6 Hours</SelectItem>
                <SelectItem value="12">12 Hours</SelectItem>
                <SelectItem value="24">24 Hours (Default)</SelectItem>
                <SelectItem value="48">48 Hours</SelectItem>
                <SelectItem value="72">72 Hours</SelectItem>
                <SelectItem value="168">1 Week</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              The student will have this much time to confirm or decline the assignment.
            </p>
          </div>

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes for the student..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Assignment Preview */}
          {selectedStudentInfo && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-800">
                    Assignment Preview
                  </p>
                  <p className="text-sm text-blue-700">
                    <strong>{selectedStudentInfo.name}</strong> will be assigned <strong>{slots.length} slot(s)</strong> and will have <strong>{expiryHours} hour(s)</strong> to respond.
                  </p>
                  {notes && (
                    <p className="text-sm text-blue-600">
                      <strong>Notes:</strong> {notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isAssigning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedStudent || isAssigning}
            className="bg-green-600 hover:bg-green-700"
          >
            {isAssigning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Assigning...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Assign Slots
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
