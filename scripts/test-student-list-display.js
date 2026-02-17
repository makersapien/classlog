// Test script to debug student list display issue
const https = require('https');

async function testStudentListAPI() {
  console.log('🧪 Testing Student List Display\n');
  
  try {
    // Test the dashboard API
    console.log('📡 Fetching dashboard data...');
    const response = await fetch('http://localhost:3000/api/dashboard?role=teacher', {
      headers: {
        'Cookie': process.env.TEST_COOKIE || ''
      }
    });
    
    if (!response.ok) {
      console.error('❌ Dashboard API failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('\n📊 Dashboard Response Summary:');
    console.log('- Total Classes:', data.classes?.length || 0);
    console.log('- Total Students in Response:', data.students?.length || 0);
    console.log('- Stats Total Students:', data.stats?.totalStudents || 0);
    
    if (data.students && data.students.length > 0) {
      console.log('\n✅ Students Found:');
      data.students.forEach((student, index) => {
        console.log(`\n${index + 1}. ${student.name}`);
        console.log(`   - ID: ${student.id}`);
        console.log(`   - Grade: ${student.grade || 'N/A'}`);
        console.log(`   - Subject: ${student.subject || 'N/A'}`);
        console.log(`   - Credits Remaining: ${student.creditsRemaining || 0}`);
        console.log(`   - Total Credits: ${student.totalCredits || 0}`);
        console.log(`   - Status: ${student.status}`);
      });
    } else {
      console.log('\n⚠️  No students found in response');
      
      // Check if there are enrollments in classes
      if (data.classes && data.classes.length > 0) {
        console.log('\n📚 Checking enrollments in classes:');
        data.classes.forEach((cls, index) => {
          console.log(`\n${index + 1}. ${cls.name} (${cls.subject})`);
          console.log(`   - Enrollments: ${cls.enrollments?.length || 0}`);
          if (cls.enrollments && cls.enrollments.length > 0) {
            cls.enrollments.forEach((enrollment, eIndex) => {
              console.log(`   ${eIndex + 1}. Student ID: ${enrollment.student_id}`);
              console.log(`      Name: ${enrollment.profiles?.full_name || 'Unknown'}`);
              console.log(`      Status: ${enrollment.status}`);
            });
          }
        });
      }
    }
    
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testStudentListAPI();
