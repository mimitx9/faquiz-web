'use client';

import React, { useState, useRef, useEffect } from 'react';
import Input from './Input';

interface Suggestion {
    title: string;
    backgroundColor?: string;
}

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    suggestions?: Suggestion[];
    onEnterPress?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
                                                 value,
                                                 onChange,
                                                 placeholder = 'Tìm môn học...',
                                                 suggestions = [],
                                                 onEnterPress,
                                             }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const searchBarRef = useRef<HTMLDivElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    const SearchIcon = () => (
        <svg
            className="w-6 h-6"
            fill="gray"
            opacity="0.2"
            viewBox="0 0 12 12"
            width="24"
            height="24"
        >
            <path d="M11.5306 11.5247C11.7901 11.2636 11.7893 10.8417 11.529 10.5815L10.1235 9.17686C10.8915 8.2158 11.3523 6.99444 11.3523 5.67297C11.3523 2.54283 8.80801 0 5.67613 0C2.54424 0 0 2.54283 0 5.67297C0 8.80311 2.54424 11.3459 5.67613 11.3459C6.99833 11.3459 8.22037 10.8854 9.18197 10.1246L10.5846 11.5264C10.846 11.7877 11.2701 11.787 11.5306 11.5247ZM5.67613 10.0111C3.28548 10.0111 1.33556 8.06229 1.33556 5.67297C1.33556 3.28365 3.28548 1.33482 5.67613 1.33482C8.06678 1.33482 10.0167 3.28365 10.0167 5.67297C10.0167 8.06229 8.06678 10.0111 5.67613 10.0111Z"></path>
        </svg>
    );

    const showSuggestions = isFocused && value.trim().length > 0 && suggestions.length > 0;

    const handleSuggestionClick = (suggestion: Suggestion) => {
        onChange(suggestion.title);
        setIsFocused(false);
        setSelectedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (showSuggestions && selectedIndex >= 0) {
                // Nếu có suggestion được chọn, chọn suggestion đó
                e.preventDefault();
                handleSuggestionClick(suggestions[selectedIndex]);
            } else {
                // Nếu không có suggestion nào được chọn, gọi onEnterPress để áp dụng logic search cũ
                e.preventDefault();
                // Đóng suggestions khi nhấn Enter
                setIsFocused(false);
                setSelectedIndex(-1);
                if (onEnterPress) {
                    onEnterPress();
                }
            }
            return;
        }

        if (!showSuggestions) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => 
                prev < suggestions.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Escape') {
            setIsFocused(false);
            setSelectedIndex(-1);
        }
    };

    // Reset selectedIndex khi suggestions thay đổi
    useEffect(() => {
        setSelectedIndex(-1);
    }, [suggestions]);

    // Scroll vào suggestion được chọn
    useEffect(() => {
        if (selectedIndex >= 0 && suggestionsRef.current) {
            const selectedElement = suggestionsRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedIndex]);

    // Đóng dropdown khi click bên ngoài
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
                setIsFocused(false);
                setSelectedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Inject CSS animation styles
    useEffect(() => {
        const styleId = 'searchbar-rainbow-animation';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                @keyframes rainbow-border {
                    0% { border-bottom-color: #8D7EF7; } /* Tím */
                    40% { border-bottom-color:rgb(94, 0, 171); } /* Hồng */
                    60% { border-bottom-color:rgb(241, 100, 100); } /* Vàng */
                    70% { border-bottom-color:rgb(255, 228, 22); } /* Xanh lá */
                    80% { border-bottom-color:rgb(134, 246, 74); } /* Xanh dương */
                    90% { border-bottom-color:rgb(122, 210, 247); } /* Tím */
                    100% { border-bottom-color: #8D7EF7; } /* Tím */
                }
                .rainbow-border-animation {
                    animation: rainbow-border 3s linear infinite;
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    return (
        <div className="mt-4 mb-12 relative" ref={searchBarRef}>
            <Input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                leftIcon={<SearchIcon />}
                autoFocus
                className={`bg-transparent border-0 border-b-4 border-gray-100 rounded-none shadow-none focus:ring-0 text-4xl py-4 leading-[1.6] pl-14 placeholder:text-gray-300 ${
                    isFocused ? 'rainbow-border-animation' : ''
                }`}
            />
            
            {/* Auto Complete Dropdown */}
            {showSuggestions && (
                <div
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 bg-white z-50 max-h-128 overflow-y-auto shadow-xl shadow-black/10 rounded-b-3xl pb-4"
                >
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            type="button"
                            className={`w-full text-left px-14 py-4 hover:bg-gray-50 transition-colors ${
                                index === selectedIndex ? 'bg-gray-100' : ''
                            }`}
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent input blur before click
                            }}
                            onClick={() => handleSuggestionClick(suggestion)}
                        >
                            
                            <span className="text-gray-800 text-lg">{suggestion.title}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SearchBar;