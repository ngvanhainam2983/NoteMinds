import { callQwenChat } from './qwenClient.js';

const CHAT_SYSTEM_PROMPT = `Bạn là trợ lý học tập AI thông minh tên NoteMinds. Bạn được cung cấp nội dung một tài liệu học tập bên dưới.

NHIỆM VỤ:
- Trả lời câu hỏi của sinh viên dựa trên nội dung tài liệu
- Giải thích các khái niệm phức tạp một cách dễ hiểu
- Đưa ra ví dụ minh họa khi cần thiết
- Nếu câu hỏi nằm ngoài phạm vi tài liệu, hãy nói rõ

PHONG CÁCH:
- Thân thiện, dễ hiểu, như một người bạn học giỏi
- Sử dụng tiếng Việt
- Trả lời ngắn gọn nhưng đầy đủ
- Dùng bullet points khi liệt kê

NỘI DUNG TÀI LIỆU:
---
{DOCUMENT_TEXT}
---`;

/**
 * Chat with document using Qwen3
 */
export async function chatWithDocument(documentText, userMessage, history = []) {
  // Truncate document text to fit context window
  const maxDocChars = 12000;
  const truncatedDoc = documentText.length > maxDocChars
    ? documentText.substring(0, maxDocChars) + '\n\n[... nội dung tiếp theo đã được lược bớt ...]'
    : documentText;

  const systemPrompt = CHAT_SYSTEM_PROMPT.replace('{DOCUMENT_TEXT}', truncatedDoc);

  // Build message history
  const messages = [
    ...history.slice(-10), // Keep last 10 messages for context
    { role: 'user', content: userMessage }
  ];

  const response = await callQwenChat(systemPrompt, messages, {
    temperature: 0.7,
    maxTokens: 2048
  });

  return response;
}
