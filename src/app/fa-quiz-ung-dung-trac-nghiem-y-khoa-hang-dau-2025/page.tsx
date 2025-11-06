import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import QuizHeader from '@/components/layout/QuizHeader';

export const metadata: Metadata = {
  title: 'FA Quiz: Ứng Dụng Trắc Nghiệm Y Khoa Hàng Đầu 2025',
  description: 'FA Quiz là ứng dụng giúp sinh viên Y đạt điểm cao trong mỗi kỳ thi nhờ kho đề thi với hơn 1.000.000 câu hỏi trắc nghiệm và tự luận xịn sò. Tải ngay để trải nghiệm phương pháp học tập y khoa hiệu quả!',
  keywords: 'FA Quiz, trắc nghiệm y khoa, ứng dụng y khoa, đề thi y khoa, sinh viên y, học y khoa, ôn thi y khoa',
  openGraph: {
    title: 'FA Quiz: Ứng Dụng Trắc Nghiệm Y Khoa Hàng Đầu 2025',
    description: 'FA Quiz là ứng dụng giúp sinh viên Y đạt điểm cao trong mỗi kỳ thi nhờ kho đề thi với hơn 1.000.000 câu hỏi trắc nghiệm và tự luận xịn sò.',
    type: 'website',
    locale: 'vi_VN',
  },
  alternates: {
    canonical: '/fa-quiz-ung-dung-trac-nghiem-y-khoa-hang-dau-2025',
  },
};

