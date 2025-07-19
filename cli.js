#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { updateActivityLog } = require('./index');

const args = process.argv.slice(2);
const command = args[0];

// Help text
const showHelp = () => {
  console.log(`
GitHub Activity Bot - CLI

Usage:
  node cli.js [command]

Commands:
  start         Start the bot as a background process using PM2
  stop          Stop the bot if running
  status        Check if the bot is running
  test          Test a single commit without scheduling
  cleanup       Run the cleanup process to remove old generated files
  validate      Validate GitHub credentials and repository access
  config        Open the configuration file
  setup         Interactive setup wizard
  help          Show this help message
  `);
};

// Check if PM2 is installed
const isPM2Installed = () => {
  try {
    execSync('pm2 --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
};

// Install PM2 if needed
const installPM2 = () => {
  console.log('PM2 is not installed. Installing...');
  try {
    execSync('npm install -g pm2', { stdio: 'inherit' });
    console.log('PM2 installed successfully');
    return true;
  } catch (error) {
    console.error('Failed to install PM2:', error.message);
    return false;
  }
};

// Start the bot using PM2
const startBot = () => {
  if (!isPM2Installed() && !installPM2()) {
    console.log('Please install PM2 manually: npm install -g pm2');
    return;
  }

  try {
    execSync('pm2 start index.js --name github-activity-bot', { stdio: 'inherit' });
    console.log('GitHub Activity Bot started successfully');
    console.log('To view logs: pm2 logs github-activity-bot');
  } catch (error) {
    console.error('Failed to start bot:', error.message);
  }
};

// Stop the bot
const stopBot = () => {
  if (!isPM2Installed()) {
    console.log('PM2 is not installed. Nothing to stop.');
    return;
  }

  try {
    execSync('pm2 stop github-activity-bot', { stdio: 'inherit' });
    console.log('GitHub Activity Bot stopped');
  } catch (error) {
    console.error('Failed to stop bot:', error.message);
  }
};

// Check bot status
const checkStatus = () => {
  if (!isPM2Installed()) {
    console.log('PM2 is not installed. Bot is not running.');
    return;
  }

  try {
    const output = execSync('pm2 list').toString();
    if (output.includes('github-activity-bot')) {
      console.log('GitHub Activity Bot is running');
    } else {
      console.log('GitHub Activity Bot is not running');
    }
  } catch (error) {
    console.log('GitHub Activity Bot is not running');
  }
};

// Open config file
const openConfig = () => {
  const configPath = path.join(__dirname, 'config.json');
  
  if (!fs.existsSync(configPath)) {
    console.log('Config file not found. Creating default configuration...');
    const defaultConfig = require('./config-manager').getDefaultConfig();
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  }
  
  console.log(`Config file is located at: ${configPath}`);
  console.log('Edit this file to customize the bot behavior');
  
  // Try to open the file with the default editor
  try {
    if (process.platform === 'win32') {
      execSync(`start ${configPath}`);
    } else if (process.platform === 'darwin') { // macOS
      execSync(`open ${configPath}`);
    } else { // Linux and others
      execSync(`xdg-open ${configPath}`);
    }
  } catch (error) {
    console.log('Could not open the file automatically');
  }
};

// Setup wizard
const setupWizard = () => {
  console.log('Running setup wizard...');
  
  // Check if .env file exists, if not create it
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('Creating .env file...');
    
    // Default .env content
    const envContent = `# GitHub credentials
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_USERNAME=your_github_username
GITHUB_REPO=your_github_repo

# Commit configuration
COMMIT_FREQUENCY=*/30 * * * *  # Every 30 minutes`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('.env file created');
  }
  
  console.log(`
Setup Instructions:

1. Edit your .env file with your GitHub credentials:
   - You need a GitHub Personal Access Token with 'repo' scope
   - Set your GitHub username and repository name

2. Edit config.json to customize bot behavior:
   - Content types and weights
   - Commit patterns (weekday only, working hours, etc.)
   - Directory structure

3. Start the bot with: node cli.js start

For more details, see the README.md file.
`);
};

// Handle commands
switch (command) {
  case 'start':
    startBot();
    break;
  case 'stop':
    stopBot();
    break;
  case 'status':
    checkStatus();
    break;
  case 'test':
    console.log('Making a test commit...');
    const { updateActivityLog } = require('./index');
    updateActivityLog().then(() => {
      console.log('Test complete');
    }).catch(err => {
      console.error('Test failed:', err);
    });
    break;
  case 'cleanup':
    console.log('Running file cleanup...');
    const { cleanupOldFiles } = require('./index');
    cleanupOldFiles();
    console.log('Cleanup process complete');
    break;
  case 'validate':
    console.log('Validating GitHub credentials...');
    const { validateGitHubCredentials } = require('./index');
    validateGitHubCredentials().then(valid => {
      if (valid) {
        console.log('GitHub credentials are valid and repository is accessible');
      } else {
        console.error('GitHub credential validation failed');
        process.exit(1);
      }
    }).catch(err => {
      console.error('Validation error:', err);
      process.exit(1);
    });
    break;
  case 'config':
    openConfig();
    break;
  case 'setup':
    setupWizard();
    break;
  case 'help':
  default:
    showHelp();
    break;
}
