#!/usr/bin/env node
// Diagnostic script to check repository configuration
require('dotenv').config();

console.log('=== Repository Diagnostic ===');
console.log('Environment Variables:');
console.log('GITHUB_USERNAME:', process.env.GITHUB_USERNAME);
console.log('GITHUB_REPO:', process.env.GITHUB_REPO);
console.log('GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? `${process.env.GITHUB_TOKEN.substring(0, 20)}...` : 'Not set');

const { execSync } = require('child_process');

try {
  console.log('\nGit Configuration:');
  console.log('Remote URL:', execSync('git remote get-url origin').toString().trim());
  console.log('Current branch:', execSync('git branch --show-current').toString().trim());
  console.log('Latest local commit:', execSync('git log -1 --oneline').toString().trim());
  
  console.log('\nTesting GitHub API...');
  
  // Test GitHub API
  const { Octokit } = require('@octokit/rest');
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  
  // Test repository access
  octokit.rest.repos.get({
    owner: process.env.GITHUB_USERNAME,
    repo: process.env.GITHUB_REPO
  }).then(response => {
    console.log('✅ GitHub API access successful');
    console.log('Repository full name:', response.data.full_name);
    console.log('Repository clone URL:', response.data.clone_url);
    console.log('Repository default branch:', response.data.default_branch);
    
    // Test if we can list recent commits
    return octokit.rest.repos.listCommits({
      owner: process.env.GITHUB_USERNAME,
      repo: process.env.GITHUB_REPO,
      per_page: 5
    });
  }).then(response => {
    console.log('\nRecent commits from GitHub API:');
    response.data.forEach(commit => {
      console.log(`- ${commit.sha.substring(0, 7)} ${commit.commit.message}`);
    });
  }).catch(error => {
    console.error('❌ GitHub API error:', error.message);
  });
  
} catch (error) {
  console.error('❌ Git command error:', error.message);
}
