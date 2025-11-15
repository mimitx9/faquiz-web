import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';

interface StickerFile {
  category: string;
  filename: string;
  stickerId: string; // Format: "category/filename"
}

export async function GET() {
  try {
    const stickersDir = join(process.cwd(), 'public', 'stickers');
    const categories = ['bts', 'cat', 'wechat', 'wonyoung', 'xuka'];
    const allStickers: StickerFile[] = [];

    // Đọc từng category
    for (const category of categories) {
      const categoryPath = join(stickersDir, category);
      
      try {
        const files = await readdir(categoryPath);
        
        // Lọc chỉ lấy file .webp
        const webpFiles = files.filter(file => 
          file.toLowerCase().endsWith('.webp')
        );
        
        // Thêm vào danh sách
        for (const filename of webpFiles) {
          allStickers.push({
            category,
            filename,
            stickerId: `${category}/${filename}`,
          });
        }
      } catch (error) {
        // Nếu category không tồn tại, bỏ qua
        console.warn(`Category ${category} not found:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      stickers: allStickers,
      count: allStickers.length,
    });
  } catch (error: any) {
    console.error('Error loading stickers:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi tải danh sách sticker',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

