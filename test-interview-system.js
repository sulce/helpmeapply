// Test the interview system end-to-end
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001';

async function testInterviewSystem() {
  try {
    console.log('=== TESTING INTERVIEW SYSTEM END-TO-END ===');
    
    // First test the next-question endpoint directly
    console.log('\n1. Testing next-question endpoint...');
    
    const formData = new FormData();
    formData.append('sessionId', 'test-session-id');
    formData.append('jobDescription', 'Software Engineer position at Tech Company requiring React and Node.js experience');
    formData.append('questionIndex', '0');
    formData.append('totalQuestions', '5');
    
    const response = await fetch(`${API_BASE}/api/interview/next-question`, {
      method: 'POST',
      body: formData
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (responseText) {
      try {
        const responseJson = JSON.parse(responseText);
        console.log('Parsed response:', JSON.stringify(responseJson, null, 2));
      } catch (e) {
        console.log('Failed to parse as JSON:', e.message);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testInterviewSystem();