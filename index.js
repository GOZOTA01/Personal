require('dotenv').config();
// Using dynamic import for Octokit to handle ES modules
let Octokit;
// We'll initialize Octokit later in an async function
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const contentGenerator = require('./content-generator');
const configManager = require('./config-manager');
const { execSync } = require('child_process');
const http = require('http');

// Repository information
const owner = process.env.GITHUB_USERNAME;
const repo = process.env.GITHUB_REPO;

// We'll initialize this variable to hold the Octokit instance
let octokit;

// Import our network utilities
const networkUtils = require('./network-utils');

// Function to synchronize with remote repository
const syncWithRemote = async () => {
  console.log('Synchronizing with remote repository...');
  
  // Check internet connectivity first
  if (!networkUtils.checkInternetConnectivity()) {
    console.error('No internet connectivity detected. Waiting and trying again...');
    
    // Wait for 30 seconds and try again
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    if (!networkUtils.checkInternetConnectivity()) {
      console.error('Still no internet connectivity. Aborting sync operation.');
      return false;
    }
  }
  
  // Use our new synchronization function
  return await networkUtils.synchronizeWithRemote('origin', 'main', 'theirs');
};

// Function to initialize Octokit with proper authentication
async function initOctokit() {
  if (!octokit) {
    try {
      // Try to import @octokit/rest using dynamic import for ES modules
      const { Octokit: DynamicOctokit } = await import('@octokit/rest');
      octokit = new DynamicOctokit({
        auth: process.env.GITHUB_TOKEN
      });
      console.log('Initialized Octokit using ES modules import');
    } catch (error) {
      console.error('Failed to import Octokit as ES Module:', error.message);
      throw error;
    }
  }
  return octokit;
}

// Configure Git properly for both authentication and conflict resolution
const setupGitConfig = () => {
  console.log('Configuring Git user information and settings...');
  execSync('git config user.name "GitHub Activity Bot"', { stdio: 'inherit' });
  execSync('git config user.email "bot@example.com"', { stdio: 'inherit' });
  
  // Configure merge and pull strategies
  execSync('git config pull.rebase false', { stdio: 'pipe' }); // Use merge instead of rebase by default
  execSync('git config push.default simple', { stdio: 'pipe' });
  
  // Configure conflict resolution strategy to favor ours in merge conflicts
  execSync('git config merge.ours.driver true', { stdio: 'pipe' });
  
  // Apply network resilience improvements
  networkUtils.enhanceGitNetworkResilience();
  
  // Check if 'origin' remote exists, if not, add it (important for Render environment)
  try {
    execSync('git remote get-url origin', { stdio: 'ignore' });
    console.log('Remote origin already exists');
    // Update the remote URL to ensure it has the token
    const remoteUrl = `https://${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}.git`;
    execSync(`git remote set-url origin ${remoteUrl}`, { stdio: 'ignore' });
    console.log('Updated origin remote URL with authentication token');
  } catch (error) {
    console.log('Setting up remote origin...');
    const remoteUrl = `https://${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}.git`;
    execSync(`git remote add origin ${remoteUrl}`, { stdio: 'inherit' });
    console.log('Remote origin added successfully');
  }
  
  // Make sure we have the latest information about the remote
  try {
    networkUtils.executeGitCommandWithRetry('git fetch origin', { stdio: 'pipe' });
  } catch (error) {
    console.warn('Could not fetch from remote:', error.message);
  }
};

// Get the current date in YYYY-MM-DD format
const getFormattedDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Update the repository with new content and commit locally
const updateActivityLog = async () => {
  try {
    console.log('Starting activity update...');
    
    // First check for internet connectivity
    if (!networkUtils.checkInternetConnectivity()) {
      console.warn('No internet connectivity detected. Retrying in 30 seconds...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      if (!networkUtils.checkInternetConnectivity()) {
        console.error('Still no internet connectivity. Aborting activity update.');
        return;
      }
      
      console.log('Internet connectivity restored. Continuing with activity update.');
    }
    
    // Check if running in Render environment
    const isRenderEnvironment = process.env.RENDER === 'true';
    if (isRenderEnvironment) {
      console.log('Running in Render environment');
    }
    
    // Initialize Octokit and validate GitHub credentials first
    await initOctokit();
    const credentialsValid = await validateGitHubCredentials();
    if (!credentialsValid) {
      console.error('Cannot proceed with activity update due to invalid GitHub credentials');
      return;
    }
    
    // Check if we should skip this commit based on configuration
    if (configManager.shouldSkipCommit()) {
      console.log('Skipping commit based on configuration settings (weekday/hours)');
      return;
    }
    
    // Get target directory from config
    const targetDir = configManager.getTargetDirectory();
    
    // Generate random file content
    const { fileName, content, language } = contentGenerator.generateRandomFile();
    
    // Determine file path (with directory if configured)
    const filePath = targetDir ? `${targetDir}/${fileName}` : fileName;
    
    // Create directory if it doesn't exist
    if (targetDir && !fs.existsSync(path.join(__dirname, targetDir))) {
      fs.mkdirSync(path.join(__dirname, targetDir), { recursive: true });
    }
    
    // Write content to local file
    fs.writeFileSync(path.join(__dirname, filePath), content);
    console.log(`File ${filePath} (${language}) created locally`);

    // Create a local git repository if it doesn't exist and ensure Git config is set
    try {
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    } catch (error) {
      console.log('Initializing git repository...');
      execSync('git init', { stdio: 'inherit' });
    }
    
    // Always set Git config to ensure it works in all environments (including Render)
    setupGitConfig();
    
    // Generate a commit message based on the file type
    const commitMessage = `Update ${language} file: ${fileName}`;

    // Add and commit all files (including untracked files)
    try {
      // First commit the newly created file
      execSync(`git add "${filePath}"`, { stdio: 'pipe' });
      execSync(`git commit -m "${commitMessage}"`, { stdio: 'pipe' });
      console.log(`Successfully committed ${filePath} to the local repository!`);
      
      // Check if there are any other untracked or modified files
      const statusOutput = execSync('git status --porcelain').toString();
      if (statusOutput.trim()) {
        console.log('Found additional untracked or modified files, committing them as well...');
        execSync('git add --all', { stdio: 'pipe' });
        execSync('git commit -m "Update additional files"', { stdio: 'pipe' });
        console.log('Successfully committed all remaining files!');
      }
      
      // Try to push the changes to GitHub
      try {
        console.log('Pushing changes to GitHub...');
        
        // Use our new pushWithSync function that handles synchronization before pushing
        const pushResult = await networkUtils.pushWithSync('origin', 'main', 'theirs');
        
        if (pushResult) {
          console.log('Successfully pushed changes to GitHub!');
        } else {
          // If pushWithSync returns false but doesn't throw, we consider it a handled failure
          console.warn('Could not push to GitHub automatically. Will try again on next scheduled run.');
          console.log('To push to GitHub manually, run: git push origin main');
        }
      } catch (pushError) {
        console.warn('Unexpected error when pushing to GitHub:', pushError.message);
        console.log('To push to GitHub manually, run: git push origin main');
        
        // Continue operation - we'll try again on next scheduled run
        console.log('Continuing operation despite push failure. Will try again next run.');
      }
    } catch (error) {
      console.error('Error committing to local repository:', error.message);
      console.error('Error details:', error.stderr ? error.stderr.toString() : 'No details available');
    }

  } catch (error) {
    console.error('Error updating repository:', error);
  }
};

