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
    console.log(`Pulling latest changes from ${remote}/${branch} with rebase...`);
    executeGitCommandWithRetry(`git pull --rebase ${remote} ${branch}`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.error(`Error pulling from remote with rebase: ${error.message}`);
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
    
    // Check if we're in a rebase
    const isRebase = execSync('git rev-parse --git-dir', { stdio: 'pipe' })
      .toString().trim() + '/rebase-merge';
    const isInRebase = execSync(`test -d "${isRebase}" && echo "true" || echo "false"`, { stdio: 'pipe' })
      .toString().trim() === 'true';
    
    if (isInRebase) {
      // Continue the rebase process
      console.log('Continuing rebase after resolving conflicts...');
      executeGitCommandWithRetry('git rebase --continue', { stdio: 'pipe' });
    } else {
      // Commit the merge
      console.log('Committing resolved merge conflicts...');
      executeGitCommandWithRetry('git commit -m "Resolved merge conflicts"', { stdio: 'pipe' });
    }
    
    return true;
  } catch (error) {
    console.error(`Error resolving merge conflicts: ${error.message}`);
    
    // Check if we're in a rebase that's failing
    try {
      const isRebase = execSync('git rev-parse --git-dir', { stdio: 'pipe' })
        .toString().trim() + '/rebase-merge';
      const isInRebase = execSync(`test -d "${isRebase}" && echo "true" || echo "false"`, { stdio: 'pipe' })
        .toString().trim() === 'true';
      
      if (isInRebase) {
        // Abort the rebase to get back to a clean state
        console.log('Aborting problematic rebase...');
        executeGitCommandWithRetry('git rebase --abort', { stdio: 'pipe' });
        return false;
      }
    } catch (checkError) {
      console.error(`Error checking rebase status: ${checkError.message}`);
    }
    
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
      console.log('Local repository is behind remote, pulling changes with rebase...');
      
      try {
        // Try to pull changes with rebase
        pullRemoteChanges(remote, branch);
      } catch (pullError) {
        console.error(`Error during pull with rebase, might be merge conflicts: ${pullError.message}`);
        
        // Check if there are merge conflicts
        const hasConflicts = execSync('git status --porcelain', { stdio: 'pipe' })
          .toString()
          .split('\n')
          .some(line => line.startsWith('UU'));
        
        if (hasConflicts) {
          console.log('Detected merge conflicts, attempting to resolve...');
          if (!resolveMergeConflicts(conflictStrategy)) {
            console.error('Failed to resolve merge conflicts.');
            
            // Try a different approach - abort any rebase and do a hard reset
            try {
              console.log('Attempting to abort any ongoing rebase...');
              execSync('git rebase --abort', { stdio: 'ignore' });
            } catch (e) {
              // Ignore errors if we weren't in a rebase
            }
            
            console.log('Resetting to remote state and applying our changes on top...');
            try {
              // Stash any changes
              execSync('git stash', { stdio: 'pipe' });
              
              // Reset to remote
              execSync(`git reset --hard ${remote}/${branch}`, { stdio: 'pipe' });
              
              // Apply stashed changes if any were stashed
              const stashList = execSync('git stash list', { stdio: 'pipe' }).toString().trim();
              if (stashList) {
                execSync('git stash pop', { stdio: 'pipe' });
              }
              
              return true;
            } catch (resetError) {
              console.error(`Error during reset attempt: ${resetError.message}`);
              return false;
            }
          }
        } else {
          console.error('Unhandled error during pull, attempting reset to remote...');
          try {
            // Reset to remote
            execSync(`git reset --hard ${remote}/${branch}`, { stdio: 'pipe' });
            return true;
          } catch (resetError) {
            console.error(`Error during reset attempt: ${resetError.message}`);
            return false;
          }
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
 * @param {number} [retryCount=0] - Current retry count (used internally)
 * @returns {boolean} - True if push was successful
 */
function pushWithSync(remote = 'origin', branch = 'main', conflictStrategy = 'theirs', retryCount = 0) {
  const MAX_PUSH_RETRIES = 3;

  try {
    console.log(`Preparing to push changes to ${remote}/${branch}...`);
    
    // Check if we need to update the remote URL with token
    try {
      if (process.env.GITHUB_TOKEN) {
        console.log('Updating remote URL with authentication token...');
        const username = process.env.GITHUB_USERNAME || 'x-access-token';
        const repo = process.env.GITHUB_REPO || remote.replace('origin', '').replace(/^\/+/, '');
        const authenticatedUrl = `https://${username}:${process.env.GITHUB_TOKEN}@github.com/${username}/${repo}.git`;
        execSync(`git remote set-url ${remote} ${authenticatedUrl}`, { stdio: 'pipe' });
      }
    } catch (urlError) {
      console.warn(`Could not update remote URL: ${urlError.message}`);
    }
    
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
    if ((error.message.includes('non-fast-forward') || 
        error.message.includes('fetch first') || 
        error.message.includes('rejected')) && retryCount < MAX_PUSH_RETRIES) {
      console.log(`Push rejected, attempting to recover (Retry ${retryCount + 1} of ${MAX_PUSH_RETRIES})...`);
      
      // Try again with a full synchronization
      return synchronizeWithRemote(remote, branch, conflictStrategy) && 
             pushWithSync(remote, branch, conflictStrategy, retryCount + 1);
    }
    
    if (retryCount >= MAX_PUSH_RETRIES) {
      console.error('Maximum push retries reached. Aborting push operation.');
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

/**
 * Verify and fix GitHub authentication by ensuring the remote URL contains the token
 * 
 * @param {string} [remote='origin'] - The name of the remote
 * @returns {boolean} - True if authentication is properly configured
 */
function ensureGitHubAuthentication(remote = 'origin') {
  try {
    if (!process.env.GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN environment variable is not set. Cannot authenticate with GitHub.');
      return false;
    }

    if (!process.env.GITHUB_USERNAME) {
      console.warn('GITHUB_USERNAME environment variable is not set. Using token authentication only.');
    }

    // Get current remote URL
    const currentUrl = execSync(`git remote get-url ${remote}`, { stdio: 'pipe' }).toString().trim();
    
    // Skip if already using token auth
    if (currentUrl.includes('@github.com')) {
      console.log('Remote URL already contains authentication information.');
      
      // Verify the authentication still works
      try {
        execSync('git ls-remote --heads origin', { stdio: 'pipe' });
        console.log('GitHub authentication verified successfully.');
        return true;
      } catch (authTestError) {
        console.warn('Current authentication may be invalid. Updating token...');
      }
    }
    
    // Extract repo info from current URL
    const repoPathMatch = currentUrl.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)(?:\.git)?$/);
    if (!repoPathMatch) {
      console.error(`Unable to parse GitHub repo path from URL: ${currentUrl}`);
      return false;
    }
    
    const username = process.env.GITHUB_USERNAME || repoPathMatch[1];
    const repo = process.env.GITHUB_REPO || repoPathMatch[2];
    
    // Construct new authenticated URL
    const authenticatedUrl = `https://${username}:${process.env.GITHUB_TOKEN}@github.com/${username}/${repo}.git`;
    
    // Update the remote URL
    console.log(`Setting authenticated remote URL for ${remote}...`);
    execSync(`git remote set-url ${remote} "${authenticatedUrl}"`, { stdio: 'pipe' });
    
    // Test the connection
    try {
      execSync('git ls-remote --heads origin', { stdio: 'pipe' });
      console.log('GitHub authentication configured successfully.');
      return true;
    } catch (testError) {
      console.error(`Authentication test failed: ${testError.message}`);
      return false;
    }
  } catch (error) {
    console.error(`Error configuring GitHub authentication: ${error.message}`);
    return false;
  }
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
  pushWithSync,
  ensureGitHubAuthentication
};
