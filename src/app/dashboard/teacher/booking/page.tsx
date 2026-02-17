'use client'

import { useUser } from '@/app/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { AlertCircle, BarChart3, Calendar, Clock, Plus, Settings, Users } from 'lucide-react'

// Import existing booking management components
import TeacherScheduleView from '@/components/TeacherScheduleView'
import BookingAnalyticsDashboard from '@/components/BookingAnalyticsDashboard'
import AvailabilityModal from '@/components/AvailabilityModal'
import ConflictResolutionModal from '@/components/ConflictResolutionModal'
import RecurringSlotModal from '@/components/RecurringSlotModal'
import WaitlistModal from '@/components/WaitlistModal'
import StudentManagementPanel from '@/components/StudentManagementPanel'

// Student Booking Management Component
function StudentBookingManagement({ teacherId }: { teacherId: string }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch enrolled students
  const fetchStudents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/teacher/students')
      
      if (!response.ok) {
        throw new Error('Failed to fetch students')
      }
      
      const data = await response.json()
      setStudents(data.students || [])
    } catch (error) {
      console.error('Error fetching students:', error)
      setError(error instanceof Error ? error.message : 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [teacherId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Student Booking Management
          </CardTitle>
          <CardDescription>
            Generate shareable booking links for your enrolled students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading students...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Student Booking Management
          </CardTitle>
          <CardDescription>
            Generate shareable booking links for your enrolled students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Students</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchStudents} variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Student Booking Management
          </CardTitle>
          <CardDescription>
            Generate shareable booking links for your enrolled students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Enrolled</h3>
            <p className="text-gray-600 mb-4">
              You need to have enrolled students to generate booking links
            </p>
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Manage Students
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Student Booking Management
        </CardTitle>
        <CardDescription>
          Generate and manage shareable booking links for your {students.length} enrolled students
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StudentManagementPanel
          students={students}
          teacherId={teacherId}
          onStudentUpdate={fetchStudents}
        />
      </CardContent>
    </Card>
  )
}

export default function BookingManagementPage() {
  const user = useUser()
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [showRecurringModal, setShowRecurringModal] = useState(false)
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              Booking Management
            </h1>
            <p className="text-gray-600 mt-2">
              Create schedules, generate student booking links, and track analytics
            </p>
          </div>
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setShowAvailabilityModal(true)}
            className="bg-blue-600 hover:bg-blue-700 shadow-md"
          >
            <Clock className="h-4 w-4 mr-2" />
            Quick Availability
          </Button>
          <Button
            onClick={() => setShowRecurringModal(true)}
            className="bg-green-600 hover:bg-green-700 shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            Recurring Slots
          </Button>
        </div>
      </div>

      {/* Main Content - Using existing booking system components */}
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger 
            value="schedule" 
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-medium transition-all"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </TabsTrigger>
          <TabsTrigger 
            value="management" 
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-medium transition-all"
          >
            <Users className="h-4 w-4 mr-2" />
            Student Links
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-medium transition-all"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="conflicts" 
            className="data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-medium transition-all"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Conflicts & Waitlist
          </TabsTrigger>
        </TabsList>

        {/* Interactive Schedule Tab - Consolidated scheduling interface */}
        <TabsContent value="schedule" className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <TeacherScheduleView teacherId={user.id} user={user} />
          </div>
        </TabsContent>

        <TabsContent value="management" className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <StudentBookingManagement teacherId={user.id} />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <BookingAnalyticsDashboard teacherId={user.id} />
          </div>
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Conflict Resolution Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    Booking Conflicts
                  </h3>
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-3">No active conflicts detected</p>
                    <Button
                      onClick={() => setShowConflictModal(true)}
                      variant="outline"
                      size="sm"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Conflict Tools
                    </Button>
                  </div>
                </div>

                {/* Waitlist Management Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Student Waitlist
                  </h3>
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <Users className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-3">No students waiting</p>
                    <Button
                      onClick={() => setShowWaitlistModal(true)}
                      variant="outline"
                      size="sm"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage Waitlist
                    </Button>
                  </div>
                </div>
              </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals - Using existing modal components */}
      <AvailabilityModal
        open={showAvailabilityModal}
        onOpenChange={setShowAvailabilityModal}
        teacherId={user.id}
        onAvailabilityUpdated={() => {}}
      />

      <ConflictResolutionModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        conflicts={[]}
        proposedSlots={[]}
        onResolved={() => {}}
      />

      <RecurringSlotModal
        isOpen={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
        onSuccess={() => {}}
        mode="create"
      />

      <WaitlistModal
        isOpen={showWaitlistModal}
        onClose={() => setShowWaitlistModal(false)}
        onUpdate={() => {}}
        teacherId={user.id}
        mode="teacher"
      />
    </div>
  )
}