// pages/api/start-class.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { meetUrl, student_email, enrollment_id } = req.body;

    if (!meetUrl || !student_email) {
      return res.status(400).json({ 
        error: 'Missing required fields: meetUrl and student_email' 
      });
    }

    // Check for existing ACTIVE class for this enrollment
    const { data: existingClass, error: checkError } = await supabase
      .from('class_logs')
      .select('*')
      .eq('enrollment_id', enrollment_id)
      .in('status', ['ongoing', 'started'])
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Database check error:', checkError);
      return NextResponse.json({ 
        success: false, 
        error: 'Database error checking existing classes' 
      }, { status: 500 });
    }

    // If there's an active class, return it instead of creating new one
    if (existingClass) {
      console.log('🔄 Resuming existing active class:', existingClass.id);
      
      // Update the class to mark it as resumed
      const { error: updateError } = await supabase
        .from('class_logs')
        .update({ 
          status: 'ongoing',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingClass.id);

      if (updateError) {
        console.error('Failed to update existing class:', updateError);
      }

      return NextResponse.json({
        success: true,
        class_log_id: existingClass.id,
        message: 'Resumed existing class session',
        resumed: true,
        student_name: existingClass.student_name,
        subject: enrollment?.class?.subject || 'Class',
        start_time: existingClass.start_time,
        class_data: existingClass
      });
    }

    // Check for recent classes (within 5 minutes) to prevent duplicates
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentClass } = await supabase
      .from('class_logs')
      .select('*')
      .eq('enrollment_id', enrollment_id)
      .gte('start_time', fiveMinutesAgo)
      .eq('status', 'ongoing')
      .maybeSingle();

    if (recentClass) {
      return res.status(200).json({
        success: true,
        class_log_id: recentClass.id,
        message: 'Using recent class session',
        resumed: true,
        class_data: recentClass
      });
    }

    // Create new class log
    const { data: classLog, error: insertError } = await supabase
      .from('class_logs')
      .insert({
        enrollment_id: enrollment_id,
        student_email: student_email,
        meet_url: meetUrl,
        start_time: new Date().toISOString(),
        status: 'ongoing',
        content: '',
        topics_covered: [],
        homework_assigned: null,
        attachments: null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create class log' });
    }

    console.log('✅ New class started:', classLog.id);
    
    res.status(200).json({
      success: true,
      class_log_id: classLog.id,
      message: 'Class started successfully',
      resumed: false,
      class_data: classLog
    });

  } catch (error) {
    console.error('Start class error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}