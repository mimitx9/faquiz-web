import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Khởi tạo OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { detailAnswer, inputText } = body;

    // Validate input
    if (!detailAnswer || !inputText) {
      return NextResponse.json(
        { error: 'Thiếu thông tin: detailAnswer và inputText là bắt buộc' },
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

    // Tạo prompt theo yêu cầu
    const prompt = `CONTEXT: Bạn là một hệ thống chấm điểm tự động. Nhiệm vụ của bạn là so sánh câu trả lời của người dùng với đáp án mẫu.

 

 QUY TẮC CHẤM ĐIỂM

 - Nếu câu trả lời của người dùng đúng hoặc gần đúng với đáp án mẫu → Trả về [TRUE].

 - Nếu câu trả lời không đúng hoặc không liên quan → Trả về [FALSE].

 

 Hãy chỉ trả về một trong hai kết quả: \`[TRUE]\` hoặc \`[FALSE]\`.

 

 Đáp án mẫu: "${detailAnswer}"  

 Câu trả lời của người dùng: "${inputText}"`;

    // Gọi OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Bạn là một hệ thống chấm điểm tự động. Bạn chỉ trả về [TRUE] hoặc [FALSE] mà không có bất kỳ giải thích nào khác.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Thấp hơn để có kết quả nhất quán hơn
      max_tokens: 10, // Chỉ cần trả về TRUE hoặc FALSE
    });

    const result = completion.choices[0]?.message?.content?.trim() || '';
    
    // Parse kết quả - kiểm tra xem có chứa [TRUE] hoặc [FALSE]
    const isCorrect = result.includes('[TRUE]') || result.toUpperCase().includes('TRUE');
    
    return NextResponse.json({
      success: true,
      isCorrect,
      rawResult: result,
    });
  } catch (error: any) {
    console.error('Error grading essay:', error);
    return NextResponse.json(
      { 
        error: 'Lỗi khi chấm điểm tự luận',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

