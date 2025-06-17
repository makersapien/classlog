// src/app/debug/page.tsx
'use client'

import React, { useState } from 'react';

const APIDebugger = () => {
  const [enrollmentId, setEnrollmentId] = useState('');
  const [testData, setTestData] = useState({
    whatsapp_group_url: 'https://chat.whatsapp.com/test123',
    google_meet_url: 'https://meet.google.com/test-meeting',
    setup_completed: true
  });
  const [response, setResponse] = useState<any>(null);
  const [beforeData, setBeforeData] = useState<any>(null);
  const [afterData, setAfterData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchCurrentData = async (enrollmentId: string) => {
    try {
      const response = await fetch(`/api/teacher/students/${enrollmentId}`, {
        method: 'GET'
      });
      const result = await response.json();
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
      
      // Get data BEFORE update
      console.log('📊 Fetching data BEFORE update...');
      const beforeUpdate = await fetchCurrentData(enrollmentId);
      setBeforeData(beforeUpdate);
      console.log('📊 Data BEFORE:', beforeUpdate);
      
      // Perform the update
      console.log('🔄 Performing PATCH update...');
      const response = await fetch(`/api/teacher/students/${enrollmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });

      const result = await response.json();
      
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

      // Get data AFTER update
      console.log('📊 Fetching data AFTER update...');
      setTimeout(async () => {
        const afterUpdate = await fetchCurrentData(enrollmentId);
        setAfterData(afterUpdate);
        console.log('📊 Data AFTER:', afterUpdate);
        
        // Compare the data
        console.log('🔍 COMPARISON:');
        console.log('WhatsApp URL changed?', 
          beforeUpdate?.whatsapp_group_url !== afterUpdate?.whatsapp_group_url);
        console.log('Google Meet URL changed?', 
          beforeUpdate?.google_meet_url !== afterUpdate?.google_meet_url);
        console.log('Setup completed changed?', 
          beforeUpdate?.setup_completed !== afterUpdate?.setup_completed);
      }, 1000); // Wait 1 second for DB to update

    } catch (error: any) {
      console.error('💥 API Test Error:', error);
      setResponse({
        status: 'ERROR',
        ok: false,
        data: { error: error.message }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">🧪 Enhanced API Debugger</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
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
                onChange={(e) => {
                  try {
                    setTestData(JSON.parse(e.target.value));
                  } catch (err) {
                    // Invalid JSON, keep the text but don't update state
                  }
                }}
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

          {/* Results Section */}
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
            <li>Click "Test PATCH API" and watch the console</li>
            <li>Check if "Data BEFORE" and "Data AFTER" show any changes</li>
            <li>If no changes detected, there's a database issue</li>
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