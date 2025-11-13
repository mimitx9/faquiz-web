'use client';

import { useEffect } from 'react';

/**
 * Hook để chặn right-click (context menu) nhưng vẫn cho phép highlight text
 */
export function useDevToolsDetection() {
  useEffect(() => {
    // Chỉ chạy trên client side
    if (typeof window === 'undefined') return;

    // Chặn right-click (context menu) - chỉ preventDefault, không redirect
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Thêm event listener
    document.addEventListener('contextmenu', handleContextMenu);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);
}

