require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const contentGenerator = require('./content-generator');
const configManager = require('./config-manager');
const { execSync } = require('child_process');

// GitHub authentication
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Repository information
const owner = process.env.GITHUB_USERNAME;
const repo = process.env.GITHUB_REPO;

// Get the current date in YYYY-MM-DD format
const getFormattedDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Update the repository with new content and commit locally
const updateActivityLog = async () => {
  try {
    console.log('Starting activity update...');
    
    // Check if running in Render environment
    const isRenderEnvironment = process.env.RENDER === 'true';
    if (isRenderEnvironment) {
      console.log('Running in Render environment');
    }
    
    // Validate GitHub credentials first
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
    console.log('Configuring Git user information...');
    execSync('git config user.name "GitHub Activity Bot"', { stdio: 'inherit' });
    execSync('git config user.email "bot@example.com"', { stdio: 'inherit' });
    
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
        execSync('git push origin main', { stdio: 'pipe' });
        console.log('Successfully pushed changes to GitHub!');
      } catch (pushError) {
        console.warn('Could not push to GitHub automatically:', pushError.message);
        console.log('To push to GitHub manually, run: git push origin main');
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
const cleanupOldFiles = () => {
  if (!configManager.shouldCleanup()) {
    return;
  }

  try {
    console.log('Starting cleanup of old files...');
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
      });
      
      // Commit the deletions
      try {
        execSync('git add --all', { stdio: 'pipe' });
        execSync('git commit -m "Cleanup: Removed old generated files"', { stdio: 'pipe' });
        console.log('Successfully committed file cleanup');
        
        // Push changes
        execSync('git push origin main', { stdio: 'pipe' });
        console.log('Successfully pushed cleanup changes to GitHub');
      } catch (error) {
        console.error('Error committing cleanup changes:', error.message);
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

// Check if the script is being run directly
if (require.main === module) {
  // Run the function once when the script starts
  updateActivityLog();

  // Schedule the function to run on a regular basis
  const cronSchedule = process.env.COMMIT_FREQUENCY || '0 */6 * * *'; // Default: every 6 hours
  console.log(`Setting up scheduled updates with cron pattern: ${cronSchedule}`);
  
  // Add random delay if configured
  const shouldRandomize = configManager.config.commitPatterns.randomizeTime;
  
  cron.schedule(cronSchedule, () => {
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