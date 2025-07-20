#!/usr/bin/env node

// This script ensures proper GitHub authentication by updating the remote URL with token
// Run it locally and include it in your Render build process

require('dotenv').config();
const { execSync } = require('child_process');

// Check if required environment variables are set
if (!process.env.GITHUB_TOKEN) {
  console.error('GITHUB_TOKEN environment variable is not set. Cannot proceed.');
  process.exit(1);
}

if (!process.env.GITHUB_USERNAME || !process.env.GITHUB_REPO) {
  console.error('GITHUB_USERNAME and/or GITHUB_REPO environment variables are not set. Cannot proceed.');
  process.exit(1);
}

// Configure git to use HTTPS
try {
  console.log('Configuring Git to use HTTPS...');
  execSync('git config --global url."https://".insteadOf git://', { stdio: 'pipe' });
} catch (error) {
  console.warn('Could not configure Git to use HTTPS:', error.message);
}

// Add GitHub token to git config for automatic authentication
try {
  console.log('Configuring Git credential helper...');
  execSync('git config --global credential.helper store', { stdio: 'pipe' });
  
  // Store credentials for github.com
  const username = process.env.GITHUB_USERNAME;
  const token = process.env.GITHUB_TOKEN;
  
  // Create authenticated URL
  const authenticatedUrl = `https://${username}:${token}@github.com/${username}/${process.env.GITHUB_REPO}.git`;
  
  // Update remote if it exists, add it if it doesn't
  try {
    const remoteExists = execSync('git remote get-url origin', { stdio: 'pipe' });
    console.log('Remote origin exists, updating URL...');
    execSync(`git remote set-url origin "${authenticatedUrl}"`, { stdio: 'pipe' });
  } catch (e) {
    console.log('Remote origin does not exist, adding it...');
    execSync(`git remote add origin "${authenticatedUrl}"`, { stdio: 'pipe' });
  }
  
  // Test the connection
  console.log('Testing connection to GitHub...');
  execSync('git ls-remote --heads origin', { stdio: 'pipe' });
  console.log('Authentication successful! Remote URL updated with token.');
  
} catch (error) {
  console.error('Error setting up Git authentication:', error.message);
  process.exit(1);
}
