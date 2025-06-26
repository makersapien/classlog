'use client'

import React, { useState } from 'react';

// Define proper TypeScript interfaces based on your project structure
interface StudentData {
  id?: string;
  student_id?: string;
  student_name?: string;
  parent_name?: string;
  parent_email?: string;
  subject?: string;
  year_group?: string;
  classes_per_week?: number;
  classes_per_recharge?: number;
  tentative_schedule?: string | { note: string } | null;
  whatsapp_group_url?: string | null;
  google_meet_url?: string | null;
  setup_completed?: boolean;
  enrollment_date?: string;
  status?: string;
  class_name?: string;
  created_at?: string;
  updated_at?: string;
}

interface APIErrorResponse {
  error: string;
  details?: string;
  message?: string;
}

interface APISuccessResponse {
  student?: StudentData;
  success?: boolean;
  message?: string;
}

interface APIResponse {
  status: number | string;
  ok: boolean;
  data: APISuccessResponse | APIErrorResponse;
}

interface TestData {
  whatsapp_group_url?: string;
  google_meet_url?: string;
  setup_completed?: boolean;
  student_name?: string;
  parent_name?: string;
  parent_email?: string;
  subject?: string;
  year_group?: string;
  classes_per_week?: number;
  classes_per_recharge?: number;
  tentative_schedule?: string;
}

