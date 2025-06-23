'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  role: 'teacher' | 'parent' | 'student'
}

interface DashboardLayoutProps {
  children: React.ReactNode
  user: User
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Simple function to check if a path is active
  const isActive = (href: string) => {
    if (typeof window === 'undefined') return false
    const currentPath = window.location.pathname
    
    // Exact match for dashboard home
    if (href.endsWith(`/dashboard/${user.role}`)) {
      return currentPath === href || currentPath === `${href}/`
    }
    
    // Partial match for sub-pages
    return currentPath.includes(href)
  }

  // Define navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      { 
        icon: '🏠', 
        label: 'Dashboard', 
        href: `/dashboard/${user.role}`
      }
    ]

    switch (user.role) {
      case 'teacher':
        return [
          ...baseItems,
          { icon: '📚', label: 'My Classes', href: '/dashboard/teacher/classes' },
          { icon: '👥', label: 'Students', href: '/dashboard/teacher/students' },
          { icon: '📝', label: 'Class Logs', href: '/dashboard/teacher/classes' },
          { icon: '💰', label: 'Payments', href: '/dashboard/teacher/payments' },
          { icon: '💬', label: 'Messages', href: '/dashboard/teacher/messages' },
          { icon: '📊', label: 'Analytics', href: '/dashboard/teacher/analytics' }
        ]
      
      case 'parent':
        return [
          ...baseItems,
          { icon: '👶', label: 'My Children', href: '/dashboard/parent/children' },
          { icon: '📖', label: 'Class Logs', href: '/dashboard/parent/logs' },
          { icon: '💳', label: 'Payments', href: '/dashboard/parent/payments' },
          { icon: '📅', label: 'Schedule', href: '/dashboard/parent/schedule' },
          { icon: '💬', label: 'Messages', href: '/dashboard/parent/messages' },
          { icon: '📈', label: 'Progress', href: '/dashboard/parent/progress' }
        ]
      
      case 'student':
        return [
          ...baseItems,
          { icon: '📚', label: 'My Classes', href: '/dashboard/student/classes' },
          { icon: '📝', label: 'Assignments', href: '/dashboard/student/assignments' },
          { icon: '📊', label: 'Progress', href: '/dashboard/student/progress' },
          { icon: '📅', label: 'Schedule', href: '/dashboard/student/schedule' },
          { icon: '💬', label: 'Messages', href: '/dashboard/student/messages' }
        ]
      
      default:
        return baseItems
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'teacher': return 'bg-emerald-100 text-emerald-800'
      case 'parent': return 'bg-blue-100 text-blue-800'
      case 'student': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleEmoji = (role: string) => {
    switch (role) {
      case 'teacher': return '🧑‍🏫'
      case 'parent': return '👨‍👩‍👧‍👦'
      case 'student': return '🎓'
      default: return '👤'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <div className="w-6 h-6 flex flex-col justify-center space-y-1">
              <div className="w-full h-0.5 bg-gray-600"></div>
              <div className="w-full h-0.5 bg-gray-600"></div>
              <div className="w-full h-0.5 bg-gray-600"></div>
            </div>
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-emerald-600">ClassLogger</span>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-200 ease-in-out lg:transition-none`}>
          
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CL</span>
              </div>
              <span className="text-xl font-bold text-gray-900">ClassLogger</span>
            </div>
          </div>

          {/* User Profile */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar_url} alt={user.name} />
                <AvatarFallback className="bg-emerald-100 text-emerald-600">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </p>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                    {getRoleEmoji(user.role)} {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {getNavigationItems().map((item, index) => {
              const itemIsActive = isActive(item.href)
              return (
                <button
                  key={`${item.href}-${index}`}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    itemIsActive 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full justify-start"
            >
              <span className="mr-2">🚪</span>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-25"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 lg:pl-0">
          <main className="p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}