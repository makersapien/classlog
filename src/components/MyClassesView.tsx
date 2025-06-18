// src/components/MyClassesView.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Clock, Users, BookOpen, Calendar, Play, Square, Edit3, FileText, UserCheck } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ClassLog {
  id: string
  teacher_id: string
  date: string
  content: string
  topics_covered: string[] | null
  homework_assigned: string | null
  attendance_count: number
  total_students: number
  status: string
  attachments: any
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  google_meet_link: string | null
  detected_automatically: boolean
  student_name: string | null
  student_email: string | null
  created_at: string
  updated_at: string
}

interface Stats {
  today: number
  thisWeek: number
  thisMonth: number
  totalHours: number
  autoDetected: number
}

interface MyClassesViewProps {
  teacherId: string
}

export default function MyClassesView({ teacherId }: MyClassesViewProps) {
  const [classLogs, setClassLogs] = useState<ClassLog[]>([])
  const [stats, setStats] = useState<Stats>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    totalHours: 0,
    autoDetected: 0
  })
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [isLoading, setIsLoading] = useState(true)
  const [editingContent, setEditingContent] = useState<string | null>(null)
  const [contentText, setContentText] = useState('')

  useEffect(() => {
    if (teacherId) {
      fetchClassLogs()
      fetchStats()
    }
  }, [teacherId, selectedDate])

  const fetchClassLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('class_logs')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('date', selectedDate)
        .order('start_time', { ascending: false })

      if (error) throw error
      setClassLogs(data || [])
    } catch (error) {
      console.error('Error fetching class logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Today's classes
      const { data: todayClasses } = await supabase
        .from('class_logs')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('date', today)
        .in('status', ['completed', 'ongoing', 'in_progress'])

      // This week's classes
      const { data: weekClasses } = await supabase
        .from('class_logs')
        .select('*')
        .eq('teacher_id', teacherId)
        .gte('date', weekAgo)
        .in('status', ['completed', 'ongoing', 'in_progress'])

      // This month's classes
      const { data: monthClasses } = await supabase
        .from('class_logs')
        .select('*')
        .eq('teacher_id', teacherId)
        .gte('date', monthAgo)
        .in('status', ['completed', 'ongoing', 'in_progress'])

      // Auto-detected classes this month
      const { data: autoClasses } = await supabase
        .from('class_logs')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('detected_automatically', true)
        .gte('date', monthAgo)

      const totalMinutes = monthClasses?.reduce((sum, cls) => sum + (cls.duration_minutes || 0), 0) || 0

      setStats({
        today: todayClasses?.length || 0,
        thisWeek: weekClasses?.length || 0,
        thisMonth: monthClasses?.length || 0,
        totalHours: Math.round(totalMinutes / 60 * 10) / 10,
        autoDetected: autoClasses?.length || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const updateClassContent = async (classId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('class_logs')
        .update({ 
          content: content,
          updated_at: new Date().toISOString()
        })
        .eq('id', classId)

      if (error) throw error
      
      setEditingContent(null)
      setContentText('')
      fetchClassLogs() // Refresh the list
    } catch (error) {
      console.error('Error updating content:', error)
    }
  }

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'Not set'
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'Not calculated'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getStatusBadge = (classLog: ClassLog) => {
    const statusConfig = {
      'in_progress': { 
        color: 'bg-green-100 text-green-800', 
        icon: Play, 
        text: 'In Progress' 
      },
      'ongoing': { 
        color: 'bg-green-100 text-green-800', 
        icon: Play, 
        text: 'Ongoing' 
      },
      'completed': { 
        color: 'bg-blue-100 text-blue-800', 
        icon: Square, 
        text: 'Completed' 
      },
      'scheduled': { 
        color: 'bg-yellow-100 text-yellow-800', 
        icon: Calendar, 
        text: 'Scheduled' 
      },
      'cancelled': { 
        color: 'bg-red-100 text-red-800', 
        icon: Square, 
        text: 'Cancelled' 
      }
    }

    const config = statusConfig[classLog.status as keyof typeof statusConfig] || statusConfig.completed
    const IconComponent = config.icon

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    )
  }

  const getCurrentDuration = (classLog: ClassLog) => {
    if (classLog.status === 'in_progress' && classLog.start_time) {
      const now = new Date()
      const startTime = new Date(classLog.start_time)
      const currentMinutes = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60))
      return formatDuration(currentMinutes)
    }
    return formatDuration(classLog.duration_minutes)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
          <p className="text-gray-600">Class logs with auto-detection and manual entries</p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalHours}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <UserCheck className="w-8 h-8 text-indigo-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Auto-Detected</p>
              <p className="text-2xl font-bold text-gray-900">{stats.autoDetected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Class Logs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">
            Classes for {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h2>
        </div>

        {classLogs.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No classes found for this date</p>
            <p className="text-sm text-gray-400">Classes will appear here automatically when detected</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {classLogs.map((classLog) => (
              <div key={classLog.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {classLog.student_name || 'Class Session'}
                      </h3>
                      {getStatusBadge(classLog)}
                      {classLog.detected_automatically && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          🤖 Auto-detected
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <span className="font-medium">Start:</span> {formatTime(classLog.start_time)}
                      </div>
                      <div>
                        <span className="font-medium">End:</span> {formatTime(classLog.end_time)}
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span> {getCurrentDuration(classLog)}
                      </div>
                      <div>
                        <span className="font-medium">Attendance:</span> {classLog.attendance_count}/{classLog.total_students}
                      </div>
                      <div>
                        <span className="font-medium">Status:</span> {classLog.status}
                      </div>
                    </div>

                    {/* Class Content */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 flex items-center">
                          <FileText className="w-4 h-4 mr-2" />
                          Class Content
                        </h4>
                        {editingContent !== classLog.id && (
                          <button
                            onClick={() => {
                              setEditingContent(classLog.id)
                              setContentText(classLog.content || '')
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {editingContent === classLog.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={contentText}
                            onChange={(e) => setContentText(e.target.value)}
                            placeholder="Describe what was covered in this class..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={4}
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => updateClassContent(classLog.id, contentText)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingContent(null)
                                setContentText('')
                              }}
                              className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-700">
                            {classLog.content || 'No content added yet'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Additional Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {classLog.topics_covered && classLog.topics_covered.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-700">Topics Covered:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {classLog.topics_covered.map((topic, index) => (
                              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {classLog.homework_assigned && (
                        <div>
                          <span className="font-medium text-gray-700">Homework:</span>
                          <p className="text-gray-600 mt-1">{classLog.homework_assigned}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 text-xs text-gray-400">
                      Created: {new Date(classLog.created_at).toLocaleString()} • 
                      Updated: {new Date(classLog.updated_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}