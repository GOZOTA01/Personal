#!/usr/bin/env node
require('dotenv').config();

// Test script to verify bot functionality
const { updateActivityLog } = require('./index.js');

console.log('=== GitHub Activity Bot Test ===');
console.log('Environment Variables:');
console.log('GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? `Set (${process.env.GITHUB_TOKEN.length} chars)` : 'Not set');
console.log('GITHUB_USERNAME:', process.env.GITHUB_USERNAME);
console.log('GITHUB_REPO:', process.env.GITHUB_REPO);
console.log('COMMIT_FREQUENCY:', process.env.COMMIT_FREQUENCY);
console.log('');

// Don't start the HTTP server for testing
const originalModule = require.main;
require.main = null;

console.log('Testing updateActivityLog function...');
updateActivityLog()
  .then(() => {
    console.log('✅ Test completed successfully!');
    console.log('Check your repository for new commits.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  })
  .finally(() => {
    require.main = originalModule;
  });
