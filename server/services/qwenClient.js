import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const client = new OpenAI({
  baseURL: process.env.QWEN_API_BASE_URL || 'http://localhost:11434/v1',
  apiKey: process.env.QWEN_API_KEY || 'ollama',
});

const model = process.env.QWEN_MODEL || 'qwen3';

/**
 * Call Qwen3 with a system prompt and user message
 */
export async function callQwen(systemPrompt, userMessage, options = {}) {
  const { temperature = 0.7, maxTokens = 4096 } = options;

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

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Qwen API error:', error.message);
    throw new Error(`AI processing failed: ${error.message}`);
  }
}

/**
 * Call Qwen3 with full message history (for chat)
 */
export async function callQwenChat(systemPrompt, messages, options = {}) {
  const { temperature = 0.7, maxTokens = 2048 } = options;

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

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Qwen Chat API error:', error.message);
    throw new Error(`AI chat failed: ${error.message}`);
  }
}

export default client;
