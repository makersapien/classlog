// src/components/LiveIndicator.tsx
// Live class indicator component using shadcn/ui

'use client'

import React, { useState, useEffect } from 'react'
import { Play, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { calculateDuration, isClassLive } from '@/lib/class-utils'
import type { LiveIndicatorProps } from '@/types/database-enhanced'

const LiveIndicator: React.FC<LiveIndicatorProps> = ({ classLog, className = '' }) => {
  const [currentDuration, setCurrentDuration] = useState<string>('0m')
  const live = isClassLive(classLog)

  useEffect(() => {
    if (!live || !classLog.start_time) return

    const updateDuration = () => {
      const { formatted } = calculateDuration(classLog.start_time, null)
      setCurrentDuration(formatted)
    }

    // Update immediately
    updateDuration()

    // Update every minute
    const interval = setInterval(updateDuration, 60000)

    return () => clearInterval(interval)
  }, [live, classLog.start_time])

  if (!live) return null

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Pulsing red dot */}
      <div className="relative">
        <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
        <div className="absolute top-0 left-0 h-2 w-2 bg-red-500 rounded-full animate-ping opacity-75"></div>
      </div>
      
      {/* Live badge with duration */}
      <Badge variant="destructive" className="text-xs font-semibold animate-pulse">
        <Play className="h-3 w-3 mr-1" />
        LIVE • {currentDuration}
      </Badge>
    </div>
  )
}

export default LiveIndicator