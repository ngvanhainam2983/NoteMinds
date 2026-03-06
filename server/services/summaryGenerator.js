import { callQwen } from './qwenClient.js';
import { sanitizeDocumentText, sanitizeFileName } from './promptGuard.js';
import { buildSystemPrompt, normalizeLanguage } from './promptBuilder.js';

/**
 * Generate a markdown summary from document text
 */
export async function generateSummary(text, fileName, options = {}) {
    // Truncate text if it's exceptionally long to respect context window and save tokens
    const maxChars = 20000;
    const truncatedText = text.length > maxChars
        ? text.substring(0, maxChars) + '\n\n[... phần còn lại đã được lược bỏ ...]'
        : text;

    const cleanDoc = sanitizeDocumentText(truncatedText);
    const cleanName = sanitizeFileName(fileName);
    const language = normalizeLanguage(options.language, options.acceptLanguage);
    const systemPrompt = buildSystemPrompt('summary', language);
    const userMessage = language === 'vi'
        ? `Tên tài liệu: "${cleanName}"\n\n<document>\n${cleanDoc}\n</document>\n\nHãy tóm tắt tài liệu này.`
        : `Document name: "${cleanName}"\n\n<document>\n${cleanDoc}\n</document>\n\nPlease summarize this document.`;

    const response = await callQwen(systemPrompt, userMessage, {
        temperature: 0.5,
        maxTokens: 3000,
        userId: options.userId,
        action: 'generate_summary'
    });

    return response;
}
