const https = require('https');
const http = require('http');
const { URL } = require('url');
const { getConfig } = require('./config');

class AIService {
  constructor() {
  }

  _getConfig() {
    return getConfig();
  }

  isConfigured() {
    const aiConfig = this._getConfig().ai || {};
    return !!(aiConfig.apiKey && aiConfig.apiKey.trim() !== '');
  }

  async chatCompletion(messages, options = {}) {
    const config = this._getConfig();
    const aiConfig = { ...config.ai, ...options };

    if (!aiConfig.apiKey || aiConfig.apiKey.trim() === '') {
      throw new Error(
        'AI API key not configured. Set it with: aicg config --set ai.apiKey=YOUR_KEY\n' +
        'For OpenAI: aicg config --set ai.provider=openai\n' +
        'For local LLM: aicg config --set ai.baseUrl=http://localhost:11434/v1/chat/completions\n' +
        'Falling back to rule-based generation.'
      );
    }

    return this.apiCompletion(messages, aiConfig);
  }

  async apiCompletion(messages, aiConfig) {
    const maxRetries = 2;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this._makeRequest(messages, aiConfig);
      } catch (error) {
        lastError = error;
        if (error.message.includes('timeout') && attempt < maxRetries) {
          const delay = 1000 * (attempt + 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        if (error.message.includes('429') && attempt < maxRetries) {
          const delay = 2000 * (attempt + 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        break;
      }
    }

    throw lastError;
  }

  _makeRequest(messages, aiConfig) {
    return new Promise((resolve, reject) => {
      let baseUrl = aiConfig.baseUrl || 'https://api.openai.com/v1/chat/completions';

      if (aiConfig.provider === 'ollama' && !aiConfig.baseUrl) {
        baseUrl = 'http://127.0.0.1:11434/v1/chat/completions';
      }

      const url = new URL(baseUrl);
      const client = url.protocol === 'https:' ? https : http;

      const requestBody = {
        model: aiConfig.model || 'gpt-4o-mini',
        messages: messages,
        temperature: aiConfig.temperature !== undefined ? aiConfig.temperature : 0.7,
        max_tokens: aiConfig.maxTokens || 2048
      };

      const postData = JSON.stringify(requestBody);

      const reqOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: aiConfig.timeout || 60000
      };

      if (aiConfig.apiKey && aiConfig.apiKey !== 'ollama') {
        reqOptions.headers['Authorization'] = `Bearer ${aiConfig.apiKey}`;
      }

      const req = client.request(reqOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);

            if (res.statusCode === 401) {
              reject(new Error('AI API Error: Invalid API key. Please check your configuration.'));
              return;
            }

            if (res.statusCode === 429) {
              reject(new Error('AI API Error: Rate limit exceeded (429). Will retry...'));
              return;
            }

            if (res.statusCode && res.statusCode >= 500) {
              reject(new Error(`AI API Error: Server error (${res.statusCode}). Will retry...`));
              return;
            }

            if (result.error) {
              reject(new Error(`AI API Error: ${result.error.message || JSON.stringify(result.error)}`));
              return;
            }

            if (result.choices && result.choices[0] && result.choices[0].message) {
              resolve({
                content: result.choices[0].message.content,
                usage: result.usage,
                model: result.model
              });
              return;
            }

            reject(new Error('Unexpected API response format: missing choices[0].message'));
          } catch (e) {
            reject(new Error(`Failed to parse AI response: ${e.message}. Response: ${data.substring(0, 200)}`));
          }
        });
      });

      req.on('error', (e) => reject(new Error(`AI API request failed: ${e.message}`)));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('AI API request timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  extractJSON(text) {
    if (!text || typeof text !== 'string') return null;

    let content = text.trim();

    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*\n?/, '').replace(/\n?\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*\n?/, '').replace(/\n?\s*```$/, '');
    }

    content = content.trim();

    try {
      return JSON.parse(content);
    } catch (e) {
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
      }
    }

    const arrayMatch = content.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (e3) {
      }
    }

    return null;
  }
}

const aiService = new AIService();
module.exports = aiService;
