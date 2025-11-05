'use client';

import React from 'react';
import Image from 'next/image';
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
          <div className="flex items-center justify-center h-16 relative w-16">
            <Image
              src={subject.icon}
              alt={subject.name}
              width={64}
              height={64}
              className="opacity-80"
              loading="lazy"
              quality={85}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectCard;
