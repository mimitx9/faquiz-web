# FA Quiz Web

Website làm quiz được xây dựng bằng Next.js, TypeScript và Tailwind CSS.

## Yêu cầu hệ thống

- Node.js >= 18.0.0
- npm hoặc yarn hoặc pnpm

## Cài đặt

1. **Cài đặt dependencies:**

```bash
npm install
# hoặc
yarn install
# hoặc
pnpm install
```

2. **Tạo file `.env.local`:**

```bash
# Tạo file .env.local trong thư mục gốc với nội dung:
OPENAI_API_KEY=your_openai_api_key_here

# Lấy API key từ: https://platform.openai.com/api-keys
# API key này được sử dụng để chấm điểm tự luận trong phần quiz
```

## Chạy ứng dụng

### Development mode:

```bash
npm run dev
# hoặc
yarn dev
# hoặc
pnpm dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000)

### Build production:

```bash
npm run build
npm start
```

## Cấu trúc project

```
faquiz-web/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── page.tsx      # Trang home
│   │   ├── quiz/         # Trang làm quiz
│   │   ├── result/       # Trang kết quả
│   │   ├── upgrade/      # Trang nâng cấp
│   │   └── login/        # Trang đăng nhập
│   ├── components/       # React components
│   │   ├── layout/       # Layout components
│   │   └── ui/          # UI components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities và API services
│   └── types/           # TypeScript types
├── public/              # Static files
└── package.json
```

## Các trang chính

- **Home (`/`)**: Trang chủ với search bar, danh sách đề mới và môn mới
- **Quiz (`/quiz/[id]`)**: Trang làm quiz
- **Result (`/result/[id]`)**: Trang hiển thị kết quả
- **Upgrade (`/upgrade`)**: Trang nâng cấp tài khoản Pro
- **Login (`/login`)**: Trang đăng nhập

## API Configuration

API endpoints được cấu hình trong `src/lib/api.ts`:

- Development: `http://localhost:7071/fai`
- Production: `https://api.facourse.com/fai`

## Lưu ý

- Backend API cần chạy ở `http://localhost:7071/fai` khi development
- Đảm bảo backend có các endpoints:
  - `/v1/quiz-web/new-quizzes` - Lấy danh sách đề mới
  - `/v1/quiz-web/new-subjects` - Lấy danh sách môn mới
  - `/v1/quiz-web/quiz/[id]` - Lấy chi tiết quiz
  - `/v1/quiz-web/search-subjects` - Tìm kiếm môn học
  - `/v1/quiz-web/quiz/[id]/submit` - Nộp bài quiz

## Troubleshooting

### Lỗi khi chạy `npm install`:

```bash
# Xóa node_modules và package-lock.json (nếu có)
rm -rf node_modules package-lock.json
npm install
```

### Lỗi TypeScript:

```bash
# Kiểm tra TypeScript version
npm list typescript
```

### Lỗi Tailwind CSS không hoạt động:

Kiểm tra file `tailwind.config.js` và `postcss.config.js` đã được tạo đúng chưa.

