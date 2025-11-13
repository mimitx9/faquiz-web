'use client';

import { useDevToolsDetection } from '@/hooks/useDevToolsDetection';

/**
 * Component để phát hiện DevTools và redirect về trang home
 * Component này không render gì cả, chỉ chạy logic detection
 */
export default function DevToolsDetector() {
  useDevToolsDetection();
  return null;
}

