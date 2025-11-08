import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Khởi tạo OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface QuestionContext {
  questionId: number;
  question: string;
  options: Array<{
    answerId: number;
    text: string;
    isCorrect: boolean;
  }>;
  detailAnswer?: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check if request has form data (with image) or JSON
    const contentType = request.headers.get('content-type') || '';
    let userMessage: string;
    let questions: any;
    let categoryTitle: string;
    let subCategoryTitle: string;
    let conversationHistory: any;
    let imageFile: File | null = null;
    let imageBase64: string | null = null;

    // Try to parse as FormData first (for image uploads)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      userMessage = (formData.get('userMessage') as string) || '';
      const questionsStr = formData.get('questions') as string;
      questions = questionsStr ? JSON.parse(questionsStr) : [];
      categoryTitle = (formData.get('categoryTitle') as string) || '';
      subCategoryTitle = (formData.get('subCategoryTitle') as string) || '';
      const historyStr = formData.get('conversationHistory') as string;
      conversationHistory = historyStr ? JSON.parse(historyStr) : [];
      
      const image = formData.get('image') as File | null;
      if (image && image.size > 0) {
        imageFile = image;
        // Convert image to base64
        const arrayBuffer = await image.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        imageBase64 = `data:${image.type};base64,${buffer.toString('base64')}`;
      }
    } else {
      // Handle JSON (backward compatibility)
      const body = await request.json();
      userMessage = body.userMessage || '';
      questions = body.questions || [];
      categoryTitle = body.categoryTitle || '';
      subCategoryTitle = body.subCategoryTitle || '';
      conversationHistory = body.conversationHistory || [];
    }

    // Validate input
    if ((!userMessage && !imageFile) || !questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'Thiếu thông tin: userMessage hoặc image và questions là bắt buộc' },
        { status: 400 }
      );
    }

    // Kiểm tra API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY chưa được cấu hình' },
        { status: 500 }
      );
    }

    // Xây dựng context từ danh sách câu hỏi
    const questionsContext = questions.map((q: QuestionContext) => {
      const optionsText = q.options
        ?.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx); // A, B, C, D...
          const correctMark = opt.isCorrect ? ' ✓' : '';
          return `${letter}. ${opt.text}${correctMark}`;
        })
        .join('\n') || '';

      return `Câu hỏi ID: ${q.questionId}
Câu hỏi: ${q.question}
Các đáp án:
${optionsText}
${q.detailAnswer ? `Giải thích: ${q.detailAnswer}` : ''}
---`;
    }).join('\n\n');

    // System instruction cho AI về lĩnh vực y khoa
    const systemInstruction = `Bạn là một trợ lý AI chuyên về lĩnh vực y khoa, có nhiệm vụ giải đáp các câu hỏi liên quan đến kiến thức y học.

Bạn được cung cấp danh sách các câu hỏi trắc nghiệm y khoa bao gồm:
- ID câu hỏi
- Nội dung câu hỏi
- Các đáp án (đáp án đúng được đánh dấu ✓)
- Giải thích (nếu có)

Nhiệm vụ của bạn:
1. Sử dụng thông tin từ các câu hỏi được cung cấp để trả lời câu hỏi của người dùng
2. Giải thích rõ ràng, chính xác dựa trên kiến thức y khoa
3. Tham khảo các câu hỏi liên quan trong danh sách để đưa ra câu trả lời phù hợp
4. Nếu câu hỏi của người dùng không liên quan đến các câu hỏi được cung cấp, hãy trả lời dựa trên kiến thức y khoa chung của bạn
5. Trả lời bằng tiếng Việt, ngắn gọn nhưng đầy đủ thông tin

Môn học: ${categoryTitle || 'Y khoa'}
Đề thi: ${subCategoryTitle || 'Đề thi thử'}`;

    // Xây dựng messages array với conversation history
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: systemInstruction,
      },
    ];

    // Thêm context về danh sách câu hỏi vào đầu conversation (chỉ một lần)
    // Nếu không có conversation history, thêm context về questions
    if (!conversationHistory || conversationHistory.length === 0) {
      messages.push({
        role: 'user',
        content: `Dưới đây là danh sách các câu hỏi trong đề thi:

${questionsContext}

Bạn có thể sử dụng thông tin này để trả lời các câu hỏi của người dùng.`,
      });
    }

    // Thêm conversation history (nếu có)
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      // Validate và thêm các message từ conversation history
      conversationHistory.forEach((msg: ConversationMessage) => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      });
    }

    // Thêm câu hỏi hiện tại của user (có thể kèm ảnh)
    if (imageBase64) {
      // Nếu có ảnh, gửi cả text và ảnh cho OpenAI Vision API
      const userContent: any[] = [];
      
      if (userMessage) {
        userContent.push({
          type: 'text',
          text: userMessage,
        });
      }
      
      userContent.push({
        type: 'image_url',
        image_url: {
          url: imageBase64,
        },
      });
      
      messages.push({
        role: 'user',
        content: userContent,
      });
    } else {
      // Chỉ có text
      messages.push({
        role: 'user',
        content: userMessage,
      });
    }

    // Gọi OpenAI API với streaming
    // Sử dụng gpt-4o hoặc gpt-4o-mini nếu có ảnh (Vision API), ngược lại dùng gpt-4o-mini
    const model = imageBase64 ? 'gpt-4o' : 'gpt-4o-mini';
    
    const stream = await openai.chat.completions.create({
      model: model,
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    // Tạo ReadableStream để stream response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              // Gửi data theo format Server-Sent Events
              const data = `data: ${JSON.stringify({ content })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          // Gửi signal kết thúc
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error: any) {
          // Gửi lỗi nếu có
          const errorData = `data: ${JSON.stringify({ error: error.message || 'Lỗi khi xử lý stream' })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    // Trả về stream response với headers phù hợp
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error in star-chat API:', error);
    
    // Trả về lỗi dưới dạng stream nếu có thể
    const encoder = new TextEncoder();
    const errorStream = new ReadableStream({
      start(controller) {
        const errorData = `data: ${JSON.stringify({ error: error.message || 'Lỗi khi xử lý câu hỏi' })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      },
    });

    return new Response(errorStream, {
      status: 500,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
}

