// src/components/WaitlistModal.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, ArrowDown, ArrowUp, Bell, Calendar, CheckCircle, Clock, Timer, Users, X, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface WaitlistEntry {
  id: string
  teacher_id: string
  student_id: string
  schedule_slot_id?: string
  time_slot_id?: string
  preferred_date?: string
  day_of_week?: string
  start_time: string
  end_time: string
  priority: number
  status: 'waiting' | 'notified' | 'expired' | 'fulfilled'
  created_at: string
  expires_at?: string
  notified_at?: string
  fulfilled_at?: string
  notes?: string
  position?: number
  estimated_wait_time?: number
  estimated_available_date?: string
  student?: {
    id: string
    full_name: string
    email: string
  }
  teacher?: {
    id: string
    full_name: string
    email: string
  }
}

interface WaitlistModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  teacherId?: string
  studentId?: string
  shareToken?: string
  mode: 'teacher' | 'student'
}

const STATUS_COLORS = {
  waiting: 'bg-yellow-100 text-yellow-800',
  notified: 'bg-blue-100 text-blue-800',
  expired: 'bg-gray-100 text-gray-800',
  fulfilled: 'bg-green-100 text-green-800'
}

const STATUS_ICONS = {
  waiting: Clock,
  notified: Bell,
  expired: X,
  fulfilled: CheckCircle
}

