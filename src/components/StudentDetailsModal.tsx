import React, { useState, useEffect } from 'react';
import { AlertCircle, Calendar, CheckCircle, Link, User, X } from 'lucide-react'

// Define TypeScript interfaces
interface Student {
  id: string;
  student_id: string;
  student_name: string;
  parent_name: string;
  parent_email: string;
  subject: string;
  year_group: string;
  classes_per_week: number;
  classes_per_recharge: number;
  tentative_schedule: string | { note: string } | null;
  whatsapp_group_url: string | null;
  google_meet_url: string | null;
  setup_completed: boolean;
  enrollment_date: string;
  status: string;
  class_name: string;
}

interface StudentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onUpdate: (updatedStudent: Student) => void;
}

interface FormData {
  student_name: string;
  parent_name: string;
  parent_email: string;
  subject: string;
  year_group: string;
  classes_per_week: number;
  classes_per_recharge: number;
  tentative_schedule: string;
  whatsapp_group_url: string;
  google_meet_url: string;
  setup_completed: boolean;
}

interface FormErrors {
  [key: string]: string;
}

const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  student, 
  onUpdate 
}) => {
  const [formData, setFormData] = useState<FormData>({
    student_name: '',
    parent_name: '',
    parent_email: '',
    subject: '',
    year_group: '',
    classes_per_week: 1,
    classes_per_recharge: 4,
    tentative_schedule: '',
    whatsapp_group_url: '',
    google_meet_url: '',
    setup_completed: false
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Populate form when student data changes
  useEffect(() => {
    if (student) {
      setFormData({
        student_name: student.student_name || '',
        parent_name: student.parent_name || '',
        parent_email: student.parent_email || '',
        subject: student.subject || '',
        year_group: student.year_group || '',
        classes_per_week: student.classes_per_week || 1,
        classes_per_recharge: student.classes_per_recharge || 4,
        tentative_schedule: typeof student.tentative_schedule === 'object' 
          ? student.tentative_schedule?.note || '' 
          : student.tentative_schedule || '',
        whatsapp_group_url: student.whatsapp_group_url || '',
        google_meet_url: student.google_meet_url || '',
        setup_completed: student.setup_completed || false
      });
    }
  }, [student]);

  // Check which fields are missing
  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    if (!formData.whatsapp_group_url?.trim()) missing.push('WhatsApp Group URL');
    if (!formData.google_meet_url?.trim()) missing.push('Google Meet URL');
    if (!formData.tentative_schedule?.trim()) missing.push('Schedule');
    return missing;
  };

  const missingFields = getMissingFields();
  const isSetupComplete = missingFields.length === 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 1 : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.student_name.trim()) newErrors.student_name = 'Student name is required';
    if (!formData.parent_name.trim()) newErrors.parent_name = 'Parent name is required';
    if (!formData.parent_email.trim()) newErrors.parent_email = 'Parent email is required';
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.year_group.trim()) newErrors.year_group = 'Year group is required';
    
    if (formData.whatsapp_group_url && !formData.whatsapp_group_url.includes('chat.whatsapp.com')) {
      newErrors.whatsapp_group_url = 'Please enter a valid WhatsApp group URL';
    }
    
    if (formData.google_meet_url && !formData.google_meet_url.includes('meet.google.com')) {
      newErrors.google_meet_url = 'Please enter a valid Google Meet URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validateForm() || !student) return;
    
    setIsLoading(true);
    
    try {
      // Update student data via API
      const response = await fetch(`/api/teacher/students/${student.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          setup_completed: isSetupComplete
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update student');
      }

      // // const result = await response.json();
      
      // Call parent callback to update the UI
      if (onUpdate) {
        onUpdate({
          ...student,
          ...formData,
          setup_completed: isSetupComplete
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating student:', error);
      setErrors({ submit: 'Failed to update student. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get input class names
  const getInputClassName = (fieldName: string, hasError: boolean = false, isMissing: boolean = false): string => {
    const baseClass = 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';
    
    if (hasError) {
      return `${baseClass} border-red-500`;
    } else if (isMissing) {
      return `${baseClass} border-orange-300 bg-orange-50`;
    } else {
      return `${baseClass} border-gray-300`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Student Details</h2>
            <p className="text-sm text-gray-600 mt-1">
              Update student information and setup details
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Setup Status Alert */}
        <div className="p-6 pb-4">
          {isSetupComplete ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-900">Setup Complete</p>
                <p className="text-sm text-green-700">All required information has been provided</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900">Setup Incomplete</p>
                <p className="text-sm text-orange-700 mb-2">Missing required information:</p>
                <ul className="text-sm text-orange-700 list-disc list-inside">
                  {missingFields.map((field: string) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Form Content */}
        <div className="p-6 pt-2 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Name
                </label>
                <input
                  type="text"
                  name="student_name"
                  value={formData.student_name}
                  onChange={handleInputChange}
                  className={getInputClassName('student_name', !!errors.student_name)}
                  placeholder="Enter student name"
                />
                {errors.student_name && (
                  <p className="text-red-500 text-xs mt-1">{errors.student_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className={getInputClassName('subject', !!errors.subject)}
                  placeholder="e.g., Physics, Mathematics"
                />
                {errors.subject && (
                  <p className="text-red-500 text-xs mt-1">{errors.subject}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Name
                </label>
                <input
                  type="text"
                  name="parent_name"
                  value={formData.parent_name}
                  onChange={handleInputChange}
                  className={getInputClassName('parent_name', !!errors.parent_name)}
                  placeholder="Enter parent name"
                />
                {errors.parent_name && (
                  <p className="text-red-500 text-xs mt-1">{errors.parent_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year Group
                </label>
                <input
                  type="text"
                  name="year_group"
                  value={formData.year_group}
                  onChange={handleInputChange}
                  className={getInputClassName('year_group', !!errors.year_group)}
                  placeholder="e.g., Year 11, Grade 10"
                />
                {errors.year_group && (
                  <p className="text-red-500 text-xs mt-1">{errors.year_group}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Email
                </label>
                <input
                  type="email"
                  name="parent_email"
                  value={formData.parent_email}
                  onChange={handleInputChange}
                  className={getInputClassName('parent_email', !!errors.parent_email)}
                  placeholder="parent@example.com"
                />
                {errors.parent_email && (
                  <p className="text-red-500 text-xs mt-1">{errors.parent_email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Class Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Class Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Classes per Week
                </label>
                <input
                  type="number"
                  name="classes_per_week"
                  value={formData.classes_per_week}
                  onChange={handleInputChange}
                  min="1"
                  max="7"
                  className={getInputClassName('classes_per_week')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Classes per Recharge
                </label>
                <input
                  type="number"
                  name="classes_per_recharge"
                  value={formData.classes_per_recharge}
                  onChange={handleInputChange}
                  min="1"
                  max="50"
                  className={getInputClassName('classes_per_recharge')}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tentative Schedule
                </label>
                <textarea
                  name="tentative_schedule"
                  value={formData.tentative_schedule}
                  onChange={handleInputChange}
                  rows={3}
                  className={getInputClassName('tentative_schedule', false, !formData.tentative_schedule?.trim())}
                  placeholder="e.g., Mondays 4 PM, Wednesdays 6 PM"
                />
                {!formData.tentative_schedule?.trim() && (
                  <p className="text-orange-600 text-xs mt-1">⚠️ Schedule information needed for complete setup</p>
                )}
              </div>
            </div>
          </div>

          {/* Communication Links */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Link className="w-5 h-5" />
              Communication Links
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Group URL
                </label>
                <input
                  type="url"
                  name="whatsapp_group_url"
                  value={formData.whatsapp_group_url}
                  onChange={handleInputChange}
                  className={getInputClassName('whatsapp_group_url', !!errors.whatsapp_group_url, !formData.whatsapp_group_url?.trim())}
                  placeholder="https://chat.whatsapp.com/..."
                />
                {errors.whatsapp_group_url && (
                  <p className="text-red-500 text-xs mt-1">{errors.whatsapp_group_url}</p>
                )}
                {!formData.whatsapp_group_url?.trim() && !errors.whatsapp_group_url && (
                  <p className="text-orange-600 text-xs mt-1">⚠️ WhatsApp group URL needed for complete setup</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Meet URL
                </label>
                <input
                  type="url"
                  name="google_meet_url"
                  value={formData.google_meet_url}
                  onChange={handleInputChange}
                  className={getInputClassName('google_meet_url', !!errors.google_meet_url, !formData.google_meet_url?.trim())}
                  placeholder="https://meet.google.com/..."
                />
                {errors.google_meet_url && (
                  <p className="text-red-500 text-xs mt-1">{errors.google_meet_url}</p>
                )}
                {!formData.google_meet_url?.trim() && !errors.google_meet_url && (
                  <p className="text-orange-600 text-xs mt-1">⚠️ Google Meet URL needed for complete setup</p>
                )}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {isSetupComplete ? (
                <span className="text-green-600 font-medium">✓ Setup complete</span>
              ) : (
                <span className="text-orange-600 font-medium">
                  {missingFields.length} field{missingFields.length !== 1 ? 's' : ''} missing
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailsModal;