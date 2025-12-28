// Test the fixed Gradio request with proper file data
const fs = require('fs');
const gradioEndpoint = "https://40e1f1559a1fb965fb.gradio.live";

async function testFixedGradioRequest() {
  try {
    console.log('=== TESTING FIXED GRADIO REQUEST ===');
    
    // Create a proper Gradio FileData object (simulating what our API now sends)
    const mockResumeData = {
      path: "resume.pdf",
      url: null,
      size: 12345,
      orig_name: "resume.pdf",
      mime_type: "application/pdf",
      is_stream: false,
      meta: { "_type": "gradio.FileData" }
    };
    
    const testData = {
      fn_index: 0,
      data: [
        mockResumeData, // Proper file object instead of null
        "Senior Software Engineer position at Tech Company requiring React, Node.js, and AWS expertise. Must have 5+ years experience building scalable web applications.", // job description
        5, // total questions
        null, // previous question audio
        null  // previous answer audio
      ]
    };

    console.log('Request data with proper file structure:');
    console.log(JSON.stringify(testData, null, 2));

    const response = await fetch(`${gradioEndpoint}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('\nResponse status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body length:', responseText.length);

    if (response.ok) {
      console.log('\n🎉 SUCCESS! Gradio API working!');
      try {
        const responseJson = JSON.parse(responseText);
        console.log('Response data:', JSON.stringify(responseJson, null, 2));
        
        if (responseJson.data && Array.isArray(responseJson.data)) {
          console.log('\n=== GRADIO RESPONSE BREAKDOWN ===');
          console.log('[0] Interviewer Question Audio:', responseJson.data[0]);
          console.log('[1] Record Answer Audio:', responseJson.data[1]);
          console.log('[2] Performance Evaluation:', responseJson.data[2]);
        }
      } catch (e) {
        console.log('Response text:', responseText.substring(0, 500));
      }
    } else {
      console.log('❌ Still getting error:', responseText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFixedGradioRequest();