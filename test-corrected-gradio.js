// Test the corrected Gradio API format based on screenshots
const gradioEndpoint = "https://71c34bc7ac7fcc589e.gradio.live";

async function testCorrectGradioFormat() {
  try {
    console.log('=== TESTING CORRECTED GRADIO API FORMAT ===');
    
    // Based on the screenshots, the correct format is:
    const correctData = {
      fn_index: 0, // Based on dependency 0
      data: [
        null, // resume_path (file) - null for now
        "Software Engineer position at Tech Company requiring React and Node.js expertise. Must have 3+ years experience.", // job_str (string)
        5, // total_number (number)
        null, // question_previous (file) - null for first question
        null  // answer_previous (file) - null for first question
      ]
    };

    console.log('Request data:', JSON.stringify(correctData, null, 2));

    const response = await fetch(`${gradioEndpoint}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(correctData)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body length:', responseText.length);
    console.log('Response body:', responseText.substring(0, 1000) + (responseText.length > 1000 ? '...' : ''));

    if (responseText) {
      try {
        const responseJson = JSON.parse(responseText);
        console.log('\n=== PARSED RESPONSE ===');
        console.log('Response structure:', typeof responseJson);
        console.log('Has data property:', 'data' in responseJson);
        
        if (responseJson.data && Array.isArray(responseJson.data)) {
          console.log('Data array length:', responseJson.data.length);
          console.log('[0] Interviewer Question Audio:', responseJson.data[0]);
          console.log('[1] Record Answer Audio:', responseJson.data[1]);  
          console.log('[2] Performance Evaluation:', responseJson.data[2]);
        }
        
      } catch (e) {
        console.log('Failed to parse as JSON:', e.message);
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testCorrectGradioFormat();