// src/components/PrivacySettingsModal.tsx
'use client'

import React, {  useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, Download, Trash2, Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface PrivacySettings {
  hide_student_names_in_calendar: boolean
  allow_student_notes: boolean
  share_booking_analytics: boolean
  data_retention_days: number
  require_booking_confirmation: boolean
  allow_late_cancellations: boolean
  auto_delete_expired_tokens: boolean
  anonymize_old_audit_logs: boolean
}

interface PrivacySettingsModalProps {
  isOpen: boolean
  onClose: () => void
  teacherId: string
}

export default function PrivacySettingsModal({ 
  isOpen, 
  onClose, 
  teacherId 
}: PrivacySettingsModalProps) {
  const [settings, setSettings] = useState<PrivacySettings>({
    hide_student_names_in_calendar: false,
    allow_student_notes: true,
    share_booking_analytics: false,
    data_retention_days: 2555, // 7 years
    require_booking_confirmation: false,
    allow_late_cancellations: false,
    auto_delete_expired_tokens: true,
    anonymize_old_audit_logs: true
  })
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  // Load privacy settings
  useEffect(() => {
    if (isOpen) {
      loadPrivacySettings()
    }
  }, [isOpen])

  const loadPrivacySettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/privacy/settings')
      
      if (!response.ok) {
        throw new Error('Failed to load privacy settings')
      }
      
      const data = await response.json()
      if (data.success) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error)
      toast.error('Failed to load privacy settings')
    } finally {
      setLoading(false)
    }
  }

  const savePrivacySettings = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/privacy/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      })
      
      if (!response.ok) {
        throw new Error('Failed to save privacy settings')
      }
      
      const data = await response.json()
      if (data.success) {
        toast.success('Privacy settings saved successfully')
        onClose()
      } else {
        throw new Error(data.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error)
      toast.error('Failed to save privacy settings')
    } finally {
      setSaving(false)
    }
  }

  const exportStudentData = async (studentId: string) => {
    try {
      const response = await fetch('/api/privacy/export-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          teacher_id: teacherId
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to export data')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `student-data-${studentId}-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Student data exported successfully')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export student data')
    }
  }

  const updateSetting = (key: keyof PrivacySettings, value: boolean | number) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-2">Loading privacy settings...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Data Protection Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="data">Data Retention</TabsTrigger>
            <TabsTrigger value="booking">Booking Privacy</TabsTrigger>
            <TabsTrigger value="gdpr">GDPR Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">General Privacy Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Hide student names in calendar</Label>
                    <p className="text-sm text-gray-600">
                      Show only initials or anonymized identifiers in your calendar view
                    </p>
                  </div>
                  <Switch
                    checked={settings.hide_student_names_in_calendar}
                    onCheckedChange={(checked) => updateSetting('hide_student_names_in_calendar', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Allow student notes</Label>
                    <p className="text-sm text-gray-600">
                      Allow students to add notes when booking classes
                    </p>
                  </div>
                  <Switch
                    checked={settings.allow_student_notes}
                    onCheckedChange={(checked) => updateSetting('allow_student_notes', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Share booking analytics</Label>
                    <p className="text-sm text-gray-600">
                      Allow anonymized booking data to be used for platform analytics
                    </p>
                  </div>
                  <Switch
                    checked={settings.share_booking_analytics}
                    onCheckedChange={(checked) => updateSetting('share_booking_analytics', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Data Retention Settings
              </h3>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  These settings control how long student data is retained. Changes affect future data only.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Data retention period (days)</Label>
                  <Input
                    type="number"
                    min="30"
                    max="3650"
                    value={settings.data_retention_days}
                    onChange={(e) => updateSetting('data_retention_days', parseInt(e.target.value))}
                    className="w-32"
                  />
                  <p className="text-sm text-gray-600">
                    How long to keep student data after last activity (30-3650 days)
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auto-delete expired tokens</Label>
                    <p className="text-sm text-gray-600">
                      Automatically deactivate share tokens after retention period
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_delete_expired_tokens}
                    onCheckedChange={(checked) => updateSetting('auto_delete_expired_tokens', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Anonymize old audit logs</Label>
                    <p className="text-sm text-gray-600">
                      Remove personal identifiers from old access logs
                    </p>
                  </div>
                  <Switch
                    checked={settings.anonymize_old_audit_logs}
                    onCheckedChange={(checked) => updateSetting('anonymize_old_audit_logs', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="booking" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Booking Privacy Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Require booking confirmation</Label>
                    <p className="text-sm text-gray-600">
                      Require manual approval for all booking requests
                    </p>
                  </div>
                  <Switch
                    checked={settings.require_booking_confirmation}
                    onCheckedChange={(checked) => updateSetting('require_booking_confirmation', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Allow late cancellations</Label>
                    <p className="text-sm text-gray-600">
                      Allow students to cancel bookings within 24 hours
                    </p>
                  </div>
                  <Switch
                    checked={settings.allow_late_cancellations}
                    onCheckedChange={(checked) => updateSetting('allow_late_cancellations', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gdpr" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">GDPR Compliance Tools</h3>
              
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  These tools help you comply with GDPR data protection requirements.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Data Export</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Export all data for a specific student in JSON format
                  </p>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Student ID" 
                      className="flex-1"
                      id="export-student-id"
                    />
                    <Button 
                      variant="outline"
                      onClick={() => {
                        const input = document.getElementById('export-student-id') as HTMLInputElement
                        if (input.value) {
                          exportStudentData(input.value)
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Data Deletion</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Permanently delete or anonymize student data
                  </p>
                  <Alert className="mb-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This action cannot be undone. Use with caution.
                    </AlertDescription>
                  </Alert>
                  <Button variant="destructive" disabled>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Data (Contact Support)
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={savePrivacySettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
