# Deployment Guide

This guide provides instructions for deploying the GitHub Activity Bot to different environments for continuous operation.

## Deploying to a VPS or Dedicated Server

### Prerequisites
- Linux server (Ubuntu/Debian recommended)
- Node.js 14+ installed
- Git installed

### Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/github-activity-bot.git
   cd github-activity-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up configuration:
   ```bash
   cp .env.example .env
   nano .env  # Edit with your GitHub credentials
   ```

4. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

5. Start the bot with PM2:
   ```bash
   pm2 start index.js --name github-activity-bot
   ```

6. Set PM2 to start on system boot:
   ```bash
   pm2 startup
   pm2 save
   ```

7. Monitor the bot:
   ```bash
   pm2 logs github-activity-bot
   pm2 monit
   ```

## Deploying to Heroku

### Prerequisites
- Heroku account
- Heroku CLI installed

### Deployment Steps

1. Create a new Heroku app:
   ```bash
   heroku create github-activity-bot
   ```

2. Add the following to your `package.json`:
   ```json
   "engines": {
     "node": "14.x"
   }
   ```

3. Create a `Procfile` in the root directory:
   ```
   worker: node index.js
   ```

4. Configure environment variables:
   ```bash
   heroku config:set GITHUB_TOKEN=your_token
   heroku config:set GITHUB_USERNAME=your_username
   heroku config:set GITHUB_REPO=your_repo
   heroku config:set COMMIT_FREQUENCY="0 */6 * * *"
   ```

5. Deploy to Heroku:
   ```bash
   git push heroku main
   ```

6. Scale the worker dyno:
   ```bash
   heroku ps:scale worker=1
   ```

7. Check logs:
   ```bash
   heroku logs --tail
   ```

## Deploying to AWS Lambda

For a serverless approach using AWS Lambda and EventBridge:

1. Modify the code to work with Lambda by removing the cron scheduling and exporting a handler:

   Create a `lambda.js` file:
   ```javascript
   const { updateActivityLog } = require('./index');

   exports.handler = async (event) => {
     try {
       await updateActivityLog();
       return { statusCode: 200, body: 'Activity updated successfully' };
     } catch (error) {
       console.error('Error:', error);
       return { statusCode: 500, body: 'Error updating activity' };
     }
   };
   ```

2. Create a ZIP package with all dependencies:
   ```bash
   npm install
   zip -r function.zip . -x "node_modules/*"
   ```

3. Create a Lambda function in AWS Console:
   - Runtime: Node.js 14.x
   - Upload the ZIP file
   - Add environment variables for GITHUB_TOKEN, GITHUB_USERNAME, and GITHUB_REPO

4. Set up an EventBridge rule to trigger the Lambda:
   - Create a new rule with a schedule expression (e.g., `rate(6 hours)` or `cron(0 */6 * * ? *)`)
   - Select the Lambda function as the target

## Deploying to GitHub Actions

You can use GitHub Actions to run the bot from GitHub's infrastructure:

1. Create a `.github/workflows/activity-bot.yml` file:

```yaml
name: GitHub Activity Bot

on:
  schedule:
    # Run every 6 hours
    - cron: '0 */6 * * *'
  workflow_dispatch:  # Allow manual triggering

jobs:
  update-activity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          token: ${{ secrets.BOT_GITHUB_TOKEN }}
      
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '14'
          
      - name: Install dependencies
        run: npm install
        
      - name: Configure Git
        run: |
          git config --global user.name "GitHub Activity Bot"
          git config --global user.email "bot@example.com"
          
      - name: Generate and commit content
        env:
          GITHUB_TOKEN: ${{ secrets.BOT_GITHUB_TOKEN }}
          GITHUB_USERNAME: ${{ github.repository_owner }}
          GITHUB_REPO: ${{ github.event.repository.name }}
        run: node index.js
```

2. Create a personal access token and add it as a repository secret named `BOT_GITHUB_TOKEN`.

## Security Best Practices

1. Never commit your `.env` file with tokens
2. Use environment variables for all sensitive information
3. Use the principle of least privilege for your GitHub token
4. Regularly rotate your tokens
5. Monitor your bot's activity for unusual behavior
