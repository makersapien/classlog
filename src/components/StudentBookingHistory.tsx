'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface BookingHistoryItem {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  booked_at: string
  cancelled_at?: string
  completed_at?: string
  notes?: string
  class_log?: {
    id: string
    duration_minutes: number
    topics_covered: string[]
    homework_assigned?: string
  }
}

interface StudentBookingHistoryProps {
  studentId: string
  teacherId: string
}

export default function StudentBookingHistory({ studentId, teacherId }: StudentBookingHistoryProps) {
  const [bookings, setBookings] = useState<BookingHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBookingHistory()
  }, [studentId, teacherId])

  const fetchBookingHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/booking/history?student_id=${studentId}&teacher_id=${teacherId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch booking history')
      }

      const data = await response.json()
      setBookings(data.bookings || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booking history')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-yellow-100 text-yellow-800'
      case 'no_show':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'confirmed':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-yellow-600" />
      case 'no_show':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Booking History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Booking History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
            <Button onClick={fetchBookingHistory} size="sm" className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Booking History
        </CardTitle>
        <CardDescription>
          {bookings.length} total bookings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No bookings yet</p>
            <p className="text-sm">This student hasn't made any bookings through the booking system.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {bookings.map((booking) => (
              <div key={booking.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(booking.status)}
                    <span className="font-medium">
                      {formatDate(booking.booking_date)}
                    </span>
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                  </div>

                  {booking.class_log && (
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Duration: {booking.class_log.duration_minutes} minutes</div>
                      {booking.class_log.topics_covered.length > 0 && (
                        <div>Topics: {booking.class_log.topics_covered.join(', ')}</div>
                      )}
                      {booking.class_log.homework_assigned && (
                        <div>Homework: {booking.class_log.homework_assigned}</div>
                      )}
                    </div>
                  )}

                  {booking.notes && (
                    <div className="text-xs text-gray-500 mt-1">
                      Note: {booking.notes}
                    </div>
                  )}
                </div>

                <div className="text-right text-xs text-gray-500">
                  <div>Booked</div>
                  <div>{formatDate(booking.booked_at)}</div>
                  {booking.completed_at && (
                    <>
                      <div className="mt-1">Completed</div>
                      <div>{formatDate(booking.completed_at)}</div>
                    </>
                  )}
                  {booking.cancelled_at && (
                    <>
                      <div className="mt-1">Cancelled</div>
                      <div>{formatDate(booking.cancelled_at)}</div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}