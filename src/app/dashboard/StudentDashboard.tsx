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
    averageScore: 85
  }

  const todaySchedule = [
    {
      id: 1,
      subject: 'Mathematics',
      teacher: 'Mr. Sharma',
      time: '9:00 AM - 10:00 AM',
      topic: 'Trigonometry',
      status: 'completed',
      room: 'Room 101'
    },
    {
      id: 2,
      subject: 'Physics',
      teacher: 'Mr. Kumar',
      time: '10:30 AM - 11:30 AM',
      topic: 'Wave Motion',
      status: 'completed',
      room: 'Lab 2'
    },
    {
      id: 3,
      subject: 'Chemistry',
      teacher: 'Ms. Gupta',
      time: '2:00 PM - 3:00 PM',
      topic: 'Organic Chemistry',
      status: 'upcoming',
      room: 'Lab 1'
    },
    {
      id: 4,
      subject: 'English',
      teacher: 'Ms. Reddy',
      time: '3:30 PM - 4:30 PM',
      topic: 'Essay Writing',
      status: 'upcoming',
      room: 'Room 205'
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
      description: 'Solve problems 1-15 from Chapter 8'
    },
    {
      id: 2,
      subject: 'Physics',
      title: 'Wave Motion Lab Report',
      dueDate: 'Dec 20',
      status: 'in_progress',
      priority: 'medium',
      description: 'Write lab report on sound wave experiments'
    },
    {
      id: 3,
      subject: 'Chemistry',
      title: 'Organic Chemistry Notes',
      dueDate: 'Dec 22',
      status: 'completed',
      priority: 'low',
      description: 'Prepare detailed notes on hydrocarbon reactions'
    },
    {
      id: 4,
      subject: 'English',
      title: 'Creative Writing Essay',
      dueDate: 'Dec 25',
      status: 'pending',
      priority: 'medium',
      description: 'Write a 500-word creative piece on "Future Cities"'
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
      trend: 'up'
    },
    {
      subject: 'Physics',
      teacher: 'Mr. Kumar',
      currentGrade: 'B+',
      progress: 85,
      lastTest: 82,
      attendance: 90,
      trend: 'up'
    },
    {
      subject: 'Chemistry',
      teacher: 'Ms. Gupta',
      currentGrade: 'A-',
      progress: 88,
      lastTest: 85,
      attendance: 93,
      trend: 'stable'
    },
    {
      subject: 'English',
      teacher: 'Ms. Reddy',
      currentGrade: 'B',
      progress: 78,
      lastTest: 75,
      attendance: 88,
      trend: 'down'
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
      materials: ['Textbook Chapter 8', 'Practice Worksheet']
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
      materials: ['Lab Manual', 'Wave Simulation Video']
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
      materials: ['Molecular Model Kit', 'Chapter 12 Notes']
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
      weightage: '20%'
    },
    {
      id: 2,
      subject: 'Physics',
      type: 'Lab Practical',
      date: 'Dec 24, 2024',
      topics: ['Wave Experiments', 'Sound Analysis'],
      duration: '3 hours',
      weightage: '15%'
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
      case 'completed': return 'bg-green-100 text-green-800'
      case 'upcoming': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'pending': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800'
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800'
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hello, {studentProfile.name}! 🎓
          </h1>
          <p className="text-gray-600 mt-1">
            {studentProfile.grade} • Roll No: {studentProfile.rollNumber}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-emerald-100 text-emerald-800">
            🔥 {studentProfile.currentStreak} day streak
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Attendance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round((studentProfile.attendedClasses / studentProfile.totalClasses) * 100)}%
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <span className="text-xl">📊</span>
              </div>
            </div>
            <Progress 
              value={(studentProfile.attendedClasses / studentProfile.totalClasses) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{studentProfile.averageScore}%</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <span className="text-xl">🎯</span>
              </div>
            </div>
            <Progress value={studentProfile.averageScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Subjects</p>
                <p className="text-2xl font-bold text-gray-900">{studentProfile.subjects.length}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <span className="text-xl">📚</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                <p className="text-2xl font-bold text-orange-600">
                  {recentAssignments.filter(a => a.status === 'pending').length}
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-full">
                <span className="text-xl">📝</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="today" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>📅</span>
                  <span>Today's Classes</span>
                </CardTitle>
                <CardDescription>Your schedule for today</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {todaySchedule.map((cls) => (
                  <div key={cls.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">{cls.subject}</h4>
                        <Badge className={getStatusColor(cls.status)}>
                          {cls.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{cls.time} • {cls.room}</p>
                      <p className="text-xs text-gray-500">{cls.teacher} • {cls.topic}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Class Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>📝</span>
                  <span>Recent Class Logs</span>
                </CardTitle>
                <CardDescription>Latest updates from your classes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentClassLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{log.subject}</h4>
                        <p className="text-sm text-gray-600">{log.teacher} • {log.date} {log.time}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>{getPerformanceEmoji(log.performance)}</span>
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

          {/* Upcoming Tests */}
          {upcomingTests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>🎯</span>
                  <span>Upcoming Tests</span>
                </CardTitle>
                <CardDescription>Prepare for your upcoming assessments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingTests.map((test) => (
                    <div key={test.id} className="border rounded-lg p-4 bg-yellow-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{test.subject}</h4>
                        <Badge variant="outline">{test.type}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{test.date} • {test.duration}</p>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Topics:</strong> {test.topics.join(', ')}
                      </p>
                      <p className="text-xs text-gray-600">Weightage: {test.weightage}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <div className="flex items-center justify-between">
            <Card className="flex-1 mr-4">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>📋</span>
                  <span>Assignments & Homework</span>
                </CardTitle>
                <CardDescription>Track your pending and completed tasks</CardDescription>
              </CardHeader>
            </Card>
            <Dialog open={homeworkDialog} onOpenChange={setHomeworkDialog}>
              <DialogTrigger asChild>
                <Button>
                  <span className="mr-2">✅</span>
                  Submit Work
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Assignment</DialogTitle>
                  <DialogDescription>
                    Submit your completed homework or assignment
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="assignment-select">Select Assignment</Label>
                    <Select>
                      <SelectTrigger>
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
                    <Label htmlFor="submission">Submission Notes</Label>
                    <Textarea 
                      id="submission" 
                      placeholder="Add any notes about your submission..." 
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="file-upload">Upload Files (Optional)</Label>
                    <Input id="file-upload" type="file" multiple />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setHomeworkDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setHomeworkDialog(false)}>
                      Submit
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentAssignments.map((assignment) => (
              <Card key={assignment.id} className={`border-l-4 ${
                assignment.status === 'completed' ? 'border-l-green-500' :
                assignment.status === 'in_progress' ? 'border-l-yellow-500' : 'border-l-red-500'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getStatusColor(assignment.status)}>
                      {assignment.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className={getPriorityColor(assignment.priority)}>
                      {assignment.priority}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{assignment.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{assignment.subject}</p>
                  <p className="text-xs text-gray-500 mb-3">{assignment.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Due: {assignment.dueDate}</span>
                    {assignment.status !== 'completed' && (
                      <Button size="sm" variant="outline">
                        Work on it
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>📈</span>
                <span>Academic Progress</span>
              </CardTitle>
              <CardDescription>Track your performance across all subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progressData.map((subject) => (
                  <div key={subject.subject} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{subject.subject}</h3>
                        <p className="text-sm text-gray-600">{subject.teacher}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getGradeColor(subject.currentGrade)}>
                          {subject.currentGrade}
                        </Badge>
                        <span className="text-lg">{getTrendIcon(subject.trend)}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Overall Progress</p>
                        <p className="text-lg font-semibold text-gray-900">{subject.progress}%</p>
                        <Progress value={subject.progress} className="mt-1" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Last Test</p>
                        <p className="text-lg font-semibold text-gray-900">{subject.lastTest}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Attendance</p>
                        <p className="text-lg font-semibold text-gray-900">{subject.attendance}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
            
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Weekly Schedule</CardTitle>
                <CardDescription>Your complete class timetable</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(weeklySchedule).map(([day, classes]) => (
                    <div key={day} className="border rounded-lg p-3">
                      <h4 className="font-medium text-gray-900 mb-2">{day}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {classes.map((cls, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <span className="font-medium">{cls.time}</span>
                              <p className="text-xs text-gray-600">{cls.subject}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-600">{cls.teacher}</p>
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

        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📚</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Study Materials</h3>
                <p className="text-sm text-gray-600">Access textbooks, notes, and reference materials</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎥</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Video Lectures</h3>
                <p className="text-sm text-gray-600">Watch recorded classes and educational videos</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🧪</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Lab Resources</h3>
                <p className="text-sm text-gray-600">Virtual labs and experiment simulations</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Practice Tests</h3>
                <p className="text-sm text-gray-600">Take mock tests and practice questions</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💬</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Discussion Forum</h3>
                <p className="text-sm text-gray-600">Ask questions and discuss with classmates</p>
              </CardContent>
            </Card>

            <Dialog open={messageDialog} onOpenChange={setMessageDialog}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">✉️</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Message Teacher</h3>
                    <p className="text-sm text-gray-600">Send messages to your teachers</p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Message to Teacher</DialogTitle>
                  <DialogDescription>
                    Contact your teacher with questions or concerns
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
                        <SelectItem value="kumar">Mr. Kumar - Physics</SelectItem>
                        <SelectItem value="gupta">Ms. Gupta - Chemistry</SelectItem>
                        <SelectItem value="reddy">Ms. Reddy - English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" placeholder="What is this about?" />
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

          {/* Quick Access to Recent Materials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>📂</span>
                <span>Recent Materials</span>
              </CardTitle>
              <CardDescription>Recently shared study materials from your teachers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentMaterials.map((material) => (
                  <div key={material.id} className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-lg">{getFileTypeIcon(material.type)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{material.title}</h4>
                        <p className="text-xs text-gray-500">{material.subject} • {material.teacher}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-400">{material.uploadedAt}</p>
                          <p className="text-xs text-gray-400">{material.size}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <Separator className="my-4" />
              
              <div className="text-center">
                <Button variant="outline" className="w-full">
                  <span className="mr-2">📁</span>
                  View All Materials
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Study Tips & Resources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>💡</span>
                <span>Study Tips & Resources</span>
              </CardTitle>
              <CardDescription>Helpful resources to improve your learning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="border rounded-lg p-3 bg-blue-50">
                    <h4 className="font-medium text-blue-900 mb-1">📖 Active Reading Tips</h4>
                    <p className="text-sm text-blue-700">Take notes while reading and summarize each chapter in your own words.</p>
                  </div>
                  
                  <div className="border rounded-lg p-3 bg-green-50">
                    <h4 className="font-medium text-green-900 mb-1">🎯 Goal Setting</h4>
                    <p className="text-sm text-green-700">Break large assignments into smaller, manageable tasks with deadlines.</p>
                  </div>
                  
                  <div className="border rounded-lg p-3 bg-purple-50">
                    <h4 className="font-medium text-purple-900 mb-1">🧠 Memory Techniques</h4>
                    <p className="text-sm text-purple-700">Use mnemonics, flashcards, and spaced repetition for better retention.</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="border rounded-lg p-3 bg-yellow-50">
                    <h4 className="font-medium text-yellow-900 mb-1">⏰ Time Management</h4>
                    <p className="text-sm text-yellow-700">Use the Pomodoro technique: 25 minutes focused study, 5 minutes break.</p>
                  </div>
                  
                  <div className="border rounded-lg p-3 bg-red-50">
                    <h4 className="font-medium text-red-900 mb-1">🤝 Study Groups</h4>
                    <p className="text-sm text-red-700">Form study groups with classmates to discuss difficult concepts.</p>
                  </div>
                  
                  <div className="border rounded-lg p-3 bg-indigo-50">
                    <h4 className="font-medium text-indigo-900 mb-1">💤 Rest & Recovery</h4>
                    <p className="text-sm text-indigo-700">Get 7-9 hours of sleep and take regular breaks to maintain focus.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}