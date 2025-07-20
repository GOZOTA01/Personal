// Network retry utility for GitHub Activity Bot
// This module handles network retries with exponential backoff
// and provides improved error handling for network operations

const { execSync } = require('child_process');

// Maximum number of retries for network operations
const MAX_RETRIES = 5;

// Initial delay in milliseconds (1 second)
const INITIAL_DELAY = 1000;

// Maximum delay in milliseconds (5 minutes)
const MAX_DELAY = 300000;

/**
 * Execute a Git command with automatic retries for network errors
 * 
 * @param {string} command - Git command to execute
 * @param {Object} options - Options for child_process.execSync
 * @param {number} [retryCount=0] - Current retry count (used internally)
 * @returns {Buffer} - Command output
 */
function executeGitCommandWithRetry(command, options = {}, retryCount = 0) {
  const stdioOption = options.stdio || 'pipe';
  
  try {
    console.log(`Executing git command: ${command}`);
    return execSync(command, { ...options, stdio: stdioOption });
  } catch (error) {
    // Check if this is a network-related error
    const errorMsg = error.message || '';
    const isNetworkError = errorMsg.includes('Could not resolve host') || 
                           errorMsg.includes('Failed to connect') ||
                           errorMsg.includes('Connection timed out') ||
                           errorMsg.includes('Network unreachable') ||
                           errorMsg.includes('SSL connection') ||
                           errorMsg.includes('ERR_NETWORK') ||
                           errorMsg.includes('Unable to negotiate with') ||
                           errorMsg.includes('Could not read from remote repository');
    
    if (isNetworkError && retryCount < MAX_RETRIES) {
      // Calculate exponential backoff delay
      const delay = Math.min(INITIAL_DELAY * Math.pow(2, retryCount), MAX_DELAY);
      
      console.warn(`Network error occurred: ${errorMsg}`);
      console.log(`Retrying in ${delay/1000} seconds... (Attempt ${retryCount + 1} of ${MAX_RETRIES})`);
      
      // Wait before retrying
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(executeGitCommandWithRetry(command, options, retryCount + 1));
        }, delay);
      });
    } else {
      // Either not a network error or we've exceeded max retries
      if (retryCount >= MAX_RETRIES) {
        console.error(`Maximum retry attempts (${MAX_RETRIES}) exceeded for command: ${command}`);
      }
      throw error;
    }
  }
}

/**
 * Fetch the latest changes from the remote repository
 * 
 * @param {string} [remote='origin'] - The name of the remote
 * @param {string} [branch='main'] - The branch to fetch
 * @returns {boolean} - True if fetch was successful
 */