const APIDebugger = () => {
  const [enrollmentId, setEnrollmentId] = useState('');
  const [testData, setTestData] = useState<TestData>({
    whatsapp_group_url: 'https://chat.whatsapp.com/test123',
    google_meet_url: 'https://meet.google.com/test-meeting',
    setup_completed: true
  });
  const [response, setResponse] = useState<APIResponse | null>(null);
  const [beforeData, setBeforeData] = useState<StudentData | null>(null);
  const [afterData, setAfterData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCurrentData = async (enrollmentId: string): Promise<StudentData | null> => {
    try {
      const response = await fetch(`/api/teacher/students/${enrollmentId}`, {
        method: 'GET'
      });
      const result: APISuccessResponse = await response.json();
      return result.student || null;
    } catch (error) {
      console.error('Error fetching current data:', error);
      return null;
    }
  };

  const testAPI = async () => {
    if (!enrollmentId.trim()) {
      alert('Please enter an enrollment ID');
      return;
    }

    setLoading(true);
    try {
      console.log('🧪 Testing API with data:', testData);
      
      console.log('📊 Fetching data BEFORE update...');
      const beforeUpdate = await fetchCurrentData(enrollmentId);
      setBeforeData(beforeUpdate);
      console.log('📊 Data BEFORE:', beforeUpdate);
      
      console.log('🔄 Performing PATCH update...');
      const response = await fetch(`/api/teacher/students/${enrollmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });

      const result: APISuccessResponse | APIErrorResponse = await response.json();
      
      console.log('📊 API Response:', {
        status: response.status,
        ok: response.ok,
        data: result
      });

      setResponse({
        status: response.status,
        ok: response.ok,
        data: result
      });

      console.log('📊 Fetching data AFTER update...');
      setTimeout(async () => {
        const afterUpdate = await fetchCurrentData(enrollmentId);
        setAfterData(afterUpdate);
        console.log('📊 Data AFTER:', afterUpdate);
        
        console.log('🔍 COMPARISON:');
        console.log('WhatsApp URL changed?',
          beforeUpdate?.whatsapp_group_url !== afterUpdate?.whatsapp_group_url);
        console.log('Google Meet URL changed?',
          beforeUpdate?.google_meet_url !== afterUpdate?.google_meet_url);
        console.log('Setup completed changed?',
          beforeUpdate?.setup_completed !== afterUpdate?.setup_completed);
      }, 1000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('💥 API Test Error:', error);
      setResponse({
        status: 'ERROR',
        ok: false,
        data: { error: errorMessage }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestDataChange = (value: string) => {
    try {
      const parsedData = JSON.parse(value) as TestData;
      setTestData(parsedData);
    } catch {
      // Silently handle JSON parse errors
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">🧪 Enhanced API Debugger</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enrollment ID
              </label>
              <input
                type="text"
                value={enrollmentId}
                onChange={(e) => setEnrollmentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter student enrollment ID"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get this from your students page or network tab
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Data (JSON)
              </label>
              <textarea
                value={JSON.stringify(testData, null, 2)}
                onChange={(e) => handleTestDataChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={8}
              />
            </div>

            <button
              onClick={testAPI}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Testing API...
                </span>
              ) : (
                '🚀 Test PATCH API'
              )}
            </button>
          </div>

          <div className="space-y-4">
            {response && (
              <div className="p-4 bg-gray-50 rounded-md">
                <h3 className="font-bold text-gray-900 mb-2">API Response:</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <span className={`px-2 py-1 rounded text-sm ${
                      response.ok 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {response.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Data:</span>
                    <pre className="mt-1 p-3 bg-white border rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(response.data, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {beforeData && (
              <div className="p-4 bg-blue-50 rounded-md">
                <h3 className="font-bold text-blue-900 mb-2">Data BEFORE Update:</h3>
                <div className="text-sm space-y-1">
                  <div><strong>WhatsApp:</strong> {beforeData.whatsapp_group_url || 'null'}</div>
                  <div><strong>Google Meet:</strong> {beforeData.google_meet_url || 'null'}</div>
                  <div><strong>Setup Complete:</strong> {beforeData.setup_completed ? 'true' : 'false'}</div>
                </div>
              </div>
            )}

            {afterData && (
              <div className="p-4 bg-green-50 rounded-md">
                <h3 className="font-bold text-green-900 mb-2">Data AFTER Update:</h3>
                <div className="text-sm space-y-1">
                  <div><strong>WhatsApp:</strong> {afterData.whatsapp_group_url || 'null'}</div>
                  <div><strong>Google Meet:</strong> {afterData.google_meet_url || 'null'}</div>
                  <div><strong>Setup Complete:</strong> {afterData.setup_completed ? 'true' : 'false'}</div>
                </div>
                
                {beforeData && (
                  <div className="mt-4 pt-3 border-t border-green-200">
                    <h4 className="font-medium text-green-900 mb-2">Changes Detected:</h4>
                    <div className="text-xs space-y-1">
                      <div className={beforeData.whatsapp_group_url !== afterData.whatsapp_group_url ? 'text-green-600 font-semibold' : 'text-gray-500'}>
                        WhatsApp: {beforeData.whatsapp_group_url !== afterData.whatsapp_group_url ? '✅ Changed' : '❌ No change'}
                      </div>
                      <div className={beforeData.google_meet_url !== afterData.google_meet_url ? 'text-green-600 font-semibold' : 'text-gray-500'}>
                        Google Meet: {beforeData.google_meet_url !== afterData.google_meet_url ? '✅ Changed' : '❌ No change'}
                      </div>
                      <div className={beforeData.setup_completed !== afterData.setup_completed ? 'text-green-600 font-semibold' : 'text-gray-500'}>
                        Setup Complete: {beforeData.setup_completed !== afterData.setup_completed ? '✅ Changed' : '❌ No change'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-md">
          <h3 className="font-bold text-yellow-900 mb-2">🔍 Debugging Steps:</h3>
          <ol className="text-sm text-yellow-800 list-decimal list-inside space-y-1">
            <li>Open browser DevTools (F12) and go to Console tab</li>
            <li>Enter a valid enrollment ID above</li>
            <li>Click &ldquo;Test PATCH API&rdquo; and watch the console</li>
            <li>Check if &ldquo;Data BEFORE&rdquo; and &ldquo;Data AFTER&rdquo; show any changes</li>
            <li>If no changes detected, there&apos;s a database issue</li>
            <li>Share the console output for further debugging</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default function DebugPage() {
  return <APIDebugger />;
}