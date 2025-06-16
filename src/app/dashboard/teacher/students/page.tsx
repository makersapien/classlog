'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { PlusCircle, Users, AlertTriangle, CheckCircle, Settings } from 'lucide-react'
import AddStudentModal from '@/components/AddStudentModal'

// Types for our data
interface Student {
  id: string
  student_name: string
  parent_name: string
  parent_email: string
  subject: string
  year_group: string
  classes_per_week: number
  classes_per_recharge: number
  whatsapp_group_url?: string
  google_meet_url?: string
  setup_completed: boolean
  enrollment_date: string
  status: string
}

interface StudentsStats {
  totalStudents: number
  completeSetup: number
  incompleteSetup: number
  pendingInvitations: number
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [stats, setStats] = useState<StudentsStats>({
    totalStudents: 0,
    completeSetup: 0,
    incompleteSetup: 0,
    pendingInvitations: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddStudent, setShowAddStudent] = useState(false)

  // Fetch students data
  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/teacher/students')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setStudents(data.students || [])
      setStats(data.stats || {
        totalStudents: 0,
        completeSetup: 0,
        incompleteSetup: 0,
        pendingInvitations: 0
      })
    } catch (err) {
      console.error('Failed to fetch students:', err)
      setError(err instanceof Error ? err.message : 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const getSetupProgress = (student: Student) => {
    let completed = 0
    const total = 4

    if (student.student_name && student.parent_name) completed += 1
    if (student.subject && student.year_group) completed += 1
    if (student.whatsapp_group_url) completed += 1
    if (student.google_meet_url) completed += 1

    return { completed, total, percentage: (completed / total) * 100 }
  }

  const getSetupStatus = (student: Student) => {
    const progress = getSetupProgress(student)
    if (progress.completed === progress.total) {
      return { label: 'Complete', color: 'bg-green-100 text-green-800', icon: CheckCircle }
    }
    if (progress.completed >= 2) {
      return { label: 'Partial', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle }
    }
    return { label: 'Incomplete', color: 'bg-red-100 text-red-800', icon: AlertTriangle }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <Button onClick={fetchStudents} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-600" />
            My Students
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your students and track their setup progress
          </p>
        </div>
        <Button 
          onClick={() => setShowAddStudent(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Complete Setup</p>
                <p className="text-2xl font-bold text-green-600">{stats.completeSetup}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Needs Setup</p>
                <p className="text-2xl font-bold text-orange-600">{stats.incompleteSetup}</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Invites</p>
                <p className="text-2xl font-bold text-purple-600">{stats.pendingInvitations}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <PlusCircle className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Setup Reminders */}
      {stats.incompleteSetup > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">{stats.incompleteSetup} students</span> need complete setup. 
            Add WhatsApp Group and Google Meet URLs for full ClassLogger functionality.
          </AlertDescription>
        </Alert>
      )}

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Students List
          </CardTitle>
          <CardDescription>
            Manage your students and their class setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No students yet</h3>
              <p className="text-gray-600 mb-4">Start by adding your first student</p>
              <Button 
                onClick={() => setShowAddStudent(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add First Student
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {students.map((student) => {
                const progress = getSetupProgress(student)
                const status = getSetupStatus(student)
                const StatusIcon = status.icon

                return (
                  <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-emerald-100 text-emerald-600 font-semibold">
                          {student.student_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="font-semibold text-gray-900">{student.student_name}</h3>
                          <Badge className={status.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>📚 {student.subject}</span>
                          <span>🎓 {student.year_group}</span>
                          <span>📅 {student.classes_per_week}x/week</span>
                          <span>👨‍👩‍👧‍👦 {student.parent_name}</span>
                        </div>
                        
                        <div className="mt-2 flex items-center space-x-2">
                          <div className="flex-1 max-w-xs">
                            <Progress value={progress.percentage} className="h-2" />
                          </div>
                          <span className="text-xs text-gray-500">
                            {progress.completed}/{progress.total} complete
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-1" />
                        Setup
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Student Modal */}
      <AddStudentModal 
        isOpen={showAddStudent}
        onClose={() => setShowAddStudent(false)}
        onSuccess={() => {
          setShowAddStudent(false)
          fetchStudents() // Refresh the students list
        }}
      />
    </div>
  )
}