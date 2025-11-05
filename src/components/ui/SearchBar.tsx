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
            className="w-5 h-5"
            fill="gray"
            opacity="0.2"
            viewBox="0 0 12 12"
            width="20"
            height="20"
        >
            <path d="M11.5306 11.5247C11.7901 11.2636 11.7893 10.8417 11.529 10.5815L10.1235 9.17686C10.8915 8.2158 11.3523 6.99444 11.3523 5.67297C11.3523 2.54283 8.80801 0 5.67613 0C2.54424 0 0 2.54283 0 5.67297C0 8.80311 2.54424 11.3459 5.67613 11.3459C6.99833 11.3459 8.22037 10.8854 9.18197 10.1246L10.5846 11.5264C10.846 11.7877 11.2701 11.787 11.5306 11.5247ZM5.67613 10.0111C3.28548 10.0111 1.33556 8.06229 1.33556 5.67297C1.33556 3.28365 3.28548 1.33482 5.67613 1.33482C8.06678 1.33482 10.0167 3.28365 10.0167 5.67297C10.0167 8.06229 8.06678 10.0111 5.67613 10.0111Z"></path>
        </svg>
    );

    return (
        <div className="mt-4 mb-12">
            <Input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                leftIcon={<SearchIcon />}
                autoFocus
                className="bg-transparent border-0 border-b-2 border-gray-100 rounded-none shadow-none focus:ring-0 focus:border-[#8D7EF7] text-2xl py-4 leading-[1.2] pl-14 placeholder:text-gray-300"
            />
        </div>
    );
};

export default SearchBar;