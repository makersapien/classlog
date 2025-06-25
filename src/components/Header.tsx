// components/Header.tsx
"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface HeaderProps {
  showAuthButton?: boolean
  onSignInClick?: () => void
}

export default function Header({ 
  showAuthButton = true, 
  onSignInClick,
}: HeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()

  

  // Check if we're on the landing page
  const isLandingPage = pathname === '/'

  const handleSignInClick = () => {
    if (onSignInClick) {
      onSignInClick()
    } else {
      window.location.href = '/dashboard'
    }
  }

  // Auto-collapse after 3 seconds of no interaction
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        setIsExpanded(false)
        setIsMenuOpen(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isExpanded])

  
  const contentVariants = {
    collapsed: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.2,
        ease: "easeInOut" as const
      }
    },
    expanded: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        delay: 0.1,
        ease: "easeOut" as const
      }
    }
  }
  const mobileMenuVariants = {
    closed: {
      opacity: 0,
      height: 0,
      transition: {
        duration: 0.2,
        ease: "easeInOut" as const
      }
    },
    open: {
      opacity: 1,
      height: "auto",
      transition: {
        duration: 0.3,
        ease: "easeOut" as const
      }
    }
  }

  return (
    <motion.nav 
      className="fixed top-0 w-full z-50"
      variants={contentVariants}
      initial="collapsed"
      animate={isExpanded ? "expanded" : "collapsed"}
      onHoverStart={() => setIsExpanded(true)}
      onHoverEnd={() => {
        if (!isMenuOpen) {
          setTimeout(() => setIsExpanded(false), 1000)
        }
      }}
    >
      {/* Collapsed State - Minimal 5px bar */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="w-full h-1 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 backdrop-blur-sm cursor-pointer"
            onClick={() => setIsExpanded(true)}
          />
        )}
      </AnimatePresence>

      {/* Expanded State - Full Navigation */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            variants={contentVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            className="bg-white/95 backdrop-blur-xl shadow-2xl border-b border-white/20 rounded-b-2xl"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                  <motion.div 
                    className="p-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 1v6m0 6v6" />
                    </svg>
                  </motion.div>
                  <span className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    ClassLogger
                  </span>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-8">
                  {isLandingPage ? (
                    // Landing page navigation
                    <>
                      <motion.a 
                        href="#features" 
                        className="text-gray-600 hover:text-emerald-600 transition-all duration-300 font-semibold relative group"
                        whileHover={{ y: -2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <span>✨ Features</span>
                        <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 group-hover:w-full transition-all duration-300"></div>
                      </motion.a>
                      <motion.a 
                        href="#pricing" 
                        className="text-gray-600 hover:text-emerald-600 transition-all duration-300 font-semibold relative group"
                        whileHover={{ y: -2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <span>💰 Pricing</span>
                        <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 group-hover:w-full transition-all duration-300"></div>
                      </motion.a>
                      <motion.a 
                        href="#about" 
                        className="text-gray-600 hover:text-emerald-600 transition-all duration-300 font-semibold relative group"
                        whileHover={{ y: -2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <span>ℹ️ About</span>
                        <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 group-hover:w-full transition-all duration-300"></div>
                      </motion.a>
                    </>
                  ) : (
                    // Dashboard navigation
                    <>
                      <motion.div whileHover={{ y: -2 }}>
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
                      </motion.div>
                      <motion.div whileHover={{ y: -2 }}>
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
                      </motion.div>
                      <motion.div whileHover={{ y: -2 }}>
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
                      </motion.div>
                    </>
                  )}

                  {/* Auth Button */}
                  {showAuthButton && (
                    <motion.button 
                      onClick={handleSignInClick}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-3 rounded-full font-semibold flex items-center gap-2"
                      whileHover={{ 
                        scale: 1.05,
                        boxShadow: "0 20px 40px rgba(16, 185, 129, 0.4)"
                      }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      🔐 Sign In
                    </motion.button>
                  )}
                </div>

                {/* Mobile Menu Button */}
                <motion.button 
                  onClick={() => {
                    setIsMenuOpen(!isMenuOpen)
                    setIsExpanded(true)
                  }}
                  className="md:hidden p-3 rounded-xl hover:bg-gray-100 transition-colors duration-300"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <motion.div 
                    className="text-2xl"
                    animate={{ rotate: isMenuOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {isMenuOpen ? '✕' : '☰'}
                  </motion.div>
                </motion.button>

                {/* Collapse Button */}
                <motion.button
                  onClick={() => setIsExpanded(false)}
                  className="hidden md:block ml-4 p-2 rounded-full hover:bg-gray-100 transition-colors duration-300"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Collapse navigation"
                >
                  <motion.div
                    animate={{ rotate: 180 }}
                    transition={{ duration: 0.3 }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ⌄
                  </motion.div>
                </motion.button>
              </div>

              {/* Mobile Menu */}
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    variants={mobileMenuVariants}
                    initial="closed"
                    animate="open"
                    exit="closed"
                    className="md:hidden py-6 border-t border-gray-200 bg-white/95 backdrop-blur-md rounded-b-2xl overflow-hidden"
                  >
                    <div className="flex flex-col gap-4">
                      {isLandingPage ? (
                        // Landing page mobile navigation
                        <>
                          <motion.a 
                            href="#features" 
                            className="text-gray-600 hover:text-emerald-600 transition-colors duration-300 font-semibold flex items-center gap-2"
                            whileHover={{ x: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            <span>✨</span> Features
                          </motion.a>
                          <motion.a 
                            href="#pricing" 
                            className="text-gray-600 hover:text-emerald-600 transition-colors duration-300 font-semibold flex items-center gap-2"
                            whileHover={{ x: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            <span>💰</span> Pricing
                          </motion.a>
                          <motion.a 
                            href="#about" 
                            className="text-gray-600 hover:text-emerald-600 transition-colors duration-300 font-semibold flex items-center gap-2"
                            whileHover={{ x: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            <span>ℹ️</span> About
                          </motion.a>
                        </>
                      ) : (
                        // Dashboard mobile navigation
                        <>
                          <motion.div whileHover={{ x: 10 }}>
                            <Link href="/dashboard" className="text-gray-600 hover:text-emerald-600 transition-colors duration-300 font-semibold">
                              Dashboard
                            </Link>
                          </motion.div>
                          <motion.div whileHover={{ x: 10 }}>
                            <Link href="/classes" className="text-gray-600 hover:text-emerald-600 transition-colors duration-300 font-semibold">
                              Classes
                            </Link>
                          </motion.div>
                          <motion.div whileHover={{ x: 10 }}>
                            <Link href="/payments" className="text-gray-600 hover:text-emerald-600 transition-colors duration-300 font-semibold">
                              Payments
                            </Link>
                          </motion.div>
                        </>
                      )}

                      {showAuthButton && (
                        <motion.button 
                          onClick={handleSignInClick}
                          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-full font-semibold w-fit flex items-center gap-2"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          🔐 Sign In
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expand hint for collapsed state */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 2 }}
            className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded-full backdrop-blur-sm pointer-events-none"
          >
            Hover to expand navigation ↑
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}