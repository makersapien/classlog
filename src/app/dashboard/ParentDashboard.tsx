'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Heart, TrendingUp, DollarSign, BookOpen, Calendar, MessageSquare, CreditCard, Star, Target, Award, Sparkles, Clock, Bell, Gift, Zap, Crown, Trophy, Rocket } from 'lucide-react'

interface ParentDashboardProps {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

export default function ParentDashboard({ user }: ParentDashboardProps) {
  const [selectedChild, setSelectedChild] = useState('all')
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [messageDialog, setMessageDialog] = useState(false)

  // Mock data - will be replaced with real API calls
  const children = [
    {
      id: 1,
      name: 'Arjun Patel',
      grade: 'Grade 10',
      subjects: ['Mathematics', 'Physics'],
      avatar: null,
      totalClasses: 24,
      attendedClasses: 22,
      currentBalance: 2500,
      nextClass: 'Today, 4:00 PM',
      performance: 'excellent',
      streak: 5,
      averageScore: 92
    },
    {
      id: 2,
      name: 'Priya Patel',
      grade: 'Grade 8',
      subjects: ['Science', 'English'],
      avatar: null,
      totalClasses: 20,
      attendedClasses: 19,
      currentBalance: -500, // negative means overdue
      nextClass: 'Tomorrow, 10:00 AM',
      performance: 'good',
      streak: 3,
      averageScore: 85
    }
  ]

  const recentClassLogs = [
    {
      id: 1,
      studentName: 'Arjun Patel',
      subject: 'Mathematics',
      teacher: 'Mr. Sharma',
      date: '2024-01-15',
      time: '4:00 PM - 5:00 PM',
      topics: ['Quadratic Equations', 'Problem Solving'],
      homework: 'Chapter 4, Exercise 4.1 - Questions 1-10',
      performance: 'excellent',
      notes: 'Arjun showed great understanding of quadratic equations today. He solved complex problems with ease.',
      attendance: 'present'
    },
    {
      id: 2,
      studentName: 'Priya Patel',
      subject: 'Science',
      teacher: 'Ms. Gupta',
      date: '2024-01-15',
      time: '10:00 AM - 11:00 AM',
      topics: ['Photosynthesis', 'Plant Biology'],
      homework: 'Read Chapter 6 and prepare notes on different types of plants',
      performance: 'good',
      notes: 'Priya was attentive during the lesson and asked thoughtful questions about plant processes.',
      attendance: 'present'
    },
    {
      id: 3,
      studentName: 'Arjun Patel',
      subject: 'Physics',
      teacher: 'Mr. Kumar',
      date: '2024-01-14',
      time: '2:00 PM - 3:00 PM',
      topics: ['Motion and Forces', 'Newton&apos;s Laws'],
      homework: 'Solve numerical problems from Chapter 8',
      performance: 'needs_improvement',
      notes: 'Arjun needs to practice more numerical problems. Conceptual understanding is good but application needs work.',
      attendance: 'present'
    }
  ]

  const upcomingClasses = [
    {
      id: 1,
      studentName: 'Arjun Patel',
      subject: 'Mathematics',
      teacher: 'Mr. Sharma',
      date: 'Today',
      time: '4:00 PM - 5:00 PM',
      topic: 'Trigonometry Basics'
    },
    {
      id: 2,
      studentName: 'Priya Patel',
      subject: 'English',
      teacher: 'Ms. Reddy',
      date: 'Tomorrow',
      time: '10:00 AM - 11:00 AM',
      topic: 'Creative Writing'
    },
    {
      id: 3,
      studentName: 'Arjun Patel',
      subject: 'Physics',
      teacher: 'Mr. Kumar',
      date: 'Tomorrow',
      time: '2:00 PM - 3:00 PM',
      topic: 'Work and Energy'
    }
  ]

  const paymentHistory = [
    {
      id: 1,
      studentName: 'Arjun Patel',
      amount: 2500,
      date: '2024-01-01',
      status: 'paid',
      subject: 'Mathematics + Physics',
      period: 'January 2024'
    },
    {
      id: 2,
      studentName: 'Priya Patel',
      amount: 1800,
      date: '2024-01-01',
      status: 'paid',
      subject: 'Science + English',
      period: 'January 2024'
    },
    {
      id: 3,
      studentName: 'Priya Patel',
      amount: 1800,
      date: '2024-02-01',
      status: 'overdue',
      subject: 'Science + English',
      period: 'February 2024'
    }
  ]

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'excellent': return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
      case 'good': return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
      case 'needs_improvement': return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
      case 'poor': return 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg'
    }
  }

  const getPerformanceEmoji = (performance: string) => {
    switch (performance) {
      case 'excellent': return '🌟'
      case 'good': return '👍'
      case 'needs_improvement': return '⚠️'
      case 'poor': return '❌'
      default: return '📝'
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

  const getTotalBalance = () => {
    return children.reduce((total, child) => total + child.currentBalance, 0)
  }

  const getOverallAttendance = () => {
    const totalClasses = children.reduce((total, child) => total + child.totalClasses, 0)
    const attendedClasses = children.reduce((total, child) => total + child.attendedClasses, 0)
    return totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0
  }

  const getAveragePerformance = () => {
    const totalScore = children.reduce((total, child) => total + child.averageScore, 0)
    return Math.round(totalScore / children.length)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="space-y-8 pt-6 pb-20 px-4 sm:px-6">
        {/* Enhanced Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-6 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent">
                Welcome, {user.name}! 👨‍👩‍👧‍👦
              </h1>
              <p className="text-lg text-gray-600 mt-2 flex items-center">
                <Crown className="w-5 h-5 mr-2 text-purple-500" />
                Track your children&apos;s academic journey and stay connected
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger className="w-40 border-2 border-purple-200 rounded-xl bg-white shadow-lg">
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Children</SelectItem>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id.toString()}>
                    {child.name}
                  </SelectItem>
                ))}
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
                  <p className="text-blue-100 font-medium mb-1">Children Enrolled</p>
                  <p className="text-3xl font-bold">{children.length}</p>
                  <div className="flex items-center mt-2">
                    <Users className="w-4 h-4 mr-1" />
                    <span className="text-xs text-blue-100">Active learners</span>
                  </div>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Users className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 font-medium mb-1">Overall Attendance</p>
                  <p className="text-3xl font-bold">{getOverallAttendance()}%</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    <span className="text-xs text-emerald-100">Excellent rate</span>
                  </div>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Target className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <Progress 
                  value={getOverallAttendance()} 
                  className="bg-emerald-400/30"
                />
              </div>
            </CardContent>
          </Card>

          <Card className={`${getTotalBalance() >= 0 ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-orange-500 to-red-500'} text-white border-0 shadow-2xl transform hover:scale-105 transition-all duration-300`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${getTotalBalance() >= 0 ? 'text-green-100' : 'text-orange-100'} font-medium mb-1`}>Account Balance</p>
                  <p className="text-3xl font-bold">
                    ₹{Math.abs(getTotalBalance()).toLocaleString()}
                  </p>
                  <div className="flex items-center mt-2">
                    <DollarSign className="w-4 h-4 mr-1" />
                    <span className={`text-xs ${getTotalBalance() >= 0 ? 'text-green-100' : 'text-orange-100'}`}>
                      {getTotalBalance() >= 0 ? 'All paid up' : 'Amount due'}
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  {getTotalBalance() >= 0 ? 
                    <Award className="h-8 w-8 text-white" /> : 
                    <Bell className="h-8 w-8 text-white" />
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 font-medium mb-1">Average Performance</p>
                  <p className="text-3xl font-bold">{getAveragePerformance()}%</p>
                  <div className="flex items-center mt-2">
                    <Trophy className="w-4 h-4 mr-1" />
                    <span className="text-xs text-purple-100">Outstanding progress</span>
                  </div>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Star className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <Progress 
                  value={getAveragePerformance()} 
                  className="bg-purple-400/30"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Children Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {children.map((child, index) => (
            <Card key={child.id} className="border-0 shadow-2xl overflow-hidden bg-gradient-to-br from-white to-purple-50 transform hover:scale-105 transition-all duration-300">
              <div className={`h-2 bg-gradient-to-r ${index === 0 ? 'from-blue-500 to-indigo-600' : 'from-pink-500 to-purple-600'}`}></div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Avatar className="h-14 w-14 border-4 border-white shadow-lg">
                        <AvatarFallback className={`bg-gradient-to-br ${index === 0 ? 'from-blue-400 to-indigo-500' : 'from-pink-400 to-purple-500'} text-white font-bold text-lg`}>
                          {child.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-xs font-bold text-white">{child.streak}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-xl">{child.name}</h3>
                      <p className="text-sm text-gray-600 font-medium">{child.grade}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getPerformanceColor(child.performance)}>
                          {getPerformanceEmoji(child.performance)} {child.performance}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">{child.averageScore}%</div>
                    <p className="text-xs text-gray-500">Avg Score</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl border border-blue-200">
                    <p className="text-xs text-blue-700 font-semibold mb-1">SUBJECTS</p>
                    <p className="text-sm font-bold text-blue-900">{child.subjects.join(', ')}</p>
                  </div>
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-3 rounded-xl border border-emerald-200">
                    <p className="text-xs text-emerald-700 font-semibold mb-1">ATTENDANCE</p>
                    <p className="text-sm font-bold text-emerald-900">
                      {child.attendedClasses}/{child.totalClasses} ({Math.round((child.attendedClasses / child.totalClasses) * 100)}%)
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 font-medium">Next Class:</span>
                    <span className="text-sm font-bold text-gray-900">{child.nextClass}</span>
                  </div>
                  
                  {child.currentBalance < 0 && (
                    <div className="bg-gradient-to-r from-red-50 to-pink-50 p-3 rounded-xl border-2 border-red-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-red-700 font-semibold">Amount Due:</span>
                        <span className="text-lg font-bold text-red-600">₹{Math.abs(child.currentBalance)}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-600 mb-2">
                    <span>Attendance Progress</span>
                    <span>{Math.round((child.attendedClasses / child.totalClasses) * 100)}%</span>
                  </div>
                  <Progress 
                    value={(child.attendedClasses / child.totalClasses) * 100} 
                    className="h-3"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enhanced Main Content Tabs */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <Tabs defaultValue="logs" className="w-full">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
              <TabsList className="grid w-full grid-cols-4 bg-white/20 backdrop-blur-sm rounded-xl">
                <TabsTrigger 
                  value="logs" 
                  className="data-[state=active]:bg-white data-[state=active]:text-purple-600 text-white font-semibold"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Class Logs
                </TabsTrigger>
                <TabsTrigger 
                  value="schedule"
                  className="data-[state=active]:bg-white data-[state=active]:text-purple-600 text-white font-semibold"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule
                </TabsTrigger>
                <TabsTrigger 
                  value="payments"
                  className="data-[state=active]:bg-white data-[state=active]:text-purple-600 text-white font-semibold"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Payments
                </TabsTrigger>
                <TabsTrigger 
                  value="messages"
                  className="data-[state=active]:bg-white data-[state=active]:text-purple-600 text-white font-semibold"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Messages
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="logs" className="p-6 space-y-6">
              <Card className="border-2 border-gradient-to-r from-blue-200 to-indigo-200 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                  <CardTitle className="flex items-center space-x-3 text-xl">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                      Recent Class Logs
                    </span>
                  </CardTitle>
                  <CardDescription className="text-blue-600 font-medium">Latest updates from your children&apos;s classes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {recentClassLogs.map((log) => (
                    <div key={log.id} className="border-2 border-gray-200 rounded-xl p-6 bg-gradient-to-r from-white to-blue-50 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10 border-2 border-blue-300">
                            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-bold">
                              {log.studentName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-bold text-gray-900 text-lg">{log.studentName}</h4>
                            <p className="text-sm text-gray-700 font-medium">{log.subject} • {log.teacher}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{log.date}</p>
                          <p className="text-xs text-gray-500">{log.time}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 mb-4">
                        <Badge className={getPerformanceColor(log.performance)}>
                          {getPerformanceEmoji(log.performance)} {log.performance.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="border-2 border-emerald-300 text-emerald-700 bg-emerald-50">
                          {log.attendance === 'present' ? '✅ Present' : '❌ Absent'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-xl border border-gray-200">
                          <p className="text-sm font-bold text-gray-700 mb-2">📚 Topics Covered:</p>
                          <div className="flex flex-wrap gap-2">
                            {log.topics.map((topic, index) => (
                              <span key={index} className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium border border-blue-200">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        {log.homework && (
                          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-xl border border-yellow-200">
                            <p className="text-sm font-bold text-yellow-800 mb-2">📝 Homework:</p>
                            <p className="text-sm text-yellow-700">{log.homework}</p>
                          </div>
                        )}
                        
                        {log.notes && (
                          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-200">
                            <p className="text-sm font-bold text-emerald-800 mb-2">💭 Teacher&apos;s Notes:</p>
                            <p className="text-sm text-emerald-700 italic">&ldquo;{log.notes}&rdquo;</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="p-6 space-y-6">
              <Card className="border-2 border-gradient-to-r from-emerald-200 to-teal-200 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-lg">
                  <CardTitle className="flex items-center space-x-3 text-xl">
                    <div className="p-2 bg-emerald-500 rounded-lg">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                      Upcoming Classes
                    </span>
                  </CardTitle>
                  <CardDescription className="text-emerald-600 font-medium">Your children&apos;s class schedule</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {upcomingClasses.map((cls) => (
                    <div key={cls.id} className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl bg-gradient-to-r from-white to-emerald-50 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-10 w-10 border-2 border-emerald-300">
                          <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold">
                            {cls.studentName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-gray-900">{cls.studentName}</h4>
                          <p className="text-sm text-gray-700 font-medium">{cls.subject} • {cls.teacher}</p>
                          <p className="text-xs text-gray-600 bg-gradient-to-r from-gray-100 to-emerald-100 px-2 py-1 rounded-full mt-1 inline-block">
                            Topic: {cls.topic}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg mb-2">
                          {cls.date}
                        </Badge>
                        <p className="text-xs text-gray-500 font-medium">{cls.time}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="p-6 space-y-6">
              <div className="flex items-center justify-between mb-6">
                <Card className="flex-1 mr-4 border-2 border-gradient-to-r from-orange-200 to-red-200 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 rounded-t-lg">
                    <CardTitle className="flex items-center space-x-3 text-xl">
                      <div className="p-2 bg-orange-500 rounded-lg">
                        <Gift className="h-5 w-5 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-orange-700 to-red-700 bg-clip-text text-transparent">
                        Payment History
                      </span>
                    </CardTitle>
                    <CardDescription className="text-orange-600 font-medium">Track all payments and dues</CardDescription>
                  </CardHeader>
                </Card>
                <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200 px-8 py-4 rounded-xl">
                      <Rocket className="mr-2 h-5 w-5" />
                      Make Payment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                        Make Payment
                      </DialogTitle>
                      <DialogDescription className="text-gray-600">
                        Pay tuition fees for your children
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="child-select" className="font-semibold text-gray-700">Select Child</Label>
                        <Select>
                          <SelectTrigger className="border-2 border-gray-200 rounded-xl focus:border-emerald-500">
                            <SelectValue placeholder="Select child" />
                          </SelectTrigger>
                          <SelectContent>
                            {children.map((child) => (
                              <SelectItem key={child.id} value={child.id.toString()}>
                                {child.name} - {child.grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="amount" className="font-semibold text-gray-700">Amount (₹)</Label>
                        <Input 
                          id="amount" 
                          type="number" 
                          placeholder="Enter amount"
                          className="border-2 border-gray-200 rounded-xl focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="period" className="font-semibold text-gray-700">Payment For</Label>
                        <Select>
                          <SelectTrigger className="border-2 border-gray-200 rounded-xl focus:border-emerald-500">
                            <SelectValue placeholder="Select period" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="current">Current Month</SelectItem>
                            <SelectItem value="advance">Advance Payment</SelectItem>
                            <SelectItem value="overdue">Overdue Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-3">
                        <Button variant="outline" onClick={() => setPaymentDialog(false)} className="rounded-xl">
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => setPaymentDialog(false)}
                          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl"
                        >
                          Proceed to Pay
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <Card className="border-2 border-gray-200 shadow-xl">
                <CardContent className="p-0">
                  <div className="divide-y-2 divide-gray-100">
                    {paymentHistory.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-6 hover:bg-gradient-to-r hover:from-white hover:to-gray-50 transition-all duration-200">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12 border-2 border-gray-300">
                            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white font-bold">
                              {payment.studentName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-bold text-gray-900 text-lg">{payment.studentName}</h4>
                            <p className="text-sm text-gray-700 font-medium">{payment.subject}</p>
                            <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full mt-1 inline-block">{payment.period}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">₹{payment.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500 font-medium mb-2">{payment.date}</p>
                          <Badge className={getPaymentStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages" className="p-6 space-y-6">
              <div className="flex items-center justify-between mb-6">
                <Card className="flex-1 mr-4 border-2 border-gradient-to-r from-blue-200 to-purple-200 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
                    <CardTitle className="flex items-center space-x-3 text-xl">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Zap className="h-5 w-5 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
                        Messages
                      </span>
                    </CardTitle>
                    <CardDescription className="text-blue-600 font-medium">Communicate with teachers</CardDescription>
                  </CardHeader>
                </Card>
                <Dialog open={messageDialog} onOpenChange={setMessageDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200 px-8 py-4 rounded-xl">
                      <MessageSquare className="mr-2 h-5 w-5" />
                      New Message
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
                        Send Message
                      </DialogTitle>
                      <DialogDescription className="text-gray-600">
                        Send a message to your child&apos;s teacher
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="teacher-select" className="font-semibold text-gray-700">Select Teacher</Label>
                        <Select>
                          <SelectTrigger className="border-2 border-gray-200 rounded-xl focus:border-blue-500">
                            <SelectValue placeholder="Select teacher" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sharma">Mr. Sharma - Mathematics</SelectItem>
                            <SelectItem value="gupta">Ms. Gupta - Science</SelectItem>
                            <SelectItem value="kumar">Mr. Kumar - Physics</SelectItem>
                            <SelectItem value="reddy">Ms. Reddy - English</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="subject" className="font-semibold text-gray-700">Subject</Label>
                        <Input 
                          id="subject" 
                          placeholder="Message subject"
                          className="border-2 border-gray-200 rounded-xl focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="message" className="font-semibold text-gray-700">Message</Label>
                        <Textarea 
                          id="message" 
                          placeholder="Type your message here..." 
                          rows={4}
                          className="border-2 border-gray-200 rounded-xl focus:border-blue-500"
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <Button variant="outline" onClick={() => setMessageDialog(false)} className="rounded-xl">
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => setMessageDialog(false)}
                          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl"
                        >
                          Send Message
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <Card className="border-2 border-gray-200 shadow-xl">
                <CardContent className="p-8">
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <MessageSquare className="h-10 w-10 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">No messages yet</h3>
                    <p className="text-gray-600 mb-6 text-lg">Start a conversation with your child&apos;s teachers</p>
                    <Button 
                      onClick={() => setMessageDialog(true)}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200 px-8 py-4 rounded-xl"
                    >
                      <MessageSquare className="mr-2 h-5 w-5" />
                      Send First Message
                    </Button>
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