// Test Gradio with api_prefix
const gradioEndpoint = "https://71c34bc7ac7fcc589e.gradio.live";

async function testGradioApiPrefix() {
  try {
    console.log('=== TESTING GRADIO WITH API PREFIX ===');
    
    // From config, api_prefix is "/gradio_api"
    const apiPrefix = "/gradio_api";
    
    console.log('\nTesting with api_prefix /gradio_api/predict');
    const testData = {
      fn_index: 0,
      data: [
        null, // file input
        "Software Engineer position at Tech Company", // job description
        5, // number of questions
        null, // previous question audio
        null  // previous answer audio
      ]
    };

    console.log('Request data:', JSON.stringify(testData, null, 2));

    let response = await fetch(`${gradioEndpoint}${apiPrefix}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    let responseText = await response.text();
    console.log('Response body:', responseText);

    if (responseText) {
      try {
        const responseJson = JSON.parse(responseText);
        console.log('Parsed response:', JSON.stringify(responseJson, null, 2));
      } catch (e) {
        console.log('Failed to parse as JSON:', e.message);
      }
    }

    // Also test the run endpoint
    console.log('\nTesting /gradio_api/run/predict');
    response = await fetch(`${gradioEndpoint}${apiPrefix}/run/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('Run endpoint status:', response.status);
    responseText = await response.text();
    console.log('Run endpoint response:', responseText.substring(0, 500));

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGradioApiPrefix();