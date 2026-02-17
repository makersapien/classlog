// src/components/StudentManagementPanel.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { 
  Link, 
  Copy, 
  Mail, 
  Eye,
  EyeOff,
  RefreshCw,
  BarChart3,
  
  
  User,
  ExternalLink
} from 'lucide-react'

interface StudentManagementPanelProps {
  students: Student[]
  teacherId: string
  onStudentUpdate: () => void
}

interface Student {
  id: string
  student_id: string
  student_name: string
  parent_name: string
  parent_email: string
  subject: string
  year_group: string
  classes_per_week: number
  classes_per_recharge: number
  tentative_schedule: string | { note: string } | null
  whatsapp_group_url: string | null
  google_meet_url: string | null
  setup_completed: boolean
  enrollment_date: string
  status: string
  class_name: string
}

interface ShareLinkData {
  has_token: boolean
  token?: string
  share_url?: string
  created_at?: string
  expires_at?: string
  access_count?: number
  last_accessed?: string
  is_expired?: boolean
}

interface TokenAnalytics {
  total_access_count: number
  tokens_with_recent_access: number
  booking_stats: {
    total_bookings: number
    confirmed_bookings: number
    completed_bookings: number
    cancelled_bookings: number
  }
}

// Color themes for students
const studentThemes = {
  red: { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-800', badge: 'bg-red-500' },
  blue: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800', badge: 'bg-blue-500' },
  purple: { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-800', badge: 'bg-purple-500' },
  amber: { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-800', badge: 'bg-amber-500' },
  emerald: { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-800', badge: 'bg-emerald-500' },
  pink: { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-800', badge: 'bg-pink-500' },
  indigo: { bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-800', badge: 'bg-indigo-500' },
  teal: { bg: 'bg-teal-100', border: 'border-teal-500', text: 'text-teal-800', badge: 'bg-teal-500' }
}

export default function StudentManagementPanel({ 
  students, 
  onStudentUpdate 
}: StudentManagementPanelProps) {
  void onStudentUpdate
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showShareLinkModal, setShowShareLinkModal] = useState(false)
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [shareLinkData, setShareLinkData] = useState<ShareLinkData | null>(null)
  const [analytics, setAnalytics] = useState<TokenAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [blurredStudents, setBlurredStudents] = useState<Set<string>>(new Set())

  const { toast } = useToast()

  // Generate consistent theme based on student data
  const getStudentTheme = (student: Student) => {
    // Create a consistent hash from student name and subject
    const hashString = `${student.student_name}-${student.subject}`.toLowerCase()
    let hash = 0
    for (let i = 0; i < hashString.length; i++) {
      const char = hashString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Get theme based on hash
    const themeKeys = Object.keys(studentThemes)
    const themeIndex = Math.abs(hash) % themeKeys.length
    const themeName = themeKeys[themeIndex]
    return studentThemes[themeName as keyof typeof studentThemes]
  }

  // Toggle student blur
  const toggleStudentBlur = (studentId: string) => {
    const newBlurred = new Set(blurredStudents)
    if (newBlurred.has(studentId)) {
      newBlurred.delete(studentId)
    } else {
      newBlurred.add(studentId)
    }
    setBlurredStudents(newBlurred)
  }

  // Fetch share link data
  const fetchShareLinkData = async (studentId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/teacher/students/${studentId}/share-link`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setShareLinkData(data)
      } else {
        throw new Error('Failed to fetch share link data')
      }
    } catch (error) {
      console.error('Error fetching share link:', error)
      toast({
        title: "Error",
        description: "Failed to load share link data",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  // Generate or regenerate share link
  const generateShareLink = async (studentId: string, regenerate = false) => {
    try {
      setLoading(true)
      const endpoint = regenerate 
        ? `/api/teacher/students/${studentId}/regenerate-token`
        : `/api/teacher/students/${studentId}/share-link`
      
      const response = await fetch(endpoint, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setShareLinkData({
          has_token: true,
          token: data.token,
          share_url: data.share_url,
          created_at: data.created_at,
          expires_at: data.expires_at,
          access_count: data.access_count,
          last_accessed: data.last_accessed
        })
        
        toast({
          title: "Success",
          description: regenerate ? "Share link regenerated successfully" : "Share link created successfully",
          duration: 3000,
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate share link')
      }
    } catch (error) {
      console.error('Error generating share link:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to generate share link',
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  // Copy share link to clipboard
  const copyShareLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: "Copied!",
        description: "Share link copied to clipboard",
        duration: 2000,
      })
    } catch (error) {
      console.error('Failed to copy:', error)
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Send share link via email
  const emailShareLink = (url: string, studentName: string, studentEmail?: string) => {
    const subject = encodeURIComponent(`Your ClassLogger Booking Link - ${studentName}`)
    const body = encodeURIComponent(`Hi ${studentName},

Here is your personal booking link to schedule classes:

${url}

You can use this link to:
- View available time slots
- Book your classes
- Cancel bookings (up to 24 hours before)
- See your upcoming classes

Best regards,
Your Teacher`)

    const mailtoUrl = `mailto:${studentEmail || ''}?subject=${subject}&body=${body}`
    window.open(mailtoUrl, '_blank')
  }

  // Fetch analytics data
  const fetchAnalytics = async (studentId?: string) => {
    try {
      setLoading(true)
      const url = studentId 
        ? `/api/teacher/analytics/token-usage?student_id=${studentId}`
        : '/api/teacher/analytics/token-usage'
      
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.analytics)
      } else {
        throw new Error('Failed to fetch analytics')
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle share link modal
  const handleShareLinkClick = async (student: Student) => {
    setSelectedStudent(student)
    setShowShareLinkModal(true)
    await fetchShareLinkData(student.id)
  }

  // Handle analytics modal
  const handleAnalyticsClick = async (student?: Student) => {
    setSelectedStudent(student || null)
    setShowAnalyticsModal(true)
    await fetchAnalytics(student?.id)
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Student Management</h3>
          <p className="text-sm text-gray-600">Manage booking links and student access</p>
        </div>
        <Button
          onClick={() => handleAnalyticsClick()}
          variant="outline"
          className="flex items-center gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          View Analytics
        </Button>
      </div>

      {/* Students Grid */}
      {students.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students yet</h3>
            <p className="text-gray-600">Students will appear here once they&apos;re enrolled in your classes.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map(student => {
            const theme = getStudentTheme(student)
            const isBlurred = blurredStudents.has(student.id)
            
            return (
              <Card key={student.id} className={`border-l-4 ${theme.border} ${theme.bg} hover:shadow-md transition-shadow`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`${isBlurred ? 'blur-sm' : ''}`}>
                      <h4 className={`font-semibold ${theme.text}`}>
                        {student.student_name}
                      </h4>
                      <p className="text-sm text-gray-600">{student.year_group}</p>
                      <p className="text-xs text-gray-500">{student.subject}</p>
                      <p className="text-xs text-gray-400">{student.class_name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className={`w-3 h-3 rounded-full ${theme.badge}`}></div>
                      {student.setup_completed ? (
                        <span className="text-xs text-green-600 font-medium">✓ Setup</span>
                      ) : (
                        <span className="text-xs text-orange-600 font-medium">⚠ Pending</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStudentBlur(student.id)}
                        className="p-1 h-8 w-8"
                        title={isBlurred ? "Show student info" : "Hide student info"}
                      >
                        {isBlurred ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShareLinkClick(student)}
                        className="p-1 h-8 w-8"
                        title="Manage booking link"
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAnalyticsClick(student)}
                        className="p-1 h-8 w-8"
                        title="View analytics"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="text-xs">
                        {student.classes_per_week}/week
                      </Badge>
                      <span className="text-xs text-gray-500" title={student.parent_email}>
                        {student.parent_name}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Share Link Modal */}
      <Dialog open={showShareLinkModal} onOpenChange={setShowShareLinkModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-5 w-5 text-indigo-600" />
              Booking Link for {selectedStudent?.student_name}
            </DialogTitle>
            <DialogDescription>
              Share this link with {selectedStudent?.student_name} to allow them to book their own class slots.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : shareLinkData?.has_token ? (
              <>
                <div>
                  <Label className="text-sm font-medium">🔗 Booking Link:</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
                    <code className="text-sm break-all text-gray-800">
                      {shareLinkData.share_url}
                    </code>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => shareLinkData.share_url && copyShareLink(shareLinkData.share_url)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button
                    onClick={() => shareLinkData.share_url && emailShareLink(
                      shareLinkData.share_url, 
                      selectedStudent?.student_name || '', 
                      selectedStudent?.parent_email
                    )}
                    variant="outline"
                    className="flex-1"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email Link
                  </Button>
                  <Button
                    onClick={() => shareLinkData.share_url && window.open(shareLinkData.share_url, '_blank')}
                    variant="outline"
                    className="px-3"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Settings:</Label>
                    <div className="mt-1 space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Allow booking up to 7 days in advance
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Allow cancellation up to 24h before class
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Analytics:</Label>
                    <div className="mt-1 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Link accessed:</span>
                        <span className="ml-1 font-medium">{shareLinkData.access_count || 0} times</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Last accessed:</span>
                        <span className="ml-1 font-medium">
                          {shareLinkData.last_accessed ? formatDate(shareLinkData.last_accessed) : 'Never'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Created:</span>
                        <span className="ml-1 font-medium">
                          {shareLinkData.created_at ? formatDate(shareLinkData.created_at) : 'Unknown'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Expires:</span>
                        <span className="ml-1 font-medium">
                          {shareLinkData.expires_at ? formatDate(shareLinkData.expires_at) : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => selectedStudent && generateShareLink(selectedStudent.id, true)}
                    variant="outline"
                    disabled={loading}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Link
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <Link className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h4 className="font-medium text-gray-900 mb-2">No booking link yet</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Create a booking link for {selectedStudent?.student_name} to allow them to book classes.
                </p>
                <Button
                  onClick={() => selectedStudent && generateShareLink(selectedStudent.id)}
                  disabled={loading}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Link className="h-4 w-4 mr-2" />
                      Create Booking Link
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setShowShareLinkModal(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Analytics Modal */}
      <Dialog open={showAnalyticsModal} onOpenChange={setShowAnalyticsModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              {selectedStudent ? `Analytics for ${selectedStudent.student_name}` : 'Booking Analytics'}
            </DialogTitle>
            <DialogDescription>
              {selectedStudent 
                ? `Booking and link usage statistics for ${selectedStudent.student_name}`
                : 'Overall booking and link usage statistics for all students'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : analytics ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {analytics.total_access_count}
                    </div>
                    <div className="text-sm text-gray-600">Total Link Access</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {analytics.booking_stats.total_bookings}
                    </div>
                    <div className="text-sm text-gray-600">Total Bookings</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {analytics.booking_stats.confirmed_bookings}
                    </div>
                    <div className="text-sm text-gray-600">Confirmed</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {analytics.booking_stats.completed_bookings}
                    </div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No analytics data available</p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setShowAnalyticsModal(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
