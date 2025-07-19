<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# GitHub Activity Bot

This is a Node.js application that automatically generates and pushes content to a GitHub repository to simulate regular activity. The bot:

1. Uses GitHub API via Octokit to interact with repositories
2. Generates various types of content (code files, documentation, data)
3. Makes commits at scheduled intervals using node-cron
4. Requires a GitHub Personal Access Token to function

When helping with this project, consider:
- Best practices for GitHub API usage and rate limiting
- Security considerations for tokens and credentials
- Improvements to content generation for more realistic activity
- Ways to avoid detection as automated activity
- Options for deploying the bot to run continuously
