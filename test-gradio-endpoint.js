// Test script to manually test Gradio endpoint
const gradioEndpoint = "https://71c34bc7ac7fcc589e.gradio.live";

console.log('=== TESTING GRADIO ENDPOINT ===');
console.log('Endpoint:', gradioEndpoint);

// First test - check if endpoint is alive
async function testGradioEndpoint() {
  try {
    console.log('\n1. Testing base endpoint...');
    const baseResponse = await fetch(gradioEndpoint);
    console.log('Base endpoint status:', baseResponse.status);
    
    console.log('\n2. Testing config endpoint...');
    const configResponse = await fetch(`${gradioEndpoint}/config`);
    console.log('Config endpoint status:', configResponse.status);
    
    if (configResponse.ok) {
      const config = await configResponse.text();
      console.log('Config response:', config.substring(0, 500) + '...');
    }

    console.log('\n3. Testing next_question endpoint with JSON...');
    const gradioData = {
      data: [
        null, // resume file
        "Software Engineer position at Tech Company", // job description
        5, // total questions
        null, // previous question audio
        null  // previous answer audio
      ]
    };

    console.log('Request data:', JSON.stringify(gradioData, null, 2));

    const response = await fetch(`${gradioEndpoint}/call/next_question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gradioData)
    });

    console.log('Response status:', response.status, response.statusText);
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

// Run the test
testGradioEndpoint();