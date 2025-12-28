// Debug the new Gradio endpoint configuration
const gradioEndpoint = "https://fa6933ca70d4a74cab.gradio.live";

async function debugNewGradioConfig() {
  try {
    console.log('=== DEBUGGING NEW GRADIO CONFIG ===');
    
    const configResponse = await fetch(`${gradioEndpoint}/config`);
    if (configResponse.ok) {
      const config = await configResponse.json();
      
      console.log('\n=== DEPENDENCIES ===');
      if (config.dependencies) {
        config.dependencies.forEach((dep, index) => {
          console.log(`\nDependency ${index}:`);
          console.log('  ID:', dep.id);
          console.log('  Targets:', dep.targets);
          console.log('  Queue:', dep.queue);
          if (dep.api_name) console.log('  API Name:', dep.api_name);
          if (dep.fn_index !== undefined) console.log('  Function Index:', dep.fn_index);
        });
      }
      
      console.log('\n=== COMPONENTS ===');
      if (config.components) {
        const relevantComponents = config.components.filter(comp => 
          comp.type === 'button' || comp.props?.label
        );
        relevantComponents.forEach((comp, index) => {
          console.log(`Component ${comp.id}: ${comp.type} - ${comp.props?.label || comp.props?.value || 'no label'}`);
        });
      }
      
      // Try alternative endpoints based on config
      console.log('\n=== TRYING ALTERNATIVE ENDPOINTS ===');
      
      const endpoints = [
        '/run/predict',
        '/queue/join',
        '/gradio_api/run/predict',
        '/gradio_api/predict'
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`\nTrying: ${gradioEndpoint}${endpoint}`);
          const response = await fetch(`${gradioEndpoint}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fn_index: 0,
              data: [null, "test job description", 3, null, null]
            })
          });
          console.log(`Status: ${response.status}`);
          
          if (response.status !== 404) {
            const text = await response.text();
            console.log(`Response: ${text.substring(0, 200)}`);
          }
        } catch (e) {
          console.log(`Error: ${e.message}`);
        }
      }
      
    }
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugNewGradioConfig();