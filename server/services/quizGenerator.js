import { callQwen } from './qwenClient.js';
import { parseAIJson } from './jsonParser.js';
import { sanitizeDocumentText, sanitizeFileName } from './promptGuard.js';
import { buildSystemPrompt, normalizeLanguage } from './promptBuilder.js';

/**
 * Generate a multiple choice quiz from document text
 */
export async function generateQuiz(text, fileName, options = {}) {
    const maxChars = 15000;
    const truncatedText = text.length > maxChars
        ? text.substring(0, maxChars) + '\\n\\n[... nội dung đã được cắt ngắn ...]'
        : text;

    const cleanDoc = sanitizeDocumentText(truncatedText);
    const cleanName = sanitizeFileName(fileName);
    const language = normalizeLanguage(options.language, options.acceptLanguage);
    const systemPrompt = buildSystemPrompt('quiz', language);
    const userMessage = language === 'vi'
        ? `Tên tài liệu: "${cleanName}"\n\n<document>\n${cleanDoc}\n</document>\n\nHãy tạo bài trắc nghiệm 10 câu từ nội dung trên dưới dạng JSON.`
        : `Document name: "${cleanName}"\n\n<document>\n${cleanDoc}\n</document>\n\nPlease generate a 10-question multiple-choice quiz from the content above in JSON format.`;

    const response = await callQwen(systemPrompt, userMessage, {
        temperature: 0.5,
        maxTokens: 4096,
        userId: options.userId,
        action: options.action || 'generate_quiz'
    });

    try {
        const quiz = parseAIJson(response);
        return quiz;
    } catch (error) {
        console.error('Failed to parse quiz JSON:', error.message);
        console.error('Raw response:', response);
        return {
            title: language === 'vi' ? `Kiểm tra: ${fileName}` : `Quiz: ${fileName}`,
            questions: [{
                id: 1,
                question: language === 'vi' ? 'Lỗi phân tích - Vui lòng thử lại' : 'Parsing error - Please try again',
                options: language === 'vi'
                    ? ['Lỗi A', 'Lỗi B', 'Lỗi C', 'Lỗi D']
                    : ['Error A', 'Error B', 'Error C', 'Error D'],
                correctAnswerIndex: 0,
                explanation: language === 'vi'
                    ? 'Hệ thống không thể tạo bài kiểm tra. Hãy thử tải lại tài liệu.'
                    : 'The system could not generate the quiz. Please try uploading again.'
            }]
        };
    }
}
