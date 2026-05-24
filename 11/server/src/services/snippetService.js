const redis = require('../config/redis');
const bcrypt = require('bcrypt');
const { generateSnippetId, generateVersionId } = require('../utils/generateId');
const { isLanguageSupported } = require('../utils/languageConfig');

const SNIPPET_PREFIX = 'snippet:';
const HISTORY_PREFIX = 'snippet:history:';
const MAX_HISTORY_SIZE = parseInt(process.env.MAX_HISTORY_SIZE) || 50;

const defaultCodeTemplates = {
  javascript: `// JavaScript
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
`,
  python: `# Python
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
`,
  java: `// Java
public class Main {
    public static void main(String[] args) {
        System.out.println(greet("World"));
    }
    
    public static String greet(String name) {
        return "Hello, " + name + "!";
    }
}
`,
  go: `// Go
package main

import "fmt"

func greet(name string) string {
    return fmt.Sprintf("Hello, %s!", name)
}

func main() {
    fmt.Println(greet("World"))
}
`,
  html: `<!DOCTYPE html>
<html>
<head>
    <title>Hello World</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
        }
    </style>
</head>
<body>
    <h1>Hello, World!</h1>
    <p>Welcome to the collaborative code editor</p>
</body>
</html>
`
};

const createSnippet = async (options = {}) => {
  const {
    language = 'javascript',
    code,
    password,
    expiresAt,
    isReadOnly = false,
    ownerId,
    ownerName = 'Anonymous'
  } = options;

  if (!isLanguageSupported(language)) {
    throw new Error('Unsupported language');
  }

  const snippetId = generateSnippetId();
  const now = Date.now();

  const snippetData = {
    id: snippetId,
    language,
    code: code !== undefined ? code : defaultCodeTemplates[language],
    createdAt: now,
    updatedAt: now,
    ownerId,
    ownerName,
    isReadOnly,
    hasPassword: !!password,
    expiresAt: expiresAt || null,
    userStats: {}
  };

  if (password) {
    snippetData.passwordHash = await bcrypt.hash(password, 10);
  }

  await redis.set(SNIPPET_PREFIX + snippetId, JSON.stringify(snippetData));

  const initialVersion = {
    id: generateVersionId(),
    code: snippetData.code,
    language: snippetData.language,
    createdAt: now,
    createdBy: ownerName,
    message: 'Initial version'
  };

  await redis.lpush(HISTORY_PREFIX + snippetId, JSON.stringify(initialVersion));

  return snippetData;
};

const getSnippet = async (snippetId) => {
  const data = await redis.get(SNIPPET_PREFIX + snippetId);
  if (!data) return null;

  const snippet = JSON.parse(data);

  if (snippet.expiresAt && Date.now() > snippet.expiresAt) {
    await deleteSnippet(snippetId);
    return null;
  }

  return snippet;
};

const updateSnippet = async (snippetId, updates, userId, userName) => {
  const snippet = await getSnippet(snippetId);
  if (!snippet) return null;

  if (snippet.isReadOnly && userId !== snippet.ownerId) {
    throw new Error('Snippet is read-only');
  }

  if (updates.language && !isLanguageSupported(updates.language)) {
    throw new Error('Unsupported language');
  }

  const updatedSnippet = {
    ...snippet,
    ...updates,
    updatedAt: Date.now()
  };

  if (updates.code !== undefined && userId) {
    const lineCount = (updates.code.match(/\n/g) || []).length + 1;
    if (!updatedSnippet.userStats[userId]) {
      updatedSnippet.userStats[userId] = {
        name: userName,
        linesEdited: 0,
        lastActive: Date.now()
      };
    }
    updatedSnippet.userStats[userId].linesEdited += lineCount;
    updatedSnippet.userStats[userId].lastActive = Date.now();
  }

  await redis.set(SNIPPET_PREFIX + snippetId, JSON.stringify(updatedSnippet));

  return updatedSnippet;
};

const saveVersion = async (snippetId, code, language, userName, message = '') => {
  const version = {
    id: generateVersionId(),
    code,
    language,
    createdAt: Date.now(),
    createdBy: userName,
    message
  };

  await redis.lpush(HISTORY_PREFIX + snippetId, JSON.stringify(version));
  await redis.ltrim(HISTORY_PREFIX + snippetId, 0, MAX_HISTORY_SIZE - 1);

  return version;
};

const getHistory = async (snippetId) => {
  const history = await redis.lrange(HISTORY_PREFIX + snippetId, 0, -1);
  return history.map(item => JSON.parse(item));
};

const getVersion = async (snippetId, versionId) => {
  const history = await getHistory(snippetId);
  return history.find(v => v.id === versionId) || null;
};

const revertToVersion = async (snippetId, versionId, userId, userName) => {
  const version = await getVersion(snippetId, versionId);
  if (!version) return null;

  const updatedSnippet = await updateSnippet(
    snippetId,
    { code: version.code, language: version.language },
    userId,
    userName
  );

  await saveVersion(snippetId, version.code, version.language, userName, `Reverted to version ${versionId}`);

  return updatedSnippet;
};

const deleteSnippet = async (snippetId) => {
  await redis.del(SNIPPET_PREFIX + snippetId);
  await redis.del(HISTORY_PREFIX + snippetId);
  return true;
};

const verifyPassword = async (snippet, password) => {
  if (!snippet.hasPassword) return true;
  if (!snippet.passwordHash || !password) return false;
  return bcrypt.compare(password, snippet.passwordHash);
};

const setReadOnly = async (snippetId, isReadOnly, userId) => {
  const snippet = await getSnippet(snippetId);
  if (!snippet) return null;
  if (snippet.ownerId !== userId) {
    throw new Error('Only owner can change permissions');
  }

  return updateSnippet(snippetId, { isReadOnly }, userId, snippet.ownerName);
};

const updateUserStats = async (snippetId, userId, userName, linesEdited) => {
  const snippet = await getSnippet(snippetId);
  if (!snippet) return;

  if (!snippet.userStats[userId]) {
    snippet.userStats[userId] = {
      name: userName,
      linesEdited: 0,
      lastActive: Date.now()
    };
  }

  snippet.userStats[userId].linesEdited += linesEdited;
  snippet.userStats[userId].lastActive = Date.now();

  await redis.set(SNIPPET_PREFIX + snippetId, JSON.stringify(snippet));
};

module.exports = {
  createSnippet,
  getSnippet,
  updateSnippet,
  saveVersion,
  getHistory,
  getVersion,
  revertToVersion,
  deleteSnippet,
  verifyPassword,
  setReadOnly,
  updateUserStats
};
