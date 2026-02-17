'use client'

import { createContext, useContext } from 'react'

// Context to indicate that DashboardLayout is already provided
export const DashboardLayoutContext = createContext<boolean>(false)

// Hook to check if DashboardLayout is already provided
export const useDashboardLayoutProvided = () => useContext(DashboardLayoutContext)