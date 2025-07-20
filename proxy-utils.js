// Proxy detection and configuration utility for GitHub Activity Bot
// This module helps handle proxy environments and network configurations

/**
 * Detect if the current environment is behind a proxy
 * and configure Git and Node.js to use it properly
 */

const { execSync } = require('child_process');
const http = require('http');
const https = require('https');
const url = require('url');

/**
 * Detect system proxy settings and configure Git to use them
 */
function detectAndConfigureProxy() {
  try {
    console.log('Checking for proxy environment...');
    
    // Check for standard proxy environment variables
    const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
    const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
    const noProxy = process.env.NO_PROXY || process.env.no_proxy;
    
    if (httpProxy || httpsProxy) {
      console.log('Proxy environment detected');
      
      // Configure Git to use the proxy
      if (httpProxy) {
        execSync(`git config --global http.proxy ${httpProxy}`, { stdio: 'pipe' });
        console.log(`Configured Git to use HTTP proxy: ${httpProxy}`);
      }
      
      if (httpsProxy) {
        execSync(`git config --global https.proxy ${httpsProxy}`, { stdio: 'pipe' });
        console.log(`Configured Git to use HTTPS proxy: ${httpsProxy}`);
      }
      
      // Configure Git to bypass proxy for certain hosts
      if (noProxy) {
        execSync(`git config --global http.noProxy ${noProxy}`, { stdio: 'pipe' });
        console.log(`Configured Git to bypass proxy for: ${noProxy}`);
      }
      
      return true;
    } else {
      console.log('No proxy environment detected');
      
      // Clear any existing proxy settings to ensure clean state
      try {
        execSync('git config --global --unset http.proxy', { stdio: 'ignore' });
        execSync('git config --global --unset https.proxy', { stdio: 'ignore' });
        execSync('git config --global --unset http.noProxy', { stdio: 'ignore' });
      } catch (error) {
        // Ignore errors from unsetting non-existent values
      }
      
      return false;
    }
  } catch (error) {
    console.warn('Error detecting or configuring proxy:', error.message);
    return false;
  }
}

/**
 * Test GitHub API connectivity through proxy or direct connection
 * @returns {Promise<boolean>} Whether GitHub API is accessible
 */
async function testGitHubConnectivity() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/zen',
      method: 'GET',
      headers: {
        'User-Agent': 'GitHub-Activity-Bot'
      },
      timeout: 10000 // 10 second timeout
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log('Successfully connected to GitHub API');
        resolve(true);
      } else {
        console.warn(`GitHub API returned status code: ${res.statusCode}`);
        resolve(false);
      }
    });
    
    req.on('error', (error) => {
      console.error('Error connecting to GitHub API:', error.message);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.error('GitHub API connection timed out');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

/**
 * Parse proxy URL and return components
 * @param {string} proxyUrl - The proxy URL (e.g., http://user:pass@proxy.example.com:8080)
 * @returns {Object} The parsed proxy components
 */
function parseProxyUrl(proxyUrl) {
  if (!proxyUrl) return null;
  
  try {
    const parsed = new url.URL(proxyUrl);
    return {
      protocol: parsed.protocol,
      host: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      auth: parsed.username && parsed.password ? 
        `${parsed.username}:${parsed.password}` : null
    };
  } catch (error) {
    console.error('Error parsing proxy URL:', error.message);
    return null;
  }
}

/**
 * Configure Node.js global agent to use proxy
 */
function configureNodeProxy() {
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  
  if (httpProxy) {
    const proxyConfig = parseProxyUrl(httpProxy);
    if (proxyConfig) {
      http.globalAgent = new http.Agent({ proxy: proxyConfig });
      console.log('Configured Node.js HTTP agent to use proxy');
    }
  }
  
  if (httpsProxy) {
    const proxyConfig = parseProxyUrl(httpsProxy);
    if (proxyConfig) {
      https.globalAgent = new https.Agent({ proxy: proxyConfig });
      console.log('Configured Node.js HTTPS agent to use proxy');
    }
  }
}

/**
 * Setup all proxy-related configurations
 */
async function setupProxyEnvironment() {
  const proxyConfigured = detectAndConfigureProxy();
  if (proxyConfigured) {
    configureNodeProxy();
  }
  
  // Test connectivity regardless of proxy configuration
  const isConnected = await testGitHubConnectivity();
  return isConnected;
}

module.exports = {
  detectAndConfigureProxy,
  testGitHubConnectivity,
  configureNodeProxy,
  setupProxyEnvironment
};
