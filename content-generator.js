const fs = require('fs');
const path = require('path');
const configManager = require('./config-manager');

// Function to generate random code in various languages
function generateRandomCode() {
  const languages = [
    { 
      name: 'JavaScript', 
      extension: 'js',
      template: () => {
        const functionName = `function${Math.floor(Math.random() * 1000)}`;
        return `/**
 * ${getRandomComment()}
 * Generated on: ${new Date().toISOString()}
 */
function ${functionName}() {
  const value = ${Math.random() * 100};
  console.log('Processing value:', value);
  return value * ${Math.floor(Math.random() * 10)};
}

// Export the function
module.exports = { ${functionName} };`;
      }
    },
    { 
      name: 'Python', 
      extension: 'py',
      template: () => {
        const functionName = `function_${Math.floor(Math.random() * 1000)}`;
        return `#!/usr/bin/env python3
# ${getRandomComment()}
# Generated on: ${new Date().toISOString()}

import random
import datetime

def ${functionName}():
    """
    ${getRandomComment()}
    Returns a processed random value
    """
    value = random.random() * 100
    print(f"Processing value: {value}")
    return value * ${Math.floor(Math.random() * 10)}

if __name__ == "__main__":
    result = ${functionName}()
    print(f"Result: {result}")`;
      }
    },
    { 
      name: 'HTML', 
      extension: 'html',
      template: () => {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page ${Math.floor(Math.random() * 1000)}</title>
</head>
<body>
    <h1>${getRandomComment()}</h1>
    <p>Generated on: ${new Date().toISOString()}</p>
    <div class="container">
        <p>${getRandomComment()}</p>
    </div>
</body>
</html>`;
      }
    }
  ];

  const selectedLanguage = languages[Math.floor(Math.random() * languages.length)];
  const fileName = `sample-${Date.now()}.${selectedLanguage.extension}`;
  const content = selectedLanguage.template();
  
  return {
    fileName,
    content,
    language: selectedLanguage.name
  };
}

// Generate a random markdown file with notes or documentation
function generateRandomMarkdown() {
  const title = `Notes ${new Date().toLocaleDateString()}`;
  const content = `# ${title}

## Overview
${getRandomComment()}

## Details
- Item 1: ${getRandomComment()}
- Item 2: ${getRandomComment()}
- Item 3: ${getRandomComment()}

## Next Steps
1. ${getRandomComment()}
2. ${getRandomComment()}

Generated on: ${new Date().toISOString()}
`;

  const fileName = `notes-${Date.now()}.md`;
  return {
    fileName,
    content,
    language: 'Markdown'
  };
}

// Generate a random data file (JSON or CSV)
function generateRandomDataFile() {
  const formats = [
    {
      name: 'JSON',
      extension: 'json',
      generator: () => {
        const entries = [];
        const count = Math.floor(Math.random() * 5) + 3;
        
        for (let i = 0; i < count; i++) {
          entries.push({
            id: i + 1,
            value: Math.random() * 100,
            description: getRandomComment(),
            timestamp: new Date().toISOString()
          });
        }
        
        return JSON.stringify({ data: entries }, null, 2);
      }
    },
    {
      name: 'CSV',
      extension: 'csv',
      generator: () => {
        let content = 'id,value,description,timestamp\n';
        const count = Math.floor(Math.random() * 5) + 3;
        
        for (let i = 0; i < count; i++) {
          content += `${i + 1},${(Math.random() * 100).toFixed(2)},"${getRandomComment()}",${new Date().toISOString()}\n`;
        }
        
        return content;
      }
    }
  ];

  const selectedFormat = formats[Math.floor(Math.random() * formats.length)];
  const fileName = `data-${Date.now()}.${selectedFormat.extension}`;
  const content = selectedFormat.generator();
  
  return {
    fileName,
    content,
    language: selectedFormat.name
  };
}

// Random comments to make content more varied
function getRandomComment() {
  const comments = [
    'Updated the project configuration',
    'Fixed a bug in the main module',
    'Added new feature implementation',
    'Refactored for better performance',
    'Documentation update',
    'Code cleanup and optimization',
    'Added unit tests',
    'Integration with external API',
    'UI/UX improvements',
    'Security patch implementation',
    'Dependency updates',
    'Added error handling',
    'Implemented user feedback',
    'Fixed edge case scenario',
    'Performance optimization'
  ];
  
  return comments[Math.floor(Math.random() * comments.length)];
}

// Generate a random file of any supported type
function generateRandomFile() {
  const generators = [
    generateRandomCode,
    generateRandomMarkdown,
    generateRandomDataFile
  ];
  
  const selectedGenerator = generators[Math.floor(Math.random() * generators.length)];
  return selectedGenerator();
}

module.exports = {
  generateRandomFile,
  generateRandomCode,
  generateRandomMarkdown,
  generateRandomDataFile
};
