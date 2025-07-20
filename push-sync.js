// Simple script to push changes using our network-utils module
const networkUtils = require('./network-utils');

async function pushChanges() {
  console.log('Starting sync and push process...');
  
  // Enhance Git network resilience first
  networkUtils.enhanceGitNetworkResilience();
  
  // Check internet connectivity
  if (!networkUtils.checkInternetConnectivity()) {
    console.error('No internet connectivity detected. Cannot push changes.');
    process.exit(1);
  }
  
  // Push with synchronization
  console.log('Pushing changes to GitHub with automatic synchronization...');
  const result = await networkUtils.pushWithSync('origin', 'main', 'theirs');
  
  if (result) {
    console.log('Successfully pushed changes to GitHub!');
    process.exit(0);
  } else {
    console.error('Failed to push changes to GitHub.');
    process.exit(1);
  }
}

// Run the push function
pushChanges().catch(error => {
  console.error('Error in push process:', error);
  process.exit(1);
});
