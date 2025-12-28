// Get full Gradio config to see available endpoints
const gradioEndpoint = "https://71c34bc7ac7fcc589e.gradio.live";

async function getGradioConfig() {
  try {
    console.log('Getting Gradio config...');
    const configResponse = await fetch(`${gradioEndpoint}/config`);
    
    if (configResponse.ok) {
      const config = await configResponse.json();
      console.log('\n=== FULL GRADIO CONFIG ===');
      console.log(JSON.stringify(config, null, 2));
      
      // Look for dependencies and endpoints
      if (config.dependencies) {
        console.log('\n=== AVAILABLE DEPENDENCIES/ENDPOINTS ===');
        config.dependencies.forEach((dep, index) => {
          console.log(`${index}: ${dep.id || 'unknown'}`);
          if (dep.targets) {
            console.log('  Targets:', dep.targets);
          }
        });
      }

      // Look for components
      if (config.components) {
        console.log('\n=== COMPONENTS ===');
        config.components.forEach((comp, index) => {
          if (comp.type === 'button' || comp.props?.label) {
            console.log(`${index}: ${comp.type} - ${comp.props?.label || comp.props?.value || 'no label'}`);
          }
        });
      }
    } else {
      console.error('Config request failed:', configResponse.status);
    }
  } catch (error) {
    console.error('Error getting config:', error);
  }
}

getGradioConfig();