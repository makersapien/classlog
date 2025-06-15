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
      const todayLog = todaySchedule.find(log => log.classes.name === cls.name)
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
        if (enrollment.status === 'active' && enrollment.profiles) {
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
      case 'completed': return 'bg-green-100 text-green-800'
      case 'upcoming': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Dashboard</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <Button 
            onClick={fetchDashboardData}
            className="mt-3 bg-red-600 text-white hover:bg-red-700"
          >
            Retry
          </Button>
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

  const recentStudents = data && data.classes ? 
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user.name}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your classes today
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
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

      {/* Quick Stats - Now using real data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Classes Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {todayStats.classesToday}/{todayStats.totalClasses}
                </p>
              </div>
              <div className="p-2 bg-emerald-100 rounded-full">
                <span className="text-xl">📚</span>
              </div>
            </div>
            <Progress 
              value={todayStats.totalClasses && todayStats.totalClasses > 0 ? (todayStats.classesToday! / todayStats.totalClasses) * 100 : 0} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Students Present</p>
                <p className="text-2xl font-bold text-gray-900">
                  {todayStats.attendanceToday}/{todayStats.totalStudents}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <span className="text-xl">👥</span>
              </div>
            </div>
            <Progress 
              value={todayStats.totalStudents && todayStats.totalStudents > 0 ? (todayStats.attendanceToday! / todayStats.totalStudents) * 100 : 0} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                <p className="text-2xl font-bold text-orange-600">
                  {todayStats.pendingPayments}
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-full">
                <span className="text-xl">💰</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{todayStats.totalRevenue?.toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <span className="text-xl">📊</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="quick-actions">Quick Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Schedule - Enhanced with real data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>📅</span>
                  <span>Today's Schedule</span>
                </CardTitle>
                <CardDescription>Your classes for today</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data?.todaySchedule && data.todaySchedule.length > 0 ? (
                  data.todaySchedule.map((schedule) => (
                    <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{schedule.classes.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {schedule.classes.grade}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{schedule.classes.subject}</p>
                        <p className="text-xs text-gray-500">
                          {schedule.attendance_count}/{schedule.total_students} students attended
                        </p>
                        {schedule.topics_covered && schedule.topics_covered.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {schedule.topics_covered.slice(0, 2).map((topic, index) => (
                              <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                {topic}
                              </span>
                            ))}
                            {schedule.topics_covered.length > 2 && (
                              <span className="text-xs text-gray-500">+{schedule.topics_covered.length - 2} more</span>
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
                  <div key={cls.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">{cls.subject}</h4>
                        <Badge variant="outline" className="text-xs">
                          {cls.grade}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{cls.time}</p>
                      <p className="text-xs text-gray-500">
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

            {/* Recent Activity - Enhanced with real data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>🔔</span>
                  <span>Recent Activity</span>
                </CardTitle>
                <CardDescription>Latest updates from your classes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-3">
                  {data?.todaySchedule && data.todaySchedule.length > 0 ? (
                    data.todaySchedule.map((schedule, index) => (
                    <div key={schedule.id} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {schedule.classes.name} class completed
                        </p>
                        <p className="text-xs text-gray-600">
                          {schedule.classes.grade} • {schedule.attendance_count}/{schedule.total_students} students attended • Today
                        </p>
                      </div>
                    </div>
                                      )) 
                  ) : (
                    <>
                      <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            Physics class completed
                          </p>
                          <p className="text-xs text-gray-600">
                            Grade 12 • 6/6 students attended • 1 hour ago
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            Payment received from Arjun Patel
                          </p>
                          <p className="text-xs text-gray-600">
                            ₹2,500 • Mathematics • 2 hours ago
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            New message from parent
                          </p>
                          <p className="text-xs text-gray-600">
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

        <TabsContent value="classes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>My Classes</CardTitle>
                  <CardDescription>Manage your class schedule and logs</CardDescription>
                </div>
                <Dialog open={newClassDialog} onOpenChange={setNewClassDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <span className="mr-2">➕</span>
                      New Class
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Class</DialogTitle>
                      <DialogDescription>
                        Add a new class to your schedule
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="subject">Subject</Label>
                          <Input 
                            id="subject" 
                            placeholder="e.g., Mathematics"
                            value={newClassData.subject}
                            onChange={(e) => setNewClassData({...newClassData, subject: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="grade">Grade</Label>
                          <Select 
                            value={newClassData.grade} 
                            onValueChange={(value) => setNewClassData({...newClassData, grade: value})}
                          >
                            <SelectTrigger>
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
                          <Label htmlFor="start-time">Start Time</Label>
                          <Input 
                            id="start-time" 
                            type="time"
                            value={newClassData.startTime}
                            onChange={(e) => setNewClassData({...newClassData, startTime: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="end-time">End Time</Label>
                          <Input 
                            id="end-time" 
                            type="time"
                            value={newClassData.endTime}
                            onChange={(e) => setNewClassData({...newClassData, endTime: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="max-students">Max Students</Label>
                          <Input 
                            id="max-students" 
                            type="number"
                            value={newClassData.maxStudents}
                            onChange={(e) => setNewClassData({...newClassData, maxStudents: parseInt(e.target.value)})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="fees">Monthly Fees (₹)</Label>
                          <Input 
                            id="fees" 
                            type="number"
                            value={newClassData.fees}
                            onChange={(e) => setNewClassData({...newClassData, fees: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setNewClassDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateClass}>
                          Create Class
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentClasses.map((cls) => (
                  <div key={cls.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-900">{cls.subject}</h3>
                          <Badge variant="outline">{cls.grade}</Badge>
                          <Badge className={getStatusColor(cls.status)}>
                            {cls.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{cls.time}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {cls.students} students enrolled
                          {cls.attendance && ` • ${cls.attendance} attended`}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {cls.status === 'completed' && (
                          <Dialog open={newLogDialog} onOpenChange={setNewLogDialog}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <span className="mr-1">📝</span>
                                Add Log
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Class Log</DialogTitle>
                                <DialogDescription>
                                  Record what happened in today's {cls.subject} class
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="log-content">Class Summary</Label>
                                  <Textarea 
                                    id="log-content" 
                                    placeholder="Describe what was covered in class..."
                                    className="min-h-[100px]"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="homework">Homework Assigned</Label>
                                  <Input 
                                    id="homework" 
                                    placeholder="e.g., Complete exercises 1-10"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="attendance">Students Present</Label>
                                    <Input 
                                      id="attendance" 
                                      type="number"
                                      max={cls.students}
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="total">Total Students</Label>
                                    <Input 
                                      id="total" 
                                      type="number"
                                      value={cls.students}
                                      disabled
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline" onClick={() => setNewLogDialog(false)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handleCreateLog}>
                                    Save Log
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        <Button variant="outline" size="sm">
                          <span className="mr-1">👁️</span>
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

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Students</CardTitle>
              <CardDescription>Manage your student roster and track progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback className="bg-emerald-100 text-emerald-600">
                          {student.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium text-gray-900">{student.name}</h4>
                        <p className="text-sm text-gray-600">{student.grade} • {student.subject}</p>
                        <p className="text-xs text-gray-500">Last class: {student.lastClass}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPaymentStatusColor(student.paymentStatus)}>
                        {student.paymentStatus}
                      </Badge>
                      <Button variant="outline" size="sm">
                        View Profile
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quick-actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setNewLogDialog(true)}>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Create Class Log</h3>
                <p className="text-sm text-gray-600">Record today's class activities and student progress</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setNewClassDialog(true)}>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">👤</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Add New Student</h3>
                <p className="text-sm text-gray-600">Enroll a new student to your classes</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Send Payment Reminder</h3>
                <p className="text-sm text-gray-600">Notify parents about pending payments</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💬</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Message Parents</h3>
                <p className="text-sm text-gray-600">Send updates and communicate with parents</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">View Analytics</h3>
                <p className="text-sm text-gray-600">Track student performance and class insights</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setNewClassDialog(true)}>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📅</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Schedule Class</h3>
                <p className="text-sm text-gray-600">Add new classes to your calendar</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}