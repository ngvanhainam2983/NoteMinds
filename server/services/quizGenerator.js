import { callQwen } from './qwenClient.js';
import { parseAIJson } from './jsonParser.js';

const QUIZ_SYSTEM_PROMPT = `Bạn là một giáo viên chuyên thiết kế bài kiểm tra trắc nghiệm từ tài liệu học tập.

NHIỆM VỤ: Đọc tài liệu và tạo một bài kiểm tra trắc nghiệm (Multiple Choice Quiz) gồm 10 câu hỏi quan trọng nhất.

QUY TẮC:
1. Mỗi câu hỏi phải có đúng 4 lựa chọn (A, B, C, D).
2. Chỉ có 1 đáp án đúng duy nhất.
3. Câu hỏi phải kiểm tra sự hiểu biết, không chỉ ghi nhớ máy móc.
4. Cung cấp lời giải thích ngắn gọn tại sao đáp án đó đúng.
5. Ngôn ngữ: Tiếng Việt.

BẮT BUỘC trả về JSON hợp lệ theo đúng format sau, KHÔNG thêm text hay markdown nào khác:
{
  "title": "Bài Kiểm Tra 15 Phút",
  "questions": [
    {
      "id": 1,
      "question": "Nội dung câu hỏi?",
      "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
      "correctAnswerIndex": 0, // Vị trí của đáp án đúng trong mảng options (0, 1, 2, hoặc 3)
      "explanation": "Giải thích ngắn gọn tại sao A đúng"
    }
  ]
}`;

/**
 * Generate a multiple choice quiz from document text
 */
export async function generateQuiz(text, fileName) {
    const maxChars = 15000;
    const truncatedText = text.length > maxChars
        ? text.substring(0, maxChars) + '\\n\\n[... nội dung đã được cắt ngắn ...]'
        : text;

    const userMessage = `Tên tài liệu: "${fileName}"\\n\\nNỘI DUNG TÀI LIỆU:\\n${truncatedText}\\n\\nHãy tạo bài trắc nghiệm 10 câu từ nội dung trên dưới dạng JSON.`;

    const response = await callQwen(QUIZ_SYSTEM_PROMPT, userMessage, {
        temperature: 0.5,
        maxTokens: 4096
    });

    try {
        const quiz = parseAIJson(response);
        return quiz;
    } catch (error) {
        console.error('Failed to parse quiz JSON:', error.message);
        console.error('Raw response:', response);
        return {
            title: `Kiểm tra: ${fileName}`,
            questions: [{
                id: 1,
                question: 'Lỗi phân tích - Vui lòng thử lại',
                options: ['Lỗi A', 'Lỗi B', 'Lỗi C', 'Lỗi D'],
                correctAnswerIndex: 0,
                explanation: 'Hệ thống không thể tạo bài kiểm tra. Hãy thử tải lại tài liệu.'
            }]
        };
    }
}
