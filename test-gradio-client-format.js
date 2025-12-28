// Test using the Gradio client format with API name
const gradioEndpoint = "https://fa6933ca70d4a74cab.gradio.live";

async function testGradioClientFormat() {
  try {
    console.log('=== TESTING GRADIO CLIENT FORMAT ===');
    console.log('Using API name: next_question');
    
    // Try the client.predict() equivalent format
    console.log('\n1. Testing with /api/next_question endpoint...');
    const apiResponse = await fetch(`${gradioEndpoint}/api/next_question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [
          null, // resume_path
          "Software Engineer position at Tech Company requiring React and Node.js expertise. Must have 3+ years experience.", // job_str
          5, // total_number
          null, // question_previous
          null  // answer_previous
        ]
      })
    });
    
    console.log('API endpoint status:', apiResponse.status);
    if (!apiResponse.ok) {
      const apiText = await apiResponse.text();
      console.log('API response:', apiText);
    } else {
      const apiData = await apiResponse.text();
      console.log('✅ Success! Response:', apiData.substring(0, 500));
    }
    
    // Try using the queue/join approach which is more common for newer Gradio
    console.log('\n2. Testing queue approach...');
    const queueData = {
      fn_index: 0,
      data: [
        null, // resume_path
        "Software Engineer position at Tech Company", // job_str  
        3, // total_number
        null, // question_previous
        null  // answer_previous
      ]
    };
    
    console.log('Queue request data:', JSON.stringify(queueData, null, 2));
    
    // Step 1: Join the queue
    const joinResponse = await fetch(`${gradioEndpoint}/queue/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queueData)
    });
    
    console.log('Queue join status:', joinResponse.status);
    
    if (joinResponse.ok) {
      const joinData = await joinResponse.json();
      console.log('Queue join response:', JSON.stringify(joinData, null, 2));
      
      // If there's an event_id, we might need to poll for results
      if (joinData.event_id) {
        console.log('Got event_id:', joinData.event_id);
        // In a real implementation, you'd poll for results here
      }
    } else {
      const joinText = await joinResponse.text();
      console.log('Queue join error:', joinText);
    }
    
    // Try the run endpoint with session hash
    console.log('\n3. Testing run endpoint with session...');
    const sessionData = {
      fn_index: 0,
      data: [null, "Test job description", 3, null, null],
      session_hash: "random_session_" + Math.random().toString(36).substring(7)
    };
    
    const runResponse = await fetch(`${gradioEndpoint}/run/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData)
    });
    
    console.log('Run endpoint status:', runResponse.status);
    const runText = await runResponse.text();
    console.log('Run endpoint response:', runText.substring(0, 300));

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGradioClientFormat();