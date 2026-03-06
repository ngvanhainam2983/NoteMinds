import { callQwen } from './qwenClient.js';
import { parseAIJson } from './jsonParser.js';
import { sanitizeDocumentText, sanitizeFileName } from './promptGuard.js';
import { buildSystemPrompt, normalizeLanguage } from './promptBuilder.js';

/**
 * Generate a learning path from document text
 */
export async function generateLearningPath(text, fileName, options = {}) {
    const maxChars = 20000;
    const truncatedText = text.length > maxChars
        ? text.substring(0, maxChars) + '\n\n[... nội dung đã được cắt ngắn ...]'
        : text;

    const cleanDoc = sanitizeDocumentText(truncatedText);
    const cleanName = sanitizeFileName(fileName);
    const language = normalizeLanguage(options.language, options.acceptLanguage);
    const systemPrompt = buildSystemPrompt('learningPath', language);
    const userMessage = language === 'vi'
        ? `Tên tài liệu: "${cleanName}"\n\n<document>\n${cleanDoc}\n</document>\n\nThiết kế lộ trình học tập tối ưu từ nội dung trên dạng JSON.`
        : `Document name: "${cleanName}"\n\n<document>\n${cleanDoc}\n</document>\n\nDesign an optimized learning path from the content above in JSON format.`;

    const response = await callQwen(systemPrompt, userMessage, {
        temperature: 0.6,
        maxTokens: 4096,
        userId: options.userId,
        action: 'generate_learning_path'
    });

    try {
        const pathData = parseAIJson(response);
        // Ensure steps have IDs if AI missed it
        if (pathData && Array.isArray(pathData.steps)) {
            pathData.steps = pathData.steps.map((step, index) => ({
                ...step,
                id: step.id || `step_${index + 1}`
            }));
        }
        return pathData;
    } catch (error) {
        console.error('Failed to parse learning path JSON:', error.message);
        console.error('Raw response:', response);
        return {
            name: language === 'vi' ? `Lộ trình học: ${fileName}` : `Learning Path: ${fileName}`,
            description: language === 'vi'
                ? 'Chúng tôi không thể tự động tạo lộ trình phức tạp. Hãy sử dụng lộ trình mặc định này.'
                : 'We could not automatically build a complex learning path. Please use this default path.',
            estimated_hours: 1.0,
            steps: language === 'vi'
                ? [
                    {
                        id: "step_1",
                        title: "Khởi động: Đọc hiểu Mindmap",
                        description: "Xem sơ đồ tư duy để có cái nhìn tổng quan về tài liệu",
                        estimated_minutes: 15,
                        recommended_activities: ["read_summary"]
                    },
                    {
                        id: "step_2",
                        title: "Thực hành: Ghi nhớ Flashcards",
                        description: "Học qua các thẻ ghi nhớ để khắc sâu kiến thức",
                        estimated_minutes: 20,
                        recommended_activities: ["flashcards"]
                    },
                    {
                        id: "step_3",
                        title: "Kiểm tra: Làm bài Quiz",
                        description: "Đánh giá mức độ hiểu bài qua bài kiểm tra trắc nghiệm",
                        estimated_minutes: 15,
                        recommended_activities: ["quiz"]
                    }
                ]
                : [
                    {
                        id: "step_1",
                        title: "Start: Review the Mind Map",
                        description: "Read the mind map to get a high-level view of the document",
                        estimated_minutes: 15,
                        recommended_activities: ["read_summary"]
                    },
                    {
                        id: "step_2",
                        title: "Practice: Memorize with Flashcards",
                        description: "Use flashcards to reinforce key concepts",
                        estimated_minutes: 20,
                        recommended_activities: ["flashcards"]
                    },
                    {
                        id: "step_3",
                        title: "Check: Take the Quiz",
                        description: "Evaluate your understanding with a multiple-choice quiz",
                        estimated_minutes: 15,
                        recommended_activities: ["quiz"]
                    }
                ]
        };
    }
}
