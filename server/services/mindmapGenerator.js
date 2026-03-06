import { callQwen } from './qwenClient.js';
import { parseAIJson } from './jsonParser.js';
import { sanitizeDocumentText, sanitizeFileName } from './promptGuard.js';
import { buildSystemPrompt, normalizeLanguage } from './promptBuilder.js';

/**
 * Generate mindmap structure from document text
 */
export async function generateMindmap(text, fileName, options = {}) {
  // Truncate text if too long (keep within context window)
  const maxChars = 15000;
  const truncatedText = text.length > maxChars
    ? text.substring(0, maxChars) + '\n\n[... nội dung đã được cắt ngắn ...]'
    : text;

  const cleanDoc = sanitizeDocumentText(truncatedText);
  const cleanName = sanitizeFileName(fileName);
  const language = normalizeLanguage(options.language, options.acceptLanguage);
  const systemPrompt = buildSystemPrompt('mindmap', language);
  const userMessage = language === 'vi'
    ? `Tên tài liệu: "${cleanName}"

<document>
${cleanDoc}
</document>

Hãy phân tích tài liệu trên và tạo sơ đồ tư duy dưới dạng JSON.`
    : `Document name: "${cleanName}"

<document>
${cleanDoc}
</document>

Please analyze the document and generate a mind map in JSON format.`;

  const response = await callQwen(systemPrompt, userMessage, {
    temperature: 0.3,
    maxTokens: 4096,
    userId: options.userId,
    action: options.action || 'generate_mindmap'
  });

  // Parse JSON from response
  try {
    const mindmap = parseAIJson(response);
    return mindmap;
  } catch (error) {
    console.error('Failed to parse mindmap JSON:', error.message);
    console.error('Raw response:', response);
    // Return a fallback mindmap
    return {
      title: fileName,
      nodes: [{
        id: '1',
        label: fileName.replace(/\.[^.]+$/, ''),
        children: [{
          id: '1-1',
          label: language === 'vi' ? 'Lỗi phân tích - Vui lòng thử lại' : 'Parsing error - Please try again',
          children: []
        }]
      }]
    };
  }
}
