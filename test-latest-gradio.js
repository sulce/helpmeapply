// Test the latest Gradio endpoint
const gradioEndpoint = "https://40e1f1559a1fb965fb.gradio.live";

async function testLatestGradio() {
  try {
    console.log('=== TESTING LATEST GRADIO ENDPOINT ===');
    console.log('Endpoint:', gradioEndpoint);
    
    // Test base endpoint
    console.log('\n1. Testing base endpoint...');
    const baseResponse = await fetch(gradioEndpoint);
    console.log('Base status:', baseResponse.status);
    
    if (!baseResponse.ok) {
      const baseText = await baseResponse.text();
      console.log('Base error:', baseText.substring(0, 200));
      return;
    }
    
    // Test config
    console.log('\n2. Testing config...');
    const configResponse = await fetch(`${gradioEndpoint}/config`);
    console.log('Config status:', configResponse.status);
    
    if (configResponse.ok) {
      const config = await configResponse.json();
      console.log('✅ Gradio app is running!');
      console.log('Version:', config.version);
      
      if (config.dependencies) {
        console.log('\nDependencies:');
        config.dependencies.forEach((dep, i) => {
          console.log(`  ${i}: ${dep.api_name || 'unknown'} (fn_index: ${dep.fn_index})`);
        });
      }
    }
    
    // Test the API
    console.log('\n3. Testing API call...');
    const testData = {
      fn_index: 0,
      data: [
        null, // resume
        "Software Engineer at Tech Company", // job description
        3, // total questions
        null, // previous question
        null  // previous answer
      ]
    };
    
    console.log('Request:', JSON.stringify(testData, null, 2));
    
    const response = await fetch(`${gradioEndpoint}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('API response status:', response.status);
    const responseText = await response.text();
    
    if (response.ok) {
      console.log('\n🎉 SUCCESS!');
      try {
        const data = JSON.parse(responseText);
        console.log('Response data:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('Response text:', responseText);
      }
    } else {
      console.log('❌ API Error:', responseText);
      
      // Try alternative endpoints
      console.log('\n4. Trying alternative endpoints...');
      const alternatives = [
        '/gradio_api/run/predict',
        '/run/predict'
      ];
      
      for (const alt of alternatives) {
        try {
          console.log(`\nTrying: ${gradioEndpoint}${alt}`);
          const altResponse = await fetch(`${gradioEndpoint}${alt}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
          });
          console.log(`Status: ${altResponse.status}`);
          if (altResponse.status !== 404) {
            const altText = await altResponse.text();
            console.log(`Response: ${altText.substring(0, 200)}`);
          }
        } catch (e) {
          console.log(`Error: ${e.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLatestGradio();