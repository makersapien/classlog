'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Users, TrendingUp, CheckCircle, XCircle, AlertCircle, BarChart3 } from 'lucide-react'

interface BookingAnalytics {
  period: {
    start_date: string
    end_date: string
  }
  summary: {
    total_bookings: number
    completed_bookings: number
    cancelled_bookings: number
    no_show_bookings: number
    total_hours: number
    utilization_rate: number
  }
  booking_vs_actual: Array<{
    booking_id: string
    booking_date: string
    booking_start: string
    booking_end: string
    actual_start?: string
    actual_end?: string
    actual_duration?: number
    student_name: string
    student_email: string
    status: string
    matched: boolean
    time_difference_minutes?: number
  }>
  monthly_trends: Array<{
    month: string
    total_bookings: number
    completed_bookings: number
    cancelled_bookings: number
    no_show_bookings: number
  }>
  student_statistics: Array<{
    student_id: string
    student_name: string
    student_email: string
    total_bookings: number
    completed_bookings: number
    cancelled_bookings: number
    no_show_bookings: number
    total_hours: number
  }>
  time_slot_popularity: Array<{
    time_slot: string
    day_of_week: string
    booking_count: number
    completion_rate: number
  }>
}

interface BookingAnalyticsDashboardProps {
  teacherId: string
}

export default function BookingAnalyticsDashboard({ teacherId }: BookingAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<BookingAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d')

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const endDate = new Date()
      const startDate = new Date()
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(endDate.getDate() - 90)
          break
      }

      const params = new URLSearchParams({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      })

      const response = await fetch(`/api/booking/analytics?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const data = await response.json()
      setAnalytics(data.analytics)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [teacherId, dateRange])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Booking Analytics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Booking Analytics</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-medium">Failed to load analytics</p>
              <p className="text-sm text-gray-600 mt-2">{error}</p>
              <Button onClick={fetchAnalytics} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-yellow-100 text-yellow-800'
      case 'no_show':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Booking Analytics</h2>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(range)}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.total_bookings}</div>
            <p className="text-xs text-muted-foreground">
              {formatDate(analytics.period.start_date)} - {formatDate(analytics.period.end_date)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Classes</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.summary.completed_bookings}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.summary.utilization_rate}% utilization rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(analytics.summary.total_hours * 10) / 10}h</div>
            <p className="text-xs text-muted-foreground">
              From completed classes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No Shows</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics.summary.no_show_bookings}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.summary.cancelled_bookings} cancelled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Booking vs Actual Classes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Booking vs Actual Classes
          </CardTitle>
          <CardDescription>
            Correlation between booked slots and actual class sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.booking_vs_actual.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No booking data available for this period</p>
            ) : (
              <div className="space-y-3">
                {analytics.booking_vs_actual.slice(0, 10).map((booking) => (
                  <div key={booking.booking_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{booking.student_name}</span>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                        {booking.matched && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Matched
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatDate(booking.booking_date)} • {formatTime(booking.booking_start)} - {formatTime(booking.booking_end)}
                      </div>
                      {booking.matched && booking.time_difference_minutes !== undefined && (
                        <div className="text-xs text-gray-500 mt-1">
                          Class started {Math.abs(booking.time_difference_minutes)} minutes {booking.time_difference_minutes >= 0 ? 'after' : 'before'} scheduled time
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {booking.actual_duration && (
                        <div className="text-sm font-medium">{booking.actual_duration}min</div>
                      )}
                      {booking.matched ? (
                        <CheckCircle className="h-4 w-4 text-green-600 ml-auto mt-1" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 ml-auto mt-1" />
                      )}
                    </div>
                  </div>
                ))}
                {analytics.booking_vs_actual.length > 10 && (
                  <p className="text-center text-sm text-gray-500">
                    Showing 10 of {analytics.booking_vs_actual.length} bookings
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Student Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Statistics
            </CardTitle>
            <CardDescription>
              Booking patterns by student
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.student_statistics.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No student data available</p>
              ) : (
                analytics.student_statistics.slice(0, 5).map((student) => (
                  <div key={student.student_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{student.student_name}</div>
                      <div className="text-sm text-gray-600">
                        {student.total_bookings} bookings • {Math.round(student.total_hours * 10) / 10}h completed
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        <span className="text-green-600">{student.completed_bookings}</span> / 
                        <span className="text-red-600 ml-1">{student.no_show_bookings}</span>
                      </div>
                      <div className="text-xs text-gray-500">completed / no-show</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Popular Time Slots
            </CardTitle>
            <CardDescription>
              Most booked time slots and completion rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.time_slot_popularity.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No time slot data available</p>
              ) : (
                analytics.time_slot_popularity.map((slot, index) => (
                  <div key={`${slot.time_slot}-${slot.day_of_week}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{formatTime(slot.time_slot)}</div>
                      <div className="text-sm text-gray-600">{slot.day_of_week.trim()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{slot.booking_count} bookings</div>
                      <div className="text-xs text-gray-500">{slot.completion_rate}% completion</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}