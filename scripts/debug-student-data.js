// Debug script to check student enrollment data in database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function debugStudentData() {
  console.log('🔍 Debugging Student Enrollment Data\n');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Get your teacher ID (replace with your actual teacher ID)
  const teacherId = 'c9dbbf3f-0fb3-48e2-84a4-3816f574d20e'; // From your console logs
  
  console.log('👤 Teacher ID:', teacherId);
  console.log('');
  
  // Check enrollments table
  console.log('📋 Checking enrollments table...');
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('*')
    .eq('teacher_id', teacherId);
  
  if (enrollError) {
    console.error('❌ Error fetching enrollments:', enrollError);
  } else {
    console.log(`✅ Found ${enrollments?.length || 0} enrollments with teacher_id`);
    if (enrollments && enrollments.length > 0) {
      enrollments.forEach((e, i) => {
        console.log(`\n${i + 1}. Enrollment ID: ${e.id}`);
        console.log(`   Student ID: ${e.student_id}`);
        console.log(`   Class ID: ${e.class_id}`);
        console.log(`   Status: ${e.status}`);
        console.log(`   Setup Complete: ${e.setup_completed}`);
      });
    }
  }
  
  console.log('\n');
  
  // Check classes table
  console.log('📚 Checking classes table...');
  const { data: classes, error: classError } = await supabase
    .from('classes')
    .select('*')
    .eq('teacher_id', teacherId);
  
  if (classError) {
    console.error('❌ Error fetching classes:', classError);
  } else {
    console.log(`✅ Found ${classes?.length || 0} classes`);
    if (classes && classes.length > 0) {
      classes.forEach((c, i) => {
        console.log(`\n${i + 1}. Class: ${c.name}`);
        console.log(`   ID: ${c.id}`);
        console.log(`   Subject: ${c.subject}`);
        console.log(`   Status: ${c.status}`);
      });
    }
  }
  
  console.log('\n');
  
  // Check student_invitations table
  console.log('📧 Checking student_invitations table...');
  const { data: invitations, error: invError } = await supabase
    .from('student_invitations')
    .select('*')
    .eq('teacher_id', teacherId);
  
  if (invError) {
    console.error('❌ Error fetching invitations:', invError);
  } else {
    console.log(`✅ Found ${invitations?.length || 0} invitations`);
    if (invitations && invitations.length > 0) {
      invitations.forEach((inv, i) => {
        console.log(`\n${i + 1}. Student: ${inv.student_name}`);
        console.log(`   Parent: ${inv.parent_name} (${inv.parent_email})`);
        console.log(`   Status: ${inv.status}`);
        console.log(`   Created: ${inv.created_at}`);
      });
    }
  }
  
  console.log('\n✅ Debug complete');
}

debugStudentData().catch(console.error);
