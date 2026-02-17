// src/components/SlotCreationModal.tsx
'use client'

import React from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Check, Clock, X } from 'lucide-react'

interface SlotCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  slotsToCreate: Array<{
    date: string
    startTime: string
    endTime: string
  }>
  isCreating: boolean
}

export default function SlotCreationModal({
  isOpen,
  onClose,
  onConfirm,
  slotsToCreate,
  isCreating
}: SlotCreationModalProps) {
  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    })
  }

  // Group slots by date for better display
  const groupedSlots = slotsToCreate.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = []
    }
    acc[slot.date].push(slot)
    return acc
  }, {} as Record<string, typeof slotsToCreate>)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Create Available Time Slots
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {slotsToCreate.length} slot(s) selected
            </Badge>
            <span className="text-sm text-gray-600">
              These slots will be marked as available for student booking
            </span>
          </div>

          {/* Slots grouped by date */}
          <div className="space-y-3">
            {Object.entries(groupedSlots).map(([date, slots]) => (
              <div key={date} className="border rounded-lg p-3 bg-gray-50">
                <div className="font-medium text-sm text-gray-900 mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(date)}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {slots.map((slot, index) => (
                    <div 
                      key={index}
                      className="bg-white border border-green-200 rounded p-2 text-center"
                    >
                      <div className="flex items-center justify-center gap-1 text-xs text-green-700">
                        <Clock className="h-3 w-3" />
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-800">
              <strong>What happens next:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>These time slots will be marked as &quot;Available&quot; (green)</li>
                <li>Students can book these slots through the booking system</li>
                <li>You can assign specific slots to students if needed</li>
                <li>You can modify or delete these slots later</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isCreating}
            className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Create {slotsToCreate.length} Slot{slotsToCreate.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