export default function FAQuizLandingPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "FA Quiz",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "iOS, Android",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "VND"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "500000"
    },
    "description": "FA Quiz là ứng dụng giúp sinh viên Y đạt điểm cao trong mỗi kỳ thi nhờ kho đề thi với hơn 1.000.000 câu hỏi trắc nghiệm và tự luận xịn sò.",
    "url": "https://apps.apple.com/vn/app/id1508005634",
    "screenshot": "https://facourse.com/wp-content/uploads/2025/04/google-play.png"
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <QuizHeader />
      <main className="pt-20">
        <article className="max-w-4xl mx-auto px-8 py-12">
          {/* Hero Section */}
          <header className="hero-section mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-8 text-center dark:text-white">
              FA Quiz: Ứng Dụng Trắc Nghiệm Y Khoa Hàng Đầu 2025
            </h1>
          </header>

          {/* Content */}
          <div className="entry-content prose prose-lg max-w-none dark:prose-invert">
            <p className="text-lg mb-8 dark:text-gray-300">
              Bạn thấy học Y khó? Bạn đang tìm một công cụ hiệu quả để vượt qua các kỳ thi y khoa? 
              Bạn là một sinh viên y khoa, điều dưỡng, dược sĩ, răng hàm mặt, xét nghiệm, cử nhân y khoa… 
              Vậy thì bạn nên tải và xài thử FA Quiz, đơn giản vì: <strong>Học Y khó, có FA Quiz lo</strong>
            </p>

            {/* YouTube Video */}
            <figure className="wp-block-embed mb-8">
              <div className="wp-block-embed__wrapper aspect-video">
                <iframe
                  title="FA Quiz - App trắc nghiệm Y khoa cục súc"
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/VaT7VCxZHxA?feature=oembed"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="w-full h-full rounded-lg"
                />
              </div>
            </figure>

            {/* FA Quiz là gì? */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6 dark:text-white">FA Quiz là gì?</h2>
              <p className="mb-4 dark:text-gray-300">
                FA Quiz là ứng dụng giúp sinh viên Y đạt điểm cao trong mỗi kỳ thi nhờ kho đề thi với hơn 1.000.000 câu hỏi trắc nghiệm và tự luận xịn sò.
              </p>
              <p className="mb-4 dark:text-gray-300">
                Sinh viên Y chỉ có hai mùa: Mùa thi và mùa thi sấp mặt. Cứ mỗi kỳ thi qua đi rồi kỳ thi này lại đến khiến sinh viên chúng ta ăn không ngon, ngủ không yên, vật lộn bên những cuốn sách dầy cộm cùng vô vàn những kiến thức chưa biết bao giờ dùng được.
              </p>
              <p className="mb-4 dark:text-gray-300">
                Chính vì lẽ đó mà FA Quiz đã có mặt ở đây với mong muốn giúp sinh viên chúng ta cùng nhau chinh phục các kì thi trắc nghiệm tiện lợi và hiệu quả nhất.
              </p>
              <p className="mb-4 dark:text-gray-300">
                Thay vì mang những cuốn sách trắc nghiệm dày cộm trên vai cùng ti tỉ lý thuyết khó nhớ, thì giờ đây thứ các bạn cần là chỉ một chiếc smartphone được trang bị FA Quiz, học mọi lúc mọi nơi, tận dụng tối đa những khoảng thời gian chết trong ngày như những phút giây nhàm chán trên xe buýt hay những lúc phải xếp hàng dài để chờ thang máy, thậm chí còn giúp bạn ôn bài vui vẻ không quạu khi đang FA…
              </p>
              <p className="mb-4 dark:text-gray-300">
                FA Quiz được nghiên cứu và xây dựng bởi những sinh viên Y tâm huyết. Hi vọng sẽ hữu ích với các bạn trên chặng đường chinh phục điểm số Full A+.
              </p>
            </section>

            {/* Tải và trải nghiệm FA Quiz */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6 dark:text-white">Tải và trải nghiệm FA Quiz</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <figure className="wp-block-image">
                  <Link href="https://play.google.com/store/apps/details?id=com.Ying.fa_quiz" target="_blank" rel="noopener noreferrer">
                    <Image
                      src="/google-play.png"
                      alt="Tải FA Quiz trên Google Play"
                      width={600}
                      height={186}
                      className="w-full h-auto rounded-lg hover:opacity-90 transition-opacity"
                      priority
                      quality={90}
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </Link>
                </figure>
                <figure className="wp-block-image">
                  <Link href="https://apps.apple.com/vn/app/id1508005634" target="_blank" rel="noopener noreferrer">
                    <Image
                      src="/appstore.png"
                      alt="Tải FA Quiz trên App Store"
                      width={600}
                      height={186}
                      className="w-full h-auto rounded-lg hover:opacity-90 transition-opacity"
                      priority
                      quality={90}
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </Link>
                </figure>
              </div>
            </section>

            {/* Cách tải và sử dụng FA Quiz */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6 dark:text-white">Cách tải và sử dụng FA Quiz</h2>
              <ol className="list-decimal list-inside space-y-3 ml-4 dark:text-gray-300">
                <li>Click nút ở trên hoặc Tìm kiếm "FA Quiz" trên Google Play hoặc App Store</li>
                <li>Tải ứng dụng miễn phí về thiết bị của bạn</li>
                <li>Đăng ký tài khoản và đăng nhập</li>
                <li>Lựa chọn chuyên ngành y học bạn quan tâm</li>
                <li>Bắt đầu hành trình ôn luyện y khoa hiệu quả</li>
              </ol>
            </section>

            {/* Những tính năng nổi bật của FA Quiz */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6 dark:text-white">Những tính năng nổi bật của FA Quiz</h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-semibold mb-4 dark:text-white">1. Kho câu hỏi y khoa đa dạng</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4 dark:text-gray-300">
                    <li>Hơn 1.000.000 câu hỏi trắc nghiệm được biên soạn kỹ lưỡng bởi các chuyên gia y khoa hàng đầu FA Quiz</li>
                    <li>Bao quát nhiều chuyên ngành: Giải Phẫu, Sinh lý, Hoá Sinh, Chạy trạm giải phẫu, giải phẫu bệnh, module, Nội khoa, Ngoại khoa, Sản phụ khoa, Nhi khoa, Y học cơ sở, và nhiều lĩnh vực khác</li>
                    <li>Cập nhật thường xuyên đề thi mới nhất của các trường như Y Quốc Gia, Y Hà Nội, Y Thái Nguyên, Y Hải Phòng, Y Thái Bình, Y Vinh, Y Cổ truyền, Quân Y, Y Huế, Y Đà Nẵng, Y Hồ Chí Minh, Y Phạm Ngọc Thạch, Y Nguyễn Tất Thành, Y Hồng Bàng, Y Cần Thơ, Y Nam Cần Thơ, Y Võ Trường Toản, Y Trà Vinh…</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold mb-4 dark:text-white">2. Chế độ ôn và thi linh hoạt</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4 dark:text-gray-300">
                    <li>Mô phỏng đề thi: Trải nghiệm theo dạng ôn thi hoặc mô phỏng kỳ thi thực tế</li>
                    <li>Luyện đề theo từng chương, đề thi: Tập trung vào từng mục tiêu cụ thể bạn muốn</li>
                    <li>Đề tổng hợp: Tạo đề ngẫu nhiên tổng hợp dựa trên những phần mà bạn muốn</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold mb-4 dark:text-white">3. Phân tích kết quả chuyên sâu</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4 dark:text-gray-300">
                    <li>Thống kê tỷ lệ đúng/sai theo từng chuyên ngành và chủ đề</li>
                    <li>Đánh giá điểm mạnh, điểm yếu của người học</li>
                    <li>Đề xuất lộ trình học tập phù hợp dựa trên phân tích kết quả</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold mb-4 dark:text-white">4. Giải thích y học chi tiết</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4 dark:text-gray-300">
                    <li>Mỗi câu hỏi đều có lời giải và giải thích khoa học</li>
                    <li>Tích hợp hình ảnh minh họa, biểu đồ và sơ đồ y khoa</li>
                    <li>Tham khảo các nguồn tài liệu y khoa uy tín</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold mb-4 dark:text-white">5. Hỗ trợ học tập</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4 dark:text-gray-300">
                    <li>Thảo luận về các câu hỏi khó với admin page FA Quiz hoặc cộng đồng trong app</li>
                    <li>Giải đáp thắc mắc và lắng nghe tâm sự thầm kín của sinh viên Y</li>
                    <li>Chia sẻ kinh nghiệm học tập và luyện thi</li>
                    <li>Cập nhật thông tin về các kỳ thi y khoa quan trọng</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Lợi ích khi sử dụng FA Quiz */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6 dark:text-white">Lợi ích khi sử dụng FA Quiz</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-semibold mb-3 dark:text-white">1. Học tập hiệu quả mọi lúc, mọi nơi</h3>
                  <p className="dark:text-gray-300">
                    Với FA Quiz, bạn có thể tận dụng mọi khoảng thời gian rảnh để học tập: khi di chuyển, trong giờ nghỉ, hoặc bất kỳ lúc nào có thời gian. 
                    Ứng dụng hoạt động cả trong chế độ ngoại tuyến, giúp việc học không bị gián đoạn ngay cả khi không có kết nối internet.
                  </p>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold mb-3 dark:text-white">2. Củng cố kiến thức y khoa toàn diện</h3>
                  <p className="dark:text-gray-300">
                    Hệ thống câu hỏi được thiết kế khoa học, từ cơ bản đến nâng cao, giúp người dùng xây dựng nền tảng kiến thức vững chắc và phát triển tư duy lâm sàng hiệu quả.
                  </p>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold mb-3 dark:text-white">3. Theo dõi tiến bộ cá nhân</h3>
                  <p className="dark:text-gray-300">
                    Công cụ phân tích kết quả thông minh giúp bạn nhận biết rõ những lĩnh vực cần cải thiện, từ đó tối ưu hóa thời gian học tập và nâng cao hiệu suất.
                  </p>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold mb-3 dark:text-white">4. Tự tin đối mặt với các kỳ thi y khoa</h3>
                  <p className="dark:text-gray-300">
                    Trải nghiệm thường xuyên với các bài kiểm tra mô phỏng giúp làm quen với cấu trúc đề thi, giảm áp lực và tăng sự tự tin khi tham gia các kỳ thi chính thức.
                  </p>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold mb-3 dark:text-white">5. Cập nhật kiến thức y học hiện đại</h3>
                  <p className="dark:text-gray-300">
                    FA Quiz thường xuyên cập nhật nội dung theo các hướng dẫn, nghiên cứu và tiến bộ y học mới nhất, giúp người dùng luôn bắt kịp với xu hướng y khoa toàn cầu.
                  </p>
                </div>
              </div>
            </section>

            {/* Trải nghiệm người dùng với FA Quiz */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6 dark:text-white">Trải nghiệm người dùng với FA Quiz</h2>
              <p className="dark:text-gray-300">
                Giao diện của FA Quiz được thiết kế trực quan, thân thiện với người dùng và tối ưu hóa cho việc học tập y khoa. 
                Ứng dụng vận hành mượt mà trên cả hệ điều hành iOS và Android, với các tính năng đồng bộ hóa dữ liệu thông minh giúp người dùng tiếp tục học tập liền mạch trên nhiều thiết bị.
              </p>
            </section>

            {/* Phản hồi từ cộng đồng Y khoa */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6 dark:text-white">Phản hồi từ cộng đồng Y khoa</h2>
              <p className="mb-6 dark:text-gray-300">
                Với hơn 500.000 lượt tải và đánh giá 4.8/5 sao trên các kho ứng dụng, FA Quiz đã nhận được sự tin tưởng từ cộng đồng y khoa. 
                Nhiều sinh viên y khoa và bác sĩ chia sẻ rằng họ đã đạt kết quả xuất sắc trong các kỳ thi nhờ vào sự hỗ trợ từ ứng dụng này.
              </p>

              <blockquote className="border-l-4 border-blue-500 pl-6 py-4 my-6 italic bg-gray-50 rounded-r-lg">
                <p>
                  "FA Quiz đã giúp tôi vượt qua kỳ thi nội trú với số điểm cao ngoài mong đợi. Kho câu hỏi phong phú và lời giải chi tiết là những yếu tố giúp tôi củng cố kiến thức một cách hiệu quả." 
                  – <strong>PGS.TS.BS. Phạm Văn Dương</strong>
                </p>
              </blockquote>

              <blockquote className="border-l-4 border-blue-500 pl-6 py-4 my-6 italic bg-gray-50 rounded-r-lg">
                <p>
                  "Là một sinh viên Y, tôi sử dụng FA Quiz để ôn thi trúng tủ. Ứng dụng này thực sự rất hữu ích cho người lười muốn học ít mà hiệu quả." 
                  – <strong>Y1. Nguyễn Xuân Diệu</strong>
                </p>
              </blockquote>

              {/* YouTube Video 2 */}
              <figure className="wp-block-embed mt-8">
                <div className="wp-block-embed__wrapper aspect-video">
                  <iframe
                    loading="lazy"
                    title="Mở rộng kiến thức với App học tập y khoa| Cần Thơ TV"
                    width="100%"
                    height="100%"
                    src="https://www.youtube.com/embed/tR_WMtRBd68?feature=oembed"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    className="w-full h-full rounded-lg"
                  />
                </div>
              </figure>
            </section>

            {/* FA Quiz Pro */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6 dark:text-white">FA Quiz Pro – Trải nghiệm học tập y khoa nâng cao</h2>
              <p className="mb-4 dark:text-gray-300">
                Bên cạnh phiên bản miễn phí với các tính năng cơ bản, FA Quiz còn cung cấp gói Premium với nhiều đặc quyền hấp dẫn:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 dark:text-gray-300">
                <li>Truy cập không giới hạn toàn bộ ngân hàng câu hỏi</li>
                <li>Các bài kiểm tra chuyên sâu theo chuyên khoa</li>
                <li>Giải thích chi tiết từ chuyên gia y khoa hàng đầu</li>
                <li>Tài liệu tham khảo bổ sung (sách, bài báo khoa học)</li>
                <li>Không hiển thị quảng cáo, tối ưu trải nghiệm học tập</li>
              </ul>
            </section>

            {/* Ứng dụng FA Quiz trong đào tạo y khoa */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6 dark:text-white">Ứng dụng FA Quiz trong đào tạo y khoa</h2>
              <p className="dark:text-gray-300">
                Nhiều trường đại học y và cơ sở đào tạo y khoa đã tích hợp FA Quiz vào chương trình học tập, sử dụng như một công cụ bổ trợ hiệu quả cho việc đánh giá kiến thức và chuẩn bị cho các kỳ thi. 
                Ứng dụng cung cấp các gói dành cho tổ chức giáo dục với tính năng quản lý học viên và báo cáo tiến độ chi tiết.
              </p>
            </section>

            {/* Hướng phát triển của FA Quiz */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6 dark:text-white">Hướng phát triển của FA Quiz</h2>
              <p className="mb-4 dark:text-gray-300">
                Đội ngũ phát triển FA Quiz không ngừng cải tiến và bổ sung các tính năng mới:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 dark:text-gray-300">
                <li>Tích hợp trí tuệ nhân tạo để cá nhân hóa lộ trình học tập</li>
                <li>Mở rộng kho câu hỏi cho các chuyên ngành y khoa chuyên sâu</li>
                <li>Phát triển tính năng học tập tương tác với mô phỏng ca lâm sàng</li>
                <li>Tăng cường kết nối với cộng đồng y khoa toàn cầu</li>
              </ul>
            </section>

            {/* Kết luận */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6 dark:text-white">Kết luận</h2>
              <p className="mb-4 dark:text-gray-300">
                FA Quiz không chỉ là một ứng dụng trắc nghiệm y khoa thông thường mà còn là công cụ học tập toàn diện, hỗ trợ đắc lực cho sinh viên và chuyên gia y tế trong việc nâng cao kiến thức và kỹ năng nghề nghiệp. 
                Với kho câu hỏi phong phú, tính năng học tập thông minh và cộng đồng người dùng sôi nổi, FA Quiz xứng đáng là lựa chọn hàng đầu cho những ai mong muốn chinh phục lĩnh vực y khoa đầy thách thức.
              </p>
              <p className="text-lg font-semibold dark:text-white">
                Hãy tải FA Quiz ngay hôm nay và trải nghiệm phương pháp học tập y khoa hiệu quả, khoa học và tiện lợi!
              </p>
            </section>
          </div>
        </article>
      </main>
    </div>
  );
}

