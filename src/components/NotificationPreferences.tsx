'use client'

import React, { useState, useEffect } from 'react'
import { Settings, Mail, Bell, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface NotificationPreferences {
  email_booking_confirmation: boolean
  email_booking_cancellation: boolean
  email_class_reminders: boolean
  email_weekly_summary: boolean
  inapp_booking_activity: boolean
  inapp_class_reminders: boolean
  inapp_system_notifications: boolean
  reminder_24h_enabled: boolean
  reminder_1h_enabled: boolean
}

interface NotificationPreferencesProps {
  userId: string
  userRole: 'teacher' | 'student' | 'parent'
}

export function NotificationPreferences({ userId, userRole }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_booking_confirmation: true,
    email_booking_cancellation: true,
    email_class_reminders: true,
    email_weekly_summary: userRole === 'teacher',
    inapp_booking_activity: true,
    inapp_class_reminders: true,
    inapp_system_notifications: true,
    reminder_24h_enabled: true,
    reminder_1h_enabled: true
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPreferences()
  }, [userId])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/notifications/preferences?userId=${userId}&role=${userRole}`)
      if (response.ok) {
        const data = await response.json()
        if (data.preferences) {
          setPreferences(data.preferences)
        }
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
      toast.error('Failed to load notification preferences')
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userRole,
          preferences
        })
      })
      
      if (response.ok) {
        toast.success('Notification preferences saved')
      } else {
        throw new Error('Failed to save preferences')
      }
    } catch (error) {
      console.error('Failed to save notification preferences:', error)
      toast.error('Failed to save notification preferences')
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <p className="text-sm text-gray-600">
          Manage how you receive notifications about your classes and bookings
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-4 w-4 text-blue-600" />
            <h3 className="font-medium">Email Notifications</h3>
          </div>
          <div className="space-y-3 ml-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="email_booking_confirmation" className="text-sm">
                Booking confirmations
              </Label>
              <Switch
                id="email_booking_confirmation"
                checked={preferences.email_booking_confirmation}
                onCheckedChange={(checked) => updatePreference('email_booking_confirmation', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email_booking_cancellation" className="text-sm">
                Booking cancellations
              </Label>
              <Switch
                id="email_booking_cancellation"
                checked={preferences.email_booking_cancellation}
                onCheckedChange={(checked) => updatePreference('email_booking_cancellation', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email_class_reminders" className="text-sm">
                Class reminders
              </Label>
              <Switch
                id="email_class_reminders"
                checked={preferences.email_class_reminders}
                onCheckedChange={(checked) => updatePreference('email_class_reminders', checked)}
              />
            </div>
            {userRole === 'teacher' && (
              <div className="flex items-center justify-between">
                <Label htmlFor="email_weekly_summary" className="text-sm">
                  Weekly class summary
                </Label>
                <Switch
                  id="email_weekly_summary"
                  checked={preferences.email_weekly_summary}
                  onCheckedChange={(checked) => updatePreference('email_weekly_summary', checked)}
                />
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* In-App Notifications */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-green-600" />
            <h3 className="font-medium">In-App Notifications</h3>
          </div>
          <div className="space-y-3 ml-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="inapp_booking_activity" className="text-sm">
                Booking activity
              </Label>
              <Switch
                id="inapp_booking_activity"
                checked={preferences.inapp_booking_activity}
                onCheckedChange={(checked) => updatePreference('inapp_booking_activity', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="inapp_class_reminders" className="text-sm">
                Class reminders
              </Label>
              <Switch
                id="inapp_class_reminders"
                checked={preferences.inapp_class_reminders}
                onCheckedChange={(checked) => updatePreference('inapp_class_reminders', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="inapp_system_notifications" className="text-sm">
                System notifications
              </Label>
              <Switch
                id="inapp_system_notifications"
                checked={preferences.inapp_system_notifications}
                onCheckedChange={(checked) => updatePreference('inapp_system_notifications', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Reminder Settings */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-orange-600" />
            <h3 className="font-medium">Reminder Settings</h3>
          </div>
          <div className="space-y-3 ml-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="reminder_24h_enabled" className="text-sm">
                24-hour reminders
              </Label>
              <Switch
                id="reminder_24h_enabled"
                checked={preferences.reminder_24h_enabled}
                onCheckedChange={(checked) => updatePreference('reminder_24h_enabled', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="reminder_1h_enabled" className="text-sm">
                1-hour reminders
              </Label>
              <Switch
                id="reminder_1h_enabled"
                checked={preferences.reminder_1h_enabled}
                onCheckedChange={(checked) => updatePreference('reminder_1h_enabled', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={savePreferences} 
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </div>
            ) : (
              'Save Preferences'
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <p className="font-medium mb-1">💡 Tips:</p>
          <ul className="space-y-1">
            <li>• Email notifications are sent to your registered email address</li>
            <li>• In-app notifications appear in the notification center</li>
            <li>• Reminders help you stay on top of your scheduled classes</li>
            {userRole === 'teacher' && (
              <li>• Weekly summaries are sent every Sunday with your upcoming classes</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
