#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Function to check if a URL is accessible
function checkUrl(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data.slice(0, 200) // First 200 chars
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({ error: err.message });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ error: 'Timeout' });
    });
  });
}

async function checkRenderService() {
  console.log('Checking Render service health...\n');
  
  // Common Render URL patterns based on the service name
  const possibleUrls = [
    'https://github-activity-bot.onrender.com',
    'https://github-activity-bot.onrender.com/healthz',
    // Add more potential URLs if needed
  ];
  
  for (const url of possibleUrls) {
    console.log(`Checking: ${url}`);
    const result = await checkUrl(url);
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}\n`);
    } else {
      console.log(`✅ Status: ${result.status}`);
      console.log(`Response: ${result.data}\n`);
    }
  }
}

checkRenderService();
