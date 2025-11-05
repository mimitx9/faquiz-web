import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Chuẩn hóa keyword tìm kiếm:
 * - Convert tiếng Việt về không dấu
 * - Loại bỏ space và ký tự đặc biệt
 * - Ví dụ: "Giải Phẫu" -> "giaiphau"
 */
export function normalizeSearchKeyword(keyword: string): string {
  // Map các ký tự tiếng Việt về không dấu
  const vietnameseMap: Record<string, string> = {
    'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
    'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
    'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
    'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
    'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
    'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
    'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
    'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
    'đ': 'd',
    'À': 'A', 'Á': 'A', 'Ạ': 'A', 'Ả': 'A', 'Ã': 'A',
    'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ậ': 'A', 'Ẩ': 'A', 'Ẫ': 'A',
    'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
    'È': 'E', 'É': 'E', 'Ẹ': 'E', 'Ẻ': 'E', 'Ẽ': 'E',
    'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ọ': 'O', 'Ỏ': 'O', 'Õ': 'O',
    'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O',
    'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U',
    'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ự': 'U', 'Ử': 'U', 'Ữ': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỵ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y',
    'Đ': 'D',
  };

  let normalized = keyword.trim();
  
  // Convert tiếng Việt về không dấu
  normalized = normalized.split('').map(char => vietnameseMap[char] || char).join('');
  
  // Loại bỏ space và ký tự đặc biệt, chỉ giữ lại chữ cái và số
  normalized = normalized.replace(/[^a-zA-Z0-9]/g, '');
  
  // Convert về lowercase
  normalized = normalized.toLowerCase();
  
  return normalized;
}

/**
 * Chuẩn hóa code của category (giữ lại dấu gạch ngang để match pattern {keyword}-*)
 * - Convert tiếng Việt về không dấu
 * - Loại bỏ space và ký tự đặc biệt (nhưng giữ lại dấu gạch ngang "-")
 * - Convert về lowercase
 */
function normalizeCategoryCode(code: string): string {
  // Map các ký tự tiếng Việt về không dấu
  const vietnameseMap: Record<string, string> = {
    'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
    'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
    'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
    'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
    'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
    'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
    'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
    'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
    'đ': 'd',
    'À': 'A', 'Á': 'A', 'Ạ': 'A', 'Ả': 'A', 'Ã': 'A',
    'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ậ': 'A', 'Ẩ': 'A', 'Ẫ': 'A',
    'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
    'È': 'E', 'É': 'E', 'Ẹ': 'E', 'Ẻ': 'E', 'Ẽ': 'E',
    'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ọ': 'O', 'Ỏ': 'O', 'Õ': 'O',
    'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O',
    'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U',
    'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ự': 'U', 'Ử': 'U', 'Ữ': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỵ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y',
    'Đ': 'D',
  };

  let normalized = code.trim();
  
  // Convert tiếng Việt về không dấu
  normalized = normalized.split('').map(char => vietnameseMap[char] || char).join('');
  
  // Loại bỏ space và ký tự đặc biệt, nhưng giữ lại dấu gạch ngang "-"
  normalized = normalized.replace(/[^a-zA-Z0-9-]/g, '');
  
  // Convert về lowercase
  normalized = normalized.toLowerCase();
  
  return normalized;
}

/**
 * Kiểm tra xem code có match với keyword không:
 * - Match chính xác {keyword}
 * - Match dạng {keyword}-*
 * 
 * @param code - Code của category/subcategory
 * @param normalizedKeyword - Keyword đã được normalize (không có dấu gạch ngang)
 */
export function matchesCategoryCode(code: string, normalizedKeyword: string): boolean {
  // Normalize code (ignore case, giữ lại dấu gạch ngang)
  const normalizedCode = normalizeCategoryCode(code);
  
  // Match chính xác
  if (normalizedCode === normalizedKeyword) {
    return true;
  }
  
  // Match dạng {keyword}-*
  if (normalizedCode.startsWith(normalizedKeyword + '-')) {
    return true;
  }
  
  return false;
}

/**
 * Kiểm tra xem title có match với keyword không (wild card matching):
 * - Match bất kỳ phần nào trong title
 * - Hỗ trợ tìm kiếm không dấu, không phân biệt hoa thường
 * 
 * @param title - Title của category/subcategory
 * @param normalizedKeyword - Keyword đã được normalize (không có dấu gạch ngang)
 */
export function matchesCategoryTitle(title: string, normalizedKeyword: string): boolean {
  if (!title || !normalizedKeyword) {
    return false;
  }
  
  // Normalize title (giống như normalizeSearchKeyword)
  const normalizedTitle = normalizeSearchKeyword(title);
  
  // Wild card matching: kiểm tra xem normalizedKeyword có xuất hiện trong normalizedTitle không
  return normalizedTitle.includes(normalizedKeyword);
}

/**
 * Chuyển đổi màu hex thành rgba với opacity cụ thể
 * @param hex - Màu hex (ví dụ: "#3B82F6" hoặc "3B82F6")
 * @param opacity - Opacity từ 0 đến 1 (ví dụ: 0.05 cho 5%)
 * @returns Chuỗi rgba (ví dụ: "rgba(59, 130, 246, 0.05)")
 */
export function hexToRgba(hex: string, opacity: number = 1): string {
  if (!hex) {
    return `rgba(0, 0, 0, ${opacity})`;
  }

  // Loại bỏ ký tự # nếu có
  const cleanHex = hex.replace('#', '').trim();
  
  // Nếu không phải hex hợp lệ (6 ký tự), trả về màu mặc định
  if (cleanHex.length !== 6) {
    return `rgba(0, 0, 0, ${opacity})`;
  }
  
  // Parse hex thành RGB
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  // Kiểm tra nếu parse thành công
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return `rgba(0, 0, 0, ${opacity})`;
  }
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}