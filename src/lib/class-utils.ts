// src/lib/class-utils.ts
// Fixed utility functions with improved PostgreSQL array parsing

import type { ClassLog, ClassStats, LiveClassInfo, EnhancedClassLog } from '@/types/database-enhanced'

// Define interfaces that match the actual database JSONB structure
interface Screenshot {
  timestamp: string
  type: string
  format: string
  size: number
}

interface ManualNotes {
  class_description?: string
  topics_covered?: string
  homework_assigned?: string
  key_points?: string
  classDescription?: string
  topicsCovered?: string
  homeworkAssigned?: string
  keyPoints?: string
}

interface ExtensionData {
  manual_notes?: ManualNotes
  screenshots_taken?: number
}

interface ParsedAttachments {
  screenshots?: Screenshot[]
  manual_notes?: ManualNotes
  extension_data?: ExtensionData
  last_screenshot?: Screenshot
  total_screenshots?: number
  screenshots_taken?: number
  features_used?: string[]
}

/**
 * Check if a class is currently live
 */
export function isClassLive(classLog: ClassLog): boolean {
  if (classLog.status !== 'in_progress' && classLog.status !== 'ongoing') {
    return false
  }

  if (!classLog.start_time) {
    return false
  }

  // If there's an end_time, the class is completed
  if (classLog.end_time) {
    return false
  }

  // Check if started within reasonable time (not more than 8 hours ago)
  const startTime = new Date(classLog.start_time)
  const now = new Date()
  const diffHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60)

  return diffHours <= 8 // Assume classes longer than 8 hours are stale
}

/**
 * Calculate duration between start and end time
 */
export function calculateDuration(startTime: string | null, endTime: string | null): {
  minutes: number
  formatted: string
} {
  if (!startTime) {
    return { minutes: 0, formatted: '0min' }
  }

  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()
  const diffMs = end.getTime() - start.getTime()
  const minutes = Math.round(diffMs / (1000 * 60))

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  let formatted = ''
  if (hours > 0) {
    formatted = `${hours}h ${remainingMinutes}m`
  } else {
    formatted = `${minutes}m`
  }

  return { minutes, formatted }
}

/**
 * Parse topics_covered field - FIXED for your database format
 */
function parseTopicsCovered(topicsData: string[] | string | null): string[] {
  if (!topicsData) return []
  
  // If it's already an array, return it
  if (Array.isArray(topicsData)) {
    return topicsData.filter(topic => topic && topic.trim().length > 0)
  }
  
  // If it's a string, handle different PostgreSQL array formats
  if (typeof topicsData === 'string') {
    try {
      // Handle empty cases
      if (!topicsData.trim() || topicsData === '{}' || topicsData === '[]') {
        return []
      }

      // Try to parse as JSON first (if it's a valid JSON array)
      try {
        const jsonParsed = JSON.parse(topicsData)
        if (Array.isArray(jsonParsed)) {
          return jsonParsed.filter(topic => topic && topic.trim().length > 0)
        }
      } catch {
        // Not JSON, continue with PostgreSQL array parsing
      }

      // Handle PostgreSQL array format: {topic1,topic2} or {"topic1","topic2"}
      let cleaned = topicsData.trim()
      
      // Remove outer braces
      if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
        cleaned = cleaned.slice(1, -1)
      }
      
      if (!cleaned) return []
      
      // Split by comma and clean each topic
      const topics = cleaned.split(',').map(topic => {
        // Remove quotes and trim
        return topic.replace(/^"?(.*?)"?$/, '$1').trim()
      }).filter(topic => topic.length > 0)
      
      return topics
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Parse failed'
      console.warn('Failed to parse topics_covered:', topicsData, errorMessage)
      return []
    }
  }
  
  return []
}

/**
 * Parse attachments field and extract data safely
 */
function parseAttachments(attachments: ClassLog['attachments']): ParsedAttachments | null {
  if (!attachments) return null
  
  try {
    // Handle case where attachments might be a string (shouldn't happen with JSONB but just in case)
    if (typeof attachments === 'string') {
      const parsed = JSON.parse(attachments) as ParsedAttachments
      return parsed
    }
    
    // If it's already an object (which it should be from JSONB), cast it appropriately
    return attachments as ParsedAttachments
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Parse failed'
    console.warn('Failed to parse attachments:', attachments, errorMessage)
    return null
  }
}

/**
 * Extract topics from class log content and attachments
 */
export function extractTopics(classLog: ClassLog): string[] {
  const topics: string[] = []

  // Add from topics_covered field (handle PostgreSQL array format)
  const parsedTopics = parseTopicsCovered(classLog.topics_covered)
  topics.push(...parsedTopics)

  // Add from manual notes in attachments
  const attachments = parseAttachments(classLog.attachments)
  if (attachments) {
    // Check extension_data.manual_notes.topicsCovered
    const extensionTopics = attachments.extension_data?.manual_notes?.topicsCovered
    if (extensionTopics && typeof extensionTopics === 'string') {
      const manualTopics = extensionTopics
        .split(/[\n,]/) // Split by newline OR comma
        .map(topic => topic.trim())
        .filter(topic => topic.length > 0)
      topics.push(...manualTopics)
    }
    
    // Check direct manual_notes.topics_covered
    const directTopics = attachments.manual_notes?.topics_covered
    if (directTopics && typeof directTopics === 'string') {
      const manualTopics = directTopics
        .split(/[\n,]/) // Split by newline OR comma
        .map(topic => topic.trim())
        .filter(topic => topic.length > 0)
      topics.push(...manualTopics)
    }
  }

  // Remove duplicates and return
  return Array.from(new Set(topics.filter(topic => topic.length > 0)))
}

