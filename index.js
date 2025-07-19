require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const contentGenerator = require('./content-generator');
const configManager = require('./config-manager');

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

// Update the repository with new content and push to GitHub
const updateActivityLog = async () => {
  try {
    console.log('Starting activity update...');
    
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

    // Get the reference to the head of the main branch
    const refData = await octokit.git.getRef({
      owner,
      repo,
      ref: 'heads/main',
    });
    const latestCommitSha = refData.data.object.sha;

    // Get the tree associated with the latest commit
    const treeData = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: latestCommitSha,
    });

    // Create a blob with our new content
    const blobData = await octokit.git.createBlob({
      owner,
      repo,
      content: Buffer.from(content).toString('base64'),
      encoding: 'base64',
    });

    // Create a new tree with our new blob
    const newTree = await octokit.git.createTree({
      owner,
      repo,
      base_tree: treeData.data.sha,
      tree: [
        {
          path: filePath,
          mode: '100644',
          type: 'blob',
          sha: blobData.data.sha,
        },
      ],
    });

    // Generate a commit message based on the file type
    const commitMessage = `Update ${language} file: ${fileName}`;

    // Create a new commit
    const newCommit = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: newTree.data.sha,
      parents: [latestCommitSha],
    });

    // Update the reference to point to the new commit
    await octokit.git.updateRef({
      owner,
      repo,
      ref: 'heads/main',
      sha: newCommit.data.sha,
    });

    console.log(`Successfully pushed ${fileName} to the repository!`);
  } catch (error) {
    console.error('Error updating repository:', error);
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
  
  console.log('GitHub Activity Bot is running...');
}

module.exports = { updateActivityLog };
