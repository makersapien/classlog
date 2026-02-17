// src/components/ConflictResolutionModal.tsx
'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Calendar,  Clock, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'

interface ConflictInfo {
  slot: {
    day_of_week: string
    start_time: string
    end_time: string
    date?: string
  }
  time_slot_conflicts: Array<{
    id: string
    day_of_week?: string
    start_time?: string
    end_time?: string
    subject?: string
  }>
  schedule_slot_conflicts: Array<{
    id?: string
    date?: string
    start_time?: string
    end_time?: string
    status?: string
    subject?: string
  }>
  blocked_slot_conflicts: Array<{
    id?: string
    date?: string
    day_of_week?: string
    start_time?: string
    end_time?: string
    reason?: string
  }>
}

interface ResolutionSuggestion {
  time_range: string
  reason: string
  confidence: 'high' | 'medium' | 'low'
}

interface ConflictResolutionModalProps {
  isOpen: boolean
  onClose: () => void
  onResolved: () => void
  conflicts: ConflictInfo[]
  proposedSlots: unknown[]
}

const RESOLUTION_STRATEGIES = [
  { value: 'suggest_alternatives', label: 'Suggest Alternative Times', description: 'Find nearby available time slots' },
  { value: 'auto_adjust', label: 'Auto-Adjust Times', description: 'Automatically adjust times to avoid conflicts' },
  { value: 'force_override', label: 'Force Override', description: 'Create slots despite conflicts (not recommended)' }
]

const ADJUSTMENT_PREFERENCES = {
  preferred_direction: [
    { value: 'earlier', label: 'Earlier' },
    { value: 'later', label: 'Later' },
    { value: 'any', label: 'Any Direction' }
  ],
  max_adjustment_minutes: [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' }
  ]
}

export default function ConflictResolutionModal({
  isOpen,
  onClose,
  onResolved,
  conflicts,
  proposedSlots
}: ConflictResolutionModalProps) {
  void proposedSlots
  const [activeTab, setActiveTab] = useState('conflicts')
  const [resolutionStrategy, setResolutionStrategy] = useState('suggest_alternatives')
  const [adjustmentPreferences, setAdjustmentPreferences] = useState({
    preferred_direction: 'any',
    max_adjustment_minutes: 60,
    allow_day_change: false
  })
  const [suggestions, setSuggestions] = useState<Record<string, ResolutionSuggestion[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isResolving, setIsResolving] = useState(false)

  const getConflictSeverity = (conflict: ConflictInfo) => {
    const totalConflicts = 
      conflict.time_slot_conflicts.length + 
      conflict.schedule_slot_conflicts.length + 
      conflict.blocked_slot_conflicts.length
    
    if (totalConflicts >= 3) return 'high'
    if (totalConflicts >= 2) return 'medium'
    return 'low'
  }

  // const getConflictTypeLabel = (type: string) => {
  //   switch (type) {
  //     case 'time_slot_conflicts': return 'Time Slot Template'
  //     case 'schedule_slot_conflicts': return 'Scheduled Class'
  //     case 'blocked_slot_conflicts': return 'Blocked Period'
  //     default: return type
  //   }
  // }

  const getSuggestions = async () => {
    if (resolutionStrategy !== 'suggest_alternatives') return

    setIsLoading(true)
    try {
      // Prepare conflicts for resolution API
      const conflictsForResolution = conflicts.flatMap(conflict => 
        conflict.time_slot_conflicts.map(tc => ({
          type: 'time_overlap' as const,
          conflicting_slot_id: tc.id,
          proposed_slot: conflict.slot
        }))
      )

      const response = await fetch('/api/timeslots/conflicts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflicts: conflictsForResolution,
          resolution_strategy: 'suggest_alternatives',
          adjustment_preferences: adjustmentPreferences
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get suggestions')
      }

      // Process suggestions
      const newSuggestions: Record<string, ResolutionSuggestion[]> = {}
      data.resolutions.forEach((resolution: unknown, index: number) => {
        void index
        const conflictKey = conflicts[index]
          ? `${conflicts[index].slot.day_of_week}-${conflicts[index].slot.start_time}`
          : `conflict-${index}`
        const resolutionData = resolution as { suggestions: string[] }
        newSuggestions[conflictKey] = resolutionData.suggestions.map((suggestion: string) => ({
          time_range: suggestion,
          reason: 'Available time slot found',
          confidence: 'high' as const
        }))
      })

      setSuggestions(newSuggestions)
      setActiveTab('suggestions')
    } catch (error) {
      console.error('Suggestions error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to get suggestions')
    } finally {
      setIsLoading(false)
    }
  }

  const resolveConflicts = async () => {
    setIsResolving(true)
    try {
      // Prepare conflicts for resolution API
      const conflictsForResolution = conflicts.flatMap(conflict => 
        conflict.time_slot_conflicts.map(tc => ({
          type: 'time_overlap' as const,
          conflicting_slot_id: tc.id,
          proposed_slot: conflict.slot
        }))
      )

      const response = await fetch('/api/timeslots/conflicts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflicts: conflictsForResolution,
          resolution_strategy: resolutionStrategy,
          adjustment_preferences: adjustmentPreferences
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resolve conflicts')
      }

      const resolvedCount = data.total_resolved
      toast.success(`Successfully resolved ${resolvedCount} conflicts`)
      onResolved()
      onClose()
    } catch (error) {
      console.error('Resolution error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to resolve conflicts')
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Resolve Scheduling Conflicts
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="conflicts">Conflicts ({conflicts.length})</TabsTrigger>
            <TabsTrigger value="resolution">Resolution Strategy</TabsTrigger>
            <TabsTrigger value="suggestions" disabled={!suggestions || Object.keys(suggestions).length === 0}>
              Suggestions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conflicts" className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                The following conflicts were detected with your proposed time slots. 
                Review each conflict and choose a resolution strategy.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              {conflicts.map((conflict, index) => {
                const severity = getConflictSeverity(conflict)
                // const conflictKey = `${conflict.slot.day_of_week}-${conflict.slot.start_time}`
                
                return (
                  <Card key={index} className={`border-l-4 ${
                    severity === 'high' ? 'border-l-red-500' : 
                    severity === 'medium' ? 'border-l-orange-500' : 
                    'border-l-yellow-500'
                  }`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {conflict.slot.day_of_week} {conflict.slot.start_time} - {conflict.slot.end_time}
                          {conflict.slot.date && (
                            <Badge variant="outline">{conflict.slot.date}</Badge>
                          )}
                        </div>
                        <Badge variant={
                          severity === 'high' ? 'destructive' : 
                          severity === 'medium' ? 'default' : 
                          'secondary'
                        }>
                          {severity} priority
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Time Slot Conflicts */}
                      {conflict.time_slot_conflicts.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            Time Slot Template Conflicts ({conflict.time_slot_conflicts.length})
                          </h4>
                          <div className="space-y-1">
                            {conflict.time_slot_conflicts.map((tc, tcIndex) => (
                              <div key={tcIndex} className="text-sm text-muted-foreground bg-muted p-2 rounded">
                                {tc.day_of_week} {tc.start_time} - {tc.end_time}
                                {tc.subject && ` (${tc.subject})`}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Schedule Slot Conflicts */}
                      {conflict.schedule_slot_conflicts.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            Scheduled Class Conflicts ({conflict.schedule_slot_conflicts.length})
                          </h4>
                          <div className="space-y-1">
                            {conflict.schedule_slot_conflicts.map((sc, scIndex) => (
                              <div key={scIndex} className="text-sm text-muted-foreground bg-muted p-2 rounded">
                                {sc.date} {sc.start_time} - {sc.end_time}
                                <Badge variant="outline" className="ml-2">{sc.status}</Badge>
                                {sc.subject && ` (${sc.subject})`}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Blocked Slot Conflicts */}
                      {conflict.blocked_slot_conflicts.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-3 w-3" />
                            Blocked Period Conflicts ({conflict.blocked_slot_conflicts.length})
                          </h4>
                          <div className="space-y-1">
                            {conflict.blocked_slot_conflicts.map((bc, bcIndex) => (
                              <div key={bcIndex} className="text-sm text-muted-foreground bg-muted p-2 rounded">
                                {bc.date || bc.day_of_week} {bc.start_time} - {bc.end_time}
                                {bc.reason && ` - ${bc.reason}`}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="resolution" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Choose Resolution Strategy</h3>
              
              <div className="space-y-3">
                {RESOLUTION_STRATEGIES.map((strategy) => (
                  <Card 
                    key={strategy.value}
                    className={`cursor-pointer transition-colors ${
                      resolutionStrategy === strategy.value ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setResolutionStrategy(strategy.value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 mt-0.5 ${
                          resolutionStrategy === strategy.value 
                            ? 'bg-primary border-primary' 
                            : 'border-muted-foreground'
                        }`} />
                        <div>
                          <h4 className="font-medium">{strategy.label}</h4>
                          <p className="text-sm text-muted-foreground">{strategy.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {(resolutionStrategy === 'suggest_alternatives' || resolutionStrategy === 'auto_adjust') && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Adjustment Preferences</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Preferred Direction</Label>
                    <Select
                      value={adjustmentPreferences.preferred_direction}
                      onValueChange={(value) => setAdjustmentPreferences(prev => ({
                        ...prev,
                        preferred_direction: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ADJUSTMENT_PREFERENCES.preferred_direction.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Maximum Adjustment</Label>
                    <Select
                      value={adjustmentPreferences.max_adjustment_minutes.toString()}
                      onValueChange={(value) => setAdjustmentPreferences(prev => ({
                        ...prev,
                        max_adjustment_minutes: parseInt(value)
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ADJUSTMENT_PREFERENCES.max_adjustment_minutes.map(option => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {resolutionStrategy === 'suggest_alternatives' && (
              <div className="flex justify-center">
                <Button onClick={getSuggestions} disabled={isLoading}>
                  {isLoading ? 'Generating Suggestions...' : 'Get Suggestions'}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-4">
            {Object.keys(suggestions).length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  <h3 className="text-lg font-medium">Alternative Time Suggestions</h3>
                </div>

                {Object.entries(suggestions).map(([conflictKey, conflictSuggestions]) => (
                  <Card key={conflictKey}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {conflictKey.replace('-', ' ')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {conflictSuggestions.length > 0 ? (
                        <div className="space-y-2">
                          {conflictSuggestions.map((suggestion, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium">{suggestion.time_range}</span>
                                <span className="text-sm text-muted-foreground">{suggestion.reason}</span>
                              </div>
                              <Badge variant={
                                suggestion.confidence === 'high' ? 'default' :
                                suggestion.confidence === 'medium' ? 'secondary' :
                                'outline'
                              }>
                                {suggestion.confidence} confidence
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No alternative times found for this slot.</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Click &quot;Get Suggestions&quot; in the Resolution Strategy tab to see alternative times.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          
          <Button
            onClick={resolveConflicts}
            disabled={isResolving}
            variant={resolutionStrategy === 'force_override' ? 'destructive' : 'default'}
          >
            {isResolving ? 'Resolving...' : 
             resolutionStrategy === 'force_override' ? 'Force Create' : 
             'Resolve Conflicts'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
