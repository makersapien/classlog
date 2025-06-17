// src/app/onboarding/success/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Credentials {
  parent: { email: string; password: string }
  student: { email: string; password: string }
}

export default function OnboardingSuccessPage() {
  const router = useRouter()
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [showPasswords, setShowPasswords] = useState(false)

  useEffect(() => {
    // Get credentials from session storage
    const storedCredentials = sessionStorage.getItem('onboarding_credentials')
    if (storedCredentials) {
      setCredentials(JSON.parse(storedCredentials))
      // Clear from session storage for security
      sessionStorage.removeItem('onboarding_credentials')
    }
  }, [])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-600 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Enrollment Complete!</h1>
          <p className="text-gray-600 text-lg">
            Welcome to ClassLogger! Your accounts have been successfully created.
          </p>
        </div>

        {credentials && (
          <div className="space-y-6 mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-emerald-50 border-2 border-blue-200 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                🔑 Login Credentials
              </h3>
              <div className="text-sm text-blue-800 mb-4">
                <strong>Important:</strong> Please save these credentials and change your passwords after first login.
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Parent Credentials */}
                <div className="bg-white rounded-xl p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    👨‍👩‍👧‍👦 Parent Account
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Email</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={credentials.parent.email}
                          readOnly
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(credentials.parent.email)}
                          className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Password</label>
                      <div className="flex items-center gap-2">
                        <input
                          type={showPasswords ? "text" : "password"}
                          value={credentials.parent.password}
                          readOnly
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(credentials.parent.password)}
                          className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student Credentials */}
                <div className="bg-white rounded-xl p-4 border border-emerald-200">
                  <h4 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                    🎓 Student Account
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Email</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={credentials.student.email}
                          readOnly
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(credentials.student.email)}
                          className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors text-sm"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Password</label>
                      <div className="flex items-center gap-2">
                        <input
                          type={showPasswords ? "text" : "password"}
                          value={credentials.student.password}
                          readOnly
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(credentials.student.password)}
                          className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors text-sm"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showPasswords ? '🙈 Hide Passwords' : '👁️ Show Passwords'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
              📋 Next Steps
            </h3>
            <ul className="space-y-3 text-amber-800">
              <li className="flex items-start gap-3">
                <span className="text-lg">1️⃣</span>
                <span><strong>Save your login credentials</strong> - Write them down or save them in a password manager</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg">2️⃣</span>
                <span><strong>First Login</strong> - Both parent and student should log in and change their passwords</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg">3️⃣</span>
                <span><strong>Join Communication Channels</strong> - Use the WhatsApp and Google Meet links provided</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg">4️⃣</span>
                <span><strong>Check Your Schedule</strong> - View class times and upcoming sessions in your dashboard</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
              💡 Getting Started Tips
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-emerald-800">
              <div>
                <h4 className="font-semibold mb-2">For Parents:</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Monitor your child's progress</li>
                  <li>View class logs and homework</li>
                  <li>Communicate with teachers</li>
                  <li>Track payments and attendance</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">For Students:</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>View your class schedule</li>
                  <li>Access study materials</li>
                  <li>Submit assignments</li>
                  <li>Track your progress</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.push('/')}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 px-6 rounded-2xl font-bold text-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            🏠 Go to Login Page
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-4 border-2 border-emerald-500 text-emerald-600 rounded-2xl font-semibold hover:bg-emerald-50 transition-all duration-200"
          >
            🖨️ Print Credentials
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>🔒 Your credentials are securely generated and encrypted. Please change your passwords after first login.</p>
        </div>
      </div>
    </div>
  )
}