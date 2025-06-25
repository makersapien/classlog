// src/components/MyClassesView.tsx
// Enhanced version with modern UI and fixed layout

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Clock, Users, BookOpen, Calendar, Play, Square, Edit3, FileText, UserCheck, Upload, File, Download, Trash2, Image, FileIcon, ChevronDown, ChevronRight, AlertCircle, Sparkles, TrendingUp, Zap } from 'lucide-react'

interface ClassLog {
  id: string
  teacher_id: string
  date: string
  content: string
  topics_covered: string[] | null
  homework_assigned: string | null
  attendance_count: number
  total_students: number
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'in_progress'
  attachments: unknown
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

interface ClassFile {
  id: string
  class_log_id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  uploaded_by: string
  uploaded_by_role: string
  description: string | null
  is_homework: boolean
  created_at: string
  uploaded_by_name?: string
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

interface StatusConfig {
  color: string
  icon: React.ComponentType<{ className?: string }>
  text: string
  gradient: string
}

export default function MyClassesView({ teacherId }: MyClassesViewProps) {
  const [classLogs, setClassLogs] = useState<ClassLog[]>([])
  const [classFiles, setClassFiles] = useState<Record<string, ClassFile[]>>({})
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
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({})
  const [expandedClass, setExpandedClass] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fetchClassFiles = async (classLogId: string) => {
    try {
      const { data, error } = await supabase
        .from('class_files')
        .select(`
          *,
          uploaded_by_profile:profiles!uploaded_by(full_name)
        `)
        .eq('class_log_id', classLogId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching class files:', error)
        const { data: basicData, error: basicError } = await supabase
          .from('class_files')
          .select('*')
          .eq('class_log_id', classLogId)
          .order('created_at', { ascending: false })

        if (basicError) {
          console.error('Error with basic file query:', basicError)
          return
        }

        setClassFiles(prev => ({
          ...prev,
          [classLogId]: basicData || []
        }))
        return
      }

      const filesWithNames = (data || []).map(file => ({
        ...file,
        uploaded_by_name: file.uploaded_by_profile?.full_name || 'Unknown'
      }))

      setClassFiles(prev => ({
        ...prev,
        [classLogId]: filesWithNames
      }))
    } catch (error) {
      console.error('Error fetching class files:', error)
    }
  }

  const fetchClassLogs = useCallback(async () => {
    try {
      console.log('📚 Fetching class logs for teacher:', teacherId, 'date:', selectedDate)
      
      const { data, error } = await supabase
        .from('class_logs')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('date', selectedDate)
        .order('start_time', { ascending: false })

      if (error) {
        console.error('❌ Error fetching class logs:', error)
        throw error
      }

      console.log('✅ Found', data?.length || 0, 'class logs')
      const logs = (data as ClassLog[]) || []
      setClassLogs(logs)

      for (const log of logs) {
        await fetchClassFiles(log.id)
      }
    } catch (error) {
      console.error('Error fetching class logs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [teacherId, selectedDate])

  const fetchStats = useCallback(async () => {
    try {
      console.log('📊 Fetching stats for teacher:', teacherId)
      
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const { data: todayClasses } = await supabase
        .from('class_logs')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('date', today)
        .in('status', ['completed', 'ongoing', 'in_progress'])

      const { data: weekClasses } = await supabase
        .from('class_logs')
        .select('*')
        .eq('teacher_id', teacherId)
        .gte('date', weekAgo)
        .in('status', ['completed', 'ongoing', 'in_progress'])

      const { data: monthClasses } = await supabase
        .from('class_logs')
        .select('*')
        .eq('teacher_id', teacherId)
        .gte('date', monthAgo)
        .in('status', ['completed', 'ongoing', 'in_progress'])

      const { data: autoClasses } = await supabase
        .from('class_logs')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('detected_automatically', true)
        .gte('date', monthAgo)

      const typedMonthClasses = monthClasses as ClassLog[] | null
      const totalMinutes = typedMonthClasses?.reduce((sum, cls) => sum + (cls.duration_minutes || 0), 0) || 0

      const newStats = {
        today: todayClasses?.length || 0,
        thisWeek: weekClasses?.length || 0,
        thisMonth: typedMonthClasses?.length || 0,
        totalHours: Math.round(totalMinutes / 60 * 10) / 10,
        autoDetected: autoClasses?.length || 0
      }

      console.log('✅ Stats calculated:', newStats)
      setStats(newStats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [teacherId])

  useEffect(() => {
    if (teacherId) {
      console.log('🔄 Teacher ID changed, fetching data for:', teacherId)
      fetchClassLogs()
      fetchStats()
    }
  }, [teacherId, selectedDate, fetchClassLogs, fetchStats])

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
      await fetchClassLogs()
    } catch (error) {
      console.error('Error updating content:', error)
      setUploadError('Failed to update class content')
    }
  }

  const handleFileUpload = async (classLogId: string, files: FileList) => {
    if (!files || files.length === 0) return

    setUploadingFiles(prev => ({ ...prev, [classLogId]: true }))
    setUploadError(null)

    try {
      for (const file of Array.from(files)) {
        if (file.size > 50 * 1024 * 1024) {
          setUploadError(`File ${file.name} is too large. Maximum size is 50MB.`)
          continue
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const fileName = `${timestamp}_${file.name}`
        const filePath = `${classLogId}/${teacherId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('class-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          setUploadError(`Failed to upload ${file.name}: ${uploadError.message}`)
          continue
        }

        const { error: dbError } = await supabase
          .from('class_files')
          .insert({
            class_log_id: classLogId,
            teacher_id: teacherId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: teacherId,
            uploaded_by_role: 'teacher',
            description: null,
            is_homework: false
          })

        if (dbError) {
          console.error('Database error:', dbError)
          setUploadError(`Failed to save ${file.name} metadata: ${dbError.message}`)
          await supabase.storage.from('class-files').remove([filePath])
        }
      }

      await fetchClassFiles(classLogId)
    } catch (error) {
      console.error('Error uploading files:', error)
      setUploadError('Unexpected error during file upload')
    } finally {
      setUploadingFiles(prev => ({ ...prev, [classLogId]: false }))
    }
  }

  const downloadFile = async (file: ClassFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('class-files')
        .download(file.file_path)

      if (error) {
        console.error('Download error:', error)
        setUploadError(`Failed to download ${file.file_name}: ${error.message}`)
        return
      }

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading file:', error)
      setUploadError('Failed to download file')
    }
  }

  const deleteFile = async (file: ClassFile) => {
    if (!confirm(`Are you sure you want to delete &quot;${file.file_name}&quot;?`)) return

    try {
      const { error: storageError } = await supabase.storage
        .from('class-files')
        .remove([file.file_path])

      if (storageError) {
        console.error('Storage delete error:', storageError)
        setUploadError(`Failed to delete ${file.file_name}: ${storageError.message}`)
        return
      }

      const { error: dbError } = await supabase
        .from('class_files')
        .delete()
        .eq('id', file.id)

      if (dbError) {
        console.error('Database delete error:', dbError)
        setUploadError(`Failed to remove ${file.file_name} from database: ${dbError.message}`)
        return
      }

      await fetchClassFiles(file.class_log_id)
    } catch (error) {
      console.error('Error deleting file:', error)
      setUploadError('Failed to delete file')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image
    if (fileType === 'application/pdf') return FileText
    if (fileType.includes('word') || fileType.includes('document')) return FileText
    if (fileType.includes('sheet') || fileType.includes('excel')) return FileText
    return FileIcon
  }

  const formatTime = (timestamp: string | null): string => {
    if (!timestamp) return 'Not set'
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return 'Not calculated'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getStatusBadge = (classLog: ClassLog) => {
    const statusConfig: Record<ClassLog['status'], StatusConfig> = {
      'in_progress': { 
        color: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white', 
        icon: Play, 
        text: 'In Progress',
        gradient: 'from-green-100 to-emerald-100'
      },
      'ongoing': { 
        color: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white', 
        icon: Play, 
        text: 'Ongoing',
        gradient: 'from-green-100 to-emerald-100'
      },
      'completed': { 
        color: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white', 
        icon: Square, 
        text: 'Completed',
        gradient: 'from-blue-100 to-indigo-100'
      },
      'scheduled': { 
        color: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white', 
        icon: Calendar, 
        text: 'Scheduled',
        gradient: 'from-yellow-100 to-orange-100'
      },
      'cancelled': { 
        color: 'bg-gradient-to-r from-red-500 to-pink-600 text-white', 
        icon: Square, 
        text: 'Cancelled',
        gradient: 'from-red-100 to-pink-100'
      }
    }

    const config = statusConfig[classLog.status] || statusConfig.completed
    const IconComponent = config.icon

    return (
      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-md ${config.color}`}>
        <IconComponent className="w-3 h-3 mr-1.5" />
        {config.text}
      </span>
    )
  }

  const getCurrentDuration = (classLog: ClassLog): string => {
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
      <div className="flex items-center justify-center py-16">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200"></div>
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-emerald-600 absolute top-0 left-0"></div>
        </div>
        <span className="ml-3 text-gray-600 font-medium">Loading your classes...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20 min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50">
      {/* Header with proper spacing */}
      <div className="pt-4 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-emerald-800 bg-clip-text text-transparent">
                My Classes
              </h1>
              <p className="text-gray-600 flex items-center">
                <Sparkles className="w-4 h-4 mr-1" />
                Auto-detected and manual class logs
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border-2 border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Error Display */}
      {uploadError && (
        <div className="mx-4 sm:mx-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-4 flex items-start relative z-10 shadow-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-semibold">Upload Error</p>
            <p className="text-red-700 text-sm mt-1">{uploadError}</p>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="ml-auto text-red-500 hover:text-red-700 text-xl font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Enhanced Stats Cards */}
      <div className="px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-xl text-white transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Today</p>
                <p className="text-3xl font-bold">{stats.today}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-200" />
            </div>
            <div className="mt-2">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              <span className="text-xs text-blue-100">Classes completed</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl shadow-xl text-white transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">This Week</p>
                <p className="text-3xl font-bold">{stats.thisWeek}</p>
              </div>
              <Users className="w-8 h-8 text-green-200" />
            </div>
            <div className="mt-2">
              <Zap className="w-4 h-4 inline mr-1" />
              <span className="text-xs text-green-100">Weekly progress</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-xl text-white transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">This Month</p>
                <p className="text-3xl font-bold">{stats.thisMonth}</p>
              </div>
              <BookOpen className="w-8 h-8 text-purple-200" />
            </div>
            <div className="mt-2">
              <Sparkles className="w-4 h-4 inline mr-1" />
              <span className="text-xs text-purple-100">Monthly total</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-2xl shadow-xl text-white transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Total Hours</p>
                <p className="text-3xl font-bold">{stats.totalHours}h</p>
              </div>
              <Clock className="w-8 h-8 text-orange-200" />
            </div>
            <div className="mt-2">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              <span className="text-xs text-orange-100">Time invested</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-6 rounded-2xl shadow-xl text-white transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-sm font-medium">Auto-Detected</p>
                <p className="text-3xl font-bold">{stats.autoDetected}</p>
              </div>
              <UserCheck className="w-8 h-8 text-teal-200" />
            </div>
            <div className="mt-2">
              <Zap className="w-4 h-4 inline mr-1" />
              <span className="text-xs text-teal-100">Smart tracking</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Class Logs */}
      <div className="px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden backdrop-blur-sm">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-6 text-white">
            <h2 className="text-xl font-bold flex items-center">
              <Calendar className="w-6 h-6 mr-3" />
              Classes for {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h2>
          </div>

          {classLogs.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-12 h-12 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No classes found for this date</h3>
              <p className="text-gray-500 mb-6">Classes will appear here automatically when detected</p>
              {selectedDate === new Date().toISOString().split('T')[0] && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 max-w-md mx-auto border-2 border-emerald-200">
                  <div className="flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6 text-emerald-600 mr-2" />
                    <span className="font-semibold text-emerald-800">Pro Tip</span>
                  </div>
                  <p className="text-emerald-700 text-sm">
                    Start a Google Meet with the URL from your enrollments to see auto-detection in action!
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {classLogs.map((classLog) => (
                <div key={classLog.id} className="p-6 hover:bg-gradient-to-r hover:from-gray-50 hover:to-emerald-50 transition-all duration-200">
                  <div className="space-y-6">
                    {/* Enhanced Class Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <h3 className="text-xl font-bold text-gray-900">
                            {classLog.student_name || 'Class Session'}
                          </h3>
                          {getStatusBadge(classLog)}
                          {classLog.detected_automatically && (
                            <span className="text-xs font-semibold text-emerald-700 bg-gradient-to-r from-emerald-100 to-teal-100 px-3 py-1.5 rounded-full border border-emerald-200">
                              🤖 Auto-detected
                            </span>
                          )}
                        </div>
                        
                        {/* Enhanced Class Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
                            <span className="font-semibold text-blue-800">Start:</span><br />
                            <span className="text-blue-700">{formatTime(classLog.start_time)}</span>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-200">
                            <span className="font-semibold text-purple-800">End:</span><br />
                            <span className="text-purple-700">{formatTime(classLog.end_time)}</span>
                          </div>
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                            <span className="font-semibold text-green-800">Duration:</span><br />
                            <span className="text-green-700">{getCurrentDuration(classLog)}</span>
                          </div>
                          <div className="bg-gradient-to-br from-orange-50 to-red-50 p-3 rounded-lg border border-orange-200">
                            <span className="font-semibold text-orange-800">Attendance:</span><br />
                            <span className="text-orange-700">{classLog.attendance_count}/{classLog.total_students}</span>
                          </div>
                          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-3 rounded-lg border border-teal-200">
                            <span className="font-semibold text-teal-800">Status:</span><br />
                            <span className="text-teal-700 capitalize">{classLog.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Class Content */}
                    <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-900 flex items-center text-lg">
                          <FileText className="w-5 h-5 mr-2 text-emerald-600" />
                          Class Content
                        </h4>
                        <div className="flex items-center space-x-3">
                          {/* Enhanced File Upload */}
                          <label className="cursor-pointer group">
                            <input
                              type="file"
                              multiple
                              accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                              onChange={(e) => e.target.files && handleFileUpload(classLog.id, e.target.files)}
                              className="hidden"
                            />
                            <div className="flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl hover:from-emerald-600 hover:to-teal-700 shadow-lg transform group-hover:scale-105 transition-all duration-200">
                              {uploadingFiles[classLog.id] ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              <span className="ml-2">Upload Files</span>
                            </div>
                          </label>

                          {/* Enhanced Edit Content Button */}
                          <button
                            onClick={() => {
                              if (editingContent === classLog.id) {
                                setEditingContent(null)
                                setContentText('')
                              } else {
                                setEditingContent(classLog.id)
                                setContentText(classLog.content || '')
                              }
                            }}
                            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 shadow-lg transform hover:scale-105 transition-all duration-200"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span className="ml-2">
                              {editingContent === classLog.id ? 'Cancel' : 'Edit'}
                            </span>
                          </button>

                          {/* Enhanced Expand/Collapse Button */}
                          <button
                            onClick={() => setExpandedClass(expandedClass === classLog.id ? null : classLog.id)}
                            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl hover:from-gray-200 hover:to-gray-300 shadow-lg transform hover:scale-105 transition-all duration-200"
                          >
                            {expandedClass === classLog.id ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <span className="ml-2">Files ({classFiles[classLog.id]?.length || 0})</span>
                          </button>
                        </div>
                      </div>

                      {/* Enhanced Content Display/Edit */}
                      {editingContent === classLog.id ? (
                        <div className="space-y-4">
                          <textarea
                            value={contentText}
                            onChange={(e) => setContentText(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200 bg-white shadow-inner"
                            rows={5}
                            placeholder="Add class notes, topics covered, homework assigned..."
                          />
                          <div className="flex justify-end space-x-3">
                            <button
                              onClick={() => {
                                setEditingContent(null)
                                setContentText('')
                              }}
                              className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => updateClassContent(classLog.id, contentText)}
                              className="px-6 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 shadow-lg transition-all duration-200"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-gray-200 shadow-inner">
                          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {classLog.content || (
                              <span className="text-gray-500 italic flex items-center">
                                <Sparkles className="w-4 h-4 mr-2" />
                                No content added yet. Click &ldquo;Edit&rdquo; to add class notes.
                              </span>
                            )}
                          </p>
                        </div>
                      )}

                      {/* Enhanced Files Section */}
                      {expandedClass === classLog.id && (
                        <div className="mt-6 border-t-2 border-gray-200 pt-6">
                          <h5 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
                            <File className="w-5 h-5 mr-2 text-purple-600" />
                            Class Files ({classFiles[classLog.id]?.length || 0})
                          </h5>
                          
                          {classFiles[classLog.id] && classFiles[classLog.id].length > 0 ? (
                            <div className="grid gap-4">
                              {classFiles[classLog.id].map((file) => {
                                const FileIconComponent = getFileIcon(file.file_type)
                                return (
                                  <div key={file.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50 border-2 border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                                    <div className="flex items-center space-x-4">
                                      <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                                        <FileIconComponent className="w-8 h-8 text-purple-600" />
                                      </div>
                                      <div>
                                        <p className="font-semibold text-gray-900">{file.file_name}</p>
                                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                                          <span className="bg-gray-100 px-2 py-1 rounded-full">{formatFileSize(file.file_size)}</span>
                                          <span>Uploaded by {file.uploaded_by_name || 'Unknown'}</span>
                                          <span>{new Date(file.created_at).toLocaleDateString()}</span>
                                        </div>
                                        {file.description && (
                                          <p className="text-sm text-gray-600 mt-1 italic">{file.description}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => downloadFile(file)}
                                        className="p-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:scale-110"
                                        title="Download file"
                                      >
                                        <Download className="w-5 h-5" />
                                      </button>
                                      {file.uploaded_by === teacherId && (
                                        <button
                                          onClick={() => deleteFile(file)}
                                          className="p-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200 hover:scale-110"
                                          title="Delete file"
                                        >
                                          <Trash2 className="w-5 h-5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
                              <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                <File className="w-8 h-8 text-gray-500" />
                              </div>
                              <p className="text-gray-600 font-medium mb-1">No files uploaded yet</p>
                              <p className="text-gray-500 text-sm">Click &ldquo;Upload Files&rdquo; to add class materials</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Enhanced Topics and Homework */}
                    {(classLog.topics_covered && classLog.topics_covered.length > 0) || classLog.homework_assigned ? (
                      <div className="grid md:grid-cols-2 gap-6">
                        {classLog.topics_covered && classLog.topics_covered.length > 0 && (
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200">
                            <h5 className="font-bold text-green-800 mb-3 flex items-center">
                              <BookOpen className="w-5 h-5 mr-2" />
                              Topics Covered
                            </h5>
                            <ul className="space-y-2">
                              {classLog.topics_covered.map((topic, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                  <span className="text-green-700">{topic}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {classLog.homework_assigned && (
                          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl border-2 border-yellow-300">
                            <h5 className="font-bold text-yellow-800 mb-3 flex items-center">
                              <FileText className="w-5 h-5 mr-2" />
                              Homework Assigned
                            </h5>
                            <div className="bg-white/70 backdrop-blur-sm p-4 rounded-lg border border-yellow-200">
                              <p className="text-yellow-800 leading-relaxed">
                                {classLog.homework_assigned}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Enhanced Google Meet Link */}
                    {classLog.google_meet_link && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-500 rounded-lg">
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <span className="font-semibold text-blue-800">Google Meet:</span>
                            <a
                              href={classLog.google_meet_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-blue-600 hover:text-blue-800 underline font-medium truncate"
                            >
                              Join Meeting
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom spacing to prevent overlap with fixed elements */}
      <div className="h-20"></div>
    </div>
  )
}