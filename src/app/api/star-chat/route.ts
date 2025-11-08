import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { checkRateLimit, getRemainingRequests } from '@/lib/rateLimit';

// Khởi tạo OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Constants for validation
const MAX_MESSAGE_LENGTH = 5000; // characters
const MAX_CONVERSATION_HISTORY_LENGTH = 20; // messages
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_QUESTIONS_COUNT = 100;

// Rate limiting: 10 requests per minute per user
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

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

/**
 * Sanitize user input to prevent prompt injection
 */
function sanitizeInput(input: string): string {
  // Remove potential prompt injection patterns
  // This is a basic sanitization - consider more sophisticated approaches
  return input
    .replace(/[\r\n]+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH); // Limit length
}

/**
 * Get user identifier from request (token or IP)
 */
function getUserIdentifier(request: NextRequest): string {
  // Try to get token from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Use token as identifier (or extract user ID from token if JWT)
    return `token:${token.substring(0, 20)}`; // Use first 20 chars as identifier
  }
  
  // Fallback to IP address
  const ip = request.headers.get('x-forwarded-for') || 
              request.headers.get('x-real-ip') || 
              'unknown';
  return `ip:${ip}`;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const encoder = new TextEncoder();
      const errorStream = new ReadableStream({
        start(controller) {
          const errorData = `data: ${JSON.stringify({ error: 'Vui lòng đăng nhập để sử dụng tính năng này' })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        },
      });
      return new Response(errorStream, {
        status: 401,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // 2. Rate limiting
    const userIdentifier = getUserIdentifier(request);
    if (!checkRateLimit(userIdentifier, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS)) {
      const remaining = getRemainingRequests(userIdentifier, RATE_LIMIT_MAX_REQUESTS);
      const encoder = new TextEncoder();
      const errorStream = new ReadableStream({
        start(controller) {
          const errorData = `data: ${JSON.stringify({ error: `Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.` })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        },
      });
      return new Response(errorStream, {
        status: 429,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Retry-After': '60',
        },
      });
    }

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
      try {
        questions = questionsStr ? JSON.parse(questionsStr) : [];
      } catch (e) {
        throw new Error('Invalid questions format');
      }
      categoryTitle = (formData.get('categoryTitle') as string) || '';
      subCategoryTitle = (formData.get('subCategoryTitle') as string) || '';
      const historyStr = formData.get('conversationHistory') as string;
      try {
        conversationHistory = historyStr ? JSON.parse(historyStr) : [];
      } catch (e) {
        conversationHistory = [];
      }
      
      const image = formData.get('image') as File | null;
      if (image && image.size > 0) {
        // Validate image size
        if (image.size > MAX_IMAGE_SIZE) {
          throw new Error(`Kích thước ảnh không được vượt quá ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
        }
        // Validate image type
        if (!image.type.startsWith('image/')) {
          throw new Error('File phải là ảnh');
        }
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

    // 3. Input validation
    // Validate message length
    if (userMessage && userMessage.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Tin nhắn không được vượt quá ${MAX_MESSAGE_LENGTH} ký tự`);
    }

    // Validate questions
    if (!questions || !Array.isArray(questions)) {
      throw new Error('Questions phải là một mảng');
    }
    if (questions.length > MAX_QUESTIONS_COUNT) {
      throw new Error(`Số lượng câu hỏi không được vượt quá ${MAX_QUESTIONS_COUNT}`);
    }

    // Validate conversation history
    if (conversationHistory && Array.isArray(conversationHistory)) {
      if (conversationHistory.length > MAX_CONVERSATION_HISTORY_LENGTH) {
        // Truncate to max length
        conversationHistory = conversationHistory.slice(-MAX_CONVERSATION_HISTORY_LENGTH);
      }
      // Validate each message structure
      conversationHistory = conversationHistory.filter((msg: any) => {
        return msg && 
               (msg.role === 'user' || msg.role === 'assistant') && 
               typeof msg.content === 'string' &&
               msg.content.length <= MAX_MESSAGE_LENGTH;
      });
    } else {
      conversationHistory = [];
    }

    // Sanitize user message
    if (userMessage) {
      userMessage = sanitizeInput(userMessage);
    }

    // Final validation
    if ((!userMessage && !imageFile) || !questions || !Array.isArray(questions) || questions.length === 0) {
      const encoder = new TextEncoder();
      const errorStream = new ReadableStream({
        start(controller) {
          const errorData = `data: ${JSON.stringify({ error: 'Thiếu thông tin: userMessage hoặc image và questions là bắt buộc' })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        },
      });
      return new Response(errorStream, {
        status: 400,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
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

Môn học: ${sanitizeInput(categoryTitle || 'Y khoa')}
Đề thi: ${sanitizeInput(subCategoryTitle || 'Đề thi thử')}`;

    // Xây dựng messages array với conversation history
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
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
          // Sanitize content từ conversation history
          const sanitizedContent = typeof msg.content === 'string' 
            ? sanitizeInput(msg.content) 
            : '';
          if (sanitizedContent) {
            messages.push({
              role: msg.role,
              content: sanitizedContent,
            });
          }
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
          text: sanitizeInput(userMessage),
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
        content: userMessage ? sanitizeInput(userMessage) : '',
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

