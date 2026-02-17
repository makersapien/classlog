// src/components/BulkActionsModal.tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Calendar, Link, Trash2 } from 'lucide-react'

interface BulkActionsModalProps {
  isOpen: boolean
  onClose: () => void
  onClearWeek: () => void
  onGenerateShareLink: () => void
  weekStart: Date
  weekEnd: Date
  totalSlots: number
  availableSlots: number
  assignedSlots: number
  bookedSlots: number
  isProcessing: boolean
  shareLink?: string
}

export default function BulkActionsModal({
  isOpen,
  onClose,
  onClearWeek,
  onGenerateShareLink,
  weekStart,
  weekEnd,
  totalSlots,
  availableSlots,
  assignedSlots,
  bookedSlots,
  isProcessing,
  shareLink
}: BulkActionsModalProps) {
  const [showClearConfirmation, setShowClearConfirmation] = useState(false)

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleClearWeek = () => {
    if (showClearConfirmation) {
      onClearWeek()
      setShowClearConfirmation(false)
    } else {
      setShowClearConfirmation(true)
    }
  }

  const copyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Week Actions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Week Summary */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm font-medium text-gray-900 mb-2">
              Week of {formatDate(weekStart)} - {formatDate(weekEnd)}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-gray-100">
                  {totalSlots} Total
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {availableSlots} Available
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {assignedSlots} Assigned
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {bookedSlots} Booked
                </Badge>
              </div>
            </div>
          </div>

          {/* Share Link Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Student Booking Link</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerateShareLink}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                <Link className="h-4 w-4" />
                {shareLink ? 'Regenerate' : 'Generate'} Link
              </Button>
            </div>
            
            {shareLink && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs text-blue-700 mb-2">
                  Share this link with students so they can book available slots:
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 text-xs bg-white border border-blue-300 rounded px-2 py-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyShareLink}
                    className="text-blue-600 border-blue-300"
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Clear Week Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">Clear All Slots</h4>
            
            {!showClearConfirmation ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Remove all time slots for this week. This action cannot be undone.
                </p>
                <Button
                  variant="outline"
                  onClick={handleClearWeek}
                  disabled={isProcessing || totalSlots === 0}
                  className="w-full flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Week ({totalSlots} slots)
                </Button>
              </div>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="space-y-2">
                    <p className="font-medium">Are you sure?</p>
                    <p className="text-sm">
                      This will permanently delete all {totalSlots} time slots for this week, including:
                    </p>
                    <ul className="text-sm list-disc list-inside space-y-1">
                      {availableSlots > 0 && <li>{availableSlots} available slots</li>}
                      {assignedSlots > 0 && <li>{assignedSlots} assigned slots (students will be notified)</li>}
                      {bookedSlots > 0 && <li>{bookedSlots} booked slots (students will be notified)</li>}
                    </ul>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowClearConfirmation(false)}
                        disabled={isProcessing}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleClearWeek}
                        disabled={isProcessing}
                        className="flex items-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                            Clearing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-3 w-3" />
                            Yes, Clear All
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}