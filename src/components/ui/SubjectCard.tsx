'use client';

import React from 'react';
import { Subject } from '@/types';

interface SubjectCardProps {
  subject: Subject;
  onClick: () => void;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, onClick }) => {
  const colors = ['#3B82F6', '#EF4444', '#8B5CF6', '#10B981'];
  const bgColor = subject.color || colors[subject.id % colors.length];

  return (
    <div
      onClick={onClick}
      className="rounded-lg p-6 min-w-[200px] cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
      style={{ backgroundColor: bgColor }}
    >
      <div className="text-white">
        <h3 className="font-bold text-lg mb-4">{subject.name}</h3>
        {subject.icon && (
          <div className="flex items-center justify-center h-16">
            <img src={subject.icon} alt={subject.name} className="w-16 h-16 opacity-80" />
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectCard;
