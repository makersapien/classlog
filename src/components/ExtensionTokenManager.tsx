'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, RefreshCw, Shield, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface TokenInfo {
  created_at: string
  expires_at: string
  last_used_at?: string
  usage_count: number
  days_until_expiry: number
  hours_until_expiry: number
}

interface TokenStatus {
  has_token: boolean
  status: 'active' | 'expiring_soon' | 'expired' | 'no_token'
  message: string
  token_info?: TokenInfo
}

interface ExtensionTokenManagerProps {
  userId: string
  teacherName?: string
}

export default function ExtensionTokenManager({ userId }: ExtensionTokenManagerProps) {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null)
  const [currentToken, setCurrentToken] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchTokenStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/teacher/tokens/status?teacherId=${userId}`)
      const data = await response.json()
      
      if (data.success) {
        setTokenStatus(data)
      } else {
        console.error('Failed to fetch token status:', data.error)
      }
    } catch (error) {
      console.error('Error fetching token status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchTokenStatus()
  }, [fetchTokenStatus])

  const generateToken = async () => {
    try {
      setIsGenerating(true)
      const response = await fetch('/api/teacher/tokens/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teacherId: userId })
      })

      const data = await response.json()
      
      if (data.success) {
        setCurrentToken(data.token)
        await fetchTokenStatus()
        toast({
          title: "Token Generated!",
          description: "Your new extension token is ready. Copy it to your browser extension.",
        })
      } else {
        toast({
          title: "Failed to Generate Token",
          description: data.error || "Please try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error generating token:', error)
      toast({
        title: "Error",
        description: "Failed to generate token. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const revokeToken = async () => {
    if (!confirm('Are you sure you want to revoke your current extension token? You will need to generate a new one.')) {
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/teacher/tokens/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teacherId: userId })
      })

      const data = await response.json()
      
      if (data.success) {
        setCurrentToken('')
        await fetchTokenStatus()
        toast({
          title: "Token Revoked",
          description: "Your extension token has been deactivated.",
        })
      } else {
        toast({
          title: "Failed to Revoke Token",
          description: data.error || "Please try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error revoking token:', error)
      toast({
        title: "Error",
        description: "Failed to revoke token. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: "Token copied to clipboard.",
      })
    } catch (error) {
      console.error('Failed to copy:', error)
      toast({
        title: "Copy Failed",
        description: "Please copy the token manually.",
        variant: "destructive"
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>
      case 'expiring_soon':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Expiring Soon</Badge>
      case 'expired':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Expired</Badge>
      case 'no_token':
        return <Badge variant="outline">No Token</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (isLoading && !tokenStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Extension Token Manager
          </CardTitle>
          <CardDescription>
            Loading token status...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Extension Token Manager
        </CardTitle>
        <CardDescription>
          Generate and manage your ClassLogger Chrome extension authentication token
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {tokenStatus && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Current Status:</span>
                {getStatusBadge(tokenStatus.status)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTokenStatus}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            <Alert className={tokenStatus.status === 'expiring_soon' ? 'border-orange-200 bg-orange-50' : ''}>
              <AlertDescription>
                {tokenStatus.message}
              </AlertDescription>
            </Alert>

            {tokenStatus.has_token && tokenStatus.token_info && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Created</Label>
                  <p className="text-sm">{new Date(tokenStatus.token_info.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Expires</Label>
                  <p className="text-sm">{new Date(tokenStatus.token_info.expires_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Usage Count</Label>
                  <p className="text-sm">{tokenStatus.token_info.usage_count} times</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Last Used</Label>
                  <p className="text-sm">
                    {tokenStatus.token_info.last_used_at 
                      ? new Date(tokenStatus.token_info.last_used_at).toLocaleDateString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Generate New Token</h3>
              <p className="text-sm text-gray-600">Creates a new weekly token for your browser extension</p>
            </div>
            <Button
              onClick={generateToken}
              disabled={isGenerating}
              className="min-w-[120px]"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Token'
              )}
            </Button>
          </div>

          {currentToken && (
            <div className="space-y-2">
              <Label htmlFor="new-token">Your New Extension Token:</Label>
              <div className="flex gap-2">
                <Input
                  id="new-token"
                  value={currentToken}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(currentToken)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <Alert>
                <AlertDescription>
                  <strong>Important:</strong> Copy this token to your Chrome extension now. It will only be shown once for security reasons.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Setup Instructions:</h3>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Generate a new token using the button above</li>
            <li>Copy the token to your clipboard</li>
            <li>Open your ClassLogger Chrome extension</li>
            <li>Paste the token in the &quot;Extension Token&quot; field</li>
            <li>Click &quot;Save Token&quot; to activate</li>
            <li>Your extension is now ready to log classes!</li>
          </ol>
        </div>

        {tokenStatus?.has_token && (
          <div className="pt-4 border-t border-gray-200">
            <div className="space-y-2">
              <h3 className="font-medium text-red-600">Danger Zone</h3>
              <p className="text-sm text-gray-600">
                Revoking your token will immediately deactivate your browser extension.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={revokeToken}
                disabled={isLoading}
              >
                Revoke Current Token
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}