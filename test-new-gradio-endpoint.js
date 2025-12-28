// Test the new Gradio endpoint
const gradioEndpoint = "https://fa6933ca70d4a74cab.gradio.live";

async function testNewGradioEndpoint() {
  try {
    console.log('=== TESTING NEW GRADIO ENDPOINT ===');
    console.log('Endpoint:', gradioEndpoint);
    
    // First test if the base endpoint is alive
    console.log('\n1. Testing base endpoint...');
    const baseResponse = await fetch(gradioEndpoint);
    console.log('Base endpoint status:', baseResponse.status);
    
    if (!baseResponse.ok) {
      console.log('Base endpoint failed, checking response...');
      const baseText = await baseResponse.text();
      console.log('Base response:', baseText.substring(0, 200));
      return;
    }
    
    // Test the config
    console.log('\n2. Testing /config endpoint...');
    const configResponse = await fetch(`${gradioEndpoint}/config`);
    console.log('Config endpoint status:', configResponse.status);
    
    if (configResponse.ok) {
      const config = await configResponse.json();
      console.log('Config version:', config.version);
      console.log('App mode:', config.mode);
      console.log('Has dependencies:', !!config.dependencies);
    }
    
    // Test the API predict endpoint with correct format
    console.log('\n3. Testing /api/predict with correct format...');
    const testData = {
      fn_index: 0,
      data: [
        null, // resume_path
        "Software Engineer position at Tech Company requiring React and Node.js expertise. Must have 3+ years experience.", // job_str
        5, // total_number
        null, // question_previous
        null  // answer_previous
      ]
    };

    console.log('Request data:', JSON.stringify(testData, null, 2));

    const response = await fetch(`${gradioEndpoint}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body length:', responseText.length);
    
    if (response.ok) {
      console.log('\n🎉 SUCCESS! Response received:');
      try {
        const responseJson = JSON.parse(responseText);
        console.log('Response data type:', typeof responseJson);
        
        if (responseJson.data && Array.isArray(responseJson.data)) {
          console.log('\n=== GRADIO RESPONSE BREAKDOWN ===');
          console.log('Data array length:', responseJson.data.length);
          console.log('[0] Interviewer Question Audio:', responseJson.data[0]);
          console.log('[1] Record Answer Audio:', responseJson.data[1]);
          console.log('[2] Performance Evaluation:', responseJson.data[2]);
          
          if (responseJson.data[0]) {
            console.log('\n🎵 Question audio URL would be:', `${gradioEndpoint}/file=${responseJson.data[0]}`);
          }
        } else {
          console.log('Full response:', JSON.stringify(responseJson, null, 2));
        }
      } catch (e) {
        console.log('Response text (not JSON):', responseText.substring(0, 500));
      }
    } else {
      console.log('❌ Error response:', responseText.substring(0, 500));
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNewGradioEndpoint();