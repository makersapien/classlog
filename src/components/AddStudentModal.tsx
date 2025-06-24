'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, Check, AlertTriangle, Info, Mail, Link2, Clock, Users } from 'lucide-react'

interface AddStudentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  student_name: string
  parent_name: string
  parent_email: string
  subject: string
  year_group: string
  classes_per_week: number
  classes_per_recharge: number
  tentative_schedule: {
    days: string[]
    time: string
  }
  whatsapp_group_url: string
  google_meet_url: string
}

const SUBJECTS = {
  mathematics: 'Mathematics',
  physics_myp: 'Physics (MYP)',
  physics_hl_dp1: 'HL Physics DP1',
  physics_sl_dp1: 'SL Physics DP1', 
  physics_hl_dp2: 'HL Physics DP2',
  physics_sl_dp2: 'SL Physics DP2',
  chemistry_myp: 'Chemistry (MYP)',
  chemistry_hl_dp1: 'HL Chemistry DP1',
  chemistry_sl_dp1: 'SL Chemistry DP1',
  chemistry_hl_dp2: 'HL Chemistry DP2',
  chemistry_sl_dp2: 'SL Chemistry DP2',
  biology_myp: 'Biology (MYP)',
  biology_hl_dp1: 'HL Biology DP1',
  biology_sl_dp1: 'SL Biology DP1',
  biology_hl_dp2: 'HL Biology DP2',
  biology_sl_dp2: 'SL Biology DP2'
}

const YEAR_GROUPS = ['MYP 4', 'MYP 5', 'DP1', 'DP2']

const DAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
]

export default function AddStudentModal({ isOpen, onClose, onSuccess }: AddStudentModalProps) {
  const [formData, setFormData] = useState<FormData>({
    student_name: '',
    parent_name: '',
    parent_email: '',
    subject: '',
    year_group: '',
    classes_per_week: 1,
    classes_per_recharge: 4,
    tentative_schedule: {
      days: [],
      time: ''
    },
    whatsapp_group_url: '',
    google_meet_url: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState<'form' | 'success'>('form')

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError(null)
  }

  const handleScheduleChange = (field: 'days' | 'time', value: any) => {
    setFormData(prev => ({
      ...prev,
      tentative_schedule: {
        ...prev.tentative_schedule,
        [field]: value
      }
    }))
  }

  const toggleDay = (day: string) => {
    const currentDays = formData.tentative_schedule.days
    if (currentDays.includes(day)) {
      handleScheduleChange('days', currentDays.filter(d => d !== day))
    } else {
      handleScheduleChange('days', [...currentDays, day])
    }
  }

  const validateForm = () => {
    if (!formData.student_name.trim()) return 'Student name is required'
    if (!formData.parent_name.trim()) return 'Parent name is required'
    if (!formData.parent_email.trim()) return 'Parent email is required'
    if (!formData.subject) return 'Subject is required'
    if (!formData.year_group) return 'Year group is required'
    if (formData.classes_per_week < 1 || formData.classes_per_week > 7) return 'Classes per week must be between 1-7'
    if (formData.classes_per_recharge < 1) return 'Classes per recharge must be at least 1'
    if (formData.tentative_schedule.days.length === 0) return 'Please select at least one day'
    if (!formData.tentative_schedule.time.trim()) return 'Please specify a time'
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.parent_email)) return 'Please enter a valid email address'
    
    return null
  }

  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/teacher/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create invitation')
      }

      const result = await response.json()
      setInvitationUrl(result.invitation_url)
      setStep('success')

    } catch (err) {
      console.error('Error creating invitation:', err)
      setError(err instanceof Error ? err.message : 'Failed to create invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = async () => {
    if (invitationUrl) {
      try {
        await navigator.clipboard.writeText(invitationUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  const handleClose = () => {
    if (step === 'success') {
      onSuccess()
    }
    onClose()
    // Reset form
    setFormData({
      student_name: '',
      parent_name: '',
      parent_email: '',
      subject: '',
      year_group: '',
      classes_per_week: 1,
      classes_per_recharge: 4,
      tentative_schedule: { days: [], time: '' },
      whatsapp_group_url: '',
      google_meet_url: ''
    })
    setStep('form')
    setError(null)
    setInvitationUrl(null)
  }

  if (step === 'success') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Student Invitation Created!
            </DialogTitle>
            <DialogDescription>
              Share this link with the parent to complete the enrollment
            </DialogDescription>
          </DialogHeader>

          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="text-sm">
                  <p><strong>Student:</strong> {formData.student_name}</p>
                  <p><strong>Parent:</strong> {formData.parent_name}</p>
                  <p><strong>Subject:</strong> {SUBJECTS[formData.subject as keyof typeof SUBJECTS]}</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Label className="text-xs text-gray-600">Invitation Link</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input 
                      value={invitationUrl || ''} 
                      readOnly 
                      className="text-xs"
                    />
                    <Button 
                      onClick={copyToClipboard}
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    This link expires in 7 days. The parent will use it to confirm enrollment and provide additional details.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button onClick={handleClose}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Add New Student
          </DialogTitle>
          <DialogDescription>
            Create a student invitation that will be shared with the parent
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Basic Information</CardTitle>
              <CardDescription className="text-xs">
                Required information about the student and parent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="student_name">Student Name *</Label>
                  <Input
                    id="student_name"
                    value={formData.student_name}
                    onChange={(e) => handleInputChange('student_name', e.target.value)}
                    placeholder="Enter student's full name"
                  />
                </div>
                <div>
                  <Label htmlFor="parent_name">Parent Name *</Label>
                  <Input
                    id="parent_name"
                    value={formData.parent_name}
                    onChange={(e) => handleInputChange('parent_name', e.target.value)}
                    placeholder="Enter parent's full name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="parent_email">Parent Email *</Label>
                <Input
                  id="parent_email"
                  type="email"
                  value={formData.parent_email}
                  onChange={(e) => handleInputChange('parent_email', e.target.value)}
                  placeholder="parent@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Select value={formData.subject} onValueChange={(value) => handleInputChange('subject', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SUBJECTS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="year_group">Year Group *</Label>
                  <Select value={formData.year_group} onValueChange={(value) => handleInputChange('year_group', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_GROUPS.map((year) => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Class Schedule */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Class Schedule
              </CardTitle>
              <CardDescription className="text-xs">
                Set up the class frequency and tentative schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="classes_per_week">Classes per Week *</Label>
                  <Select 
                    value={formData.classes_per_week.toString()} 
                    onValueChange={(value) => handleInputChange('classes_per_week', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7].map(num => (
                        <SelectItem key={num} value={num.toString()}>{num}x per week</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="classes_per_recharge">Classes per Recharge *</Label>
                  <Input
                    id="classes_per_recharge"
                    type="number"
                    min="1"
                    max="50"
                    value={formData.classes_per_recharge}
                    onChange={(e) => handleInputChange('classes_per_recharge', parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div>
                <Label>Tentative Days *</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DAYS.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={formData.tentative_schedule.days.includes(day.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDay(day.value)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="time">Preferred Time *</Label>
                <Input
                  id="time"
                  value={formData.tentative_schedule.time}
                  onChange={(e) => handleScheduleChange('time', e.target.value)}
                  placeholder="e.g., 4:00 PM"
                />
              </div>
            </CardContent>
          </Card>

          {/* Technical Setup */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Technical Setup
                <Badge variant="secondary" className="text-xs">Optional</Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Add these URLs for full ClassLogger functionality. You can add them later too.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="whatsapp_group_url">WhatsApp Group URL</Label>
                <Input
                  id="whatsapp_group_url"
                  value={formData.whatsapp_group_url}
                  onChange={(e) => handleInputChange('whatsapp_group_url', e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                />
                <p className="text-xs text-gray-500 mt-1">Used by ClassLogger bot to monitor attendance</p>
              </div>

              <div>
                <Label htmlFor="google_meet_url">Google Meet URL</Label>
                <Input
                  id="google_meet_url"
                  value={formData.google_meet_url}
                  onChange={(e) => handleInputChange('google_meet_url', e.target.value)}
                  placeholder="https://meet.google.com/..."
                />
                <p className="text-xs text-gray-500 mt-1">Used for online classes and automatic logging</p>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  You can add these URLs later from the student management page. The invitation will work without them.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Create Invitation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}