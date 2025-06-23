'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { BookOpen, Users, Clock, DollarSign, TrendingUp, Calendar, Plus, FileText, User, Send, BarChart3, Sparkles, Zap, Star, Target, Award, Shield, Chrome, Key, Smartphone } from 'lucide-react'
import ExtensionTokenManager from '@/components/ExtensionTokenManager'

interface TeacherDashboardProps {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface DashboardStats {
  classesScheduled?: number
  classesCompleted?: number
  classesToday?: number
  totalClasses?: number
  totalStudents?: number
  studentsPresent?: number
  attendanceToday?: number
  pendingPayments?: number
  totalRevenue?: number
}

interface ClassData {
  id: string
  name: string
  subject: string
  grade: string
  schedule: any
  max_students: number
  fees_per_month: number
  status: string
  enrollments?: any[]
}

interface TodayScheduleItem {
  id: string
  date: string
  content: string
  topics_covered: string[]
  homework_assigned: string
  attendance_count: number
  total_students: number
  status: string
  classes: {
    name: string
    subject: string
    grade: string
  }
}

interface DashboardData {
  stats: DashboardStats
  classes: ClassData[]
  todaySchedule: TodayScheduleItem[]
  recentMessages: any[]
  upcomingPayments: any[]
}

interface StudentData {
  id: string
  name: string
  grade: string
  subject: string
  lastClass: string
  status: string
  paymentStatus: string
}

export default function TeacherDashboard({ user }: TeacherDashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('today')
  const [newClassDialog, setNewClassDialog] = useState(false)
  const [newLogDialog, setNewLogDialog] = useState(false)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form states for new class
  const [newClassData, setNewClassData] = useState({
    subject: '',
    grade: '',
    startTime: '',
    endTime: '',
    maxStudents: 25,
    fees: 2500
  })

  useEffect(() => {
    fetchDashboardData()
  }, [selectedTimeframe])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/dashboard?role=teacher')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Convert real data to format expected by existing UI
  const transformClassesToSchedule = (classes: ClassData[], todaySchedule: TodayScheduleItem[]) => {
    return classes.map(cls => {
      const todayLog = todaySchedule.find(log => log.classes?.name === cls.name)
      const schedule = cls.schedule || {}
      const timeStr = schedule.start_time && schedule.end_time 
        ? `${schedule.start_time} - ${schedule.end_time}`
        : 'Time TBD'
      
      return {
        id: parseInt(cls.id.slice(-6), 16), // Convert UUID to number for existing logic
        subject: cls.subject,
        grade: cls.grade || 'Grade TBD',
        time: timeStr,
        students: cls.enrollments?.filter(e => e.status === 'active').length || 0,
        status: todayLog ? 'completed' : 'upcoming',
        attendance: todayLog ? todayLog.attendance_count : null
      }
    })
  }

  const transformClassesToStudents = (classes: ClassData[]): StudentData[] => {
    const students: StudentData[] = []
    
    classes.forEach(cls => {
      cls.enrollments?.forEach(enrollment => {
        if (enrollment.status === 'active' && enrollment.profiles && enrollment.profiles.full_name) {
          students.push({
            id: enrollment.student_id,
            name: enrollment.profiles.full_name || 'Unknown Student',
            grade: cls.grade || 'Grade TBD',
            subject: cls.subject,
            lastClass: 'Today', // Simplified for now
            status: 'active',
            paymentStatus: Math.random() > 0.3 ? 'paid' : 'pending' // Mock payment status
          })
        }
      })
    })
    
    return students.slice(0, 10) // Limit to 10 for display
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
      case 'upcoming': return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
      case 'cancelled': return 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
      case 'pending': return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
      case 'overdue': return 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg'
    }
  }

  const handleCreateClass = async () => {
    // TODO: Implement API call to create new class
    console.log('Creating new class:', newClassData)
    setNewClassDialog(false)
    // Refresh data after creating
    await fetchDashboardData()
  }

  const handleCreateLog = async () => {
    // TODO: Implement API call to create class log
    console.log('Creating new log')
    setNewLogDialog(false)
    // Refresh data after creating
    await fetchDashboardData()
  }

