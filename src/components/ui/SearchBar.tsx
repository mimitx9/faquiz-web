'use client';

import React from 'react';
import Input from './Input';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
                                                 value,
                                                 onChange,
                                                 placeholder = 'Tìm môn học',
                                             }) => {
    const SearchIcon = () => (
        <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
        </svg>
    );

    return (
        <div className="mb-8">
            <Input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                leftIcon={<SearchIcon />}
                className="bg-transparent"
            />
        </div>
    );
};

export default SearchBar;