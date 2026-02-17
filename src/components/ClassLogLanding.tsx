"use client"
import React, { useState } from 'react';
import Header from '@/components/Header';
import { signInWithGoogle } from '@/lib/supabase'

const ClassLoggerLanding = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginType, setLoginType] = useState('student');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Starting Google sign-in for role:', loginType);
      
      const { error } = await signInWithGoogle(loginType);
      
      if (error) {
        console.error('❌ Google sign-in error:', error);
        alert('Sign-in failed. Please try again.');
      } else {
        console.log('✅ Google sign-in initiated successfully');
        // If successful, user will be redirected by the OAuth flow
      }
    } catch (error) {
      console.error('💥 Google sign-in error:', error);
      alert('Sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const LoginModal = () => (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${isLoginOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsLoginOpen(false)} />
      <div className={`relative bg-white rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl transform transition-all duration-300 ${isLoginOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        <button onClick={() => setIsLoginOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors duration-200">
          <div className="text-xl text-gray-600">✕</div>
        </button>
        
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6" />
              </svg>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">ClassLogger</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Welcome Back!</h3>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        {/* Role Selector */}
        <div className="flex bg-gradient-to-r from-gray-100 to-gray-50 rounded-2xl p-1 mb-6 shadow-inner">
          {[
            { key: 'student', label: 'Student', icon: '👨‍🎓' },
            { key: 'parent', label: 'Parent', icon: '👨‍👩‍👧‍👦' },
            { key: 'teacher', label: 'Teacher', icon: '👨‍🏫' }
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setLoginType(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 transform ${
                loginType === key 
                  ? 'bg-white text-emerald-600 shadow-lg scale-105' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <span className="text-lg">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Google Login */}
        <button 
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 border-2 border-gray-200 rounded-2xl hover:border-emerald-300 hover:bg-emerald-50/50 transition-all duration-300 mb-6 group transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          <span className="font-semibold text-gray-700 group-hover:text-gray-900">
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500 font-medium">Or continue with email</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <div className="space-y-5">
          <div>
            <div className="relative">
              <div className="absolute left-4 top-4 text-emerald-500 text-xl">📧</div>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full pl-14 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-300 text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>
          
          <div>
            <div className="relative">
              <div className="absolute left-4 top-4 text-emerald-500 text-xl">🔒</div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="w-full pl-14 pr-14 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-300 text-gray-900 placeholder-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4 text-xl text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button 
            onClick={() => {
              console.log('Email login clicked for:', loginType);
              // TODO: Implement email/password login
              alert('Email login not implemented yet. Please use Google sign-in.');
            }}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 rounded-2xl font-semibold text-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            Sign In as {loginType.charAt(0).toUpperCase() + loginType.slice(1)} ✨
          </button>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Don&apos;t have an account? 
          <button className="text-emerald-600 hover:text-emerald-700 font-semibold ml-1 transition-colors duration-200">Sign up</button>
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header Component */}
      <Header 
        showAuthButton={true}
        onSignInClick={() => setIsLoginOpen(true)}
       
      />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 px-6 py-3 rounded-full mb-8 shadow-lg animate-bounce">
              <span className="text-xl">📊</span>
              <span className="text-sm font-bold">Transparent Class Logs for Parents & Teachers</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold text-gray-900 mb-8 leading-tight">
              Smart Class
              <br />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent animate-pulse">
                Logging
              </span>
            </h1>
            
            <p className="text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              Create transparent class logs that keep parents informed and help teachers track student progress 
              with seamless payment integration and effortless communication. 📊
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-12 py-5 rounded-full text-xl font-bold hover:shadow-2xl transform hover:scale-110 transition-all duration-500 flex items-center justify-center gap-3 group"
              >
                <span>🚀</span>
                Get Started Free
                <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
              </button>
              <button className="border-3 border-gray-300 text-gray-700 px-12 py-5 rounded-full text-xl font-bold hover:border-emerald-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-300 flex items-center justify-center gap-3 transform hover:scale-105">
                <span>▶️</span>
                Watch Demo
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-3xl p-8 shadow-xl transform hover:scale-105 transition-all duration-300">
                <div className="text-5xl mb-4">👨‍🏫</div>
                <div className="text-4xl font-bold text-emerald-600 mb-2">500+</div>
                <div className="text-gray-600 font-semibold">Active Teachers</div>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-3xl p-8 shadow-xl transform hover:scale-105 transition-all duration-300">
                <div className="text-5xl mb-4">👨‍🎓</div>
                <div className="text-4xl font-bold text-teal-600 mb-2">10K+</div>
                <div className="text-gray-600 font-semibold">Students</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-8 shadow-xl transform hover:scale-105 transition-all duration-300">
                <div className="text-5xl mb-4">⭐</div>
                <div className="text-4xl font-bold text-green-600 mb-2">98%</div>
                <div className="text-gray-600 font-semibold">Satisfaction</div>
              </div>
            </div>
          </div>

          {/* Hero Dashboard */}
          <div className="relative max-w-6xl mx-auto">
            <div className="bg-gradient-to-r from-emerald-600/10 to-teal-600/10 rounded-3xl p-8 backdrop-blur-sm border border-white/30 shadow-2xl">
              <div className="bg-white rounded-3xl shadow-2xl p-8 transform hover:scale-[1.02] transition-all duration-500">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex gap-3">
                    <div className="w-4 h-4 bg-red-500 rounded-full shadow-lg"></div>
                    <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-lg"></div>
                    <div className="w-4 h-4 bg-green-500 rounded-full shadow-lg"></div>
                  </div>
                  <div className="text-gray-500 font-semibold">ClassLogger Dashboard ✨</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-72">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 flex flex-col justify-between shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                    <div>
                      <div className="text-4xl text-emerald-600 mb-3">📅</div>
                      <h3 className="font-bold text-gray-900 text-lg">Today&apos;s Classes</h3>
                      <p className="text-sm text-gray-600 mt-1">Mathematics, Physics</p>
                    </div>
                    <div className="text-4xl font-bold text-emerald-600">4</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 flex flex-col justify-between shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                    <div>
                      <div className="text-4xl text-green-600 mb-3">💳</div>
                      <h3 className="font-bold text-gray-900 text-lg">Monthly Revenue</h3>
                      <p className="text-sm text-gray-600 mt-1">This month</p>
                    </div>
                    <div className="text-4xl font-bold text-green-600">₹45K</div>
                  </div>
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-6 flex flex-col justify-between shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                    <div>
                      <div className="text-4xl text-teal-600 mb-3">📊</div>
                      <h3 className="font-bold text-gray-900 text-lg">Class Logs</h3>
                      <p className="text-sm text-gray-600 mt-1">Generated today</p>
                    </div>
                    <div className="text-4xl font-bold text-teal-600">12</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">Everything You Need ✨</h2>
            <p className="text-2xl text-gray-600 max-w-4xl mx-auto">
              Comprehensive tools designed to make teaching more efficient and learning more effective.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "📊",
                title: "Transparent Class Logs",
                description: "Create detailed class logs that parents can access instantly, ensuring complete transparency in their child's education.",
                color: "from-emerald-500 to-emerald-600",
                bgColor: "from-emerald-50 to-emerald-100"
              },
              {
                icon: "💳",
                title: "Smart Payment Tracking",
                description: "Manage tuition fees with credit system, automated reminders, and seamless payment integration.",
                color: "from-green-500 to-green-600",
                bgColor: "from-green-50 to-green-100"
              },
              {
                icon: "👥",
                title: "Parent-Teacher Connect",
                description: "Seamless communication between teachers and parents with real-time updates and notifications.",
                color: "from-teal-500 to-teal-600",
                bgColor: "from-teal-50 to-teal-100"
              },
              {
                icon: "📅",
                title: "Class Management",
                description: "Schedule classes, track attendance, and manage multiple batches effortlessly with our intuitive dashboard.",
                color: "from-cyan-500 to-cyan-600",
                bgColor: "from-cyan-50 to-cyan-100"
              },
              {
                icon: "🛡️",
                title: "Secure & Reliable",
                description: "Enterprise-grade security with regular backups and 99.9% uptime guarantee for peace of mind.",
                color: "from-slate-500 to-slate-600",
                bgColor: "from-slate-50 to-slate-100"
              },
              {
                icon: "❤️",
                title: "Made with Care",
                description: "Built by educators, for educators. Every feature is designed with teaching and learning in mind.",
                color: "from-pink-500 to-pink-600",
                bgColor: "from-pink-50 to-pink-100"
              }
            ].map((feature, index) => (
              <div key={index} className={`group bg-gradient-to-br ${feature.bgColor} rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 hover:scale-105 border border-white/50`}>
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${feature.color} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <div className="text-white text-3xl">{feature.icon}</div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed text-lg">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-teal-600 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border-4 border-white rounded-full animate-spin"></div>
          <div className="absolute bottom-10 right-10 w-24 h-24 border-4 border-white rounded-full animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-4 border-white rounded-full animate-ping"></div>
        </div>
        
        <div className="max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative">
          <h2 className="text-5xl font-bold text-white mb-8">Ready to Transform Your Teaching? 🚀</h2>
          <p className="text-2xl text-emerald-100 mb-12 leading-relaxed">
            Join thousands of educators who are creating transparent class logs and building stronger parent-teacher relationships.
          </p>
          <button 
            onClick={() => setIsLoginOpen(true)}
            className="bg-white text-emerald-600 px-12 py-5 rounded-full text-xl font-bold hover:shadow-2xl transform hover:scale-110 transition-all duration-500 inline-flex items-center gap-3 group"
          >
            <span>✨</span>
            Start Free Trial
            <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
          </button>
        </div>
      </section>

      {/* Login Modal */}
      <LoginModal />
    </div>
  );
};

export default ClassLoggerLanding;