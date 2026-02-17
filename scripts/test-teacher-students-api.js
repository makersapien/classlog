// Test script to debug teacher students API
const https = require('https');

async function testTeacherStudentsAPI() {
  console.log('🧪 Testing Teacher Students API\n');
  
  try {
    console.log('📡 Fetching teacher students data...');
    const response = await fetch('http://localhost:3000/api/teacher/students', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response OK:', response.ok);
    
    if (!response.ok) {
      console.error('❌ API failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('\n✅ API Response:');
    console.log('- Students:', data.students?.length || 0);
    console.log('- Invitations:', data.invitations?.length || 0);
    console.log('- Stats:', JSON.stringify(data.stats, null, 2));
    
    if (data.students && data.students.length > 0) {
      console.log('\n👥 Students List:');
      data.students.forEach((student, index) => {
        console.log(`\n${index + 1}. ${student.student_name}`);
        console.log(`   - ID: ${student.id}`);
        console.log(`   - Parent: ${student.parent_name} (${student.parent_email})`);
        console.log(`   - Subject: ${student.subject}`);
        console.log(`   - Year: ${student.year_group}`);
        console.log(`   - Setup Complete: ${student.setup_completed}`);
        console.log(`   - Status: ${student.status}`);
      });
    } else {
      console.log('\n⚠️  No students found');
    }
    
    if (data.invitations && data.invitations.length > 0) {
      console.log('\n📧 Pending Invitations:');
      data.invitations.forEach((inv, index) => {
        console.log(`\n${index + 1}. ${inv.student_name}`);
        console.log(`   - Parent: ${inv.parent_name} (${inv.parent_email})`);
        console.log(`   - Status: ${inv.status}`);
        console.log(`   - Created: ${inv.created_at}`);
      });
    }
    
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testTeacherStudentsAPI();
