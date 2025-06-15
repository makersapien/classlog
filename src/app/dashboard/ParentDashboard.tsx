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
      nextClass: 'Today, 4:00 PM'
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
      nextClass: 'Tomorrow, 10:00 AM'
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
      topics: ['Motion and Forces', 'Newton\'s Laws'],
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
      case 'excellent': return 'bg-green-100 text-green-800'
      case 'good': return 'bg-blue-100 text-blue-800'
      case 'needs_improvement': return 'bg-yellow-100 text-yellow-800'
      case 'poor': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {user.name}! 👨‍👩‍👧‍👦
          </h1>
          <p className="text-gray-600 mt-1">
            Track your children's academic progress and stay connected
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger className="w-40">
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Children Enrolled</p>
                <p className="text-2xl font-bold text-gray-900">{children.length}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <span className="text-xl">👶</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Attendance</p>
                <p className="text-2xl font-bold text-gray-900">{getOverallAttendance()}%</p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <span className="text-xl">📊</span>
              </div>
            </div>
            <Progress value={getOverallAttendance()} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Account Balance</p>
                <p className={`text-2xl font-bold ${getTotalBalance() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{Math.abs(getTotalBalance()).toLocaleString()}
                  {getTotalBalance() < 0 && ' (Due)'}
                </p>
              </div>
              <div className={`p-2 rounded-full ${getTotalBalance() >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <span className="text-xl">{getTotalBalance() >= 0 ? '💰' : '⚠️'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Subjects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Array.from(new Set(children.flatMap(child => child.subjects))).length}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <span className="text-xl">📚</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Children Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {children.map((child) => (
          <Card key={child.id} className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-emerald-100 text-emerald-600">
                      {child.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900">{child.name}</h3>
                    <p className="text-sm text-gray-600">{child.grade}</p>
                  </div>
                </div>
                <Badge className={child.currentBalance >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {child.currentBalance >= 0 ? 'Paid' : 'Due'}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subjects:</span>
                  <span className="font-medium">{child.subjects.join(', ')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Attendance:</span>
                  <span className="font-medium">
                    {child.attendedClasses}/{child.totalClasses} ({Math.round((child.attendedClasses / child.totalClasses) * 100)}%)
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Next Class:</span>
                  <span className="font-medium">{child.nextClass}</span>
                </div>
                {child.currentBalance < 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount Due:</span>
                    <span className="font-medium text-red-600">₹{Math.abs(child.currentBalance)}</span>
                  </div>
                )}
              </div>
              
              <Progress 
                value={(child.attendedClasses / child.totalClasses) * 100} 
                className="mt-3"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="logs">Class Logs</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>📝</span>
                <span>Recent Class Logs</span>
              </CardTitle>
              <CardDescription>Latest updates from your children's classes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentClassLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                          {log.studentName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold text-gray-900">{log.studentName}</h4>
                        <p className="text-sm text-gray-600">{log.subject} • {log.teacher}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{log.date}</p>
                      <p className="text-xs text-gray-500">{log.time}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge className={getPerformanceColor(log.performance)}>
                      {getPerformanceEmoji(log.performance)} {log.performance.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline">
                      {log.attendance === 'present' ? '✅ Present' : '❌ Absent'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Topics Covered:</p>
                      <p className="text-sm text-gray-600">{log.topics.join(', ')}</p>
                    </div>
                    
                    {log.homework && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Homework:</p>
                        <p className="text-sm text-gray-600">{log.homework}</p>
                      </div>
                    )}
                    
                    {log.notes && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Teacher's Notes:</p>
                        <p className="text-sm text-gray-600 italic">"{log.notes}"</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>📅</span>
                <span>Upcoming Classes</span>
              </CardTitle>
              <CardDescription>Your children's class schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingClasses.map((cls) => (
                <div key={cls.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-emerald-100 text-emerald-600 text-xs">
                        {cls.studentName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium text-gray-900">{cls.studentName}</h4>
                      <p className="text-sm text-gray-600">{cls.subject} • {cls.teacher}</p>
                      <p className="text-xs text-gray-500">Topic: {cls.topic}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{cls.date}</p>
                    <p className="text-xs text-gray-500">{cls.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="flex items-center justify-between">
            <Card className="flex-1 mr-4">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>💳</span>
                  <span>Payment History</span>
                </CardTitle>
                <CardDescription>Track all payments and dues</CardDescription>
              </CardHeader>
            </Card>
            <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <span className="mr-2">💰</span>
                  Make Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Make Payment</DialogTitle>
                  <DialogDescription>
                    Pay tuition fees for your children
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="child-select">Select Child</Label>
                    <Select>
                      <SelectTrigger>
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
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input id="amount" type="number" placeholder="Enter amount" />
                  </div>
                  <div>
                    <Label htmlFor="period">Payment For</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Current Month</SelectItem>
                        <SelectItem value="advance">Advance Payment</SelectItem>
                        <SelectItem value="overdue">Overdue Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setPaymentDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setPaymentDialog(false)}>
                      Proceed to Pay
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {paymentHistory.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                          {payment.studentName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium text-gray-900">{payment.studentName}</h4>
                        <p className="text-sm text-gray-600">{payment.subject}</p>
                        <p className="text-xs text-gray-500">{payment.period}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">₹{payment.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{payment.date}</p>
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

        <TabsContent value="messages" className="space-y-4">
          <div className="flex items-center justify-between">
            <Card className="flex-1 mr-4">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>💬</span>
                  <span>Messages</span>
                </CardTitle>
                <CardDescription>Communicate with teachers</CardDescription>
              </CardHeader>
            </Card>
            <Dialog open={messageDialog} onOpenChange={setMessageDialog}>
              <DialogTrigger asChild>
                <Button>
                  <span className="mr-2">✉️</span>
                  New Message
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Message</DialogTitle>
                  <DialogDescription>
                    Send a message to your child's teacher
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="teacher-select">Select Teacher</Label>
                    <Select>
                      <SelectTrigger>
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
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" placeholder="Message subject" />
                  </div>
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea 
                      id="message" 
                      placeholder="Type your message here..." 
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setMessageDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setMessageDialog(false)}>
                      Send Message
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💬</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                <p className="text-gray-600 mb-4">Start a conversation with your child's teachers</p>
                <Button onClick={() => setMessageDialog(true)}>
                  Send First Message
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}