  // Loading state with enhanced design
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 pt-6">
        <div className="space-y-8 px-4 sm:px-6">
          <div className="animate-pulse space-y-8">
            <div className="h-16 bg-gradient-to-r from-emerald-200 to-teal-200 rounded-2xl w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-8 rounded-2xl shadow-xl">
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
            <div className="h-96 bg-white rounded-2xl shadow-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  // Error state with enhanced design
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 pt-6">
        <div className="space-y-6 px-4 sm:px-6">
          <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-2xl p-8 shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-white/20 rounded-full">
                <span className="text-3xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Error Loading Dashboard</h3>
                <p className="mt-2 opacity-90">{error}</p>
                <Button 
                  onClick={fetchDashboardData}
                  className="mt-4 bg-white text-red-600 hover:bg-red-50 font-semibold"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Use real data or fallback to mock data with proper defaults
  const todayStats = {
    classesScheduled: data?.stats?.totalClasses || 4,
    classesCompleted: data?.stats?.classesToday || 2,
    classesToday: data?.stats?.classesToday || 2,
    totalClasses: data?.stats?.totalClasses || 4,
    studentsPresent: data?.stats?.attendanceToday || 24,
    totalStudents: data?.stats?.totalStudents || 28,
    attendanceToday: data?.stats?.attendanceToday || 24,
    pendingPayments: data?.stats?.pendingPayments || 3,
    totalRevenue: data?.stats?.totalRevenue || 12500
  }

  const recentClasses = data && data.classes && data.todaySchedule ? 
    transformClassesToSchedule(data.classes, data.todaySchedule) : [
    {
      id: 1,
      subject: 'Mathematics',
      grade: 'Grade 10',
      time: '9:00 AM - 10:00 AM',
      students: 8,
      status: 'completed',
      attendance: 7
    },
    {
      id: 2,
      subject: 'Physics',
      grade: 'Grade 12',
      time: '10:30 AM - 11:30 AM',
      students: 6,
      status: 'completed',
      attendance: 6
    }
  ]

