import { track } from '@vercel/analytics';

/**
 * Utility function để track custom events với Vercel Analytics
 * Tất cả events sẽ có prefix để dễ quản lý và filter trong dashboard
 */

// Event types
export type AnalyticsEvent =
  // Homepage events
  | 'homepage_search'
  | 'homepage_search_enter'
  | 'homepage_search_suggestion_click'
  | 'homepage_category_click'
  | 'homepage_subcategory_click'
  | 'homepage_subtitle_filter_click'
  | 'homepage_subtitle_filter_remove'
  | 'homepage_banner_click'
  
  // Quiz events
  | 'quiz_start'
  | 'quiz_question_answer'
  | 'quiz_question_essay_submit'
  | 'quiz_submit'
  | 'quiz_retry'
  | 'quiz_timer_expired'
  | 'quiz_panel_star_open'
  | 'quiz_panel_print_open'
  | 'quiz_panel_3d_open'
  | 'quiz_panel_kiem_open'
  | 'quiz_panel_fix_error_open'
  | 'quiz_panel_documents_open'
  | 'quiz_panel_close'
  | 'quiz_image_zoom'
  | 'quiz_fix_error_submit'
  | 'quiz_text_highlight'
  
  // Results events
  | 'results_retry_click'
  | 'results_related_subcategory_click'
  | 'results_banner_click'
  
  // Auth & Upgrade events
  | 'login_click'
  | 'login_success'
  | 'upgrade_click'
  | 'upgrade_overlay_show'
  | 'upgrade_overlay_close'
  
  // Navigation events
  | 'category_page_view'
  | 'subcategory_page_view';

interface AnalyticsProperties {
  // Category/Subject tracking
  category_code?: string;
  category_title?: string;
  subcategory_code?: string;
  subcategory_title?: string;
  subcategory_id?: number;
  
  // Search tracking
  search_query?: string;
  search_type?: 'code' | 'title' | 'suggestion';
  
  // Quiz tracking
  question_id?: number;
  question_index?: number;
  is_correct?: boolean;
  total_questions?: number;
  correct_answers?: number;
  time_spent?: number; // seconds
  quiz_duration?: number; // seconds
  
  // Panel tracking
  panel_type?: 'star' | 'print' | '3d' | 'kiem' | 'fix-error' | 'documents';
  
  // Text highlight tracking
  highlight_text_length?: number;
  
  // Banner tracking
  banner_id?: string;
  banner_title?: string;
  
  // Filter tracking
  subtitle_filter?: string;
  
  // User info
  is_paid?: boolean;
  user_id?: string | number;
  
  // Other
  [key: string]: string | number | boolean | undefined;
}

/**
 * Track custom event với Vercel Analytics
 * @param event - Tên event
 * @param properties - Properties của event (optional)
 */
export function trackEvent(event: AnalyticsEvent, properties?: AnalyticsProperties): void {
  try {
    // Chỉ track trên client side
    if (typeof window === 'undefined') {
      return;
    }

    // Filter out undefined values để tương thích với Vercel Analytics
    // AllowedPropertyValues = string | number | boolean | null (không có undefined)
    if (!properties) {
      track(event);
      return;
    }

    // Build cleaned properties object - chỉ giữ lại values không phải undefined
    const cleaned: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (value !== undefined) {
        // Chỉ cho phép string, number, boolean, null
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
          cleaned[key] = value;
        }
      }
    }
    
    track(event, cleaned);
  } catch (error) {
    // Silent fail để không ảnh hưởng đến UX
  }
}

/**
 * Helper functions cho các events phổ biến
 */

// Homepage tracking
export const trackHomepageSearch = (query: string, type: 'code' | 'title' = 'title') => {
  trackEvent('homepage_search', {
    search_query: query,
    search_type: type,
  });
};

export const trackHomepageSearchEnter = (query: string) => {
  trackEvent('homepage_search_enter', {
    search_query: query,
    search_type: 'code',
  });
};

export const trackHomepageSearchSuggestionClick = (suggestion: string) => {
  trackEvent('homepage_search_suggestion_click', {
    search_query: suggestion,
    search_type: 'suggestion',
  });
};

export const trackHomepageCategoryClick = (
  categoryCode: string,
  categoryTitle: string,
  categoryId?: number
) => {
  trackEvent('homepage_category_click', {
    category_code: categoryCode,
    category_title: categoryTitle,
    category_id: categoryId,
  });
};

export const trackHomepageSubcategoryClick = (
  subcategoryCode: string,
  subcategoryTitle: string,
  subcategoryId: number,
  categoryCode?: string,
  categoryTitle?: string,
  isPayment?: boolean
) => {
  trackEvent('homepage_subcategory_click', {
    subcategory_code: subcategoryCode,
    subcategory_title: subcategoryTitle,
    subcategory_id: subcategoryId,
    category_code: categoryCode,
    category_title: categoryTitle,
    is_paid: isPayment,
  });
};

export const trackHomepageSubtitleFilter = (subtitle: string) => {
  trackEvent('homepage_subtitle_filter_click', {
    subtitle_filter: subtitle,
  });
};

export const trackHomepageSubtitleFilterRemove = () => {
  trackEvent('homepage_subtitle_filter_remove');
};

export const trackHomepageBannerClick = (bannerId: string, bannerTitle: string) => {
  trackEvent('homepage_banner_click', {
    banner_id: bannerId,
    banner_title: bannerTitle,
  });
};

// Quiz tracking
export const trackQuizStart = (
  subcategoryCode: string,
  subcategoryTitle: string,
  categoryCode: string,
  categoryTitle: string,
  totalQuestions: number
) => {
  trackEvent('quiz_start', {
    subcategory_code: subcategoryCode,
    subcategory_title: subcategoryTitle,
    category_code: categoryCode,
    category_title: categoryTitle,
    total_questions: totalQuestions,
  });
};

