# GitHub Activity Bot

A sophisticated bot that automatically generates and pushes random content to your GitHub repository to maintain a constant activity graph.

## Features

- Automatically pushes commits to your GitHub repository at scheduled intervals
- Generates various types of content:
  - Code files (JavaScript, Python, HTML)
  - Markdown documentation
  - Data files (JSON, CSV)
- Customizable commit frequency using cron expressions
- Advanced configuration options:
  - Control content types and their frequency
  - Limit commits to weekdays or working hours
  - Randomize commit times for more natural patterns
  - Organize files in a directory structure
- Easy-to-use CLI for managing the bot
- Simple setup with minimal configuration

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a GitHub Personal Access Token:
   - Go to [GitHub Personal Access Tokens](https://github.com/settings/tokens)
   - Generate a new token with `repo` scope
   - Copy the token

4. Run the setup wizard:
   ```
   npm run bot setup
   ```

5. Edit the `.env` file with your GitHub information and token

## Configuration

Edit the `.env` file to customize basic bot behavior:

```
# GitHub credentials
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_USERNAME=your_github_username
GITHUB_REPO=your_github_repo

# Commit configuration
COMMIT_FREQUENCY=*/30 * * * *  # Every 30 minutes
```

### Advanced Configuration

Edit the `config.json` file to fine-tune bot behavior:

```json
{
  "contentTypes": {
    "code": {
      "enabled": true,
      "weight": 3,
      "languages": ["JavaScript", "Python", "HTML"]
    },
    "markdown": {
      "enabled": true,
      "weight": 2
    },
    "data": {
      "enabled": true,
      "weight": 1,
      "formats": ["JSON", "CSV"]
    }
  },
  "commitPatterns": {
    "randomizeTime": true,
    "weekdayOnly": false,
    "workingHours": {
      "enabled": false,
      "startHour": 9,
      "endHour": 17
    },
    "maxCommitsPerDay": 5
  },
  "directoryStructure": {
    "useStructure": false,
    "directories": [
      "src",
      "docs",
      "data",
      "config",
      "tests"
    ]
  }
}
```

### Cron Schedule Format

The `COMMIT_FREQUENCY` uses cron syntax:
- `* * * * *` - Every minute
- `*/30 * * * *` - Every 30 minutes
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Once a day at midnight
- `0 12 * * *` - Once a day at noon

## Using the CLI

The bot comes with a command-line interface for easy management:

```
# Show help
npm run bot help

# Start the bot as a background process (uses PM2)
npm run bot start

# Stop the bot
npm run bot stop

# Check bot status
npm run bot status

# Make a test commit
npm run bot test

# Open the configuration file
npm run bot config

# Run the setup wizard
npm run bot setup
```

## Running the Bot

You can start the bot in different ways:

```
# Run directly (keeps running until you close the terminal)
npm start

# Run as a background process with PM2
npm run bot start
```

For continuous operation, consider:
1. Using PM2 (automatically installed when needed)
2. Setting up as a service on your server
3. Using a cloud platform like Heroku, AWS, or Render

## Deployment

For continuous operation, the bot needs to run on a server or cloud platform. See the [DEPLOYMENT.md](DEPLOYMENT.md) file for detailed instructions on various deployment options.

### Quick Render Deployment

To deploy to Render:

1. Push your code to GitHub
2. Sign in to your Render account
3. Create a new Web Service
   - Connect to your GitHub repository
   - Set Environment to "Node"
   - Set Build Command to: `npm install`
   - Set Start Command to: `node index.js`
   - Add the following environment variables:
     - `GITHUB_TOKEN`: Your GitHub personal access token
     - `GITHUB_USERNAME`: Your GitHub username
     - `GITHUB_REPO`: Your target repository name
     - `COMMIT_FREQUENCY`: Your preferred schedule (e.g., `*/30 * * * *`)

The repository includes a `render.yaml` file for Blueprint deployments. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed Render deployment instructions.

## Important Notes

- Use this tool responsibly and in accordance with GitHub's terms of service
- Consider running this on a server or using a service for 24/7 operation
- The bot requires internet access to communicate with GitHub API
- To avoid detection as automated activity, use the randomization options

## License

MIT
