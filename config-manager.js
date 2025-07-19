const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, 'config.json');
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(configData);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }

    // Return default config if loading fails
    return this.getDefaultConfig();
  }

  getDefaultConfig() {
    return {
      contentTypes: {
        code: {
          enabled: true,
          weight: 3,
          languages: ["JavaScript", "Python", "HTML"]
        },
        markdown: {
          enabled: true,
          weight: 2
        },
        data: {
          enabled: true,
          weight: 1,
          formats: ["JSON", "CSV"]
        }
      },
      commitPatterns: {
        randomizeTime: true,
        weekdayOnly: false,
        workingHours: {
          enabled: false,
          startHour: 9,
          endHour: 17
        },
        maxCommitsPerDay: 5
      },
      directoryStructure: {
        useStructure: false,
        directories: [
          "src",
          "docs",
          "data",
          "config",
          "tests"
        ]
      }
    };
  }

  getContentTypeWeights() {
    const weights = [];
    const { contentTypes } = this.config;
    
    if (contentTypes.code.enabled) {
      weights.push({ type: 'code', weight: contentTypes.code.weight });
    }
    
    if (contentTypes.markdown.enabled) {
      weights.push({ type: 'markdown', weight: contentTypes.markdown.weight });
    }
    
    if (contentTypes.data.enabled) {
      weights.push({ type: 'data', weight: contentTypes.data.weight });
    }
    
    return weights;
  }

  shouldSkipCommit() {
    const { commitPatterns } = this.config;
    const now = new Date();
    
    // Check weekday only setting
    if (commitPatterns.weekdayOnly) {
      const day = now.getDay();
      if (day === 0 || day === 6) { // 0 is Sunday, 6 is Saturday
        return true;
      }
    }
    
    // Check working hours setting
    if (commitPatterns.workingHours.enabled) {
      const hour = now.getHours();
      if (hour < commitPatterns.workingHours.startHour || 
          hour >= commitPatterns.workingHours.endHour) {
        return true;
      }
    }
    
    return false;
  }

  getTargetDirectory() {
    const { directoryStructure } = this.config;
    
    if (!directoryStructure.useStructure) {
      return '';
    }
    
    const directories = directoryStructure.directories;
    const randomIndex = Math.floor(Math.random() * directories.length);
    return directories[randomIndex];
  }

  getCodeLanguages() {
    return this.config.contentTypes.code.languages || ["JavaScript", "Python", "HTML"];
  }

  getDataFormats() {
    return this.config.contentTypes.data.formats || ["JSON", "CSV"];
  }

  getMaxCommitsPerDay() {
    return this.config.commitPatterns.maxCommitsPerDay || 5;
  }
}

module.exports = new ConfigManager();
