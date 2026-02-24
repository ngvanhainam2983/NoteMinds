import { callQwen } from './qwenClient.js';
import { parseAIJson } from './jsonParser.js';

const MINDMAP_SYSTEM_PROMPT = `Bạn là trợ lý AI chuyên phân tích tài liệu học tập và tạo sơ đồ tư duy (mindmap).

NHIỆM VỤ: Phân tích nội dung tài liệu và trả về một cấu trúc JSON đại diện cho sơ đồ tư duy.

QUY TẮC:
1. Xác định chủ đề chính làm node gốc (root)
2. Phân loại thành các nhánh chính (tối đa 6-8 nhánh)
3. Mỗi nhánh có thể có các nhánh con (tối đa 4-5 cấp)
4. Mỗi node chứa từ khóa ngắn gọn, súc tích
5. Ưu tiên: Định nghĩa > Khái niệm chính > Mối liên hệ > Ví dụ

BẮT BUỘC trả về JSON hợp lệ theo đúng format sau, KHÔNG thêm text hay markdown nào khác:
{
  "title": "Tên chủ đề chính",
  "nodes": [
    {
      "id": "1",
      "label": "Chủ đề chính",
      "children": [
        {
          "id": "1-1",
          "label": "Nhánh 1",
          "children": [
            { "id": "1-1-1", "label": "Chi tiết 1" },
            { "id": "1-1-2", "label": "Chi tiết 2" }
          ]
        },
        {
          "id": "1-2",
          "label": "Nhánh 2",
          "children": []
        }
      ]
    }
  ]
}`;

/**
 * Generate mindmap structure from document text
 */
export async function generateMindmap(text, fileName) {
  // Truncate text if too long (keep within context window)
  const maxChars = 15000;
  const truncatedText = text.length > maxChars
    ? text.substring(0, maxChars) + '\n\n[... nội dung đã được cắt ngắn ...]'
    : text;

  const userMessage = `Tên tài liệu: "${fileName}"

NỘI DUNG TÀI LIỆU:
${truncatedText}

Hãy phân tích tài liệu trên và tạo sơ đồ tư duy dưới dạng JSON.`;

  const response = await callQwen(MINDMAP_SYSTEM_PROMPT, userMessage, {
    temperature: 0.3,
    maxTokens: 4096
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
          label: 'Lỗi phân tích - Vui lòng thử lại',
          children: []
        }]
      }]
    };
  }
}
