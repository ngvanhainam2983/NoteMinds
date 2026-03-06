import { callQwen } from './qwenClient.js';
import { parseAIJson } from './jsonParser.js';
import { sanitizeDocumentText, sanitizeFileName } from './promptGuard.js';
import { buildSystemPrompt, normalizeLanguage } from './promptBuilder.js';

/**
 * Generate flashcards from document text
 */
export async function generateFlashcards(text, fileName, options = {}) {
  const maxChars = 15000;
  const truncatedText = text.length > maxChars
    ? text.substring(0, maxChars) + '\n\n[... nội dung đã được cắt ngắn ...]'
    : text;

  const cleanDoc = sanitizeDocumentText(truncatedText);
  const cleanName = sanitizeFileName(fileName);
  const language = normalizeLanguage(options.language, options.acceptLanguage);
  const systemPrompt = buildSystemPrompt('flashcard', language);
  const userMessage = language === 'vi'
    ? `Tên tài liệu: "${cleanName}"

<document>
${cleanDoc}
</document>

Hãy tạo bộ flashcard từ nội dung trên dưới dạng JSON.`
    : `Document name: "${cleanName}"

<document>
${cleanDoc}
</document>

Please generate flashcards from the content above in JSON format.`;

  const response = await callQwen(systemPrompt, userMessage, {
    temperature: 0.4,
    maxTokens: 4096,
    userId: options.userId,
    action: options.action || 'generate_flashcards'
  });

  try {
    const flashcards = parseAIJson(response);
    return flashcards;
  } catch (error) {
    console.error('Failed to parse flashcard JSON:', error.message);
    console.error('Raw response:', response);
    return {
      title: fileName,
      cards: [{
        id: 1,
        question: language === 'vi' ? 'Lỗi phân tích - Vui lòng thử lại' : 'Parsing error - Please try again',
        answer: language === 'vi'
          ? 'Hệ thống không thể tạo flashcard. Hãy thử tải lại tài liệu.'
          : 'The system could not generate flashcards. Please try uploading again.',
        tag: 'Error'
      }]
    };
  }
}

/**
 * Convert flashcards to Anki-compatible format (TSV)
 */
export function exportToAnki(flashcards) {
  const lines = flashcards.cards.map(card =>
    `${card.question}\t${card.answer}\t${card.tag || ''}`
  );
  return lines.join('\n');
}

/**
 * Convert flashcards to Quizlet-compatible format
 */
export function exportToQuizlet(flashcards) {
  const lines = flashcards.cards.map(card =>
    `${card.question}\t${card.answer}`
  );
  return lines.join('\n');
}
