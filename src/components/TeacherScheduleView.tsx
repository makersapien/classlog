// src/components/TeacherScheduleView.tsx
'use client'

import StreamlinedScheduleView from './StreamlinedScheduleView'

interface TeacherScheduleViewProps {
  teacherId: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

export default function TeacherScheduleView({ teacherId, user }: TeacherScheduleViewProps) {
  // Simply use the streamlined interactive calendar
  return <StreamlinedScheduleView teacherId={teacherId} user={user} />
}