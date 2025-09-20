// Debug endpoint to check what cookies are available
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  // CORS headers for extension access
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin && origin.startsWith('chrome-extension://') ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  }

  try {
    // Get all cookies
    const cookies = request.cookies.getAll()
    
    const cookieInfo = {
      totalCookies: cookies.length,
      cookies: cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value.substring(0, 20) + '...',
        hasValue: !!cookie.value
      })),
      authCookies: {
        classlogger_auth: !!request.cookies.get('classlogger_auth'),
        classlogger_extension: !!request.cookies.get('classlogger_extension'),
        classlogger_teacher_id: !!request.cookies.get('classlogger_teacher_id')
      },
      headers: {
        origin: request.headers.get('origin'),
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer')
      }
    }

    return NextResponse.json(cookieInfo, {
      headers: corsHeaders
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      cookies: []
    }, {
      status: 500,
      headers: corsHeaders
    })
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin && origin.startsWith('chrome-extension://') ? origin : '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    }
  })
}