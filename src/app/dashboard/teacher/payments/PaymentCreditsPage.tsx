// src/app/dashboard/teacher/payments/PaymentCreditsPage.tsx
'use client'

import React, { useState, ChangeEvent, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Camera, CheckCircle, Clock, CreditCard, DollarSign, Image as  Loader2, QrCode, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/hooks/use-toast';
import AwardCreditsModal from '@/components/AwardCreditsModal';

interface PaymentRecord {
  id: string;
  student_id: string;
  class_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_date: string;
  due_date: string;
  month_year: string;
  notes: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  classes?: {
    name: string;
    subject: string;
  };
}

interface TeacherProfile {
  id: string;
  full_name: string;
  email: string;
  upi_id?: string;
  qr_code_url?: string;
  role: string;
}

type UserRole = 'teacher' | 'parent';

const PaymentCreditsPage: React.FC = () => {
  const [userRole, setUserRole] = useState<UserRole>('teacher');
  const [upiId, setUpiId] = useState<string>('');
  const [qrCodePreview, setQrCodePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [awardCreditsDialog, setAwardCreditsDialog] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const supabase = createClientComponentClient();
  const { toast } = useToast();

  // Fetch data on component mount
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching payment data...');
      
      const response = await fetch('/api/payments');
      const data = await response.json();

      console.log('API Response:', data);

      if (response.ok) {
        console.log('Profile data:', data.profile);
        setProfile(data.profile);
        setPayments(data.payments || []);
        setUpiId(data.profile?.upi_id || '');
        if (data.profile?.qr_code_url) {
          setQrCodePreview(data.profile.qr_code_url);
        }
      } else {
        console.error('API Error:', data.error);
        toast({
          title: "Error",
          description: data.error || "Failed to fetch data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Remove the unused uploadToSupabase function since we're using base64

  const uploadAsBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          resolve(reader.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsDataURL(file);
    });
  };

  const handleQrCodeUpload = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if we have a valid profile first
    if (!profile?.id) {
      toast({
        title: "Error",
        description: "User profile not loaded. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Please upload a PNG or JPEG image",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size should be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      console.log('Converting file to base64...');
      console.log('Profile ID:', profile.id);
      
      // Convert to base64 (much simpler and more reliable)
      const base64String = await uploadAsBase64(file);
      setQrCodePreview(base64String);

      console.log('Updating profile with QR code data...');
      
      // Update profile with base64 string
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ qr_code_url: base64String })
        .eq('id', profile.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error(`Failed to save QR code: ${updateError.message}`);
      }

      toast({
        title: "Success",
        description: "QR code uploaded successfully",
      });
      
      // Update local state
      setProfile(prev => prev ? { ...prev, qr_code_url: base64String } : null);
      
    } catch (error) {
      console.error('Error uploading QR code:', error);
      
      // Reset preview on error
      setQrCodePreview('');
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to upload QR code. Please try again.';
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpiSave = async (): Promise<void> => {
    if (!upiId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid UPI ID",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_upi',
          upi_id: upiId
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "UPI ID saved successfully",
        });
        setProfile(prev => prev ? { ...prev, upi_id: upiId } : null);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error saving UPI:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save UPI ID",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreditModalSuccess = () => {
    fetchData();
  };

  const triggerFileInput = (): void => {
    const fileInput = document.getElementById('qr-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  const clearQrCode = async (): Promise<void> => {
    try {
      if (!profile?.qr_code_url || !profile?.id) {
        toast({
          title: "Error",
          description: "No QR code to remove or profile not loaded",
          variant: "destructive",
        });
        return;
      }

      console.log('Removing QR code for profile:', profile.id);

      // Update database to remove QR code URL (base64 approach - no storage cleanup needed)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ qr_code_url: null })
        .eq('id', profile.id);

      if (updateError) {
        console.error('Clear QR error:', updateError);
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      // Update local state
      setQrCodePreview('');
      setProfile(prev => prev ? { ...prev, qr_code_url: undefined } : null);
      
      toast({
        title: "Success",
        description: "QR code removed successfully",
      });
    } catch (error) {
      console.error('Error removing QR code:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove QR code",
        variant: "destructive",
      });
    }
  };

  // Calculate stats from payments data
  const calculateStats = () => {
    const totalEarnings = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const totalCreditsAwarded = payments
      .filter(p => p.status === 'paid')
      .length;
    
    const pendingPayments = payments
      .filter(p => p.status === 'pending')
      .length;

    return {
      totalEarnings,
      totalCreditsAwarded,
      pendingPayments
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
          <p className="text-gray-600">Loading payment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            💳 Payment & Credits
          </h1>
          <p className="text-gray-600 mt-1">Manage payments and class credits efficiently</p>
        </div>
        <Tabs value={userRole} onValueChange={(value: string) => setUserRole(value as UserRole)} className="w-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="teacher" className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700">
              👩‍🏫 Teacher
            </TabsTrigger>
            <TabsTrigger value="parent" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
              👨‍👩‍👧‍👦 Parent
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={userRole} onValueChange={(value: string) => setUserRole(value as UserRole)}>
        <TabsContent value="teacher" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-t-4 border-t-emerald-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">₹{stats.totalEarnings.toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </CardContent>
            </Card>
            
            <Card className="border-t-4 border-t-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Credits Awarded</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.totalCreditsAwarded}</div>
                <p className="text-xs text-gray-500 mt-1">Total transactions</p>
              </CardContent>
            </Card>
            
            <Card className="border-t-4 border-t-purple-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Pending Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.pendingPayments}</div>
                <p className="text-xs text-gray-500 mt-1">Awaiting confirmation</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* UPI Setup Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <QrCode className="text-emerald-600" size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">UPI Payment Setup</CardTitle>
                    <CardDescription>Configure your payment details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="upi-id">UPI ID</Label>
                  <Input
                    id="upi-id"
                    placeholder="yourname@paytm"
                    value={upiId}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setUpiId(e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label>QR Code Upload</Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-emerald-300 transition-colors">
                    {qrCodePreview ? (
                      <div className="space-y-3">
                        <Image 
                          src={qrCodePreview} 
                          alt="QR Code Preview" 
                          width={96}
                          height={96}
                          className="mx-auto rounded-lg shadow-md object-contain"
                        />
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={triggerFileInput}
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <Loader2 size={14} className="mr-2 animate-spin" />
                            ) : (
                              <Camera size={14} className="mr-2" />
                            )}
                            Change
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearQrCode}
                            disabled={isUploading}
                          >
                            <Trash2 size={14} className="mr-2" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                        <div>
                          <p className="text-sm font-medium text-gray-600">Upload QR Code</p>
                          <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={triggerFileInput}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 size={14} className="mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            'Choose File'
                          )}
                        </Button>
                      </div>
                    )}
                    <input
                      id="qr-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleQrCodeUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleUpiSave} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={!upiId.trim() || submitting}
                >
                  {submitting ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <CheckCircle size={16} className="mr-2" />
                  )}
                  Save Payment Details
                </Button>
              </CardContent>
            </Card>

            {/* Award Credits Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CreditCard className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Award Credits</CardTitle>
                    <CardDescription>Grant hours to parents after payment confirmation</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => setAwardCreditsDialog(true)}
                >
                  <DollarSign size={16} className="mr-2" />
                  Award New Credits
                </Button>
                
                <AwardCreditsModal
                  open={awardCreditsDialog}
                  onOpenChange={setAwardCreditsDialog}
                  onSuccess={handleCreditModalSuccess}
                />
              </CardContent>
            </Card>
          </div>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={20} />
                Recent Payments
              </CardTitle>
              <CardDescription>Track payment confirmations and credits awarded</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>No payment history yet</p>
                    <p className="text-sm">Payment records will appear here</p>
                  </div>
                ) : (
                  payments.map((payment: PaymentRecord) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                            {payment.profiles?.full_name?.charAt(0) || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm">{payment.profiles?.full_name || 'Student'}</h4>
                          <p className="text-xs text-gray-600">{payment.classes?.subject || 'Subject'} • {payment.month_year}</p>
                          <p className="text-xs text-gray-500">{payment.notes || payment.profiles?.email || ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">₹{payment.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : new Date(payment.created_at).toLocaleDateString()}</p>
                        <Badge className={`text-xs ${
                          payment.status === 'paid' ? 'bg-green-100 text-green-800 border-green-200' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          'bg-red-100 text-red-800 border-red-200'
                        }`}>
                          {payment.status === 'paid' && '✅ '}
                          {payment.status === 'pending' && '⏳ '}
                          {payment.status === 'failed' && '❌ '}
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parent" className="space-y-6">
          {/* Teacher QR Code Display */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {profile?.full_name?.charAt(0) || 'T'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{profile?.full_name || 'Teacher'}</CardTitle>
                  <CardDescription>Teacher</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="font-semibold">UPI ID</Label>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                      <p className="font-mono">{profile?.upi_id || 'Not set'}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="font-semibold">Payment Instructions</Label>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <ul className="space-y-1 text-sm text-blue-800">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600">1️⃣</span>
                          Scan the QR code or use the UPI ID above
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600">2️⃣</span>
                          Enter the amount and complete payment
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600">3️⃣</span>
                          Screenshot the payment confirmation
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600">4️⃣</span>
                          Send confirmation to teacher for credit approval
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <Label className="font-semibold mb-4">Scan to Pay</Label>
                  <div className="w-40 h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    {profile?.qr_code_url ? (
                      <Image 
                        src={profile.qr_code_url} 
                        alt="Payment QR Code" 
                        width={160}
                        height={160}
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center space-y-2">
                        <QrCode size={32} className="text-gray-400 mx-auto" />
                        <p className="text-xs text-gray-500">QR Code not uploaded yet</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-2 text-center">
                    Use any UPI app to scan and pay
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentCreditsPage;