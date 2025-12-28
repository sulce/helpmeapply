// Test the full interview flow to see what specific error occurs
const fetch = require('node-fetch');
const FormData = require('form-data');

const API_BASE = 'http://localhost:3001';

async function testFullInterviewFlow() {
  try {
    console.log('=== TESTING FULL INTERVIEW FLOW ===');
    
    // Create a test request to the next-question endpoint
    console.log('\n1. Testing next-question endpoint with FormData...');
    
    const formData = new FormData();
    formData.append('sessionId', 'test-session-123');
    formData.append('jobDescription', 'Senior Software Engineer at Tech Company requiring React, Node.js, and AWS expertise. Must have 5+ years experience building scalable web applications.');
    formData.append('questionIndex', '0');
    formData.append('totalQuestions', '5');
    
    console.log('Sending request to:', `${API_BASE}/api/interview/next-question`);
    console.log('FormData fields:');
    console.log('  sessionId: test-session-123');
    console.log('  jobDescription: Senior Software Engineer...');
    console.log('  questionIndex: 0');
    console.log('  totalQuestions: 5');
    
    const response = await fetch(`${API_BASE}/api/interview/next-question`, {
      method: 'POST',
      body: formData
    });
    
    console.log('\nResponse status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('\nResponse body:');
    console.log(responseText);
    
    // Try to parse as JSON
    try {
      const responseJson = JSON.parse(responseText);
      console.log('\n📋 Parsed response:');
      console.log(JSON.stringify(responseJson, null, 2));
      
      if (responseJson.error) {
        console.log('\n❌ Error detected:', responseJson.error);
      }
      
      if (responseJson.success && responseJson.data) {
        console.log('\n✅ Success! Interview question generated:');
        console.log('Question text:', responseJson.data.questionText);
        console.log('Question audio URL:', responseJson.data.questionAudioUrl);
        console.log('Question index:', responseJson.data.questionIndex);
      }
      
    } catch (parseError) {
      console.log('\n❌ Failed to parse response as JSON:', parseError.message);
      console.log('Raw response:', responseText.substring(0, 500));
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      type: error.constructor.name
    });
  }
}

testFullInterviewFlow();