function fetchRemoteChanges(remote = 'origin', branch = 'main') {
  try {
    console.log(`Fetching latest changes from ${remote}/${branch}...`);
    executeGitCommandWithRetry(`git fetch ${remote} ${branch}`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.error(`Error fetching from remote: ${error.message}`);
    return false;
  }
}

/**
 * Check if local branch is behind the remote branch
 * 
 * @param {string} [remote='origin'] - The name of the remote
 * @param {string} [branch='main'] - The branch to check
 * @returns {boolean} - True if local is behind remote
 */
function isLocalBehindRemote(remote = 'origin', branch = 'main') {
  try {
    // First fetch to ensure we have the latest remote ref
    fetchRemoteChanges(remote, branch);
    
    // Get commit counts for comparison
    const localCommits = execSync(`git rev-list --count ${branch}`, { stdio: 'pipe' }).toString().trim();
    const remoteCommits = execSync(`git rev-list --count ${remote}/${branch}`, { stdio: 'pipe' }).toString().trim();
    
    // Get specific commits for more detailed comparison if needed
    const localRev = execSync(`git rev-parse ${branch}`, { stdio: 'pipe' }).toString().trim();
    const remoteRev = execSync(`git rev-parse ${remote}/${branch}`, { stdio: 'pipe' }).toString().trim();
    
    // Check if local is behind remote
    const behindCount = execSync(
      `git rev-list --count ${branch}..${remote}/${branch}`, 
      { stdio: 'pipe' }
    ).toString().trim();
    
    const isBehind = parseInt(behindCount) > 0;
    
    if (isBehind) {
      console.log(`Local branch is behind remote by ${behindCount} commits`);
      console.log(`Local HEAD: ${localRev}`);
      console.log(`Remote HEAD: ${remoteRev}`);
    } else {
      console.log('Local branch is up-to-date with or ahead of remote');
    }
    
    return isBehind;
  } catch (error) {
    console.error(`Error checking if local is behind remote: ${error.message}`);
    // Assume we're behind if there's an error, to be safe
    return true;
  }
}

/**
 * Pull the latest changes from the remote repository
 * 
 * @param {string} [remote='origin'] - The name of the remote
 * @param {string} [branch='main'] - The branch to pull
 * @returns {boolean} - True if pull was successful
 */
function pullRemoteChanges(remote = 'origin', branch = 'main') {
  try {
    console.log(`Pulling latest changes from ${remote}/${branch}...`);
    executeGitCommandWithRetry(`git pull ${remote} ${branch}`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.error(`Error pulling from remote: ${error.message}`);
    return false;
  }
}

/**
 * Resolve merge conflicts using a specified strategy
 * 
 * @param {string} [strategy='theirs'] - The merge strategy to use ('theirs' or 'ours')
 * @returns {boolean} - True if conflicts were resolved
 */
function resolveMergeConflicts(strategy = 'theirs') {
  try {
    if (strategy === 'theirs') {
      // Accept remote changes when there are conflicts
      console.log('Resolving merge conflicts by accepting remote changes...');
      executeGitCommandWithRetry('git checkout --theirs .', { stdio: 'pipe' });
    } else if (strategy === 'ours') {
      // Keep local changes when there are conflicts
      console.log('Resolving merge conflicts by keeping local changes...');
      executeGitCommandWithRetry('git checkout --ours .', { stdio: 'pipe' });
    }
    
    // Stage the resolved files
    executeGitCommandWithRetry('git add .', { stdio: 'pipe' });
    
    // Commit the merge
    executeGitCommandWithRetry('git commit -m "Resolved merge conflicts"', { stdio: 'pipe' });
    
    return true;
  } catch (error) {
    console.error(`Error resolving merge conflicts: ${error.message}`);
    return false;
  }
}

/**
 * Synchronize with remote repository before pushing
 * This will fetch, check if we're behind, and pull if needed
 * 
 * @param {string} [remote='origin'] - The name of the remote
 * @param {string} [branch='main'] - The branch to synchronize
 * @param {string} [conflictStrategy='theirs'] - The strategy for handling conflicts
 * @returns {boolean} - True if synchronization was successful
 */
function synchronizeWithRemote(remote = 'origin', branch = 'main', conflictStrategy = 'theirs') {
  try {
    // Fetch remote changes
    if (!fetchRemoteChanges(remote, branch)) {
      return false;
    }
    
    // Check if we're behind the remote
    if (isLocalBehindRemote(remote, branch)) {
      console.log('Local repository is behind remote, pulling changes...');
      
      try {
        // Try to pull changes
        pullRemoteChanges(remote, branch);
      } catch (pullError) {
        console.error(`Error during pull, might be merge conflicts: ${pullError.message}`);
        
        // Check if there are merge conflicts
        const hasConflicts = execSync('git status --porcelain', { stdio: 'pipe' })
          .toString()
          .split('\n')
          .some(line => line.startsWith('UU'));
        
        if (hasConflicts) {
          console.log('Detected merge conflicts, attempting to resolve...');
          if (!resolveMergeConflicts(conflictStrategy)) {
            console.error('Failed to resolve merge conflicts.');
            return false;
          }
        } else {
          console.error('Unhandled error during pull, aborting.');
          return false;
        }
      }
    } else {
      console.log('Local repository is up-to-date with or ahead of remote.');
    }
    
    return true;
  } catch (error) {
    console.error(`Error synchronizing with remote: ${error.message}`);
    return false;
  }
}

/**
 * Push changes to the remote repository with automatic synchronization
 * This will first synchronize with the remote to avoid rejection
 * 
 * @param {string} [remote='origin'] - The name of the remote
 * @param {string} [branch='main'] - The branch to push
 * @param {string} [conflictStrategy='theirs'] - The strategy for handling conflicts
 * @returns {boolean} - True if push was successful
 */
function pushWithSync(remote = 'origin', branch = 'main', conflictStrategy = 'theirs') {
  try {
    console.log(`Preparing to push changes to ${remote}/${branch}...`);
    
    // First synchronize with remote
    if (!synchronizeWithRemote(remote, branch, conflictStrategy)) {
      console.error('Failed to synchronize with remote before pushing.');
      return false;
    }
    
    // Now push our changes
    console.log(`Pushing changes to ${remote}/${branch}...`);
    executeGitCommandWithRetry(`git push ${remote} ${branch}`, { stdio: 'pipe' });
    
    console.log('Successfully pushed changes to remote!');
    return true;
  } catch (error) {
    console.error(`Error pushing to remote: ${error.message}`);
    
    // If push failed due to non-fast-forward, try to recover
    if (error.message.includes('non-fast-forward') || 
        error.message.includes('fetch first') || 
        error.message.includes('rejected')) {
      console.log('Push rejected, attempting to recover...');
      
      // Try again with a full synchronization
      return synchronizeWithRemote(remote, branch, conflictStrategy) && 
             pushWithSync(remote, branch, conflictStrategy);
    }
    
    return false;
  }
}

/**
 * Check internet connectivity by pinging a reliable host
 * 
 * @returns {boolean} - True if internet is available
 */
function checkInternetConnectivity() {
  try {
    // Try to ping GitHub's API to check connectivity
    // Use a timeout of 5 seconds
    execSync('curl -s -m 5 https://api.github.com/zen', { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.warn('Internet connectivity check failed:', error.message);
    return false;
  }
}

/**
 * Force git to use HTTPS instead of git protocol
 * This can help bypass some network restrictions
 */
function forceHttpsOverGit() {
  try {
    execSync('git config --global url."https://".insteadOf git://', { stdio: 'pipe' });
    console.log('Configured Git to use HTTPS instead of git protocol');
  } catch (error) {
    console.warn('Could not configure Git to use HTTPS:', error.message);
  }
}

/**
 * Configure git to use a longer timeout for operations
 */
function setGitTimeouts() {
  try {
    // Increase timeouts for HTTP operations (in seconds)
    execSync('git config --global http.lowSpeedLimit 1000', { stdio: 'pipe' });
    execSync('git config --global http.lowSpeedTime 60', { stdio: 'pipe' });
    
    // Increase the timeout for individual operations
    execSync('git config --global http.postBuffer 524288000', { stdio: 'pipe' });
    
    console.log('Configured Git with increased timeouts for network operations');
  } catch (error) {
    console.warn('Could not configure Git timeouts:', error.message);
  }
}

/**
 * Configure Git to retry failed operations
 */
function configureGitRetry() {
  try {
    // Configure Git to retry operations
    execSync('git config --global http.retryCount 5', { stdio: 'pipe' });
    execSync('git config --global http.retryDelay 2', { stdio: 'pipe' });
    
    console.log('Configured Git to retry failed operations');
  } catch (error) {
    console.warn('Could not configure Git retry settings:', error.message);
  }
}

/**
 * Apply all network resilience improvements to Git
 */
function enhanceGitNetworkResilience() {
  forceHttpsOverGit();
  setGitTimeouts();
  configureGitRetry();
}

module.exports = {
  executeGitCommandWithRetry,
  checkInternetConnectivity,
  enhanceGitNetworkResilience,
  forceHttpsOverGit,
  setGitTimeouts,
  configureGitRetry,
  fetchRemoteChanges,
  isLocalBehindRemote,
  pullRemoteChanges,
  resolveMergeConflicts,
  synchronizeWithRemote,
  pushWithSync
};
