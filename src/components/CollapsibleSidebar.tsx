// src/components/CollapsibleSidebar.tsx
// Collapsible sidebar navigation for the dashboard

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Users, 
  Calendar, 
  DollarSign, 
  BarChart3,
  ChevronLeft, 
  ChevronRight,
  Menu,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  description?: string;
}

interface CollapsibleSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'students',
    label: 'Students',
    icon: Users,
    description: 'Manage your students and their progress'
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: Calendar,
    description: 'View and manage your teaching schedule'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'View teaching analytics and insights'
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: DollarSign,
    description: 'Manage payments and credit transactions'
  }
];

export const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  activeTab,
  onTabChange,
  className = ''
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const toggleMobile = useCallback(() => {
    setIsMobileOpen(prev => !prev);
  }, []);

  const handleItemClick = useCallback((itemId: string) => {
    onTabChange(itemId);
    // Close mobile menu after selection
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  }, [onTabChange, isMobileOpen]);

  // Memoize sidebar classes to prevent unnecessary recalculations
  const sidebarClasses = useMemo(() => cn(
    "fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-lg transition-all duration-200 z-40",
    "lg:relative lg:translate-x-0",
    isCollapsed ? "w-16" : "w-64",
    isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
    className
  ), [isCollapsed, isMobileOpen, className]);

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleMobile}
          className="bg-white shadow-md"
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleMobile}
        />
      )}

      {/* Sidebar */}
      <div className={sidebarClasses}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <span className="font-semibold text-gray-900">ClassLogger</span>
            </div>
          )}
          
          {/* Desktop Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="hidden lg:flex p-1 h-8 w-8"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start h-auto p-3 text-left transition-colors duration-150",
                  isCollapsed ? "px-3" : "px-3",
                  isActive 
                    ? "bg-blue-600 text-white hover:bg-blue-700" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
                onClick={() => handleItemClick(item.id)}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="flex items-center space-x-3 w-full">
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-colors duration-150",
                    isActive ? "text-white" : "text-gray-500"
                  )} />
                  
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{item.label}</span>
                        {item.badge && (
                          <Badge 
                            variant={isActive ? "secondary" : "outline"}
                            className="ml-2 text-xs"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className={cn(
                          "text-xs mt-1 truncate transition-colors duration-150",
                          isActive ? "text-blue-100" : "text-gray-500"
                        )}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Button>
            );
          })}
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              ClassLogger Dashboard
            </div>
          </div>
        )}
      </div>

      {/* Content Spacer for Desktop */}
      <div className={cn(
        "hidden lg:block transition-all duration-200",
        isCollapsed ? "w-16" : "w-64"
      )} />
    </>
  );
};

// Hook for managing sidebar state
export const useSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('students');

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);
  
  return {
    isCollapsed,
    activeTab,
    setActiveTab,
    toggleCollapse
  };
};

export default CollapsibleSidebar;