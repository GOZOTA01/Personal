# Step-by-Step Guide to Deploy GitHub Activity Bot to Render

Follow these instructions to deploy your GitHub Activity Bot to Render.

## Step 1: Prepare Your Repository

1. Ensure your repository contains:
   - All necessary code files
   - Updated `package.json` with proper dependencies
   - `.env.example` file (do not commit your actual `.env` file)
   - `render.yaml` file for easy deployment

2. Push all changes to GitHub:
   ```zsh
   cd "/Users/josianncampos/Documents/Gabe Projects/github-bot"
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

## Step 2: Sign In to Render

1. Go to [https://render.com](https://render.com)
2. Sign in to your account or create a new one

## Step 3: Create a New Web Service

1. From your dashboard, click the "New +" button
2. Select "Web Service"

> **Important:** The GitHub Activity Bot must be deployed as a Web Service, not a Background Worker, because it needs to bind to a port to keep the service active. The bot includes a minimal HTTP server that handles health checks and keeps Render from timing out.

## Step 4: Connect Your Repository

1. Find and select your GitHub repository
   - If you haven't connected GitHub to Render yet, you'll be prompted to do so
   - Select the repository that contains your GitHub Activity Bot

## Step 5: Configure Service Settings

Use these exact settings:

- **Name**: `github-activity-bot` (or any name you prefer)
- **Environment**: `Node`
- **Region**: Choose the closest to your location
- **Branch**: `main` (or your default branch)
- **Build Command**: `npm install`
- **Start Command**: `node index.js`
- **Plan**: Select "Free" or a paid plan for better reliability
- **Advanced Settings**:
  - Set "Service Type" to "Private Service" (since this is a background worker)

## Step 6: Add Environment Variables

Add these environment variables:

- `GITHUB_TOKEN`: Your GitHub personal access token
- `GITHUB_USERNAME`: Your GitHub username (GOZOTA01)
- `GITHUB_REPO`: Your target repository name (Personal)
- `COMMIT_FREQUENCY`: `*/30 * * * *` (or your preferred schedule)

## Step 7: Deploy

1. Click "Create Web Service"
2. Wait for the deployment process to complete
   - This may take a few minutes
   - You can watch the build progress in the logs

## Step 8: Verify Deployment

1. Go to the "Logs" tab
2. You should see output showing your bot starting up
3. Wait for the first scheduled commit to occur
4. Check your GitHub repository to confirm that new files are being created

## Step 9: Monitor Your Service

- Check the logs periodically to ensure your bot is running correctly
- If you're using the free plan, note that your service may go to sleep after inactivity
- For continuous operation, consider upgrading to a paid plan

## Troubleshooting

If you encounter issues:

1. Check environment variables are set correctly
2. Verify your GitHub token has the necessary permissions
3. Look for error messages in the Render logs
4. Try redeploying by clicking "Manual Deploy" > "Deploy latest commit"

## Next Steps

- Consider setting up GitHub Actions as a backup deployment method
- Adjust your bot's configuration based on your GitHub activity preferences
- Explore Render's dashboard features for monitoring your service

For detailed information, see the full [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) guide.