/**
 * Get homework assignments from class log
 */
export function getHomeworkAssigned(classLog: ClassLog): string | null {
  // Check manual notes first
  const attachments = parseAttachments(classLog.attachments)
  if (attachments) {
    // Check extension_data.manual_notes.homeworkAssigned
    const extensionHomework = attachments.extension_data?.manual_notes?.homeworkAssigned
    if (extensionHomework && typeof extensionHomework === 'string' && extensionHomework.trim()) {
      return extensionHomework.trim()
    }
    
    // Check direct manual_notes.homework_assigned
    const directHomework = attachments.manual_notes?.homework_assigned
    if (directHomework && typeof directHomework === 'string' && directHomework.trim()) {
      return directHomework.trim()
    }
  }

  // Fall back to homework_assigned field
  return classLog.homework_assigned || null
}

/**
 * Get total screenshots count
 */
export function getTotalScreenshots(classLog: ClassLog): number {
  const attachments = parseAttachments(classLog.attachments)
  if (!attachments) return 0
  
  // Check different possible paths
  return attachments.total_screenshots || 
         attachments.extension_data?.screenshots_taken || 
         attachments.screenshots_taken || 
         0
}

/**
 * Check if class has manual notes
 */
export function hasManualNotes(classLog: ClassLog): boolean {
  const attachments = parseAttachments(classLog.attachments)
  if (!attachments) return false
  
  // Check extension_data.manual_notes
  const extensionNotes = attachments.extension_data?.manual_notes
  if (extensionNotes) {
    return !!(
      extensionNotes.classDescription ||
      extensionNotes.topicsCovered ||
      extensionNotes.homeworkAssigned ||
      extensionNotes.keyPoints
    )
  }
  
  // Check direct manual_notes
  const directNotes = attachments.manual_notes
  if (directNotes) {
    return !!(
      directNotes.class_description ||
      directNotes.topics_covered ||
      directNotes.homework_assigned ||
      directNotes.key_points
    )
  }
  
  return false
}

/**
 * Format time display for class sessions
 */
export function formatTimeDisplay(startTime: string | null, endTime: string | null): string {
  if (!startTime) {
    return 'No time recorded'
  }

  const start = new Date(startTime)
  const startStr = start.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  })

  if (!endTime) {
    return `Started at ${startStr}`
  }

  const end = new Date(endTime)
  const endStr = end.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  })

  return `${startStr} - ${endStr}`
}

/**
 * Enhance class log with calculated fields
 */
export function enhanceClassLog(classLog: ClassLog): EnhancedClassLog {
  const duration = calculateDuration(classLog.start_time, classLog.end_time)
  const live = isClassLive(classLog)
  const timeDisplay = formatTimeDisplay(classLog.start_time, classLog.end_time)

  // Extract student names from various sources
  const studentNames: string[] = []
  if (classLog.student_name) {
    studentNames.push(classLog.student_name)
  }

  // Get enhanced data
  const totalScreenshots = getTotalScreenshots(classLog)
  const hasNotes = hasManualNotes(classLog)

  return {
    ...classLog,
    formattedDuration: duration.formatted,
    isLive: live,
    liveStatus: live ? 'live' : (classLog.status === 'completed' ? 'completed' : 'not_started'),
    timeDisplay,
    studentNames,
    totalScreenshots,
    hasManualNotes: hasNotes
  }
}

/**
 * Calculate class statistics
 */
export function calculateStats(classLogs: ClassLog[]): ClassStats {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const todayLogs = classLogs.filter(log => log.date === today)
  const weekLogs = classLogs.filter(log => new Date(log.date) >= weekStart)
  const monthLogs = classLogs.filter(log => new Date(log.date) >= monthStart)
  const autoDetectedLogs = classLogs.filter(log => log.detected_automatically)
  const liveLogs = classLogs.filter(log => isClassLive(log))

  // Calculate total hours
  let totalMinutes = 0
  classLogs.forEach(log => {
    if (log.duration_minutes) {
      totalMinutes += log.duration_minutes
    } else if (log.start_time) {
      const { minutes } = calculateDuration(log.start_time, log.end_time)
      totalMinutes += minutes
    }
  })

  return {
    today: todayLogs.length,
    thisWeek: weekLogs.length,
    thisMonth: monthLogs.length,
    totalHours: Math.round(totalMinutes / 60 * 10) / 10,
    autoDetected: autoDetectedLogs.length,
    liveClasses: liveLogs.length
  }
}

/**
 * Get live classes for a teacher
 */
export function getLiveClasses(classLogs: ClassLog[]): LiveClassInfo[] {
  return classLogs
    .filter(log => isClassLive(log))
    .map(log => ({
      id: log.id,
      student_name: log.student_name,
      start_time: log.start_time!,
      duration_minutes: calculateDuration(log.start_time, null).minutes,
      google_meet_link: log.google_meet_link
    }))
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format relative time (e.g., "2 hours ago", "just now")
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const time = new Date(timestamp)
  const diffMs = now.getTime() - time.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) {
    return 'just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays === 1) {
    return 'yesterday'
  } else {
    return `${diffDays} days ago`
  }
}


