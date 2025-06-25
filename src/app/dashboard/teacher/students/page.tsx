// app/dashboard/teacher/students/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import StudentDetailsModal from '@/components/StudentDetailsModal'

interface StudentData {
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

interface Invitation {
  id: string
  student_name: string
  parent_name: string
  parent_email: string
  subject: string
  year_group: string
  status: string
  created_at: string
  invitation_token: string
}

interface Stats {
  totalStudents: number
  completeSetup: number
  incompleteSetup: number
  pendingInvitations: number
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentData[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    completeSetup: 0,
    incompleteSetup: 0,
    pendingInvitations: 0
  })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    student_name: '',
    student_email: '',
    parent_name: '',
    parent_email: '',
    subject: '',
    year_group: '',
    classes_per_week: 1,
    classes_per_recharge: 4,
    tentative_schedule: '',
    whatsapp_group_url: '',
    google_meet_url: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [currentTab, setCurrentTab] = useState<'students' | 'invitations'>('students')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      console.log('📊 Loading students and invitations data...')
      
      const response = await fetch('/api/teacher/students')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📊 Students API Response:', data)
      
      if (data.success) {
        setStudents(data.students || [])
        setInvitations(data.invitations || [])
        
        // Calculate stats
        const totalStudents = data.students?.length || 0
        const completeSetup = data.students?.filter((s: StudentData) => s.setup_completed).length || 0
        const incompleteSetup = totalStudents - completeSetup
        const pendingInvitations = data.invitations?.filter((i: Invitation) => i.status === 'pending').length || 0
        
        setStats({
          totalStudents,
          completeSetup,
          incompleteSetup,
          pendingInvitations
        })
      } else {
        console.error('❌ API returned success: false', data.error)
      }
    } catch (error) {
      console.error('❌ Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.student_name.trim() || !formData.parent_email.trim()) {
      alert('Please fill in required fields')
      return
    }

    try {
      setSubmitting(true)
      console.log('📤 Submitting invitation:', formData)

      const response = await fetch('/api/teacher/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        console.log('✅ Invitation created successfully')
        alert('Invitation sent successfully!')
        setShowModal(false)
        setFormData({
          student_name: '',
          student_email: '',
          parent_name: '',
          parent_email: '',
          subject: '',
          year_group: '',
          classes_per_week: 1,
          classes_per_recharge: 4,
          tentative_schedule: '',
          whatsapp_group_url: '',
          google_meet_url: ''
        })
        await loadData() // Refresh the data
      } else {
        console.error('❌ Failed to create invitation:', result.error)
        alert(`Failed to send invitation: ${result.error}`)
      }
    } catch (error) {
      console.error('❌ Error submitting invitation:', error)
      alert('Failed to send invitation. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewDetails = (student: StudentData) => {
    setSelectedStudent(student)
    setShowDetailsModal(true)
  }

  const handleUpdateStudent = (updatedStudent: StudentData) => {
    setStudents(students.map(s => 
      s.id === updatedStudent.id ? updatedStudent : s
    ))
    // Recalculate stats
    const totalStudents = students.length
    const completeSetup = students.filter(s => s.setup_completed).length
    const incompleteSetup = totalStudents - completeSetup
    
    setStats(prev => ({
      ...prev,
      completeSetup,
      incompleteSetup
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gradient-to-r from-emerald-200 to-teal-200 rounded-2xl w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-xl">
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-12 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
            <div className="h-96 bg-white rounded-2xl shadow-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Students Management</h1>
            <p className="text-gray-600 text-lg">Manage your students and send invitations</p>
          </div>
          <div className="flex items-center space-x-4">
            <Link 
              href="/dashboard" 
              className="text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg transform hover:scale-105"
            >
              + Add New Student
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 font-medium mb-1">Total Students</p>
                <p className="text-3xl font-bold">{stats.totalStudents}</p>
              </div>
              <div className="text-4xl opacity-80">👥</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 font-medium mb-1">Complete Setup</p>
                <p className="text-3xl font-bold">{stats.completeSetup}</p>
              </div>
              <div className="text-4xl opacity-80">✅</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 font-medium mb-1">Needs Setup</p>
                <p className="text-3xl font-bold">{stats.incompleteSetup}</p>
              </div>
              <div className="text-4xl opacity-80">⚠️</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 font-medium mb-1">Pending Invites</p>
                <p className="text-3xl font-bold">{stats.pendingInvitations}</p>
              </div>
              <div className="text-4xl opacity-80">📧</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50">
            <div className="flex space-x-8">
              <button
                onClick={() => setCurrentTab('students')}
                className={`pb-4 border-b-2 font-semibold transition-colors ${
                  currentTab === 'students'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Active Students ({students.length})
              </button>
              <button
                onClick={() => setCurrentTab('invitations')}
                className={`pb-4 border-b-2 font-semibold transition-colors ${
                  currentTab === 'invitations'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Pending Invitations ({invitations.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            {currentTab === 'students' && (
              <div className="space-y-6">
                {students.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No students yet</h3>
                    <p className="text-gray-600 mb-6">Start by adding your first student to get started.</p>
                    <button
                      onClick={() => setShowModal(true)}
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-200"
                    >
                      Add First Student
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-4 px-3 font-semibold text-gray-900">Student</th>
                          <th className="text-left py-4 px-3 font-semibold text-gray-900">Parent</th>
                          <th className="text-left py-4 px-3 font-semibold text-gray-900">Subject</th>
                          <th className="text-left py-4 px-3 font-semibold text-gray-900">Year Group</th>
                          <th className="text-left py-4 px-3 font-semibold text-gray-900">Setup Status</th>
                          <th className="text-left py-4 px-3 font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => (
                          <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-5 px-3">
                              <div>
                                <div className="font-semibold text-gray-900">{student.student_name}</div>
                                <div className="text-sm text-gray-600">{student.class_name}</div>
                              </div>
                            </td>
                            <td className="py-5 px-3">
                              <div>
                                <div className="font-medium text-gray-900">{student.parent_name}</div>
                                <div className="text-sm text-gray-600">{student.parent_email}</div>
                              </div>
                            </td>
                            <td className="py-5 px-3">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800">
                                {student.subject}
                              </span>
                            </td>
                            <td className="py-5 px-3">
                              <span className="font-medium text-gray-900">{student.year_group}</span>
                            </td>
                            <td className="py-5 px-3">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                student.setup_completed 
                                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800' 
                                  : 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-800'
                              }`}>
                                {student.setup_completed ? '✅ Complete' : '⚠️ Needs Setup'}
                              </span>
                            </td>
                            <td className="py-5 px-3">
                              <button 
                                onClick={() => handleViewDetails(student)}
                                className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 text-sm font-medium transform hover:scale-105"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {currentTab === 'invitations' && (
              <div className="space-y-6">
                {invitations.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📧</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No pending invitations</h3>
                    <p className="text-gray-600">All invitations have been processed or none have been sent yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-4 px-3 font-semibold text-gray-900">Student</th>
                          <th className="text-left py-4 px-3 font-semibold text-gray-900">Parent</th>
                          <th className="text-left py-4 px-3 font-semibold text-gray-900">Subject</th>
                          <th className="text-left py-4 px-3 font-semibold text-gray-900">Status</th>
                          <th className="text-left py-4 px-3 font-semibold text-gray-900">Sent Date</th>
                          <th className="text-left py-4 px-3 font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invitations.map((invitation) => (
                          <tr key={invitation.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-5 px-3">
                              <div className="font-semibold text-gray-900">{invitation.student_name}</div>
                            </td>
                            <td className="py-5 px-3">
                              <div>
                                <div className="font-medium text-gray-900">{invitation.parent_name}</div>
                                <div className="text-sm text-gray-600">{invitation.parent_email}</div>
                              </div>
                            </td>
                            <td className="py-5 px-3">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800">
                                {invitation.subject}
                              </span>
                            </td>
                            <td className="py-5 px-3">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                invitation.status === 'pending' 
                                  ? 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800'
                                  : invitation.status === 'completed'
                                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                                  : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800'
                              }`}>
                                {invitation.status === 'pending' && '⏳ Pending'}
                                {invitation.status === 'completed' && '✅ Completed'}
                                {invitation.status === 'expired' && '❌ Expired'}
                              </span>
                            </td>
                            <td className="py-5 px-3">
                              <div className="text-sm text-gray-600">
                                {new Date(invitation.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="py-5 px-3">
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => {
                                    const inviteUrl = `${window.location.origin}/onboarding/${invitation.invitation_token}`
                                    navigator.clipboard.writeText(inviteUrl)
                                    alert('Invitation link copied to clipboard!')
                                  }}
                                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 text-sm font-medium"
                                >
                                  Copy Link
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-3xl">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/50 transition-all"
              >
                ×
              </button>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Add New Student</h2>
              <p className="text-gray-600">Create an invitation link for a new student enrollment</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Student & Parent Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  👤 Student & Parent Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Student Name *
                    </label>
                    <input
                      type="text"
                      value={formData.student_name}
                      onChange={(e) => setFormData({...formData, student_name: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all"
                      placeholder="Enter student name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Student Email
                    </label>
                    <input
                      type="email"
                      value={formData.student_email}
                      onChange={(e) => setFormData({...formData, student_email: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all"
                      placeholder="Enter student email (optional)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Parent Name
                    </label>
                    <input
                      type="text"
                      value={formData.parent_name}
                      onChange={(e) => setFormData({...formData, parent_name: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all"
                      placeholder="Enter parent name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Parent Email *
                    </label>
                    <input
                      type="email"
                      value={formData.parent_email}
                      onChange={(e) => setFormData({...formData, parent_email: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all"
                      placeholder="Enter parent email"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Class Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  📚 Class Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all"
                      placeholder="e.g., Mathematics, Physics"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Year Group *
                    </label>
                    <input
                      type="text"
                      value={formData.year_group}
                      onChange={(e) => setFormData({...formData, year_group: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all"
                      placeholder="e.g., Year 11, Grade 10"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Classes per Week
                    </label>
                    <input
                      type="number"
                      value={formData.classes_per_week}
                      onChange={(e) => setFormData({...formData, classes_per_week: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all"
                      min="1"
                      max="7"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Classes per Recharge
                    </label>
                    <input
                      type="number"
                      value={formData.classes_per_recharge}
                      onChange={(e) => setFormData({...formData, classes_per_recharge: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all"
                      min="1"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  🔧 Optional Setup (can be completed later)
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tentative Schedule
                    </label>
                    <input
                      type="text"
                      value={formData.tentative_schedule}
                      onChange={(e) => setFormData({...formData, tentative_schedule: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all"
                      placeholder="e.g., Monday 4:00 PM, Wednesday 6:00 PM"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      WhatsApp Group URL
                    </label>
                    <input
                      type="url"
                      value={formData.whatsapp_group_url}
                      onChange={(e) => setFormData({...formData, whatsapp_group_url: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all"
                      placeholder="https://chat.whatsapp.com/..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Google Meet URL
                    </label>
                    <input
                      type="url"
                      value={formData.google_meet_url}
                      onChange={(e) => setFormData({...formData, google_meet_url: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all"
                      placeholder="https://meet.google.com/..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Details Modal */}
      <StudentDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        student={selectedStudent}
        onUpdate={handleUpdateStudent}
      />
    </div>
  )
}