export default function WaitlistModal({
  isOpen,
  onClose,
  onUpdate,
  teacherId,
  studentId,
  shareToken,
  mode
}: WaitlistModalProps) {
  const [activeTab, setActiveTab] = useState('current')
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState('')
  const [extendHours, setExtendHours] = useState(24)
  const [showQueueActions, setShowQueueActions] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchWaitlistEntries()
    }
  }, [isOpen, teacherId, studentId, shareToken])

  const fetchWaitlistEntries = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (shareToken) params.append('share_token', shareToken)
      if (teacherId) params.append('teacher_id', teacherId)
      if (studentId) params.append('student_id', studentId)
      params.append('status', activeTab === 'current' ? 'waiting' : 'all')

      // Try queue API first, fallback to waitlist API
      let response = await fetch(`/api/timeslots/queue?${params}`)
      let data = await response.json()

      if (!response.ok) {
        // Fallback to waitlist API
        response = await fetch(`/api/timeslots/waitlist?${params}`)
        data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch waitlist')
        }
      }

      setWaitlistEntries(data.queue_entries || data.waitlist_entries || [])
    } catch (error) {
      console.error('Fetch waitlist error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch waitlist')
    } finally {
      setIsLoading(false)
    }
  }

  const handleWaitlistAction = async (
    entryId: string,
    action: 'notify' | 'fulfill' | 'remove' | 'extend' | 'promote' | 'demote' | 'auto_book'
  ) => {
    setIsUpdating(true)
    try {
      // Use queue API for queue-specific actions, waitlist API for others
      const isQueueAction = ['promote', 'demote', 'auto_book'].includes(action)
      const apiEndpoint = isQueueAction ? '/api/timeslots/queue' : '/api/timeslots/waitlist'
      
      const requestBody: unknown = {
        [isQueueAction ? 'queue_id' : 'waitlist_id']: entryId,
        action,
        notification_message: notificationMessage || undefined,
        extend_hours: action === 'extend' ? extendHours : undefined
      }

      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} waitlist entry`)
      }

      toast.success(data.message)
      fetchWaitlistEntries()
      onUpdate()
      setSelectedEntry(null)
      setShowQueueActions(false)
    } catch (error) {
      console.error(`${action} error:`, error)
      toast.error(error instanceof Error ? error.message : `Failed to ${action} waitlist entry`)
    } finally {
      setIsUpdating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeUntilExpiry = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffMs = expiry.getTime() - now.getTime()
    
    if (diffMs <= 0) return 'Expired'
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m remaining`
    } else {
      return `${diffMinutes}m remaining`
    }
  }

  const currentEntries = waitlistEntries.filter(entry => entry.status === 'waiting' || entry.status === 'notified')
  const historyEntries = waitlistEntries.filter(entry => entry.status === 'expired' || entry.status === 'fulfilled')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {mode === 'teacher' ? 'Manage Waitlists' : 'My Waitlist Entries'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">
              Current ({currentEntries.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              History ({historyEntries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading waitlist...</p>
              </div>
            ) : currentEntries.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No current waitlist entries</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentEntries.map((entry) => {
                  const StatusIcon = STATUS_ICONS[entry.status]
                  
                  return (
                    <Card key={entry.id} className="relative">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <StatusIcon className="h-5 w-5" />
                            <div>
                              <div className="flex items-center gap-2">
                                {entry.day_of_week && (
                                  <span>{entry.day_of_week}</span>
                                )}
                                <span>{entry.start_time} - {entry.end_time}</span>
                                {entry.preferred_date && (
                                  <Badge variant="outline">{entry.preferred_date}</Badge>
                                )}
                              </div>
                              {mode === 'teacher' && entry.student && (
                                <p className="text-sm text-muted-foreground">
                                  {entry.student.full_name} ({entry.student.email})
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {entry.position && (
                              <Badge variant="secondary">
                                #{entry.position} in line
                              </Badge>
                            )}
                            <Badge className={STATUS_COLORS[entry.status]}>
                              {entry.status}
                            </Badge>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Created:</span>
                            <span className="ml-2">{formatDate(entry.created_at)}</span>
                          </div>
                          {entry.expires_at && (
                            <div>
                              <span className="text-muted-foreground">Expires:</span>
                              <span className="ml-2">{getTimeUntilExpiry(entry.expires_at)}</span>
                            </div>
                          )}
                          {entry.estimated_wait_time && (
                            <div>
                              <span className="text-muted-foreground">Est. Wait:</span>
                              <span className="ml-2">{Math.round(entry.estimated_wait_time)} hours</span>
                            </div>
                          )}
                          {entry.estimated_available_date && (
                            <div>
                              <span className="text-muted-foreground">Est. Available:</span>
                              <span className="ml-2">{entry.estimated_available_date}</span>
                            </div>
                          )}
                        </div>

                        {entry.notes && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Notes:</span>
                            <p className="mt-1 p-2 bg-muted rounded">{entry.notes}</p>
                          </div>
                        )}

                        {entry.status === 'notified' && (
                          <Alert>
                            <Bell className="h-4 w-4" />
                            <AlertDescription>
                              Student has been notified about an available slot.
                              {entry.expires_at && (
                                <span className="block mt-1">
                                  Response deadline: {getTimeUntilExpiry(entry.expires_at)}
                                </span>
                              )}
                            </AlertDescription>
                          </Alert>
                        )}

                        {mode === 'teacher' && (
                          <div className="space-y-2 pt-2">
                            <div className="flex gap-2">
                              {entry.status === 'waiting' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleWaitlistAction(entry.id, 'notify')}
                                    disabled={isUpdating}
                                  >
                                    <Bell className="h-3 w-3 mr-1" />
                                    Notify
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleWaitlistAction(entry.id, 'auto_book')}
                                    disabled={isUpdating}
                                  >
                                    <Zap className="h-3 w-3 mr-1" />
                                    Auto Book
                                  </Button>
                                </>
                              )}
                              
                              {entry.status === 'notified' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleWaitlistAction(entry.id, 'fulfill')}
                                    disabled={isUpdating}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Mark Fulfilled
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleWaitlistAction(entry.id, 'extend')}
                                    disabled={isUpdating}
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    Extend
                                  </Button>
                                </>
                              )}
                              
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleWaitlistAction(entry.id, 'remove')}
                                disabled={isUpdating}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Remove
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowQueueActions(!showQueueActions)}
                              >
                                <Timer className="h-3 w-3 mr-1" />
                                Queue
                              </Button>
                            </div>

                            {showQueueActions && (
                              <div className="flex gap-2 p-2 bg-muted rounded-lg">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleWaitlistAction(entry.id, 'promote')}
                                  disabled={isUpdating}
                                >
                                  <ArrowUp className="h-3 w-3 mr-1" />
                                  Promote
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleWaitlistAction(entry.id, 'demote')}
                                  disabled={isUpdating}
                                >
                                  <ArrowDown className="h-3 w-3 mr-1" />
                                  Demote
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {mode === 'student' && entry.status === 'notified' && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              A slot is now available! Please book it soon as this notification will expire.
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading history...</p>
              </div>
            ) : historyEntries.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No waitlist history</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historyEntries.map((entry) => {
                  const StatusIcon = STATUS_ICONS[entry.status]
                  
                  return (
                    <Card key={entry.id} className="opacity-75">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <StatusIcon className="h-5 w-5" />
                            <div>
                              <div className="flex items-center gap-2">
                                {entry.day_of_week && (
                                  <span>{entry.day_of_week}</span>
                                )}
                                <span>{entry.start_time} - {entry.end_time}</span>
                                {entry.preferred_date && (
                                  <Badge variant="outline">{entry.preferred_date}</Badge>
                                )}
                              </div>
                              {mode === 'teacher' && entry.student && (
                                <p className="text-sm text-muted-foreground">
                                  {entry.student.full_name}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge className={STATUS_COLORS[entry.status]}>
                            {entry.status}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Created:</span>
                            <span className="ml-2">{formatDate(entry.created_at)}</span>
                          </div>
                          {entry.fulfilled_at && (
                            <div>
                              <span className="text-muted-foreground">Fulfilled:</span>
                              <span className="ml-2">{formatDate(entry.fulfilled_at)}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Dialog for Teacher */}
        {selectedEntry && mode === 'teacher' && (
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-medium">Manage Waitlist Entry</h3>
            
            <div className="space-y-3">
              <div>
                <Label>Notification Message (Optional)</Label>
                <Textarea
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Custom message to include in notification..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Extend Hours</Label>
                <Select
                  value={extendHours.toString()}
                  onValueChange={(value) => setExtendHours(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                    <SelectItem value="72">72 hours</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}