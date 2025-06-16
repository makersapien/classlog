// components/Header.tsx
"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

interface HeaderProps {
  showAuthButton?: boolean
  onSignInClick?: () => void
  isTransparent?: boolean
}

export default function Header({ 
  showAuthButton = true, 
  onSignInClick,
  isTransparent = false 
}: HeaderProps) {
  const [scrollY, setScrollY] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Determine if we should show transparent background
  const shouldBeTransparent = isTransparent && scrollY <= 50
  
  // Check if we're on the landing page
  const isLandingPage = pathname === '/'

  const handleSignInClick = () => {
    if (onSignInClick) {
      onSignInClick()
    } else {
      // Default behavior - redirect to auth or dashboard
      window.location.href = '/dashboard'
    }
  }

  return (
    <nav className={`fixed top-0 w-full z-40 transition-all duration-500 ${
      shouldBeTransparent 
        ? 'bg-transparent' 
        : 'bg-white/90 backdrop-blur-md shadow-2xl border-b border-white/20'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-lg transform group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6" />
              </svg>
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              ClassLogger
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {isLandingPage ? (
              // Landing page navigation
              <>
                <a href="#features" className="text-gray-600 hover:text-emerald-600 transition-all duration-300 font-semibold relative group">
                  <span>✨ Features</span>
                  <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 group-hover:w-full transition-all duration-300"></div>
                </a>
                <a href="#pricing" className="text-gray-600 hover:text-emerald-600 transition-all duration-300 font-semibold relative group">
                  <span>💰 Pricing</span>
                  <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 group-hover:w-full transition-all duration-300"></div>
                </a>
                <a href="#about" className="text-gray-600 hover:text-emerald-600 transition-all duration-300 font-semibold relative group">
                  <span>ℹ️ About</span>
                  <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 group-hover:w-full transition-all duration-300"></div>
                </a>
              </>
            ) : (
              // Dashboard navigation
              <>
                <Link 
                  href="/dashboard"
                  className={`text-sm font-medium transition-colors ${
                    pathname.startsWith('/dashboard') 
                      ? 'text-emerald-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/classes"
                  className={`text-sm font-medium transition-colors ${
                    pathname.startsWith('/classes') 
                      ? 'text-emerald-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Classes
                </Link>
                <Link 
                  href="/payments"
                  className={`text-sm font-medium transition-colors ${
                    pathname.startsWith('/payments') 
                      ? 'text-emerald-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Payments
                </Link>
              </>
            )}

            {/* Auth Button */}
            {showAuthButton && (
              <button 
                onClick={handleSignInClick}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-3 rounded-full hover:shadow-2xl transform hover:scale-110 transition-all duration-300 font-semibold flex items-center gap-2"
              >
                🔐 Sign In
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-3 rounded-xl hover:bg-gray-100 transition-colors duration-300"
          >
            <div className="text-2xl">{isMenuOpen ? '✕' : '☰'}</div>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-6 border-t border-gray-200 bg-white/95 backdrop-blur-md rounded-b-2xl">
            <div className="flex flex-col gap-4">
              {isLandingPage ? (
                // Landing page mobile navigation
                <>
                  <a href="#features" className="text-gray-600 hover:text-emerald-600 transition-colors duration-300 font-semibold flex items-center gap-2">
                    <span>✨</span> Features
                  </a>
                  <a href="#pricing" className="text-gray-600 hover:text-emerald-600 transition-colors duration-300 font-semibold flex items-center gap-2">
                    <span>💰</span> Pricing
                  </a>
                  <a href="#about" className="text-gray-600 hover:text-emerald-600 transition-colors duration-300 font-semibold flex items-center gap-2">
                    <span>ℹ️</span> About
                  </a>
                </>
              ) : (
                // Dashboard mobile navigation
                <>
                  <Link href="/dashboard" className="text-gray-600 hover:text-emerald-600 transition-colors duration-300 font-semibold">
                    Dashboard
                  </Link>
                  <Link href="/classes" className="text-gray-600 hover:text-emerald-600 transition-colors duration-300 font-semibold">
                    Classes
                  </Link>
                  <Link href="/payments" className="text-gray-600 hover:text-emerald-600 transition-colors duration-300 font-semibold">
                    Payments
                  </Link>
                </>
              )}

              {showAuthButton && (
                <button 
                  onClick={handleSignInClick}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-full hover:shadow-xl transitions-all duration-300 font-semibold w-fit flex items-center gap-2"
                >
                  🔐 Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}