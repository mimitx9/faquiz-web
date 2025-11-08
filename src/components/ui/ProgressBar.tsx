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
      <div className="flex flex-col items-center justify-center">
        <img 
          src="/logos/falogin.png" 
          alt="FA Quiz Logo" 
          className="w-auto h-auto max-w-xl"
        />
      </div>
    </div>
  );
};

export default ProgressBar;