// Clean up old files to prevent excessive accumulation
const cleanupOldFiles = async () => {
  if (!configManager.shouldCleanup()) {
    return;
  }

  try {
    console.log('Starting cleanup of old files...');
    
    // Check internet connectivity first
    if (!networkUtils.checkInternetConnectivity()) {
      console.warn('No internet connectivity detected. Delaying cleanup...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      if (!networkUtils.checkInternetConnectivity()) {
        console.error('Still no internet connectivity. Aborting cleanup.');
        return;
      }
    }
    
    const { maxFiles, olderThanDays } = configManager.getCleanupSettings();
    
    // Get list of files created by the bot
    const generatedFilePatterns = [
      'sample-*.js', 
      'sample-*.py', 
      'sample-*.html', 
      'notes-*.md', 
      'data-*.json', 
      'data-*.csv'
    ];
    
    let filesToDelete = [];
    
    // Find files matching our patterns
    generatedFilePatterns.forEach(pattern => {
      try {
        const files = execSync(`find . -name "${pattern}" -not -path "*/\.*" -type f`).toString().trim().split('\n');
        files.forEach(file => {
          if (file && file !== '.') {
            filesToDelete.push(file);
          }
        });
      } catch (error) {
        // Ignore errors in find command
      }
    });
    
    // Skip if not enough files
    if (filesToDelete.length <= maxFiles) {
      console.log(`Only ${filesToDelete.length} generated files found, no cleanup needed`);
      return;
    }
    
    console.log(`Found ${filesToDelete.length} generated files, cleaning up old ones...`);
    
    // Get file stats and sort by modification time
    const fileStats = filesToDelete
      .map(file => {
        try {
          const stats = fs.statSync(file);
          return { file, mtime: stats.mtime };
        } catch (error) {
          return null;
        }
      })
      .filter(stat => stat !== null)
      .sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
    
    // Calculate cutoff date for files older than X days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    // Files to delete: older than cutoff date OR exceeding maxFiles limit (keeping newest)
    const toDelete = fileStats.filter((stat, index) => 
      stat.mtime < cutoffDate || index < fileStats.length - maxFiles
    );
    
    // Delete the files
    if (toDelete.length > 0) {
      console.log(`Deleting ${toDelete.length} old files...`);
      toDelete.forEach(stat => {
        try {
          fs.unlinkSync(stat.file);
          console.log(`Deleted: ${stat.file}`);
        } catch (error) {
          console.error(`Failed to delete ${stat.file}:`, error.message);
        }
      });        // Commit the deletions
        try {
          execSync('git add --all', { stdio: 'pipe' });
          execSync('git commit -m "Cleanup: Removed old generated files"', { stdio: 'pipe' });
          console.log('Successfully committed file cleanup');
          
          // Push changes with our new synchronization function
          const pushResult = await networkUtils.pushWithSync('origin', 'main', 'theirs');
          
          if (pushResult) {
            console.log('Successfully pushed cleanup changes to GitHub');
          } else {
            console.warn('Could not push cleanup changes. Will try again on next scheduled cleanup.');
          }
        } catch (error) {
          console.error('Error committing cleanup changes:', error.message);
          console.log('Continuing operation despite cleanup commit failure.');
        }
    } else {
      console.log('No files to clean up');
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

// Validate GitHub credentials
const validateGitHubCredentials = async () => {
  try {
    // Check if GitHub token is set
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN is not set in .env file');
    }

    // Check if GitHub username is set
    if (!process.env.GITHUB_USERNAME) {
      throw new Error('GITHUB_USERNAME is not set in .env file');
    }

    // Check if GitHub repo is set
    if (!process.env.GITHUB_REPO) {
      throw new Error('GITHUB_REPO is not set in .env file');
    }

    // Initialize Octokit
    await initOctokit();

    // Test GitHub API access
    console.log('Testing GitHub API access...');
    const user = await octokit.users.getAuthenticated();
    console.log(`Authenticated as GitHub user: ${user.data.login}`);

    // Check if repository exists and is accessible
    try {
      const repoInfo = await octokit.repos.get({
        owner: process.env.GITHUB_USERNAME,
        repo: process.env.GITHUB_REPO
      });
      console.log(`Successfully accessed repository: ${repoInfo.data.full_name}`);
      return true;
    } catch (repoError) {
      if (repoError.status === 404) {
        throw new Error(`Repository ${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO} not found or not accessible`);
      } else {
        throw repoError;
      }
    }
  } catch (error) {
    console.error('GitHub credential validation failed:', error.message);
    return false;
  }
};

// Add a simple HTTP server for Render deployment
const PORT = process.env.PORT || 3000;

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    // Health check endpoint
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', message: 'GitHub Activity Bot is running' }));
  } else {
    // Default response
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('GitHub Activity Bot\n\nThis is a background worker service that generates activity on GitHub.');
  }
});

// Start the HTTP server immediately (required for Render)
server.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT} (process ${process.pid})`);
});

// Start the bot if running directly
if (require.main === module) {
  // Initialize Octokit and run the function once when the script starts
  (async () => {
    try {
      await initOctokit();
      
      // Configure network resilience
      networkUtils.enhanceGitNetworkResilience();
      
      // Check connectivity before starting
      if (!networkUtils.checkInternetConnectivity()) {
        console.warn('No internet connectivity detected at startup. The bot will continue to run but operations may fail until connectivity is restored.');
      }
      
      // Run initial activity update
      await updateActivityLog();
    } catch (error) {
      console.error('Failed to initialize bot:', error);
    }
  })();

  // Schedule the function to run on a regular basis
  const cronSchedule = process.env.COMMIT_FREQUENCY || '0 */6 * * *'; // Default: every 6 hours
  console.log(`Setting up scheduled updates with cron pattern: ${cronSchedule}`);
  
  // Add random delay if configured
  const shouldRandomize = configManager.config.commitPatterns.randomizeTime;
  
  cron.schedule(cronSchedule, async () => {
    // Check internet connectivity first
    if (!networkUtils.checkInternetConnectivity()) {
      console.warn('No internet connectivity detected. Delaying activity update...');
      
      // Wait and try again
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      if (!networkUtils.checkInternetConnectivity()) {
        console.error('Still no internet connectivity after waiting. Skipping this scheduled run.');
        return;
      }
    }
    
    if (shouldRandomize) {
      // Random delay between 0 and 20 minutes
      const randomDelay = Math.floor(Math.random() * 20 * 60 * 1000);
      console.log(`Adding random delay of ${Math.round(randomDelay/60000)} minutes before commit`);
      setTimeout(updateActivityLog, randomDelay);
    } else {
      updateActivityLog();
    }
  });
  
  // Run cleanup once a day at midnight
  cron.schedule('0 0 * * *', () => {
    console.log('Running scheduled cleanup...');
    cleanupOldFiles();
  });
  
  console.log('GitHub Activity Bot is running...');
}

module.exports = { updateActivityLog, cleanupOldFiles, validateGitHubCredentials };