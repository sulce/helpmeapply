// Test correct Gradio API predict endpoint
const gradioEndpoint = "https://71c34bc7ac7fcc589e.gradio.live";

async function testGradioApiPredict() {
  try {
    console.log('=== TESTING GRADIO /api/predict ENDPOINT ===');
    
    // Test with function index 0
    console.log('\nTesting with fn_index: 0');
    const testData0 = {
      fn_index: 0,
      data: [
        null, // file input - resume
        "Software Engineer position at Tech Company requiring 3+ years experience in React and Node.js", // job description
        5, // number of questions
        null, // previous question audio
        null  // previous answer audio
      ]
    };

    console.log('Request data:', JSON.stringify(testData0, null, 2));

    let response = await fetch(`${gradioEndpoint}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData0)
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

    // Test with function index 1 if first failed
    if (!response.ok) {
      console.log('\nTesting with fn_index: 1');
      const testData1 = {
        fn_index: 1,
        data: [
          null, // file input
          "Software Engineer position at Tech Company", // job description
          5, // number of questions
          null, // previous question audio
          null  // previous answer audio
        ]
      };

      response = await fetch(`${gradioEndpoint}/api/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData1)
      });

      console.log('Response status (fn_index 1):', response.status);
      responseText = await response.text();
      console.log('Response body (fn_index 1):', responseText);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGradioApiPredict();