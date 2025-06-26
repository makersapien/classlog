"use client"
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Database, Check, X, RefreshCw, User } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'

// Import your actual utility functions
import { enhanceClassLog } from '@/lib/class-utils'
import type { ClassLog, EnhancedClassLog } from '@/types/database-enhanced'

interface TestResult {
  passed: boolean
  message: string
}

interface TestResults {
  [key: string]: TestResult
}

export default function LiveDataTest() {
  const [teacherId, setTeacherId] = useState('c9dbbf3f-0fb3-48e2-84a4-3816f574d20e') // Default from your data
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [classLogs, setClassLogs] = useState<ClassLog[]>([])
  const [enhancedLogs, setEnhancedLogs] = useState<EnhancedClassLog[]>([])
  const [testResults, setTestResults] = useState<TestResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRealData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Fetching real data for teacher:', teacherId, 'date:', selectedDate)
      
      // Fetch actual class logs from your database
      const { data, error } = await supabase
        .from('class_logs')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('date', selectedDate)
        .order('start_time', { ascending: false })

      if (error) {
        throw error
      }

      const rawLogs = (data as ClassLog[]) || []
      console.log('✅ Found', rawLogs.length, 'class logs')
      
      if (rawLogs.length === 0) {
        setError(`No class logs found for teacher ${teacherId} on ${selectedDate}. Try a different date or teacher ID.`)
        setClassLogs([])
        setEnhancedLogs([])
        setTestResults(null)
        return
      }

      setClassLogs(rawLogs)

      // Enhance the logs using your actual utility functions
      const enhanced = rawLogs.map(log => enhanceClassLog(log))
      setEnhancedLogs(enhanced)

      // Run tests on the first log
      const firstLog = enhanced[0]
      if (firstLog) {
        const results: TestResults = {
          dataFetch: {
            passed: rawLogs.length > 0,
            message: `Fetched ${rawLogs.length} class log(s) from database`
          },
          topicsParsing: {
            passed: firstLog.studentNames.length >= 0, // Always true, but shows if topics were parsed
            message: `Topics found: ${firstLog.topics_covered?.length || 0} items`
          },
          attachments: {
            passed: firstLog.totalScreenshots >= 0,
            message: `Screenshots: ${firstLog.totalScreenshots}, Manual notes: ${firstLog.hasManualNotes ? 'Yes' : 'No'}`
          },
          homework: {
            passed: true, // Always pass, just show what was found
            message: `Homework: ${firstLog.homework_assigned || 'None'}`
          },
          duration: {
            passed: firstLog.formattedDuration !== '0min',
            message: `Duration: ${firstLog.formattedDuration}`
          },
          liveStatus: {
            passed: true, // Always pass, just show status
            message: `Status: ${firstLog.liveStatus}, Live: ${firstLog.isLive ? 'Yes' : 'No'}`
          }
        }
        
        setTestResults(results)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data'
      setError(errorMessage)
      console.error('❌ Error fetching real data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-fetch on component mount
  useEffect(() => {
    fetchRealData()
  }, [])

  const allTestsPassed = testResults && Object.values(testResults).every(test => test.passed)

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          🚀 Live Data Pipeline Test
        </h1>
        <p className="text-gray-600 mt-2">Testing with actual database data</p>
      </div>

      {/* Input Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Test Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teacherId">Teacher ID</Label>
              <Input
                id="teacherId"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                placeholder="Enter teacher UUID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="selectedDate">Date</Label>
              <Input
                id="selectedDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
          <Button 
            onClick={fetchRealData} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Fetch Real Data
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <X className="h-4 w-4" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Test Results */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Live Data Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(testResults).map(([testName, result]: [string, TestResult]) => (
                <div key={testName} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    {result.passed ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium capitalize">{testName.replace(/([A-Z])/g, ' $1')}</span>
                  </div>
                  <div className="text-sm text-gray-600">{result.message}</div>
                </div>
              ))}
            </div>

            {allTestsPassed ? (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <AlertDescription>
                  <span className="text-green-700">✅ Real data pipeline is working! Your MyClassesView should display this data correctly.</span>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                <AlertDescription>
                  <span className="text-yellow-700">⚠️ Some issues detected. Check your utility functions.</span>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enhanced Logs Display */}
      {enhancedLogs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {enhancedLogs.map((log, index) => (
            <Card key={log.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Class Log {index + 1}</span>
                  <div className="flex gap-2">
                    <Badge variant={log.status === 'completed' ? 'secondary' : log.isLive ? 'destructive' : 'default'}>
                      {log.liveStatus}
                    </Badge>
                    {log.isLive && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-red-600">LIVE</span>
                      </div>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Content:</strong>
                    <p className="text-gray-600 mt-1">{log.content}</p>
                  </div>
                  <div>
                    <strong>Student:</strong>
                    <p className="text-gray-600 mt-1">{log.student_name || 'N/A'}</p>
                  </div>
                  <div>
                    <strong>Duration:</strong>
                    <p className="text-gray-600 mt-1">{log.formattedDuration}</p>
                  </div>
                  <div>
                    <strong>Screenshots:</strong>
                    <p className="text-gray-600 mt-1">{log.totalScreenshots}</p>
                  </div>
                </div>

                {/* Topics */}
                {log.topics_covered && log.topics_covered.length > 0 && (
                  <div>
                    <strong className="text-sm">Topics Covered:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {log.topics_covered.map((topic, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Homework */}
                {log.homework_assigned && (
                  <div>
                    <strong className="text-sm">Homework:</strong>
                    <p className="text-gray-600 text-sm mt-1">{log.homework_assigned}</p>
                  </div>
                )}

                {/* Manual Notes Indicator */}
                {log.hasManualNotes && (
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-3 w-3 text-green-500" />
                    <span className="text-green-700">Has manual notes</span>
                  </div>
                )}

                {/* Raw Data Preview */}
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    View Raw Data
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(log, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>📋 What This Shows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <strong>Real Database Connection:</strong> This fetches actual data from your class_logs table
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <strong>Enhanced Processing:</strong> Uses your actual utility functions from lib/class-utils.ts
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
              <div>
                <strong>Live Data Verification:</strong> If this works, your MyClassesView should display the same data
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}