export const trackQuizQuestionAnswer = (
  questionId: number,
  questionIndex: number,
  isCorrect: boolean,
  categoryCode?: string,
  subcategoryCode?: string
) => {
  trackEvent('quiz_question_answer', {
    question_id: questionId,
    question_index: questionIndex,
    is_correct: isCorrect,
    category_code: categoryCode,
    subcategory_code: subcategoryCode,
  });
};

export const trackQuizQuestionEssaySubmit = (
  questionId: number,
  questionIndex: number,
  isCorrect: boolean,
  categoryCode?: string,
  subcategoryCode?: string
) => {
  trackEvent('quiz_question_essay_submit', {
    question_id: questionId,
    question_index: questionIndex,
    is_correct: isCorrect,
    category_code: categoryCode,
    subcategory_code: subcategoryCode,
  });
};

export const trackQuizSubmit = (
  totalQuestions: number,
  correctAnswers: number,
  timeSpent: number,
  categoryCode: string,
  subcategoryCode: string
) => {
  trackEvent('quiz_submit', {
    total_questions: totalQuestions,
    correct_answers: correctAnswers,
    time_spent: timeSpent,
    category_code: categoryCode,
    subcategory_code: subcategoryCode,
  });
};

export const trackQuizRetry = (
  categoryCode: string,
  subcategoryCode: string,
  totalQuestions: number
) => {
  trackEvent('quiz_retry', {
    category_code: categoryCode,
    subcategory_code: subcategoryCode,
    total_questions: totalQuestions,
  });
};

export const trackQuizTimerExpired = (
  categoryCode: string,
  subcategoryCode: string,
  totalQuestions: number
) => {
  trackEvent('quiz_timer_expired', {
    category_code: categoryCode,
    subcategory_code: subcategoryCode,
    total_questions: totalQuestions,
  });
};

export const trackQuizPanelOpen = (
  panelType: 'star' | 'print' | '3d' | 'kiem' | 'fix-error' | 'documents',
  categoryCode?: string,
  subcategoryCode?: string
) => {
  trackEvent(`quiz_panel_${panelType}_open` as AnalyticsEvent, {
    panel_type: panelType,
    category_code: categoryCode,
    subcategory_code: subcategoryCode,
  });
};

export const trackQuizPanelClose = (panelType: 'star' | 'print' | '3d' | 'kiem' | 'fix-error' | 'documents') => {
  trackEvent('quiz_panel_close', {
    panel_type: panelType,
  });
};

export const trackQuizImageZoom = (categoryCode?: string, subcategoryCode?: string) => {
  trackEvent('quiz_image_zoom', {
    category_code: categoryCode,
    subcategory_code: subcategoryCode,
  });
};

export const trackQuizFixErrorSubmit = (
  questionId: number,
  categoryCode?: string,
  subcategoryCode?: string
) => {
  trackEvent('quiz_fix_error_submit', {
    question_id: questionId,
    category_code: categoryCode,
    subcategory_code: subcategoryCode,
  });
};

export const trackQuizTextHighlight = (
  questionId: number,
  textLength: number,
  categoryCode?: string,
  subcategoryCode?: string
) => {
  trackEvent('quiz_text_highlight', {
    question_id: questionId,
    highlight_text_length: textLength,
    category_code: categoryCode,
    subcategory_code: subcategoryCode,
  });
};

// Results tracking
export const trackResultsRetry = (
  categoryCode: string,
  subcategoryCode: string,
  totalQuestions: number
) => {
  trackEvent('results_retry_click', {
    category_code: categoryCode,
    subcategory_code: subcategoryCode,
    total_questions: totalQuestions,
  });
};

export const trackResultsRelatedSubcategoryClick = (
  subcategoryCode: string,
  subcategoryTitle: string,
  subcategoryId: number,
  categoryCode: string
) => {
  trackEvent('results_related_subcategory_click', {
    subcategory_code: subcategoryCode,
    subcategory_title: subcategoryTitle,
    subcategory_id: subcategoryId,
    category_code: categoryCode,
  });
};

export const trackResultsBannerClick = (bannerId: string, bannerTitle: string) => {
  trackEvent('results_banner_click', {
    banner_id: bannerId,
    banner_title: bannerTitle,
  });
};

// Auth & Upgrade tracking
export const trackLoginClick = (source?: string) => {
  trackEvent('login_click', {
    source: source || 'unknown',
  });
};

export const trackLoginSuccess = () => {
  trackEvent('login_success');
};

export const trackUpgradeClick = (source?: string) => {
  trackEvent('upgrade_click', {
    source: source || 'unknown',
  });
};

export const trackUpgradeOverlayShow = (source?: string) => {
  trackEvent('upgrade_overlay_show', {
    source: source || 'unknown',
  });
};

export const trackUpgradeOverlayClose = () => {
  trackEvent('upgrade_overlay_close');
};

// Navigation tracking
export const trackCategoryPageView = (categoryCode: string, categoryTitle: string) => {
  trackEvent('category_page_view', {
    category_code: categoryCode,
    category_title: categoryTitle,
  });
};

export const trackSubcategoryPageView = (
  subcategoryCode: string,
  subcategoryTitle: string,
  categoryCode: string,
  categoryTitle: string
) => {
  trackEvent('subcategory_page_view', {
    subcategory_code: subcategoryCode,
    subcategory_title: subcategoryTitle,
    category_code: categoryCode,
    category_title: categoryTitle,
  });
};

