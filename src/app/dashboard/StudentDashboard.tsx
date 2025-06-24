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
import { Calendar } from '@/components/ui/calendar'
import { BookOpen, Users, Clock, Target, TrendingUp, Calendar as CalendarIcon, MessageSquare, FileText, Zap, Star, Award, Trophy, Sparkles, Rocket, Crown, Gift, Bell, Heart, Brain, Lightbulb, Flame } from 'lucide-react'

interface StudentDashboardProps {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

export default function StudentDashboard({ user }: StudentDashboardProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [messageDialog, setMessageDialog] = useState(false)
  const [homeworkDialog, setHomeworkDialog] = useState(false)

  // Mock data - will be replaced with real API calls
  const studentProfile = {
    name: user.name,
    grade: 'Grade 10',
    rollNumber: 'ST001',
    subjects: ['Mathematics', 'Physics', 'Chemistry', 'English'],
    totalClasses: 48,
    attendedClasses: 44,
    currentStreak: 7,
    averageScore: 85,
    rank: 3,
    weeklyGoal: 90
  }

  const todaySchedule = [
    {
      id: 1,
      subject: 'Mathematics',
      teacher: 'Mr. Sharma',
      time: '9:00 AM - 10:00 AM',
      topic: 'Trigonometry',
      status: 'completed',
      room: 'Room 101',
      score: 92
    },
    {
      id: 2,
      subject: 'Physics',
      teacher: 'Mr. Kumar',
      time: '10:30 AM - 11:30 AM',
      topic: 'Wave Motion',
      status: 'completed',
      room: 'Lab 2',
      score: 88
    },
    {
      id: 3,
      subject: 'Chemistry',
      teacher: 'Ms. Gupta',
      time: '2:00 PM - 3:00 PM',
      topic: 'Organic Chemistry',
      status: 'upcoming',
      room: 'Lab 1',
      score: null
    },
    {
      id: 4,
      subject: 'English',
      teacher: 'Ms. Reddy',
      time: '3:30 PM - 4:30 PM',
      topic: 'Essay Writing',
      status: 'upcoming',
      room: 'Room 205',
      score: null
    }
  ]

  const recentAssignments = [
    {
      id: 1,
      subject: 'Mathematics',
      title: 'Trigonometry Problem Set',
      dueDate: 'Tomorrow',
      status: 'pending',
      priority: 'high',
      description: 'Solve problems 1-15 from Chapter 8',
      progress: 0
    },
    {
      id: 2,
      subject: 'Physics',
      title: 'Wave Motion Lab Report',
      dueDate: 'Dec 20',
      status: 'in_progress',
      priority: 'medium',
      description: 'Write lab report on sound wave experiments',
      progress: 65
    },
    {
      id: 3,
      subject: 'Chemistry',
      title: 'Organic Chemistry Notes',
      dueDate: 'Dec 22',
      status: 'completed',
      priority: 'low',
      description: 'Prepare detailed notes on hydrocarbon reactions',
      progress: 100
    },
    {
      id: 4,
      subject: 'English',
      title: 'Creative Writing Essay',
      dueDate: 'Dec 25',
      status: 'pending',
      priority: 'medium',
      description: 'Write a 500-word creative piece on "Future Cities"',
      progress: 20
    }
  ]

  const progressData = [
    {
      subject: 'Mathematics',
      teacher: 'Mr. Sharma',
      currentGrade: 'A',
      progress: 92,
      lastTest: 88,
      attendance: 95,
      trend: 'up',
      color: 'blue'
    },
    {
      subject: 'Physics',
      teacher: 'Mr. Kumar',
      currentGrade: 'B+',
      progress: 85,
      lastTest: 82,
      attendance: 90,
      trend: 'up',
      color: 'emerald'
    },
    {
      subject: 'Chemistry',
      teacher: 'Ms. Gupta',
      currentGrade: 'A-',
      progress: 88,
      lastTest: 85,
      attendance: 93,
      trend: 'stable',
      color: 'purple'
    },
    {
      subject: 'English',
      teacher: 'Ms. Reddy',
      currentGrade: 'B',
      progress: 78,
      lastTest: 75,
      attendance: 88,
      trend: 'down',
      color: 'orange'
    }
  ]

  const recentClassLogs = [
    {
      id: 1,
      subject: 'Mathematics',
      teacher: 'Mr. Sharma',
      date: 'Today',
      time: '9:00 AM',
      topics: ['Trigonometric Identities', 'Problem Solving'],
      homework: 'Chapter 8, Exercise 8.2 - Questions 1-10',
      performance: 'excellent',
      notes: 'Great participation in class discussions. Shows strong understanding of concepts.',
      materials: ['Textbook Chapter 8', 'Practice Worksheet'],
      score: 92
    },
    {
      id: 2,
      subject: 'Physics',
      teacher: 'Mr. Kumar',
      date: 'Today',
      time: '10:30 AM',
      topics: ['Sound Waves', 'Frequency and Wavelength'],
      homework: 'Lab report due next class',
      performance: 'good',
      notes: 'Good understanding of wave concepts. Practice more numerical problems.',
      materials: ['Lab Manual', 'Wave Simulation Video'],
      score: 88
    },
    {
      id: 3,
      subject: 'Chemistry',
      teacher: 'Ms. Gupta',
      date: 'Yesterday',
      time: '2:00 PM',
      topics: ['Hydrocarbons', 'Alkanes and Alkenes'],
      homework: 'Read Chapter 12 and prepare notes',
      performance: 'good',
      notes: 'Active participation in practical session. Good grasp of organic structures.',
      materials: ['Molecular Model Kit', 'Chapter 12 Notes'],
      score: 85
    }
  ]

  const upcomingTests = [
    {
      id: 1,
      subject: 'Mathematics',
      type: 'Unit Test',
      date: 'Dec 22, 2024',
      topics: ['Trigonometry', 'Coordinate Geometry'],
      duration: '2 hours',
      weightage: '20%',
      difficulty: 'hard'
    },
    {
      id: 2,
      subject: 'Physics',
      type: 'Lab Practical',
      date: 'Dec 24, 2024',
      topics: ['Wave Experiments', 'Sound Analysis'],
      duration: '3 hours',
      weightage: '15%',
      difficulty: 'medium'
    }
  ]

  const weeklySchedule = {
    Monday: [
      { time: '9:00-10:00', subject: 'Mathematics', teacher: 'Mr. Sharma', room: 'Room 101' },
      { time: '10:30-11:30', subject: 'Physics', teacher: 'Mr. Kumar', room: 'Lab 2' },
      { time: '2:00-3:00', subject: 'Chemistry', teacher: 'Ms. Gupta', room: 'Lab 1' },
      { time: '3:30-4:30', subject: 'English', teacher: 'Ms. Reddy', room: 'Room 205' }
    ],
    Tuesday: [
      { time: '9:00-10:00', subject: 'English', teacher: 'Ms. Reddy', room: 'Room 205' },
      { time: '10:30-11:30', subject: 'Mathematics', teacher: 'Mr. Sharma', room: 'Room 101' },
      { time: '2:00-3:00', subject: 'Physics', teacher: 'Mr. Kumar', room: 'Lab 2' },
      { time: '3:30-4:30', subject: 'Chemistry', teacher: 'Ms. Gupta', room: 'Lab 1' }
    ],
    Wednesday: [
      { time: '9:00-10:00', subject: 'Chemistry', teacher: 'Ms. Gupta', room: 'Lab 1' },
      { time: '10:30-11:30', subject: 'English', teacher: 'Ms. Reddy', room: 'Room 205' },
      { time: '2:00-3:00', subject: 'Mathematics', teacher: 'Mr. Sharma', room: 'Room 101' },
      { time: '3:30-4:30', subject: 'Physics', teacher: 'Mr. Kumar', room: 'Lab 2' }
    ],
    Thursday: [
      { time: '9:00-10:00', subject: 'Physics', teacher: 'Mr. Kumar', room: 'Lab 2' },
      { time: '10:30-11:30', subject: 'Chemistry', teacher: 'Ms. Gupta', room: 'Lab 1' },
      { time: '2:00-3:00', subject: 'English', teacher: 'Ms. Reddy', room: 'Room 205' },
      { time: '3:30-4:30', subject: 'Mathematics', teacher: 'Mr. Sharma', room: 'Room 101' }
    ],
    Friday: [
      { time: '9:00-10:00', subject: 'Mathematics', teacher: 'Mr. Sharma', room: 'Room 101' },
      { time: '10:30-11:30', subject: 'Physics', teacher: 'Mr. Kumar', room: 'Lab 2' },
      { time: '2:00-3:00', subject: 'Chemistry', teacher: 'Ms. Gupta', room: 'Lab 1' },
      { time: '3:30-4:30', subject: 'English', teacher: 'Ms. Reddy', room: 'Room 205' }
    ]
  }

  const recentMaterials = [
    {
      id: 1,
      title: 'Trigonometry Notes',
      subject: 'Mathematics',
      teacher: 'Mr. Sharma',
      type: 'document',
      uploadedAt: '2 hours ago',
      size: '2.5 MB'
    },
    {
      id: 2,
      title: 'Wave Motion Demo',
      subject: 'Physics',
      teacher: 'Mr. Kumar',
      type: 'video',
      uploadedAt: '1 day ago',
      size: '45 MB'
    },
    {
      id: 3,
      title: 'Organic Chemistry Chart',
      subject: 'Chemistry',
      teacher: 'Ms. Gupta',
      type: 'image',
      uploadedAt: '2 days ago',
      size: '1.2 MB'
    },
    {
      id: 4,
      title: 'Essay Writing Guide',
      subject: 'English',
      teacher: 'Ms. Reddy',
      type: 'document',
      uploadedAt: '3 days ago',
      size: '800 KB'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
      case 'upcoming': return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
      case 'in_progress': return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
      case 'pending': return 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
      case 'medium': return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
      case 'low': return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg'
    }
  }

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
    if (grade.startsWith('B')) return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
    if (grade.startsWith('C')) return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
    return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg'
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈'
      case 'down': return '📉'
      case 'stable': return '➡️'
      default: return '📊'
    }
  }

  const getPerformanceEmoji = (performance: string) => {
    switch (performance) {
      case 'excellent': return '🌟'
      case 'good': return '👍'
      case 'needs_improvement': return '⚠️'
      default: return '📝'
    }
  }

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return '📄'
      case 'video': return '🎥'
      case 'image': return '📊'
      case 'audio': return '🎵'
      default: return '📁'
    }
  }

  const getSubjectGradient = (color: string) => {
    const gradients = {
      blue: 'from-blue-500 to-indigo-600',
      emerald: 'from-emerald-500 to-teal-600',
      purple: 'from-purple-500 to-pink-600',
      orange: 'from-orange-500 to-red-500'
    }
    return gradients[color as keyof typeof gradients] || 'from-gray-400 to-gray-500'
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'hard': return 'bg-gradient-to-r from-red-500 to-pink-600 text-white'
      case 'medium': return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
      case 'easy': return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="space-y-8 pt-6 pb-20 px-4 sm:px-6">
        {/* Enhanced Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-6 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-indigo-800 bg-clip-text text-transparent">
                Hello, {studentProfile.name}! 🎓
              </h1>
              <p className="text-lg text-gray-600 mt-2 flex items-center">
                <Rocket className="w-5 h-5 mr-2 text-indigo-500" />
                {studentProfile.grade} • Roll No: {studentProfile.rollNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg px-4 py-2 text-lg">
              🔥 {studentProfile.currentStreak} day streak
            </Badge>
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg px-4 py-2 text-lg">
              👑 Rank #{studentProfile.rank}
            </Badge>
          </div>
        </div>

        {/* Enhanced Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 font-medium mb-1">Attendance</p>
                  <p className="text-3xl font-bold">
                    {Math.round((studentProfile.attendedClasses / studentProfile.totalClasses) * 100)}%
                  </p>
                  <div className="flex items-center mt-2">
                    <Target className="w-4 h-4 mr-1" />
                    <span className="text-xs text-emerald-100">Outstanding rate</span>
                  </div>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Target className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <Progress 
                  value={(studentProfile.attendedClasses / studentProfile.totalClasses) * 100} 
                  className="bg-emerald-400/30"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 font-medium mb-1">Average Score</p>
                  <p className="text-3xl font-bold">{studentProfile.averageScore}%</p>
                  <div className="flex items-center mt-2">
                    <Trophy className="w-4 h-4 mr-1" />
                    <span className="text-xs text-blue-100">Goal: {studentProfile.weeklyGoal}%</span>
                  </div>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <Progress value={studentProfile.averageScore} className="bg-blue-400/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 font-medium mb-1">Subjects</p>
                  <p className="text-3xl font-bold">{studentProfile.subjects.length}</p>
                  <div className="flex items-center mt-2">
                    <BookOpen className="w-4 h-4 mr-1" />
                    <span className="text-xs text-purple-100">Active learning</span>
                  </div>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-0 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 font-medium mb-1">Pending Tasks</p>
                  <p className="text-3xl font-bold text-white">
                    {recentAssignments.filter(a => a.status === 'pending').length}
                  </p>
                  <div className="flex items-center mt-2">
                    <Bell className="w-4 h-4 mr-1" />
                    <span className="text-xs text-orange-100">Need attention</span>
                  </div>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Bell className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Main Content Tabs */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <Tabs defaultValue="today" className="w-full">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
              <TabsList className="grid w-full grid-cols-5 bg-white/20 backdrop-blur-sm rounded-xl">
                <TabsTrigger 
                  value="today" 
                  className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 text-white font-semibold"
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Today
                </TabsTrigger>
                <TabsTrigger 
                  value="assignments"
                  className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 text-white font-semibold"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Assignments
                </TabsTrigger>
                <TabsTrigger 
                  value="progress"
                  className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 text-white font-semibold"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Progress
                </TabsTrigger>
                <TabsTrigger 
                  value="schedule"
                  className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 text-white font-semibold"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Schedule
                </TabsTrigger>
                <TabsTrigger 
                  value="resources"
                  className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 text-white font-semibold"
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Resources
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="today" className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Enhanced Today's Schedule */}
                <Card className="border-2 border-gradient-to-r from-blue-200 to-indigo-200 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                    <CardTitle className="flex items-center space-x-3 text-xl">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                        Today's Classes
                      </span>
                    </CardTitle>
                    <CardDescription className="text-blue-600 font-medium">Your schedule for today</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    {todaySchedule.map((cls) => (
                      <div key={cls.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-blue-50 border-2 border-blue-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-bold text-gray-900">{cls.subject}</h4>
                            <Badge className={getStatusColor(cls.status)}>
                              {cls.status}
                            </Badge>
                            {cls.score && (
                              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg">
                                {cls.score}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 font-medium mb-1">{cls.time} • {cls.room}</p>
                          <p className="text-xs text-gray-600">{cls.teacher} • {cls.topic}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Enhanced Recent Class Logs */}
                <Card className="border-2 border-gradient-to-r from-emerald-200 to-teal-200 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-lg">
                    <CardTitle className="flex items-center space-x-3 text-xl">
                      <div className="p-2 bg-emerald-500 rounded-lg">
                        <Award className="h-5 w-5 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                        Recent Class Logs
                      </span>
                    </CardTitle>
                    <CardDescription className="text-emerald-600 font-medium">Latest updates from your classes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    {recentClassLogs.slice(0, 3).map((log) => (
                      <div key={log.id} className="border-2 border-emerald-200 rounded-xl p-4 space-y-3 bg-gradient-to-r from-emerald-50 to-teal-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-gray-900">{log.subject}</h4>
                            <p className="text-sm text-gray-600">{log.teacher} • {log.date} {log.time}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getPerformanceEmoji(log.performance)}</span>
                            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg">
                              {log.score}%
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600">
                          <p><strong>Topics:</strong> {log.topics.join(', ')}</p>
                          {log.homework && <p><strong>Homework:</strong> {log.homework}</p>}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Enhanced Upcoming Tests */}
              {upcomingTests.length > 0 && (
                <Card className="border-2 border-gradient-to-r from-yellow-200 to-orange-200 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-t-lg">
                    <CardTitle className="flex items-center space-x-3 text-xl">
                      <div className="p-2 bg-yellow-500 rounded-lg">
                        <Flame className="h-5 w-5 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-yellow-700 to-orange-700 bg-clip-text text-transparent">
                        Upcoming Tests
                      </span>
                    </CardTitle>
                    <CardDescription className="text-yellow-600 font-medium">Prepare for your upcoming assessments</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {upcomingTests.map((test) => (
                        <div key={test.id} className="border-2 border-yellow-200 rounded-xl p-6 bg-gradient-to-br from-yellow-50 to-orange-50 hover:shadow-lg transition-all duration-200">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-gray-900 text-lg">{test.subject}</h4>
                            <div className="flex space-x-2">
                              <Badge variant="outline" className="border-2 border-yellow-300 text-yellow-700 bg-yellow-100">
                                {test.type}
                              </Badge>
                              <Badge className={getDifficultyColor(test.difficulty)}>
                                {test.difficulty}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 font-medium mb-3">{test.date} • {test.duration}</p>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-700">
                              <strong className="text-yellow-800">Topics:</strong> {test.topics.join(', ')}
                            </p>
                            <p className="text-xs text-gray-600 bg-yellow-100 px-2 py-1 rounded-full inline-block">
                              Weightage: {test.weightage}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="assignments" className="p-6 space-y-6">
              <div className="flex items-center justify-between mb-6">
                <Card className="flex-1 mr-4 border-2 border-gradient-to-r from-purple-200 to-pink-200 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
                    <CardTitle className="flex items-center space-x-3 text-xl">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <Zap className="h-5 w-5 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-purple-700 to-pink-700 bg-clip-text text-transparent">
                        Assignments & Homework
                      </span>
                    </CardTitle>
                    <CardDescription className="text-purple-600 font-medium">Track your pending and completed tasks</CardDescription>
                  </CardHeader>
                </Card>
                <Dialog open={homeworkDialog} onOpenChange={setHomeworkDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200 px-8 py-4 rounded-xl">
                      <Gift className="mr-2 h-5 w-5" />
                      Submit Work
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl bg-gradient-to-r from-purple-700 to-pink-700 bg-clip-text text-transparent">
                        Submit Assignment
                      </DialogTitle>
                      <DialogDescription className="text-gray-600">
                        Submit your completed homework or assignment
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="assignment-select" className="font-semibold text-gray-700">Select Assignment</Label>
                        <Select>
                          <SelectTrigger className="border-2 border-gray-200 rounded-xl focus:border-purple-500">
                            <SelectValue placeholder="Select assignment" />
                          </SelectTrigger>
                          <SelectContent>
                            {recentAssignments.filter(a => a.status !== 'completed').map((assignment) => (
                              <SelectItem key={assignment.id} value={assignment.id.toString()}>
                                {assignment.subject} - {assignment.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="submission" className="font-semibold text-gray-700">Submission Notes</Label>
                        <Textarea 
                          id="submission" 
                          placeholder="Add any notes about your submission..." 
                          rows={3}
                          className="border-2 border-gray-200 rounded-xl focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="file-upload" className="font-semibold text-gray-700">Upload Files (Optional)</Label>
                        <Input 
                          id="file-upload" 
                          type="file" 
                          multiple 
                          className="border-2 border-gray-200 rounded-xl focus:border-purple-500"
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <Button variant="outline" onClick={() => setHomeworkDialog(false)} className="rounded-xl">
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => setHomeworkDialog(false)}
                          className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 rounded-xl"
                        >
                          Submit
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentAssignments.map((assignment) => (
                  <Card key={assignment.id} className={`border-0 shadow-2xl overflow-hidden transform hover:scale-105 transition-all duration-300 ${
                    assignment.status === 'completed' ? 'bg-gradient-to-br from-green-50 to-emerald-50' :
                    assignment.status === 'in_progress' ? 'bg-gradient-to-br from-yellow-50 to-orange-50' : 
                    'bg-gradient-to-br from-red-50 to-pink-50'
                  }`}>
                    <div className={`h-2 bg-gradient-to-r ${
                      assignment.status === 'completed' ? 'from-green-500 to-emerald-600' :
                      assignment.status === 'in_progress' ? 'from-yellow-500 to-orange-500' : 
                      'from-red-500 to-pink-600'
                    }`}></div>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <Badge className={getStatusColor(assignment.status)}>
                          {assignment.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(assignment.priority)}>
                          {assignment.priority}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2 text-lg">{assignment.title}</h3>
                      <p className="text-sm text-gray-700 font-medium mb-2">{assignment.subject}</p>
                      <p className="text-xs text-gray-600 mb-4 leading-relaxed">{assignment.description}</p>
                      
                      {assignment.progress > 0 && (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-gray-600 mb-2">
                            <span>Progress</span>
                            <span>{assignment.progress}%</span>
                          </div>
                          <Progress value={assignment.progress} className="h-2" />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 font-medium bg-gray-100 px-2 py-1 rounded-full">
                          Due: {assignment.dueDate}
                        </span>
                        {assignment.status !== 'completed' && (
                          <Button 
                            size="sm" 
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg rounded-xl"
                          >
                            Work on it
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="progress" className="p-6 space-y-6">
              <Card className="border-2 border-gradient-to-r from-blue-200 to-purple-200 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
                  <CardTitle className="flex items-center space-x-3 text-xl">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
                      Academic Progress
                    </span>
                  </CardTitle>
                  <CardDescription className="text-blue-600 font-medium">Track your performance across all subjects</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {progressData.map((subject) => (
                      <div key={subject.subject} className="border-2 border-gray-200 rounded-xl p-6 bg-gradient-to-r from-white to-gray-50 hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">{subject.subject}</h3>
                            <p className="text-sm text-gray-600 font-medium">{subject.teacher}</p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge className={getGradeColor(subject.currentGrade)}>
                              {subject.currentGrade}
                            </Badge>
                            <span className="text-2xl">{getTrendIcon(subject.trend)}</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-6 mb-4">
                          <div className="text-center">
                            <p className="text-sm text-gray-600 font-medium mb-2">Overall Progress</p>
                            <p className="text-2xl font-bold text-gray-900">{subject.progress}%</p>
                            <Progress value={subject.progress} className="mt-2 h-3" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600 font-medium mb-2">Last Test</p>
                            <p className="text-2xl font-bold text-gray-900">{subject.lastTest}%</p>
                            <div className="mt-2 h-3 bg-gray-200 rounded-full">
                              <div 
                                className={`h-full bg-gradient-to-r ${getSubjectGradient(subject.color)} rounded-full transition-all duration-300`}
                                style={{ width: `${subject.lastTest}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600 font-medium mb-2">Attendance</p>
                            <p className="text-2xl font-bold text-gray-900">{subject.attendance}%</p>
                            <div className="mt-2 h-3 bg-gray-200 rounded-full">
                              <div 
                                className={`h-full bg-gradient-to-r ${getSubjectGradient(subject.color)} rounded-full transition-all duration-300`}
                                style={{ width: `${subject.attendance}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 border-2 border-gradient-to-r from-emerald-200 to-teal-200 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-lg">
                    <CardTitle className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-500 rounded-lg">
                        <CalendarIcon className="h-5 w-5 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                        Calendar
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border"
                    />
                  </CardContent>
                </Card>
                
                <Card className="lg:col-span-2 border-2 border-gradient-to-r from-blue-200 to-indigo-200 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                    <CardTitle className="flex items-center space-x-3 text-xl">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                        Weekly Schedule
                      </span>
                    </CardTitle>
                    <CardDescription className="text-blue-600 font-medium">Your complete class timetable</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      {Object.entries(weeklySchedule).map(([day, classes]) => (
                        <div key={day} className="border-2 border-blue-200 rounded-xl p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                          <h4 className="font-bold text-gray-900 mb-3 text-lg flex items-center">
                            <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                              {day.charAt(0)}
                            </span>
                            {day}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            {classes.map((cls, index) => (
                              <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm border border-blue-200 hover:shadow-md transition-all duration-200">
                                <div>
                                  <span className="font-bold text-gray-900">{cls.time}</span>
                                  <p className="text-xs text-blue-700 font-medium">{cls.subject}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-600 font-medium">{cls.teacher}</p>
                                  <p className="text-xs text-gray-500">{cls.room}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="resources" className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <BookOpen className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">Study Materials</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">Access textbooks, notes, and reference materials</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">Video Lectures</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">Watch recorded classes and educational videos</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <Lightbulb className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">Lab Resources</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">Virtual labs and experiment simulations</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <Target className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">Practice Tests</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">Take mock tests and practice questions</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-red-200 bg-gradient-to-br from-red-50 to-pink-50">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">Discussion Forum</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">Ask questions and discuss with classmates</p>
                  </CardContent>
                </Card>

                <Dialog open={messageDialog} onOpenChange={setMessageDialog}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
                      <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                          <MessageSquare className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-3 text-lg">Message Teacher</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">Send messages to your teachers</p>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                        Send Message to Teacher
                      </DialogTitle>
                      <DialogDescription className="text-gray-600">
                        Contact your teacher with questions or concerns
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="teacher-select" className="font-semibold text-gray-700">Select Teacher</Label>
                        <Select>
                          <SelectTrigger className="border-2 border-gray-200 rounded-xl focus:border-emerald-500">
                            <SelectValue placeholder="Select teacher" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sharma">Mr. Sharma - Mathematics</SelectItem>
                            <SelectItem value="kumar">Mr. Kumar - Physics</SelectItem>
                            <SelectItem value="gupta">Ms. Gupta - Chemistry</SelectItem>
                            <SelectItem value="reddy">Ms. Reddy - English</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="subject" className="font-semibold text-gray-700">Subject</Label>
                        <Input 
                          id="subject" 
                          placeholder="What is this about?"
                          className="border-2 border-gray-200 rounded-xl focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="message" className="font-semibold text-gray-700">Message</Label>
                        <Textarea 
                          id="message" 
                          placeholder="Type your message here..." 
                          rows={4}
                          className="border-2 border-gray-200 rounded-xl focus:border-emerald-500"
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <Button variant="outline" onClick={() => setMessageDialog(false)} className="rounded-xl">
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => setMessageDialog(false)}
                          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl"
                        >
                          Send Message
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Quick Access to Recent Materials */}
              <Card className="border-2 border-gradient-to-r from-gray-200 to-blue-200 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-t-lg">
                  <CardTitle className="flex items-center space-x-3 text-xl">
                    <div className="p-2 bg-gray-500 rounded-lg">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-gray-700 to-blue-700 bg-clip-text text-transparent">
                      Recent Materials
                    </span>
                  </CardTitle>
                  <CardDescription className="text-gray-600 font-medium">Recently shared study materials from your teachers</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {recentMaterials.map((material) => (
                      <div key={material.id} className="border-2 border-gray-200 rounded-lg p-4 hover:bg-gradient-to-r hover:from-white hover:to-blue-50 cursor-pointer transition-all duration-200 hover:shadow-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-lg">{getFileTypeIcon(material.type)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 truncate">{material.title}</h4>
                            <p className="text-xs text-gray-600">{material.subject} • {material.teacher}</p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-gray-400">{material.uploadedAt}</p>
                              <p className="text-xs text-gray-400">{material.size}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <div className="text-center">
                    <Button className="bg-gradient-to-r from-gray-500 to-blue-600 hover:from-gray-600 hover:to-blue-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200 px-8 py-3 rounded-xl">
                      <FileText className="mr-2 h-5 w-5" />
                      View All Materials
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Study Tips & Resources */}
              <Card className="border-2 border-gradient-to-r from-indigo-200 to-purple-200 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
                  <CardTitle className="flex items-center space-x-3 text-xl">
                    <div className="p-2 bg-indigo-500 rounded-lg">
                      <Lightbulb className="h-5 w-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
                      Study Tips & Resources
                    </span>
                  </CardTitle>
                  <CardDescription className="text-indigo-600 font-medium">Helpful resources to improve your learning</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="border-2 border-blue-200 rounded-xl p-4 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-lg transition-all duration-200">
                        <h4 className="font-bold text-blue-900 mb-2 flex items-center">
                          <BookOpen className="w-5 h-5 mr-2" />
                          Active Reading Tips
                        </h4>
                        <p className="text-sm text-blue-700">Take notes while reading and summarize each chapter in your own words.</p>
                      </div>
                      
                      <div className="border-2 border-green-200 rounded-xl p-4 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-lg transition-all duration-200">
                        <h4 className="font-bold text-green-900 mb-2 flex items-center">
                          <Target className="w-5 h-5 mr-2" />
                          Goal Setting
                        </h4>
                        <p className="text-sm text-green-700">Break large assignments into smaller, manageable tasks with deadlines.</p>
                      </div>
                      
                      <div className="border-2 border-purple-200 rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-lg transition-all duration-200">
                        <h4 className="font-bold text-purple-900 mb-2 flex items-center">
                          <Brain className="w-5 h-5 mr-2" />
                          Memory Techniques
                        </h4>
                        <p className="text-sm text-purple-700">Use mnemonics, flashcards, and spaced repetition for better retention.</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="border-2 border-yellow-200 rounded-xl p-4 bg-gradient-to-br from-yellow-50 to-orange-50 hover:shadow-lg transition-all duration-200">
                        <h4 className="font-bold text-yellow-900 mb-2 flex items-center">
                          <Clock className="w-5 h-5 mr-2" />
                          Time Management
                        </h4>
                        <p className="text-sm text-yellow-700">Use the Pomodoro technique: 25 minutes focused study, 5 minutes break.</p>
                      </div>
                      
                      <div className="border-2 border-red-200 rounded-xl p-4 bg-gradient-to-br from-red-50 to-pink-50 hover:shadow-lg transition-all duration-200">
                        <h4 className="font-bold text-red-900 mb-2 flex items-center">
                          <Users className="w-5 h-5 mr-2" />
                          Study Groups
                        </h4>
                        <p className="text-sm text-red-700">Form study groups with classmates to discuss difficult concepts.</p>
                      </div>
                      
                      <div className="border-2 border-indigo-200 rounded-xl p-4 bg-gradient-to-br from-indigo-50 to-purple-50 hover:shadow-lg transition-all duration-200">
                        <h4 className="font-bold text-indigo-900 mb-2 flex items-center">
                          <Heart className="w-5 h-5 mr-2" />
                          Rest & Recovery
                        </h4>
                        <p className="text-sm text-indigo-700">Get 7-9 hours of sleep and take regular breaks to maintain focus.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}