import OpenAI from 'openai';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data/notemind.db');

const client = new OpenAI({
  baseURL: process.env.QWEN_API_BASE_URL || 'http://localhost:11434/v1',
  apiKey: process.env.QWEN_API_KEY || 'ollama',
});

const model = process.env.QWEN_MODEL || 'qwen3';

/** Log AI usage to the database */
function logAiUsage(userId, action, modelName, usage, latencyMs, success = true, errorMessage = null) {
  try {
    const db = new Database(DB_PATH);
    db.prepare(`INSERT INTO ai_usage_logs (user_id, action, model, prompt_tokens, completion_tokens, total_tokens, latency_ms, success, error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      userId || null, action, modelName,
      usage?.prompt_tokens || 0, usage?.completion_tokens || 0, usage?.total_tokens || 0,
      latencyMs, success ? 1 : 0, errorMessage
    );
    db.close();
  } catch { /* silent */ }
}

/**
 * Call Qwen3 with a system prompt and user message
 */
export async function callQwen(systemPrompt, userMessage, options = {}) {
  const { temperature = 0.7, maxTokens = 4096, userId = null, action = 'unknown' } = options;
  const start = Date.now();

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature,
      max_tokens: maxTokens,
    });

    logAiUsage(userId, action, model, response.usage, Date.now() - start, true);
    return response.choices[0].message.content;
  } catch (error) {
    logAiUsage(userId, action, model, null, Date.now() - start, false, error.message);
    console.error('Qwen API error:', error.message);
    throw new Error(`AI processing failed: ${error.message}`);
  }
}

/**
 * Call Qwen3 with full message history (for chat)
 */
export async function callQwenChat(systemPrompt, messages, options = {}) {
  const { temperature = 0.7, maxTokens = 2048, userId = null, action = 'chat' } = options;
  const start = Date.now();

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature,
      max_tokens: maxTokens,
    });

    logAiUsage(userId, action, model, response.usage, Date.now() - start, true);
    return response.choices[0].message.content;
  } catch (error) {
    logAiUsage(userId, action, model, null, Date.now() - start, false, error.message);
    console.error('Qwen Chat API error:', error.message);
    throw new Error(`AI chat failed: ${error.message}`);
  }
}

export default client;
