'use client';

import React from 'react';

interface ProgressBarProps {
  isVisible?: boolean;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  isVisible = true,
  className = ''
}) => {
  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 ${className}`}>
      <div className="w-full max-w-[14rem] px-8">
        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden relative">
          <div 
            className="h-full bg-[#8D7EF7] absolute animate-progress rounded-full"
            style={{
              width: '25%'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;

