const express = require('express');
const router = express.Router();
const {
  createSnippet,
  getSnippet,
  getHistory,
  getVersion
} = require('../services/snippetService');
const { executeCode } = require('../services/executionService');
const { compareVersions } = require('../utils/diffUtils');
const { getSupportedLanguages } = require('../utils/languageConfig');
const { generateUserId } = require('../utils/generateId');

router.get('/languages', (req, res) => {
  res.json({
    languages: getSupportedLanguages()
  });
});

router.post('/snippets', async (req, res) => {
  try {
    const {
      language,
      code,
      password,
      expiresIn,
      isReadOnly,
      ownerName
    } = req.body;

    const ownerId = generateUserId();

    let expiresAt = null;
    if (expiresIn) {
      expiresAt = Date.now() + parseInt(expiresIn) * 1000;
    }

    const snippet = await createSnippet({
      language,
      code,
      password,
      expiresAt,
      isReadOnly,
      ownerId,
      ownerName
    });

    res.status(201).json({
      snippet: {
        id: snippet.id,
        language: snippet.language,
        code: snippet.code,
        createdAt: snippet.createdAt,
        expiresAt: snippet.expiresAt,
        isReadOnly: snippet.isReadOnly,
        hasPassword: snippet.hasPassword,
        ownerName: snippet.ownerName
      },
      ownerId
    });
  } catch (err) {
    console.error('Error creating snippet:', err);
    res.status(400).json({ error: err.message });
  }
});

router.get('/snippets/:id', async (req, res) => {
  try {
    const snippet = await getSnippet(req.params.id);
    
    if (!snippet) {
      return res.status(404).json({ error: 'Snippet not found' });
    }

    res.json({
      snippet: {
        id: snippet.id,
        language: snippet.language,
        createdAt: snippet.createdAt,
        updatedAt: snippet.updatedAt,
        expiresAt: snippet.expiresAt,
        isReadOnly: snippet.isReadOnly,
        hasPassword: snippet.hasPassword,
        ownerName: snippet.ownerName,
        userStats: snippet.userStats
      }
    });
  } catch (err) {
    console.error('Error getting snippet:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/execute', async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }

    const result = await executeCode(code, language);

    res.json(result);
  } catch (err) {
    console.error('Error executing code:', err);
    res.status(500).json({ error: 'Failed to execute code' });
  }
});

router.get('/snippets/:id/history', async (req, res) => {
  try {
    const history = await getHistory(req.params.id);
    res.json({ history });
  } catch (err) {
    console.error('Error getting history:', err);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

router.get('/snippets/:id/diff', async (req, res) => {
  try {
    const { version1, version2 } = req.query;
    
    if (!version1 || !version2) {
      return res.status(400).json({ error: 'version1 and version2 are required' });
    }

    const v1 = await getVersion(req.params.id, version1);
    const v2 = await getVersion(req.params.id, version2);

    if (!v1 || !v2) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const diffResult = compareVersions(v1, v2);
    res.json(diffResult);
  } catch (err) {
    console.error('Error computing diff:', err);
    res.status(500).json({ error: 'Failed to compute diff' });
  }
});

router.post('/export/gist', async (req, res) => {
  try {
    const { code, language, description } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }

    const { getLanguageConfig } = require('../utils/languageConfig');
    const langConfig = getLanguageConfig(language);

    const files = {};
    files[`main.${langConfig.extension}`] = {
      content: code
    };

    res.json({
      success: true,
      message: 'Gist export simulation',
      gistUrl: `https://gist.github.com/example/${generateUserId()}`,
      files
    });
  } catch (err) {
    console.error('Error exporting gist:', err);
    res.status(500).json({ error: 'Failed to export gist' });
  }
});

module.exports = router;
