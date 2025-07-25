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

### Enhancing GitHub Actions Deployment

For GitHub Actions, you can enhance the workflow with additional features:

#### Randomized Scheduling

To make the activity look more natural, you can randomize the execution time:

```yaml
name: GitHub Activity Bot

on:
  schedule:
    # Run at different times throughout the day
    - cron: '12 2,7,13,18,22 * * *'  # Odd hours to look less automated
  workflow_dispatch:

jobs:
  update-activity:
    runs-on: ubuntu-latest
    steps:
      # Random delay to start the job (0-15 minutes)
      - name: Random delay
        run: |
          sleep $(( RANDOM % 900 ))
          
      # Rest of the steps as in the original workflow
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

#### Working Hours Only

To make the bot activity look more human-like, restrict it to typical working hours:

```yaml
name: GitHub Activity Bot (Working Hours)

on:
  schedule:
    - cron: '30 9-17 * * 1-5'  # Every hour from 9:30 AM to 5:30 PM, Monday to Friday
  workflow_dispatch:

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

## Deploying to a Raspberry Pi

A Raspberry Pi is an excellent low-cost option for hosting your GitHub Activity Bot continuously:

### Prerequisites
- Raspberry Pi (any model with internet connectivity)
- Raspbian OS or similar Linux distribution installed
- Internet connection

### Installation Steps

1. Update your Raspberry Pi:
   ```bash
   sudo apt update
   sudo apt upgrade -y
   ```

2. Install Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

3. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/github-activity-bot.git
   cd github-activity-bot
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Set up your environment file:
   ```bash
   nano .env
   ```
   
   Add the following content:
   ```
   GITHUB_TOKEN=your_github_personal_access_token
   GITHUB_USERNAME=your_github_username
   GITHUB_REPO=your_github_repo
   COMMIT_FREQUENCY=*/30 * * * *  # Every 30 minutes
   ```

6. Install PM2 to manage the process:
   ```bash
   sudo npm install -g pm2
   ```

7. Start the bot:
   ```bash
   pm2 start index.js --name github-activity-bot
   ```

8. Configure PM2 to start on boot:
   ```bash
   pm2 startup
   # Run the command that PM2 outputs
   pm2 save
   ```

9. Monitor the bot:
   ```bash
   pm2 logs github-activity-bot
   ```

## Deploying to Render

Render provides an easy way to deploy and run your Node.js applications with minimal configuration.

### Prerequisites
- Render account (https://render.com)
- GitHub repository with your bot code

### Deployment Steps

1. **Push your code to GitHub**: Make sure your GitHub Activity Bot code is in a GitHub repository.

2. **Connect Render to GitHub**:
   - Sign in to your Render account
   - Go to Dashboard and click "New +"
   - Select "Blueprint" or "Web Service" (we'll configure it as a worker)

3. **Configure the service**:
   - Connect to your GitHub repository
   - For the service type, select "Web Service"
   - For the environment, select "Node"
   - Set the build command to: `npm install`
   - Set the start command to: `node index.js`
   - Select the plan (Free is fine for this use case)
   - Click "Advanced" and set the service type to "Private"

4. **Set environment variables**:
   - Scroll down to the "Environment Variables" section
   - Add the following key-value pairs:
     - `GITHUB_TOKEN`: Your GitHub personal access token
     - `GITHUB_USERNAME`: Your GitHub username
     - `GITHUB_REPO`: Your GitHub repository name
     - `COMMIT_FREQUENCY`: `*/30 * * * *` (or your preferred schedule)

5. **Deploy the service**:
   - Click "Create Web Service"
   - Render will automatically build and deploy your application

6. **Monitor your deployment**:
   - Go to the "Logs" tab to see the output from your bot
   - Check that your bot is running correctly

### Using Blueprint (Alternative Method)

If you've added the `render.yaml` file to your repository, you can use Render Blueprints for even easier deployment:

1. **Push the render.yaml file to your GitHub repository**

2. **Deploy via Blueprint**:
   - In your Render dashboard, click "New +"
   - Select "Blueprint"
   - Connect to your GitHub repository
   - Render will automatically detect the render.yaml file and configure your services
   - You'll still need to set the secret environment variables (GITHUB_TOKEN, GITHUB_USERNAME, GITHUB_REPO)

3. **Deploy your services**:
   - Click "Apply" to create and deploy all services defined in your blueprint

### Troubleshooting Render Deployments

- **Service keeps restarting**: Check the logs for errors. Common issues include missing environment variables or configuration errors.
- **No commits being made**: Verify that the GitHub token has the necessary permissions.
- **Connection issues**: Ensure that the repository specified in GITHUB_REPO exists and is accessible with your credentials.

## Choosing the Right Deployment Option

| Deployment Option | Cost | Ease of Setup | Reliability | Control |
|------------------|------|---------------|------------|---------|
| VPS/Cloud Server | $5-10/month | Moderate | High | Full |
| Raspberry Pi | ~$50 one-time | Moderate | Moderate | Full |
| GitHub Actions | Free | Easy | High | Limited |
| Heroku | Free-$7/month | Easy | Moderate | Moderate |
| AWS Lambda | Free-$1/month | Complex | High | Moderate |
| Render | Free-$7/month | Easy | High | Moderate |

**Recommendation:** 
- For simplicity and no ongoing costs: **GitHub Actions**
- For reliability and full control: **VPS/Cloud Server** 
- For low cost and learning: **Raspberry Pi**
- For ease of setup and maintenance: **Render**

## Security Best Practices

1. Never commit your `.env` file with tokens
2. Use environment variables for all sensitive information
3. Use the principle of least privilege for your GitHub token
4. Regularly rotate your tokens
5. Monitor your bot's activity for unusual behavior
