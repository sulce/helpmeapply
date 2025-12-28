// Find dependencies and correct endpoints from Gradio config
const gradioEndpoint = "https://71c34bc7ac7fcc589e.gradio.live";

async function findGradioDependencies() {
  try {
    console.log('Getting Gradio dependencies...');
    const configResponse = await fetch(`${gradioEndpoint}/config`);
    
    if (configResponse.ok) {
      const config = await configResponse.json();
      
      if (config.dependencies) {
        console.log('\n=== AVAILABLE DEPENDENCIES/ENDPOINTS ===');
        config.dependencies.forEach((dep, index) => {
          console.log(`\nDependency ${index}:`);
          console.log('  ID:', dep.id);
          console.log('  Targets:', dep.targets);
          console.log('  Function Name:', dep.js);
          if (dep.backend_fn) console.log('  Backend Function:', dep.backend_fn);
          if (dep.fn_index !== undefined) console.log('  Function Index:', dep.fn_index);
        });
        
        // Test the first dependency which should be the main function
        const firstDep = config.dependencies[0];
        if (firstDep) {
          console.log('\n=== TESTING FIRST DEPENDENCY ===');
          console.log('Function index:', firstDep.fn_index);
          
          // Try the standard Gradio API format
          const testData = {
            fn_index: firstDep.fn_index,
            data: [
              null, // file input
              "Software Engineer position at Tech Company", // job description
              5, // total questions
              null, // previous question audio
              null  // previous answer audio
            ]
          };
          
          console.log('Testing with data:', JSON.stringify(testData, null, 2));
          
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
          console.log('Response body:', responseText);
          
          if (responseText) {
            try {
              const responseJson = JSON.parse(responseText);
              console.log('Parsed response:', JSON.stringify(responseJson, null, 2));
            } catch (e) {
              console.log('Failed to parse as JSON:', e.message);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error testing dependencies:', error);
  }
}

findGradioDependencies();