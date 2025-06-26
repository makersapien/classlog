'use client'
import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function ExtensionCallbackContent() {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    
    console.log('🔍 Callback: Auth code:', code ? 'present' : 'missing')
    console.log('🔍 Callback: Error:', error)
    console.log('🔍 Callback: Full URL:', window.location.href)
    
    if (error) {
      console.error('OAuth error:', error)
      window.close()
      return
    }
    
    if (code) {
      console.log('✅ Got auth code, window will close')
      // Window will be closed by the extension
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          🎓 ClassLogger Authentication
        </h2>
        <p className="text-gray-600 mb-4">
          Please wait while we complete your login...
        </p>
        <div className="text-sm text-gray-500">
          This window will close automatically
        </div>
      </div>
    </div>
  )
}

export default function ExtensionCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            🎓 ClassLogger Authentication
          </h2>
          <p className="text-gray-600">
            Loading authentication...
          </p>
        </div>
      </div>
    }>
      <ExtensionCallbackContent />
    </Suspense>
  )
}