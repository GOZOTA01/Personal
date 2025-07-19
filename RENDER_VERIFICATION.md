# Render Deployment Verification

This document provides steps to verify that your GitHub Activity Bot is correctly deployed and running on Render.

## Verify HTTP Server

1. Once your service is deployed, click on the URL provided by Render (usually something like `https://github-activity-bot.onrender.com`)

2. You should see a message: "GitHub Activity Bot - This is a background worker service that generates activity on GitHub."

3. Navigate to the health check endpoint by adding `/healthz` to your URL (e.g., `https://github-activity-bot.onrender.com/healthz`)

4. You should see a JSON response: `{"status":"ok","message":"GitHub Activity Bot is running"}`

## Verify GitHub Commits

1. After the bot has been running for at least one scheduled interval (based on your COMMIT_FREQUENCY setting):

2. Check your GitHub repository to verify that new commits are being made

3. You should see new files being generated and committed by the bot

## Troubleshooting

If the deployment is failing or commits are not being made, check the following:

1. **Logs**: In the Render dashboard, check the logs for any errors

2. **Environment Variables**: Ensure all required environment variables are set correctly:
   - GITHUB_TOKEN: Your personal access token with repo permissions
   - GITHUB_USERNAME: Your GitHub username
   - GITHUB_REPO: The repository name where commits should be made
   - COMMIT_FREQUENCY: The cron schedule for commits (e.g., "*/30 * * * *" for every 30 minutes)
   - RENDER: Set to "true" to indicate running in the Render environment
   - PORT: Set to a specific port (e.g., "10000")

3. **Port Binding**: If you're seeing port scanning errors, ensure the HTTP server is binding to the correct port. The logs should show: "HTTP server running on port X (process Y)"

4. **Git Configuration**: Check if the Git configuration is being set correctly in the logs

## Making Changes

If you need to make changes to your deployment:

1. Update your code locally
2. Commit and push to GitHub
3. In the Render dashboard, navigate to your service
4. Click "Manual Deploy" > "Deploy latest commit"
5. Wait for the deployment to complete
6. Verify the changes are working as expected

## Monitoring

Set up regular checks of your GitHub repository to ensure the bot continues to function as expected over time.
