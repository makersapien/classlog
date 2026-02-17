'use client'

import { useEffect, useState } from 'react'

export default function DevBanner() {
  const [isDev, setIsDev] = useState(false)

  useEffect(() => {
    setIsDev(process.env.NODE_ENV === 'development')
  }, [])

  if (!isDev) return null

  return (
    <div className="bg-yellow-100 border-b border-yellow-300 p-2 text-center text-sm">
      🧪 JWT Test Mode - Visit <a href="/test-jwt" className="underline">/test-jwt</a> to check authentication
    </div>
  )
}