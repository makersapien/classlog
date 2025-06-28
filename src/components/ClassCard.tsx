// src/components/ClassCard.tsx
// Individual class session card component using shadcn/ui

'use client'

import React, { useState } from 'react'
import { 
  Clock, 
  Users, 
  BookOpen, 
  Upload, 
  ExternalLink, 
  Edit3,
  Camera,
  Download,
  Trash2,
  CheckCircle,
  FileIcon,
  Image
} from 'lucide-react'

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

import LiveIndicator from './LiveIndicator'
import { extractTopics, getHomeworkAssigned, formatFileSize } from '@/lib/class-utils'
import type { ClassCardProps } from '@/types/database-enhanced'

const ClassCard: React.FC<ClassCardProps> = ({
  classLog,
  files,
  isExpanded,
  isUploading,
  onToggleExpand,
  onEditContent,
  onFileUpload,
  onDeleteFile
}) => {
  const [editingContent, setEditingContent] = useState(false)
  const [contentText, setContentText] = useState(classLog.content || '')

  const topics = extractTopics(classLog)
  const homework = getHomeworkAssigned(classLog)

  const handleContentSave = () => {
    onEditContent(contentText)
    setEditingContent(false)
  }
// Add this right after line 50 in ClassCard.tsx (after useState declarations)
console.log('🔍 ClassCard Debug Data:', {
  classId: classLog.id,
  topics_covered_raw: classLog.topics_covered,
  topics_type: typeof classLog.topics_covered,
  extractedTopics: topics,
  topicsLength: topics.length,
  homework: homework
})
  const handleContentCancel = () => {
    setContentText(classLog.content || '')
    setEditingContent(false)
  }

  const handleFileUploadClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '.pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif'
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files) {
        onFileUpload(target.files)
      }
    }
    input.click()
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />
    }
    return <FileIcon className="h-4 w-4" />
  }

  const getStatusBadge = () => {
    if (classLog.isLive) {
      return <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
    }
    
    switch (classLog.status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>
      case 'in_progress':
      case 'ongoing':
        return <Badge variant="secondary">In Progress</Badge>
      case 'scheduled':
        return <Badge variant="outline">Scheduled</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <CardTitle className="flex items-center gap-3">
                  {classLog.student_name || 'Class Session'}
                  <LiveIndicator classLog={classLog} />
                  {getStatusBadge()}
                </CardTitle>
              </div>

              <div className="flex items-center space-x-2">
                {classLog.detected_automatically && (
                  <Badge variant="outline">Auto-detected</Badge>
                )}
                {(classLog.totalScreenshots || 0) > 0 && (
                  <Badge variant="outline">
                    <Camera className="h-3 w-3 mr-1" />
                    {classLog.totalScreenshots || 0}
                  </Badge>
                )}
                {classLog.google_meet_link && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(classLog.google_meet_link!, '_blank')
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Meet
                  </Button>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {classLog.timeDisplay}
              </span>
              {classLog.formattedDuration && (
                <span className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-1" />
                  {classLog.formattedDuration}
                </span>
              )}
              {(classLog.attendance_count || 0) > 0 && (
                <span className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {classLog.attendance_count} students
                </span>
              )}
            </div>

            {/* Content Preview */}
            <div className="mt-4">
              {editingContent ? (
                <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                  <Textarea
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    placeholder="Enter class description..."
                    rows={3}
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={handleContentSave}>
                      Save
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleContentCancel}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground">
                    {classLog.content || 'No description available'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingContent(true)
                      setContentText(classLog.content || '')
                    }}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <Separator className="mb-6" />
            
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="topics">Topics ({topics.length})</TabsTrigger>
                <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Topics Covered */}
                {topics.length > 0 && (
                  <div>
                    <Label className="text-base font-semibold">Topics Covered</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {topics.map((topic, index) => (
                        <Badge key={index} variant="secondary">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Homework */}
                {homework && (
                  <div>
                    <Label className="text-base font-semibold">Homework Assigned</Label>
                    <Card className="mt-2">
                      <CardContent className="p-4">
                        <p className="text-sm">{homework}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Manual Notes */}
                {classLog.hasManualNotes && classLog.attachments?.manual_notes && (
                  <div>
                    <Label className="text-base font-semibold">Teacher Notes</Label>
                    <div className="space-y-3 mt-2">
                      {classLog.attachments.manual_notes.class_description && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Class Description</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-sm">{classLog.attachments.manual_notes.class_description}</p>
                          </CardContent>
                        </Card>
                      )}
                      {classLog.attachments.manual_notes.key_points && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Key Points</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-sm">{classLog.attachments.manual_notes.key_points}</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="topics" className="space-y-4">
                {topics.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {topics.map((topic, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">{topic}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No topics recorded for this class</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="files" className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Class Files</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFileUploadClick}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload Files'}
                  </Button>
                </div>

                {files.length > 0 ? (
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {files.map((file) => (
                        <Card key={file.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {getFileIcon(file.file_type)}
                                <div>
                                  <p className="font-medium text-sm">{file.file_name}</p>
                                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                    <span>{formatFileSize(file.file_size)}</span>
                                    <span>•</span>
                                    <span>by {file.uploaded_by_name || 'Unknown'}</span>
                                    <span>•</span>
                                    <span>{new Date(file.created_at).toLocaleDateString()}</span>
                                  </div>
                                  {file.is_homework && (
                                    <Badge variant="outline" className="mt-1">
                                      Homework
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(file.file_path, '_blank')}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDeleteFile(file.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No files uploaded yet</p>
                    <p className="text-sm">Click &ldquo;Upload Files&rdquo; to add materials</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Session Information</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Detection Method:</span>
                        <span className="font-medium">
                          {classLog.detected_automatically ? 'Auto-detected' : 'Manual'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">
                          {classLog.formattedDuration || 'Ongoing'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Screenshots:</span>
                        <span className="font-medium">{classLog.totalScreenshots || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Students:</span>
                        <span className="font-medium">
                          {classLog.total_students || classLog.attendance_count || 'N/A'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {classLog.student_email && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Student Information</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {classLog.student_name?.charAt(0) || 'S'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{classLog.student_name}</p>
                            <p className="text-xs text-muted-foreground">{classLog.student_email}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Features Used */}
                  {classLog.attachments?.features_used && classLog.attachments.features_used.length > 0 && (
                    <Card className="md:col-span-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Features Used During Class</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                          {classLog.attachments.features_used.map((feature, index) => (
                            <Badge key={index} variant="outline">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Timing Details */}
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Timing Details</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <p className="font-medium">
                            {new Date(classLog.date).toLocaleDateString()}
                          </p>
                        </div>
                        {classLog.start_time && (
                          <div>
                            <span className="text-muted-foreground">Start Time:</span>
                            <p className="font-medium">
                              {new Date(classLog.start_time).toLocaleTimeString()}
                            </p>
                          </div>
                        )}
                        {classLog.end_time && (
                          <div>
                            <span className="text-muted-foreground">End Time:</span>
                            <p className="font-medium">
                              {new Date(classLog.end_time).toLocaleTimeString()}
                            </p>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <p className="font-medium">
                            {classLog.formattedDuration || 'Ongoing'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export default ClassCard