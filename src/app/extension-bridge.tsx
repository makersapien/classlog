'use client'

import { useEffect } from 'react'

/**
 * Global Extension Bridge Component
 * Handles postMessage communication between ClassLogger web app and Chrome extension
 * This component should be included in the root layout to work on all pages
 */
export default function ExtensionBridge() {
  useEffect(() => {
    console.log('🌉 Extension bridge initialized')

    const handleExtensionMessage = async (event: MessageEvent) => {
      // Security: Only respond to messages from chrome-extension origins OR same origin (for testing)
      if (event.origin && !event.origin.startsWith('chrome-extension://') && event.origin !== window.location.origin) {
        return
      }

      // Handle extension token requests
      if (event.data?.type === 'REQUEST_AUTH_TOKEN' && event.data?.source === 'classlogger-extension') {
        console.log('🔑 Extension requesting auth token from:', event.origin)
        
        try {
          // Call the temp token endpoint
          const response = await fetch('/api/extension/issue-temp-token', {
            method: 'POST',
            credentials: 'include'
          })

          if (response.ok) {
            const tokenData = await response.json()
            
            // Send token back to extension
            const targetOrigin = event.origin || '*'
            window.postMessage({
              source: 'classlogger-webapp',
              type: 'AUTH_TOKEN_RESPONSE',
              success: true,
              token: tokenData.token,
              user: tokenData.user,
              requestId: event.data.requestId // Echo back request ID for matching
            }, targetOrigin)
            
            console.log('✅ Token sent to extension:', event.origin)
            
          } else {
            const errorData = await response.json()
            
            // Send error response to extension
            const targetOrigin = event.origin || '*'
            window.postMessage({
              source: 'classlogger-webapp',
              type: 'AUTH_TOKEN_RESPONSE',
              success: false,
              error: errorData.error || 'Authentication failed',
              requestId: event.data.requestId
            }, targetOrigin)
            
            console.log('❌ Token request failed:', response.status, errorData.error)
          }
          
        } catch (error) {
          console.error('❌ Extension token request error:', error)
          
          // Send error response to extension
          const targetOrigin = event.origin || '*'
          window.postMessage({
            source: 'classlogger-webapp',
            type: 'AUTH_TOKEN_RESPONSE',
            success: false,
            error: 'Failed to process token request',
            requestId: event.data.requestId
          }, targetOrigin)
        }
      }

      // Handle extension ping/health check
      if (event.data?.type === 'PING' && event.data?.source === 'classlogger-extension') {
        const targetOrigin = event.origin || '*'
        window.postMessage({
          source: 'classlogger-webapp',
          type: 'PONG',
          timestamp: Date.now()
        }, targetOrigin)
      }
    }

    // Add the message listener
    window.addEventListener('message', handleExtensionMessage)

    // Set global flag to indicate bridge is loaded
    ;(window as any).extensionBridge = true

    // Cleanup on unmount
    return () => {
      window.removeEventListener('message', handleExtensionMessage)
      ;(window as any).extensionBridge = false
      console.log('🌉 Extension bridge cleaned up')
    }
  }, [])

  // This component renders nothing but provides the bridge functionality
  return null
}

/**
 * Utility function to manually send token to extension (for dashboard auto-connect)
 */
export async function sendTokenToExtension(): Promise<boolean> {
  try {
    console.log('🔗 Manually sending token to extension...')
    
    const response = await fetch('/api/extension/issue-temp-token', {
      method: 'POST',
      credentials: 'include'
    })

    if (response.ok) {
      const data = await response.json()
      
      // Broadcast to all extension contexts
      window.postMessage({
        source: 'classlogger-webapp',
        type: 'EXTENSION_TEMP_TOKEN',
        token: data.token,
        user: data.user
      }, '*')
      
      console.log('✅ Token broadcast to extension')
      return true
    } else {
      console.log('⚠️ Failed to get extension token:', response.status)
      return false
    }
  } catch (error) {
    console.error('❌ Failed to send extension token:', error)
    return false
  }
}