  const recentStudents = data?.classes && Array.isArray(data.classes) ? 
    transformClassesToStudents(data.classes) : [
    {
      id: '1',
      name: 'Arjun Patel',
      grade: 'Grade 10',
      subject: 'Mathematics',
      lastClass: '2 hours ago',
      status: 'active',
      paymentStatus: 'paid'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      <div className="space-y-8 pt-6 pb-20 px-4 sm:px-6">
        {/* Enhanced Header with proper spacing */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-6 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-emerald-800 bg-clip-text text-transparent">
                Welcome back, {user.name}! 👋
              </h1>
              <p className="text-lg text-gray-600 mt-2 flex items-center">
                <Star className="w-5 h-5 mr-2 text-yellow-500" />
                Here's what's happening with your classes today
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-40 border-2 border-emerald-200 rounded-xl bg-white shadow-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Enhanced Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 font-medium mb-1">Classes Today</p>
                  <p className="text-3xl font-bold">
                    {todayStats.classesToday}/{todayStats.totalClasses}
                  </p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    <span className="text-xs text-blue-100">Classes completed</span>
                  </div>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <Progress 
                  value={todayStats.totalClasses && todayStats.totalClasses > 0 ? (todayStats.classesToday! / todayStats.totalClasses) * 100 : 0} 
                  className="bg-blue-400/30"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 font-medium mb-1">Students Present</p>
                  <p className="text-3xl font-bold">
                    {todayStats.attendanceToday}/{todayStats.totalStudents}
                  </p>
                  <div className="flex items-center mt-2">
                    <Users className="w-4 h-4 mr-1" />
                    <span className="text-xs text-emerald-100">Today's attendance</span>
                  </div>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Users className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <Progress 
                  value={todayStats.totalStudents && todayStats.totalStudents > 0 ? (todayStats.attendanceToday! / todayStats.totalStudents) * 100 : 0} 
                  className="bg-emerald-400/30"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-0 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 font-medium mb-1">Pending Payments</p>
                  <p className="text-3xl font-bold">
                    {todayStats.pendingPayments}
                  </p>
                  <div className="flex items-center mt-2">
                    <Target className="w-4 h-4 mr-1" />
                    <span className="text-xs text-orange-100">Needs attention</span>
                  </div>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 font-medium mb-1">Revenue</p>
                  <p className="text-3xl font-bold">
                    ₹{todayStats.totalRevenue?.toLocaleString()}
                  </p>
                  <div className="flex items-center mt-2">
                    <Award className="w-4 h-4 mr-1" />
                    <span className="text-xs text-purple-100">Monthly earnings</span>
                  </div>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Main Content Tabs */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <Tabs defaultValue="overview" className="w-full">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
              <TabsList className="grid w-full grid-cols-5 bg-white/20 backdrop-blur-sm rounded-xl">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 text-white font-semibold"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="classes"
                  className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 text-white font-semibold"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Classes
                </TabsTrigger>
                <TabsTrigger 
                  value="students"
                  className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 text-white font-semibold"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Students
                </TabsTrigger>
                <TabsTrigger 
                  value="extension"
                  className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 text-white font-semibold"
                >
                  <Chrome className="w-4 h-4 mr-2" />
                  Extension
                </TabsTrigger>
                <TabsTrigger 
                  value="quick-actions"
                  className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 text-white font-semibold"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Quick Actions
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Enhanced Today's Schedule */}
                <Card className="border-2 border-gradient-to-r from-blue-200 to-indigo-200 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                    <CardTitle className="flex items-center space-x-3 text-xl">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                        Today's Schedule
                      </span>
                    </CardTitle>
                    <CardDescription className="text-blue-600 font-medium">Your classes for today</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    {data?.todaySchedule && data.todaySchedule.length > 0 ? (
                      data.todaySchedule.map((schedule) => (
                        <div key={schedule.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-blue-50 border-2 border-blue-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-bold text-gray-900">{schedule.classes?.name || 'Unnamed Class'}</h4>
                              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                                {schedule.classes?.grade || 'Grade TBD'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 font-medium mb-1">{schedule.classes?.subject || 'Subject TBD'}</p>
                            <p className="text-xs text-gray-600">
                              {schedule.attendance_count || 0}/{schedule.total_students || 0} students attended
                            </p>
                            {schedule.topics_covered && schedule.topics_covered.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {schedule.topics_covered.slice(0, 2).map((topic, index) => (
                                  <span key={index} className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                                    {topic}
                                  </span>
                                ))}
                                {schedule.topics_covered.length > 2 && (
                                  <span className="text-xs text-gray-500 font-medium">+{schedule.topics_covered.length - 2} more</span>
                                )}
                              </div>
                            )}
                          </div>
                          <Badge className={getStatusColor(schedule.status)}>
                            {schedule.status}
                          </Badge>
                        </div>
                      ))
                    ) : recentClasses.map((cls) => (
                      <div key={cls.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-blue-50 border-2 border-blue-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-bold text-gray-900">{cls.subject}</h4>
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                              {cls.grade}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 font-medium mb-1">{cls.time}</p>
                          <p className="text-xs text-gray-600">
                            {cls.students} students enrolled
                            {cls.attendance && ` • ${cls.attendance} attended`}
                          </p>
                        </div>
                        <Badge className={getStatusColor(cls.status)}>
                          {cls.status}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Enhanced Recent Activity */}
                <Card className="border-2 border-gradient-to-r from-emerald-200 to-teal-200 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-lg">
                    <CardTitle className="flex items-center space-x-3 text-xl">
                      <div className="p-2 bg-emerald-500 rounded-lg">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                        Recent Activity
                      </span>
                    </CardTitle>
                    <CardDescription className="text-emerald-600 font-medium">Latest updates from your classes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    <div className="space-y-4">
                      {data?.todaySchedule && data.todaySchedule.length > 0 ? (
                        data.todaySchedule.map((schedule, index) => (
                        <div key={schedule.id} className="flex items-start space-x-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200 shadow-sm">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full mt-2 shadow-md"></div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">
                              {schedule.classes?.name || 'Class'} class completed
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {schedule.classes?.grade || 'Grade TBD'} • {schedule.attendance_count || 0}/{schedule.total_students || 0} students attended • Today
                            </p>
                          </div>
                        </div>
                                        )) 
                      ) : (
                        <>
                          <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mt-2 shadow-md"></div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-gray-900">
                                Physics class completed
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                Grade 12 • 6/6 students attended • 1 hour ago
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 shadow-sm">
                            <div className="w-3 h-3 bg-green-500 rounded-full mt-2 shadow-md"></div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-gray-900">
                                Payment received from Arjun Patel
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                ₹2,500 • Mathematics • 2 hours ago
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200 shadow-sm">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full mt-2 shadow-md"></div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-gray-900">
                                New message from parent
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                Priya's mother • About homework • 3 hours ago
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="classes" className="p-6 space-y-6">
              <Card className="border-2 border-purple-200 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-3 text-xl">
                        <div className="p-2 bg-purple-500 rounded-lg">
                          <BookOpen className="h-5 w-5 text-white" />
                        </div>
                        <span className="bg-gradient-to-r from-purple-700 to-pink-700 bg-clip-text text-transparent">
                          My Classes
                        </span>
                      </CardTitle>
                      <CardDescription className="text-purple-600 font-medium">Manage your class schedule and logs</CardDescription>
                    </div>
                    <Dialog open={newClassDialog} onOpenChange={setNewClassDialog}>
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200">
                          <Plus className="mr-2 h-4 w-4" />
                          New Class
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-2xl bg-gradient-to-r from-purple-700 to-pink-700 bg-clip-text text-transparent">
                            Create New Class
                          </DialogTitle>
                          <DialogDescription className="text-gray-600">
                            Add a new class to your schedule
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="subject" className="font-semibold text-gray-700">Subject</Label>
                              <Input 
                                id="subject" 
                                placeholder="e.g., Mathematics"
                                value={newClassData.subject}
                                onChange={(e) => setNewClassData({...newClassData, subject: e.target.value})}
                                className="border-2 border-gray-200 rounded-xl focus:border-purple-500"
                              />
                            </div>
                            <div>
                              <Label htmlFor="grade" className="font-semibold text-gray-700">Grade</Label>
                              <Select 
                                value={newClassData.grade} 
                                onValueChange={(value) => setNewClassData({...newClassData, grade: value})}
                              >
                                <SelectTrigger className="border-2 border-gray-200 rounded-xl focus:border-purple-500">
                                  <SelectValue placeholder="Select grade" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Grade 9">Grade 9</SelectItem>
                                  <SelectItem value="Grade 10">Grade 10</SelectItem>
                                  <SelectItem value="Grade 11">Grade 11</SelectItem>
                                  <SelectItem value="Grade 12">Grade 12</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="start-time" className="font-semibold text-gray-700">Start Time</Label>
                              <Input 
                                id="start-time" 
                                type="time"
                                value={newClassData.startTime}
                                onChange={(e) => setNewClassData({...newClassData, startTime: e.target.value})}
                                className="border-2 border-gray-200 rounded-xl focus:border-purple-500"
                              />
                            </div>
                            <div>
                              <Label htmlFor="end-time" className="font-semibold text-gray-700">End Time</Label>
                              <Input 
                                id="end-time" 
                                type="time"
                                value={newClassData.endTime}
                                onChange={(e) => setNewClassData({...newClassData, endTime: e.target.value})}
                                className="border-2 border-gray-200 rounded-xl focus:border-purple-500"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="max-students" className="font-semibold text-gray-700">Max Students</Label>
                              <Input 
                                id="max-students" 
                                type="number"
                                value={newClassData.maxStudents}
                                onChange={(e) => setNewClassData({...newClassData, maxStudents: parseInt(e.target.value)})}
                                className="border-2 border-gray-200 rounded-xl focus:border-purple-500"
                              />
                            </div>
                            <div>
                              <Label htmlFor="fees" className="font-semibold text-gray-700">Monthly Fees (₹)</Label>
                              <Input 
                                id="fees" 
                                type="number"
                                value={newClassData.fees}
                                onChange={(e) => setNewClassData({...newClassData, fees: parseInt(e.target.value)})}
                                className="border-2 border-gray-200 rounded-xl focus:border-purple-500"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end space-x-3">
                            <Button variant="outline" onClick={() => setNewClassDialog(false)} className="rounded-xl">
                              Cancel
                            </Button>
                            <Button onClick={handleCreateClass} className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 rounded-xl">
                              Create Class
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {recentClasses.map((cls) => (
                      <div key={cls.id} className="border-2 border-gray-200 rounded-xl p-6 bg-gradient-to-r from-white to-purple-50 hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-3">
                              <h3 className="font-bold text-gray-900 text-lg">{cls.subject}</h3>
                              <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 font-semibold">
                                {cls.grade}
                              </Badge>
                              <Badge className={getStatusColor(cls.status)}>
                                {cls.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 font-medium mb-2">{cls.time}</p>
                            <p className="text-xs text-gray-600">
                              {cls.students} students enrolled
                              {cls.attendance && ` • ${cls.attendance} attended`}
                            </p>
                          </div>
                          <div className="flex items-center space-x-3">
                            {cls.status === 'completed' && (
                              <Dialog open={newLogDialog} onOpenChange={setNewLogDialog}>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl">
                                    <FileText className="mr-2 h-4 w-4" />
                                    Add Log
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle className="text-2xl bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                                      Add Class Log
                                    </DialogTitle>
                                    <DialogDescription>
                                      Record what happened in today's {cls.subject} class
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-6">
                                    <div>
                                      <Label htmlFor="log-content" className="font-semibold text-gray-700">Class Summary</Label>
                                      <Textarea 
                                        id="log-content" 
                                        placeholder="Describe what was covered in class..."
                                        className="min-h-[120px] border-2 border-gray-200 rounded-xl focus:border-emerald-500"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="homework" className="font-semibold text-gray-700">Homework Assigned</Label>
                                      <Input 
                                        id="homework" 
                                        placeholder="e.g., Complete exercises 1-10"
                                        className="border-2 border-gray-200 rounded-xl focus:border-emerald-500"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label htmlFor="attendance" className="font-semibold text-gray-700">Students Present</Label>
                                        <Input 
                                          id="attendance" 
                                          type="number"
                                          max={cls.students}
                                          placeholder="0"
                                          className="border-2 border-gray-200 rounded-xl focus:border-emerald-500"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="total" className="font-semibold text-gray-700">Total Students</Label>
                                        <Input 
                                          id="total" 
                                          type="number"
                                          value={cls.students}
                                          disabled
                                          className="border-2 border-gray-200 rounded-xl bg-gray-50"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-end space-x-3">
                                      <Button variant="outline" onClick={() => setNewLogDialog(false)} className="rounded-xl">
                                        Cancel
                                      </Button>
                                      <Button onClick={handleCreateLog} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl">
                                        Save Log
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                            <Button variant="outline" size="sm" className="border-2 border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl">
                              <span className="mr-2">👁️</span>
                              View
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="students" className="p-6 space-y-6">
              <Card className="border-2 border-emerald-200 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50">
                  <CardTitle className="flex items-center space-x-3 text-xl">
                    <div className="p-2 bg-emerald-500 rounded-lg">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                      My Students
                    </span>
                  </CardTitle>
                  <CardDescription className="text-emerald-600 font-medium">Manage your student roster and track progress</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {recentStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-6 border-2 border-gray-200 rounded-xl bg-gradient-to-r from-white to-emerald-50 hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12 border-2 border-emerald-300">
                            <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-lg">
                              {student.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-bold text-gray-900 text-lg">{student.name}</h4>
                            <p className="text-sm text-gray-700 font-medium">{student.grade} • {student.subject}</p>
                            <p className="text-xs text-gray-600">Last class: {student.lastClass}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={getPaymentStatusColor(student.paymentStatus)}>
                            {student.paymentStatus}
                          </Badge>
                          <Button variant="outline" size="sm" className="border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl">
                            View Profile
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* NEW EXTENSION TAB - The Star of the Show! */}
            <TabsContent value="extension" className="p-6 space-y-6">
              {/* Hero Section */}
              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative z-10">
                  <div className="flex items-center space-x-6 mb-6">
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <Chrome className="h-12 w-12 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold mb-2">ClassLogger Chrome Extension</h2>
                      <p className="text-lg opacity-90">Log classes automatically from Google Meet with secure token authentication</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="flex items-center space-x-3 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                      <Shield className="h-8 w-8 text-emerald-300" />
                      <div>
                        <h3 className="font-bold">Secure Authentication</h3>
                        <p className="text-sm opacity-80">Weekly tokens for maximum security</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                      <Smartphone className="h-8 w-8 text-blue-300" />
                      <div>
                        <h3 className="font-bold">Auto-Detection</h3>
                        <p className="text-sm opacity-80">Recognizes your students automatically</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                      <Key className="h-8 w-8 text-yellow-300" />
                      <div>
                        <h3 className="font-bold">One-Click Logging</h3>
                        <p className="text-sm opacity-80">Start and end classes with ease</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
                <div className="absolute bottom-4 left-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              </div>

              {/* Extension Token Manager */}
              <ExtensionTokenManager 
                teacherId={user.id}
                teacherName={user.name}
              />

              {/* Setup Guide */}
              <Card className="border-2 border-gradient-to-r from-cyan-200 to-blue-200 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-t-lg">
                  <CardTitle className="flex items-center space-x-3 text-xl">
                    <div className="p-2 bg-cyan-500 rounded-lg">
                      <Smartphone className="h-5 w-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-cyan-700 to-blue-700 bg-clip-text text-transparent">
                      Extension Setup Guide
                    </span>
                  </CardTitle>
                  <CardDescription className="text-cyan-600 font-medium">
                    Get your ClassLogger Chrome extension up and running in minutes
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Installation Steps */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <span className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">1</span>
                        Install Extension
                      </h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border-2 border-cyan-200">
                          <h4 className="font-semibold text-gray-800 mb-2">📥 Download & Install</h4>
                          <p className="text-sm text-gray-600 mb-3">Download the ClassLogger extension package and install it in Chrome.</p>
                          <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl">
                            <Chrome className="mr-2 h-4 w-4" />
                            Download Extension
                          </Button>
                        </div>
                        
                        <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200">
                          <h4 className="font-semibold text-gray-800 mb-2">🔧 Enable Developer Mode</h4>
                          <p className="text-sm text-gray-600">
                            Go to <code className="bg-gray-200 px-2 py-1 rounded text-xs">chrome://extensions</code> and enable "Developer mode"
                          </p>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                          <h4 className="font-semibold text-gray-800 mb-2">📁 Load Extension</h4>
                          <p className="text-sm text-gray-600">
                            Click "Load unpacked" and select the ClassLogger extension folder
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Authentication Steps */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <span className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</span>
                        Authenticate
                      </h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
                          <h4 className="font-semibold text-gray-800 mb-2">🔑 Generate Token</h4>
                          <p className="text-sm text-gray-600 mb-3">Use the token manager above to generate your weekly authentication token.</p>
                          <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                            Token expires weekly for security
                          </Badge>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border-2 border-orange-200">
                          <h4 className="font-semibold text-gray-800 mb-2">📋 Copy & Paste</h4>
                          <p className="text-sm text-gray-600">
                            Copy your token and paste it into the extension popup when you first open it.
                          </p>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                          <h4 className="font-semibold text-gray-800 mb-2">✅ You're Ready!</h4>
                          <p className="text-sm text-gray-600">
                            Join any Google Meet session and the ClassLogger widget will appear automatically.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Features Showcase */}
                  <div className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">🚀 Extension Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                        <h4 className="font-semibold text-gray-800 mb-2">Student Recognition</h4>
                        <p className="text-xs text-gray-600">Automatically detects which student's class you're in</p>
                      </div>

                      <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <Clock className="h-6 w-6 text-white" />
                        </div>
                        <h4 className="font-semibold text-gray-800 mb-2">Time Tracking</h4>
                        <p className="text-xs text-gray-600">Real-time timer shows class duration</p>
                      </div>

                      <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <h4 className="font-semibold text-gray-800 mb-2">Auto Logging</h4>
                        <p className="text-xs text-gray-600">Creates class logs automatically in your dashboard</p>
                      </div>

                      <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <Shield className="h-6 w-6 text-white" />
                        </div>
                        <h4 className="font-semibold text-gray-800 mb-2">Secure Access</h4>
                        <p className="text-xs text-gray-600">Token-based authentication prevents unauthorized use</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quick-actions" className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50" onClick={() => setNewLogDialog(true)}>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">Create Class Log</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">Record today's class activities and student progress</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50" onClick={() => setNewClassDialog(true)}>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <User className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">Add New Student</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">Enroll a new student to your classes</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <DollarSign className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">Send Payment Reminder</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">Notify parents about pending payments</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <Send className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">Message Parents</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">Send updates and communicate with parents</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <BarChart3 className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">View Analytics</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">Track student performance and class insights</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50" onClick={() => setNewClassDialog(true)}>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <Calendar className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">Schedule Class</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">Add new classes to your calendar</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}