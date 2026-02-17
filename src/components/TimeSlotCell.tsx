// src/components/TimeSlotCell.tsx
'use client'

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Check, Clock, User } from 'lucide-react'

interface TimeSlot {
  id: string
  teacherId: string
  date: string
  startTime: string
  endTime: string
  status: 'unavailable' | 'available' | 'assigned' | 'booked'
  assignedStudentId?: string
  assignedStudentName?: string
  assignmentExpiry?: Date
  createdAt: Date
  updatedAt: Date
}

interface TimeSlotCellProps {
  slot: TimeSlot | null
  isSelected: boolean
  isInDragSelection: boolean
  onMouseDown: (slotId: string) => void
  onMouseEnter: (slotId: string) => void
  onMouseUp: () => void
  onRightClick: (slotId: string) => void
  onClick: (slotId: string) => void
  interactionMode: 'select' | 'assign'
}

export default function TimeSlotCell({
  slot,
  isSelected,
  isInDragSelection,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
  onRightClick,
  onClick,
  interactionMode
}: TimeSlotCellProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    if (slot) {
      onMouseDown(slot.id)
    }
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (slot) {
      onMouseEnter(slot.id)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (slot && slot.status === 'available') {
      onRightClick(slot.id)
    }
  }

  const handleClick = () => {
    if (slot) {
      onClick(slot.id)
    }
  }

  // Get visual state classes based on slot status and interaction state
  const getVisualStateClasses = () => {
    const baseClasses = "h-full rounded p-2 border-l-4 text-xs relative transition-all duration-200"
    
    if (!slot) {
      // Empty cell
      return {
        container: `
          p-1 border-r border-gray-200 h-[60px] transition-all duration-200 cursor-pointer
          ${interactionMode === 'select' ? 'hover:bg-blue-50' : ''}
          ${isInDragSelection ? 'bg-blue-100 border-2 border-blue-400' : ''}
          ${isHovered && interactionMode === 'select' ? 'bg-blue-25' : ''}
        `,
        content: "h-full flex items-center justify-center text-gray-300"
      }
    }

    // Slot exists - determine visual state
    let slotClasses = baseClasses
    let containerClasses = `
      p-1 border-r border-gray-200 h-[60px] transition-all duration-200 cursor-pointer
      ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
      ${isInDragSelection ? 'bg-blue-100 border-2 border-blue-400' : ''}
    `

    switch (slot.status) {
      case 'unavailable':
        slotClasses += " bg-gray-100 border-l-gray-500 text-gray-600"
        if (isHovered && interactionMode === 'select') {
          containerClasses += " hover:bg-gray-50"
        }
        break
        
      case 'available':
        slotClasses += " bg-green-100 border-l-green-500 text-green-800"
        if (isHovered) {
          if (interactionMode === 'assign') {
            containerClasses += " hover:bg-green-50"
            slotClasses += " hover:bg-green-200"
          } else {
            containerClasses += " hover:bg-blue-50"
          }
        }
        break
        
      case 'assigned':
        slotClasses += " bg-yellow-100 border-l-yellow-500 text-yellow-800"
        if (isHovered) {
          slotClasses += " hover:bg-yellow-200"
        }
        break
        
      case 'booked':
        slotClasses += " bg-blue-100 border-l-blue-500 text-blue-800"
        if (isHovered) {
          slotClasses += " hover:bg-blue-200"
        }
        break
    }

    // Add selection highlighting
    if (isSelected) {
      slotClasses += " ring-2 ring-blue-400"
    }

    return {
      container: containerClasses,
      content: slotClasses
    }
  }

  // Get status icon
  const getStatusIcon = () => {
    if (!slot) return null

    switch (slot.status) {
      case 'available':
        return <Check className="h-3 w-3 text-green-600" />
      case 'assigned':
        return <Clock className="h-3 w-3 text-yellow-600" />
      case 'booked':
        return <User className="h-3 w-3 text-blue-600" />
      case 'unavailable':
        return <AlertCircle className="h-3 w-3 text-gray-500" />
      default:
        return null
    }
  }

  // Get status text
  const getStatusText = () => {
    if (!slot) return null

    switch (slot.status) {
      case 'available':
        return 'Available'
      case 'assigned':
        return 'Assigned'
      case 'booked':
        return 'Booked'
      case 'unavailable':
        return 'Unavailable'
      default:
        return 'Unknown'
    }
  }

  // Check if assignment is expiring soon (within 2 hours)
  const isAssignmentExpiringSoon = () => {
    if (!slot || slot.status !== 'assigned' || !slot.assignmentExpiry) return false
    
    const now = new Date()
    const expiry = new Date(slot.assignmentExpiry)
    const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    return hoursUntilExpiry <= 2 && hoursUntilExpiry > 0
  }

  // Format time remaining for assignment
  const getTimeRemaining = () => {
    if (!slot || slot.status !== 'assigned' || !slot.assignmentExpiry) return null
    
    const now = new Date()
    const expiry = new Date(slot.assignmentExpiry)
    const minutesUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60))
    
    if (minutesUntilExpiry <= 0) return 'Expired'
    if (minutesUntilExpiry < 60) return `${minutesUntilExpiry}m`
    
    const hours = Math.floor(minutesUntilExpiry / 60)
    const minutes = minutesUntilExpiry % 60
    return `${hours}h ${minutes}m`
  }

  const classes = getVisualStateClasses()

  return (
    <div 
      className={classes.container}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseUp={onMouseUp}
      onContextMenu={handleRightClick}
      onClick={handleClick}
    >
      {slot ? (
        <div className={classes.content}>
          {/* Status indicator and text */}
          <div className="flex items-center gap-1 mb-1">
            {getStatusIcon()}
            <span className="font-medium text-xs">
              {getStatusText()}
            </span>
          </div>

          {/* Student name for assigned/booked slots */}
          {(slot.status === 'assigned' || slot.status === 'booked') && slot.assignedStudentName && (
            <div className="text-xs truncate mb-1">
              {slot.assignedStudentName}
            </div>
          )}

          {/* Assignment expiry timer */}
          {slot.status === 'assigned' && slot.assignmentExpiry && (
            <div className={`text-xs flex items-center gap-1 ${isAssignmentExpiringSoon() ? 'text-red-600 font-medium' : ''}`}>
              <Clock className="h-2 w-2" />
              {getTimeRemaining()}
            </div>
          )}

          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute top-1 right-1">
              <Check className="h-4 w-4 text-blue-600" />
            </div>
          )}

          {/* Hover effects for available slots in assign mode */}
          {slot.status === 'available' && interactionMode === 'assign' && isHovered && (
            <div className="absolute inset-0 bg-green-200 bg-opacity-30 rounded flex items-center justify-center">
              <Badge variant="secondary" className="text-xs bg-green-600 text-white">
                Click to select
              </Badge>
            </div>
          )}

          {/* Right-click indicator for available slots */}
          {slot.status === 'available' && isHovered && (
            <div className="absolute bottom-1 right-1">
              <div className="text-xs text-gray-500 bg-white bg-opacity-80 px-1 rounded">
                Right-click to assign
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={classes.content}>
          {isInDragSelection && (
            <div className="text-blue-600 font-medium text-xs">
              New Slot
            </div>
          )}
          {isHovered && interactionMode === 'select' && !isInDragSelection && (
            <div className="text-blue-500 text-xs">
              Drag to create
            </div>
          )}
        </div>
      )}
    </div>
  )
}