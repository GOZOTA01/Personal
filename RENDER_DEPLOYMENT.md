# Deploying to Render

This guide walks you through deploying your GitHub Activity Bot to Render with detailed steps and screenshots.

## Prerequisites

- [Render account](https://render.com) (sign up if you don't have one)
- Your GitHub Activity Bot code pushed to a GitHub repository
- GitHub Personal Access Token with repo scope

## Step 1: Connect Your GitHub Repository to Render

1. Sign in to your Render account
2. From your dashboard, click the "New +" button in the top right

![Render Dashboard](https://i.imgur.com/xxxxxxxx.png)

3. Select "Web Service" from the options

## Step 2: Configure Your Web Service

1. Connect to your GitHub repository
   - Select your GitHub account
   - Find and select your GitHub Activity Bot repository

2. Configure your service:
   - **Name**: `github-activity-bot` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose the region closest to you
   - **Branch**: `main` (or your default branch)
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`

![Service Configuration](https://i.imgur.com/xxxxxxxx.png)

3. Set the instance type:
   - For the free plan, select "Free"
   - For better reliability, consider a paid plan

4. Under Advanced settings:
   - Set the service type to "Private Service" (since this is a background worker, not a web server)

## Step 3: Set Environment Variables

1. Scroll down to "Environment Variables"
2. Add the following key-value pairs:
   - `GITHUB_TOKEN`: Your GitHub personal access token
   - `GITHUB_USERNAME`: Your GitHub username
   - `GITHUB_REPO`: Your target repository name
   - `COMMIT_FREQUENCY`: Your preferred schedule (e.g., `*/30 * * * *`)

![Environment Variables](https://i.imgur.com/xxxxxxxx.png)

## Step 4: Deploy Your Service

1. Click "Create Web Service"
2. Render will start deploying your service
3. Wait for the build and deployment to complete

## Step 5: Verify Your Deployment

1. Click on the "Logs" tab to see the output from your bot
2. You should see messages about your bot starting up and making commits
3. Check your GitHub repository to verify that new commits are being created

## Alternative: Using Blueprints

If you prefer a more automated setup, you can use Render Blueprints:

1. Make sure the `render.yaml` file is in your repository
2. In your Render dashboard, click "New +" and select "Blueprint"
3. Connect to your GitHub repository
4. Render will automatically detect and use the configuration from your `render.yaml` file
5. You'll still need to set your secret environment variables

## Troubleshooting

### Service Keeps Restarting

If your service keeps restarting, check the logs for errors. Common issues include:

- **Missing environment variables**: Ensure all required variables are set
- **GitHub API rate limiting**: If you see rate limit errors, consider reducing your commit frequency
- **GitHub token issues**: Verify that your token has the correct permissions and hasn't expired

### No Commits Being Made

If the service is running but no commits appear in your repository:

1. Check the logs for any error messages
2. Verify that the GitHub token has the necessary permissions
3. Ensure the repository specified in `GITHUB_REPO` exists and is accessible with your credentials

### Service Is Running but Inactive

If the service seems to be running but not doing anything:

1. Render free tier services will "sleep" after periods of inactivity
2. Consider upgrading to a paid plan for 24/7 operation
3. You can also set up an external service to ping your Render service regularly to keep it active

## Managing Your Deployment

- **Viewing Logs**: Click on the "Logs" tab in your service dashboard
- **Restarting**: Use the "Manual Deploy" button to trigger a new deployment
- **Updating**: Push changes to your GitHub repository, and Render will automatically redeploy

## Next Steps

Consider setting up:

1. **Monitoring**: Use Render's built-in monitoring to track your service's performance
2. **Notifications**: Configure notifications to alert you if your service goes down
3. **Custom Domain**: If you need a custom domain for your service (not typically needed for this bot)
