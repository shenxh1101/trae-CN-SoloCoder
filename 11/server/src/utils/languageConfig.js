const languageConfig = {
  javascript: {
    name: 'JavaScript',
    extension: 'js',
    dockerImage: 'node:18-alpine',
    command: (filename) => ['node', `/app/${filename}`],
    codemirrorMode: 'javascript'
  },
  python: {
    name: 'Python',
    extension: 'py',
    dockerImage: 'python:3.11-slim',
    command: (filename) => ['python', `/app/${filename}`],
    codemirrorMode: 'python'
  },
  java: {
    name: 'Java',
    extension: 'java',
    dockerImage: 'openjdk:17-slim',
    command: (filename) => {
      const className = filename.replace('.java', '');
      return ['sh', '-c', `javac /app/${filename} && java -cp /app ${className}`];
    },
    codemirrorMode: 'text/x-java'
  },
  go: {
    name: 'Go',
    extension: 'go',
    dockerImage: 'golang:1.21-alpine',
    command: (filename) => ['go', 'run', `/app/${filename}`],
    codemirrorMode: 'go'
  },
  html: {
    name: 'HTML/CSS',
    extension: 'html',
    dockerImage: null,
    command: null,
    codemirrorMode: 'htmlmixed'
  }
};

const getLanguageConfig = (lang) => {
  return languageConfig[lang] || languageConfig.javascript;
};

const isLanguageSupported = (lang) => {
  return !!languageConfig[lang];
};

const getSupportedLanguages = () => {
  return Object.keys(languageConfig).map(key => ({
    id: key,
    name: languageConfig[key].name
  }));
};

module.exports = {
  languageConfig,
  getLanguageConfig,
  isLanguageSupported,
  getSupportedLanguages
};
