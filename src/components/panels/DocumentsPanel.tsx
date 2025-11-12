'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  faquizApiService, 
  DocumentGroup, 
  DocumentGroupWithContent, 
  DocumentWithContent,
  googleSearchApiService,
  GoogleSearchResult,
  GoogleSearchPagination
} from '@/lib/api';
import { removeVietnameseDiacritics } from '@/lib/utils';
import Markdown from '@/components/common/Markdown';
import { useAuth } from '@/hooks/useAuth';

interface DocumentsPanelProps {
  onClose: () => void;
  initialSearchQuery?: string;
  initialActiveTab?: ContentType;
}

type ContentType = 'sach' | 'web' | 'anh' | 'video';

const BG_COLORS = ['#47B2FF1A', '#14DD1C1A', '#8D7EF71A', '#FFAA001A'];
const TEXT_COLORS = ['#47B2FF', '#14DD1C', '#8D7EF7', '#FFAA00'];

// Hàm lấy màu background và text tương ứng dựa trên index
const getColorPair = (index: number): { bg: string; text: string } => {
  const colorIndex = index % BG_COLORS.length;
  return {
    bg: BG_COLORS[colorIndex],
    text: TEXT_COLORS[colorIndex],
  };
};

// Hàm extract YouTube video ID từ URL
const getYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

// Hàm lấy YouTube thumbnail URL
const getYouTubeThumbnail = (url: string): string | null => {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;
  
  // Thử maxresdefault trước, nếu không có thì fallback về hqdefault
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

const DocumentsPanel: React.FC<DocumentsPanelProps> = ({ onClose, initialSearchQuery = '', initialActiveTab = 'sach' }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [groups, setGroups] = useState<DocumentGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ContentType>(initialActiveTab);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridCols, setGridCols] = useState(2);

  // Kiểm tra PRO - nếu không phải PRO thì đóng panel
  const isPaid = user?.faQuizInfo?.isPaid === true;
  
  useEffect(() => {
    if (user && !isPaid) {
      // Đóng panel nếu user không phải PRO
      onClose();
    }
  }, [user, isPaid, onClose]);
  
  // Detail view states
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [detailGroups, setDetailGroups] = useState<DocumentGroupWithContent[]>([]);
  const [selectedDocumentIndex, setSelectedDocumentIndex] = useState<{ groupIndex: number; docIndex: number } | null>(null);
  const [contentSearchQuery, setContentSearchQuery] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [currentHighlightIndex, setCurrentHighlightIndex] = useState(0);
  const markdownContentRef = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  // Google Search states
  const [googleSearchResults, setGoogleSearchResults] = useState<GoogleSearchResult[]>([]);
  const [googleSearchPagination, setGoogleSearchPagination] = useState<GoogleSearchPagination | null>(null);
  const [loadingGoogleSearch, setLoadingGoogleSearch] = useState(false);
  const [googleSearchError, setGoogleSearchError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Update searchQuery when initialSearchQuery changes
  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Update activeTab when initialActiveTab changes
  useEffect(() => {
    if (initialActiveTab) {
      setActiveTab(initialActiveTab);
    }
  }, [initialActiveTab]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await faquizApiService.getDocuments();
        if (response.data && response.data.groups) {
          setGroups(response.data.groups || []);
        }
      } catch (err: any) {
        // Tự động chuyển đến trang đăng nhập khi gặp lỗi 401
        if (err.response?.status === 401) {
          router.replace('/login');
          return;
        }
        setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Reset Google Search results khi chuyển tab
  useEffect(() => {
    if (activeTab === 'sach') {
      setGoogleSearchResults([]);
      setGoogleSearchPagination(null);
      setGoogleSearchError(null);
    }
  }, [activeTab]);

  // Google Search effect - chỉ gọi khi tab là web/anh/video và có searchQuery
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Chỉ search khi tab là web, anh, hoặc video
    if (activeTab !== 'web' && activeTab !== 'anh' && activeTab !== 'video') {
      return;
    }

    // Nếu không có searchQuery, clear results
    if (!searchQuery.trim()) {
      setGoogleSearchResults([]);
      setGoogleSearchPagination(null);
      setGoogleSearchError(null);
      return;
    }

    // Debounce search - đợi 500ms sau khi user ngừng gõ
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setLoadingGoogleSearch(true);
        setGoogleSearchError(null);
        
        // Map tab to API type
        const typeMap: Record<'web' | 'anh' | 'video', 'website' | 'image' | 'video'> = {
          web: 'website',
          anh: 'image',
          video: 'video',
        };

        // Thêm site:youtube.com cho tab video
        let keyword = searchQuery.trim();
        if (activeTab === 'video') {
          keyword = `${keyword} site:youtube.com`;
        }

        const response = await googleSearchApiService.search({
          keyword: keyword,
          type: typeMap[activeTab as 'web' | 'anh' | 'video'],
          pageOffset: 0,
          pageSize: 10,
        });

        if (response.data) {
          setGoogleSearchResults(response.data.results || []);
          setGoogleSearchPagination(response.data.pagination || null);
        }
      } catch (err: any) {
        if (err.response?.status === 401) {
          router.replace('/login');
          return;
        }
        setGoogleSearchError(err.message || 'Có lỗi xảy ra khi tìm kiếm');
        setGoogleSearchResults([]);
        setGoogleSearchPagination(null);
      } finally {
        setLoadingGoogleSearch(false);
      }
    }, 500);

    // Cleanup
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, activeTab, router]);

  // Filter groups theo search query và activeTab
  const filteredGroups = useMemo(() => {
    let filtered = groups;

    // Filter theo tab (hiện tại chỉ có "Sách" có dữ liệu)
    if (activeTab === 'sach') {
      // Hiển thị tất cả groups khi chọn tab Sách
      filtered = groups;
    } else {
      // Các tab khác chưa có dữ liệu, trả về mảng rỗng
      filtered = [];
    }

    // Filter theo search query nếu có (search theo bookTitle, author, publisher, university)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const queryNoDiacritics = removeVietnameseDiacritics(query).toLowerCase();
      
      filtered = filtered.filter((group) => {
        const bookTitle = group.bookTitle || '';
        const author = group.author || '';
        const publisher = group.publisher || '';
        const university = group.university || '';
        
        // Normalize cả có dấu và không dấu
        const bookTitleLower = bookTitle.toLowerCase();
        const authorLower = author.toLowerCase();
        const publisherLower = publisher.toLowerCase();
        const universityLower = university.toLowerCase();
        const bookTitleNoDiacritics = removeVietnameseDiacritics(bookTitle).toLowerCase();
        const authorNoDiacritics = removeVietnameseDiacritics(author).toLowerCase();
        const publisherNoDiacritics = removeVietnameseDiacritics(publisher).toLowerCase();
        const universityNoDiacritics = removeVietnameseDiacritics(university).toLowerCase();
        
        // Tìm kiếm: có thể match với text có dấu hoặc không dấu
        return (
          bookTitleLower.includes(query) ||
          authorLower.includes(query) ||
          publisherLower.includes(query) ||
          universityLower.includes(query) ||
          bookTitleNoDiacritics.includes(queryNoDiacritics) ||
          authorNoDiacritics.includes(queryNoDiacritics) ||
          publisherNoDiacritics.includes(queryNoDiacritics) ||
          universityNoDiacritics.includes(queryNoDiacritics)
        );
      });
    }

    return filtered;
  }, [searchQuery, groups, activeTab]);

  // Detect panel width và cập nhật số cột grid
  useEffect(() => {
    const updateGridCols = () => {
      if (containerRef.current && typeof window !== 'undefined') {
        const panelWidth = containerRef.current.offsetWidth;
        const viewportWidth = window.innerWidth;
        const percentage = (panelWidth / viewportWidth) * 100;
        
        // 40-50%: 3 cột
        // 30-40%: 2 cột
        // < 30%: 1 cột
        if (percentage >= 45 && percentage <= 50) {
          setGridCols(3);
        } else if (percentage >= 30 && percentage < 45) {
          setGridCols(2);
        } else {
          setGridCols(1);
        }
      }
    };

    updateGridCols();
    const resizeObserver = new ResizeObserver(updateGridCols);
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateGridCols);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateGridCols);
    };
  }, []);

  // Handle card click
  const handleCardClick = async (group: DocumentGroup) => {
    try {
      setLoadingContent(true);
      setError(null);
      const response = await faquizApiService.getDocumentsWithContent({
        bookTitles: group.bookTitle || null,
        universities: group.university || null,
        authors: group.author || null,
        publishYears: group.publishYear || null,
      });
      
      if (response.data && response.data.groups && response.data.groups.length > 0) {
        setDetailGroups(response.data.groups);
        // Select first document by default
        if (response.data.groups[0].documents.length > 0) {
          setSelectedDocumentIndex({ groupIndex: 0, docIndex: 0 });
        }
        setViewMode('detail');
        setContentSearchQuery('');
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.replace('/login');
        return;
      }
      setError(err.message || 'Có lỗi xảy ra khi tải nội dung');
    } finally {
      setLoadingContent(false);
    }
  };

  // Get current document
  const currentDocument = useMemo(() => {
    if (!selectedDocumentIndex || !detailGroups.length) return null;
    const { groupIndex, docIndex } = selectedDocumentIndex;
    if (detailGroups[groupIndex] && detailGroups[groupIndex].documents[docIndex]) {
      return detailGroups[groupIndex].documents[docIndex];
    }
    return null;
  }, [selectedDocumentIndex, detailGroups]);

  // Component để render markdown với highlight
  const MarkdownWithHighlight: React.FC<{ content: string; searchQuery: string }> = ({ content, searchQuery }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!contentRef.current || !searchQuery.trim()) return;

      const element = contentRef.current;
      const query = searchQuery.trim();
      const queryNoDiacritics = removeVietnameseDiacritics(query).toLowerCase();

      // Remove existing highlights
      const marks = element.querySelectorAll('mark.highlight-search');
      marks.forEach(mark => {
        const parent = mark.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
          parent.normalize();
        }
      });

      // Highlight text in all text nodes
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );

      const textNodes: Text[] = [];
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent && node.textContent.trim()) {
          textNodes.push(node as Text);
        }
      }

      textNodes.forEach(textNode => {
        const text = textNode.textContent || '';
        const textLower = text.toLowerCase();
        const textNoDiacritics = removeVietnameseDiacritics(text).toLowerCase();
        const queryLower = query.toLowerCase();

        if (textLower.includes(queryLower) || textNoDiacritics.includes(queryNoDiacritics)) {
          const parent = textNode.parentNode;
          if (!parent) return;

          // Create a document fragment to hold the highlighted content
          const fragment = document.createDocumentFragment();
          let lastIndex = 0;
          let searchIndex = 0;

          // Try to find matches
          while (true) {
            const index = textLower.indexOf(queryLower, searchIndex);
            if (index === -1) {
              // No more matches, add remaining text
              if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
              }
              break;
            }

            // Add text before match
            if (index > lastIndex) {
              fragment.appendChild(document.createTextNode(text.substring(lastIndex, index)));
            }

            // Add highlighted match
            const match = text.substring(index, index + query.length);
            const mark = document.createElement('mark');
            mark.className = 'highlight-search bg-yellow-300 dark:bg-yellow-500/50';
            mark.textContent = match;
            fragment.appendChild(mark);

            lastIndex = index + query.length;
            searchIndex = index + 1;
          }

          parent.replaceChild(fragment, textNode);
        }
      });
    }, [content, searchQuery]);

    return (
      <div ref={contentRef}>
        <Markdown content={content} />
      </div>
    );
  };

  // Get all documents from all groups for vertical tabs
  const allDocuments = useMemo(() => {
    const docs: Array<{ groupIndex: number; docIndex: number; document: DocumentWithContent; group: DocumentGroupWithContent }> = [];
    detailGroups.forEach((group, groupIndex) => {
      group.documents.forEach((doc, docIndex) => {
        docs.push({ groupIndex, docIndex, document: doc, group });
      });
    });
    return docs;
  }, [detailGroups]);

  // Helper function to find snippets with highlight
  const findSnippets = useCallback((content: string, query: string, maxSnippets: number = 2): Array<{ text: string; position: number }> => {
    if (!query.trim() || !content) return [];
    
    const queryLower = query.toLowerCase().trim();
    const queryNoDiacritics = removeVietnameseDiacritics(queryLower);
    const contentLower = content.toLowerCase();
    const contentNoDiacritics = removeVietnameseDiacritics(content);
    
    const snippets: Array<{ text: string; position: number }> = [];
    const lines = content.split('\n');
    
    // Find all matches in content
    const matches: Array<{ lineIndex: number; matchIndex: number; position: number }> = [];
    let currentPosition = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();
      const lineNoDiacritics = removeVietnameseDiacritics(line).toLowerCase();
      
      // Find match in this line
      let matchIndex = lineLower.indexOf(queryLower);
      if (matchIndex === -1) {
        matchIndex = lineNoDiacritics.indexOf(queryNoDiacritics);
      }
      
      if (matchIndex !== -1) {
        matches.push({
          lineIndex: i,
          matchIndex: matchIndex,
          position: currentPosition + matchIndex
        });
      }
      
      currentPosition += line.length + 1; // +1 for newline
    }
    
    // Get snippets from matches (limit to maxSnippets)
    for (let i = 0; i < Math.min(matches.length, maxSnippets); i++) {
      const match = matches[i];
      const lineIndex = match.lineIndex;
      
      // Get context: current line + next line if available (tối đa 2 dòng)
      let snippetText = lines[lineIndex];
      if (lineIndex + 1 < lines.length) {
        snippetText += ' ' + lines[lineIndex + 1];
      }
      
      // Limit to approximately 200 chars
      if (snippetText.length > 200) {
        // Try to center around the match
        const matchPosInSnippet = match.matchIndex;
        const start = Math.max(0, matchPosInSnippet - 80);
        const end = Math.min(snippetText.length, matchPosInSnippet + query.length + 80);
        snippetText = (start > 0 ? '...' : '') + snippetText.substring(start, end) + (end < snippetText.length ? '...' : '');
      }
      
      snippets.push({
        text: snippetText,
        position: match.position
      });
    }
    
    return snippets;
  }, []);

  // Helper function to highlight keyword in text
  const highlightKeyword = (text: string, keyword: string): string => {
    if (!keyword.trim()) return text;
    
    const query = keyword.trim();
    const queryLower = query.toLowerCase();
    const queryNoDiacritics = removeVietnameseDiacritics(queryLower);
    const textLower = text.toLowerCase();
    const textNoDiacritics = removeVietnameseDiacritics(text).toLowerCase();
    
    // Find all match ranges (start, end)
    const ranges: Array<{ start: number; end: number }> = [];
    let searchIndex = 0;
    
    while (searchIndex < text.length) {
      // Try to find match in lowercase
      let matchIndex = textLower.indexOf(queryLower, searchIndex);
      if (matchIndex === -1) {
        // Try without diacritics
        matchIndex = textNoDiacritics.indexOf(queryNoDiacritics, searchIndex);
      }
      
      if (matchIndex === -1) break;
      
      ranges.push({ start: matchIndex, end: matchIndex + query.length });
      searchIndex = matchIndex + query.length;
    }
    
    if (ranges.length === 0) return text;
    
    // Build highlighted text by splitting and joining
    const parts: string[] = [];
    let lastIndex = 0;
    
    for (const range of ranges) {
      // Add text before match
      if (range.start > lastIndex) {
        parts.push(text.substring(lastIndex, range.start));
      }
      // Add highlighted match
      const matched = text.substring(range.start, range.end);
      parts.push(`<mark class="bg-yellow-300 dark:bg-yellow-500/50">${matched}</mark>`);
      lastIndex = range.end;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.join('');
  };

  // Search results with snippets
  const searchResults = useMemo(() => {
    if (!contentSearchQuery.trim() || !isSearchFocused) return [];
    
    const query = contentSearchQuery.trim();
    const queryLower = query.toLowerCase();
    const queryNoDiacritics = removeVietnameseDiacritics(queryLower);
    
    const results: Array<{
      groupIndex: number;
      docIndex: number;
      document: DocumentWithContent;
      group: DocumentGroupWithContent;
      snippets: Array<{ text: string; position: number }>;
    }> = [];
    
    allDocuments.forEach(({ groupIndex, docIndex, document, group }) => {
      const chapter = document.chapter || '';
      const content = document.content || '';
      
      const chapterLower = chapter.toLowerCase();
      const contentLower = content.toLowerCase();
      const chapterNoDiacritics = removeVietnameseDiacritics(chapter).toLowerCase();
      const contentNoDiacritics = removeVietnameseDiacritics(content).toLowerCase();
      
      // Check if chapter or content matches
      const chapterMatches = chapterLower.includes(queryLower) || chapterNoDiacritics.includes(queryNoDiacritics);
      const contentMatches = contentLower.includes(queryLower) || contentNoDiacritics.includes(queryNoDiacritics);
      
      if (chapterMatches || contentMatches) {
        const snippets = findSnippets(content, query, 2);
        results.push({
          groupIndex,
          docIndex,
          document,
          group,
          snippets
        });
      }
    });
    
    return results;
  }, [allDocuments, contentSearchQuery, isSearchFocused, findSnippets]);

  // Filter documents by search query
  const filteredDocuments = useMemo(() => {
    if (!contentSearchQuery.trim()) return allDocuments;
    
    const query = contentSearchQuery.toLowerCase().trim();
    const queryNoDiacritics = removeVietnameseDiacritics(query).toLowerCase();
    
    return allDocuments.filter(({ document }) => {
      const chapter = document.chapter || '';
      const content = document.content || '';
      
      const chapterLower = chapter.toLowerCase();
      const contentLower = content.toLowerCase();
      const chapterNoDiacritics = removeVietnameseDiacritics(chapter).toLowerCase();
      const contentNoDiacritics = removeVietnameseDiacritics(content).toLowerCase();
      
      return (
        chapterLower.includes(query) ||
        contentLower.includes(query) ||
        chapterNoDiacritics.includes(queryNoDiacritics) ||
        contentNoDiacritics.includes(queryNoDiacritics)
      );
    });
  }, [allDocuments, contentSearchQuery]);

  // Load more Google Search results (pagination) - tự động gọi khi scroll
  const loadMoreGoogleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !googleSearchPagination) return;
    if (loadingGoogleSearch) return;

    const nextPageOffset = (googleSearchPagination.pageOffset || 0) + 1;
    if (nextPageOffset >= (googleSearchPagination.totalPages || 0)) return;

    try {
      setLoadingGoogleSearch(true);
      setGoogleSearchError(null);
      
      const typeMap: Record<'web' | 'anh' | 'video', 'website' | 'image' | 'video'> = {
        web: 'website',
        anh: 'image',
        video: 'video',
      };

      // Thêm site:youtube.com cho tab video
      let keyword = searchQuery.trim();
      if (activeTab === 'video') {
        keyword = `${keyword} site:youtube.com`;
      }

      const response = await googleSearchApiService.search({
        keyword: keyword,
        type: typeMap[activeTab as 'web' | 'anh' | 'video'],
        pageOffset: nextPageOffset,
        pageSize: 10,
      });

      if (response.data) {
        setGoogleSearchResults(prev => [...prev, ...(response.data.results || [])]);
        setGoogleSearchPagination(response.data.pagination || null);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.replace('/login');
        return;
      }
      setGoogleSearchError(err.message || 'Có lỗi xảy ra khi tải thêm kết quả');
    } finally {
      setLoadingGoogleSearch(false);
    }
  }, [searchQuery, googleSearchPagination, loadingGoogleSearch, activeTab, router]);

  // Infinite scroll detection
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    
    // Chỉ enable infinite scroll cho tab web/anh/video
    if (activeTab !== 'web' && activeTab !== 'anh' && activeTab !== 'video') return;
    if (!googleSearchPagination) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      // Load more khi còn cách đáy 200px
      if (scrollHeight - scrollTop - clientHeight < 200) {
        loadMoreGoogleSearch();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [loadMoreGoogleSearch, activeTab, googleSearchPagination]);

  // Get total number of highlights
  const getTotalHighlights = useCallback((): number => {
    if (!markdownContentRef.current || !contentSearchQuery.trim()) return 0;
    const marks = markdownContentRef.current.querySelectorAll('mark.highlight-search');
    return marks.length;
  }, [contentSearchQuery]);

  // Scroll to highlight at specific index
  const scrollToHighlight = useCallback((index: number) => {
    if (!markdownContentRef.current) return;
    
    const container = markdownContentRef.current;
    const marks = container.querySelectorAll('mark.highlight-search');
    
    if (marks.length === 0) return;
    
    // Clamp index to valid range
    const clampedIndex = Math.max(0, Math.min(index, marks.length - 1));
    const targetMark = marks[clampedIndex] as HTMLElement;
    
    if (targetMark) {
      targetMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setCurrentHighlightIndex(clampedIndex);
    }
  }, []);

  // Navigate to next highlight
  const goToNextHighlight = useCallback(() => {
    const total = getTotalHighlights();
    if (total === 0) return;
    const nextIndex = (currentHighlightIndex + 1) % total;
    scrollToHighlight(nextIndex);
  }, [currentHighlightIndex, getTotalHighlights, scrollToHighlight]);

  // Navigate to previous highlight
  const goToPreviousHighlight = useCallback(() => {
    const total = getTotalHighlights();
    if (total === 0) return;
    const prevIndex = currentHighlightIndex === 0 ? total - 1 : currentHighlightIndex - 1;
    scrollToHighlight(prevIndex);
  }, [currentHighlightIndex, getTotalHighlights, scrollToHighlight]);

  // Reset highlight index when search query changes
  useEffect(() => {
    setCurrentHighlightIndex(0);
  }, [contentSearchQuery]);

  // Auto scroll to first highlight when highlights are created
  useEffect(() => {
    if (!contentSearchQuery.trim() || isSearchFocused) return;
    
    // Wait for highlights to be rendered
    const timeout = setTimeout(() => {
      const total = getTotalHighlights();
      if (total > 0 && currentHighlightIndex === 0) {
        scrollToHighlight(0);
      }
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [contentSearchQuery, currentDocument, isSearchFocused, getTotalHighlights, currentHighlightIndex, scrollToHighlight]);

  // Scroll to keyword in markdown content
  const scrollToKeyword = useCallback((keyword: string) => {
    if (!markdownContentRef.current || !keyword.trim()) return;
    
    const container = markdownContentRef.current;
    const query = keyword.trim();
    const queryLower = query.toLowerCase();
    const queryNoDiacritics = removeVietnameseDiacritics(queryLower);
    
    // Wait a bit for highlights to be rendered
    setTimeout(() => {
      // Try to find existing highlighted marks first
      const existingMarks = container.querySelectorAll('mark.highlight-search');
      if (existingMarks.length > 0) {
        setCurrentHighlightIndex(0);
        existingMarks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      
      // Find all text nodes that contain the keyword
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent || '';
        const textLower = text.toLowerCase();
        const textNoDiacritics = removeVietnameseDiacritics(text).toLowerCase();
        
        if (textLower.includes(queryLower) || textNoDiacritics.includes(queryNoDiacritics)) {
          // Find the first occurrence
          let matchIndex = textLower.indexOf(queryLower);
          if (matchIndex === -1) {
            matchIndex = textNoDiacritics.indexOf(queryNoDiacritics);
          }
          
          if (matchIndex !== -1) {
            // Create a range to get the position
            try {
              const range = document.createRange();
              range.setStart(node, matchIndex);
              range.setEnd(node, Math.min(matchIndex + query.length, node.textContent?.length || 0));
              
              // Scroll to the range
              const rect = range.getBoundingClientRect();
              const containerRect = container.getBoundingClientRect();
              const scrollTop = container.scrollTop + rect.top - containerRect.top - (containerRect.height / 2);
              
              container.scrollTo({
                top: Math.max(0, scrollTop),
                behavior: 'smooth'
              });
            } catch (e) {
              // If range fails, try scrolling to parent element
              const parent = node.parentElement;
              if (parent) {
                parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
            break;
          }
        }
      }
    }, 300);
  }, []);

  const SearchIcon = () => (
    <svg
      className="w-6 h-6 fill-gray-500 opacity-20 dark:fill-white dark:opacity-20"
      viewBox="0 0 12 12"
      width="24"
      height="24"
    >
      <path d="M11.5306 11.5247C11.7901 11.2636 11.7893 10.8417 11.529 10.5815L10.1235 9.17686C10.8915 8.2158 11.3523 6.99444 11.3523 5.67297C11.3523 2.54283 8.80801 0 5.67613 0C2.54424 0 0 2.54283 0 5.67297C0 8.80311 2.54424 11.3459 5.67613 11.3459C6.99833 11.3459 8.22037 10.8854 9.18197 10.1246L10.5846 11.5264C10.846 11.7877 11.2701 11.787 11.5306 11.5247ZM5.67613 10.0111C3.28548 10.0111 1.33556 8.06229 1.33556 5.67297C1.33556 3.28365 3.28548 1.33482 5.67613 1.33482C8.06678 1.33482 10.0167 3.28365 10.0167 5.67297C10.0167 8.06229 8.06678 10.0111 5.67613 10.0111Z"></path>
    </svg>
  );

  // Render detail view
  if (viewMode === 'detail') {
    // Filter chapters theo keyword khi focus vào search
    const chaptersToShow = isSearchFocused 
      ? (contentSearchQuery.trim() ? filteredDocuments : allDocuments)
      : allDocuments;
    
    // Lấy placeholder dựa trên bookTitle hiện tại
    const searchPlaceholder = currentDocument?.bookTitle 
      ? `Tìm trong ${currentDocument.bookTitle}...`
      : 'Tìm kiếm...';
    
    return (
      <div ref={containerRef} className="bg-gray-100/60 dark:bg-white/5 flex flex-col h-full">
        {/* Header với search bar */}
        <div className="flex items-center gap-4 p-4">
          {/* Back button */}
          <button
            onClick={() => {
              setViewMode('list');
              setDetailGroups([]);
              setSelectedDocumentIndex(null);
              setContentSearchQuery('');
              setIsSearchFocused(false);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex-shrink-0"
            aria-label="Quay lại"
          >
            <svg
              className="w-6 h-6 text-gray-700 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Search input */}
          <div className="flex-1 flex justify-center">
            <div className="relative max-w-sm w-full">
              <input
                type="text"
                value={contentSearchQuery}
                onChange={(e) => setContentSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={(e) => {
                  // Check if blur is caused by clicking on chapter list or navigation buttons
                  const relatedTarget = e.relatedTarget as HTMLElement;
                  if (searchResultsRef.current && relatedTarget && searchResultsRef.current.contains(relatedTarget)) {
                    return; // Don't blur if clicking on chapter list
                  }
                  // Don't blur if clicking on navigation buttons
                  if (relatedTarget && (relatedTarget.closest('.nav-highlight-button') || relatedTarget.closest('.highlight-counter'))) {
                    return;
                  }
                  setIsSearchFocused(false);
                }}
                placeholder={searchPlaceholder}
                className={`w-full rounded-full bg-white dark:bg-white/5 py-4 text-gray-900 dark:text-white placeholder:text-gray-400 focus-within:bg-white dark:focus-within:bg-white/10 border-2 border-transparent focus-within:border-2 border-white/5 focus-within:border-white/10 focus:outline-none shadow-sm focus-within:shadow-none ${
                  getTotalHighlights() > 0 ? 'pl-8 pr-32' : 'px-8 pr-16'
                }`}
                autoComplete="off"
              />
              {getTotalHighlights() > 0 && !isSearchFocused ? (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-auto">

                  {/* Previous button */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      goToPreviousHighlight();
                    }}
                    className="nav-highlight-button flex-shrink-0"
                    aria-label="Kết quả trước"
                  >
                    <svg
                      className="w-4 h-4 text-gray-600 dark:text-gray-300 opacity-50 hover:opacity-100 hover:scale-110 transition-all duration-200"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>

                  {/* Counter */}
                  <span className="highlight-counter text-xs text-gray-400 dark:text-gray-200 px-2 select-none">
                    {currentHighlightIndex + 1}/{getTotalHighlights()}
                  </span>
                  {/* Next button */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      goToNextHighlight();
                    }}
                    className="nav-highlight-button flex-shrink-0"
                    aria-label="Kết quả tiếp theo"
                  >
                    <svg
                      className="w-4 h-4 text-gray-600 dark:text-gray-300 opacity-50 hover:opacity-100 hover:scale-110 transition-all duration-200"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none">
                  <SearchIcon />
                </div>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex-shrink-0"
            aria-label="Đóng"
          >
            <svg
              className="w-6 h-6 text-gray-700 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content area */}
        {isSearchFocused ? (
          /* Hiện search results với snippets khi có keyword, hoặc danh sách chapter khi không có keyword */
          <div ref={searchResultsRef} className="flex-1 overflow-hidden">
            {contentSearchQuery.trim() && searchResults.length > 0 ? (
              /* Hiện search results với snippets khi có keyword */
              <div className="h-full overflow-y-auto p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-700">
                <div className="space-y-3">
                  {searchResults.map((result, resultIndex) => (
                    <div key={`${result.groupIndex}-${result.docIndex}-${resultIndex}`}>
                      {result.snippets.map((snippet, snippetIndex) => (
                        <button
                          key={`${result.groupIndex}-${result.docIndex}-${snippetIndex}`}
                          onClick={() => {
                            setSelectedDocumentIndex({ groupIndex: result.groupIndex, docIndex: result.docIndex });
                            setIsSearchFocused(false);
                            // Wait for markdown to render then scroll
                            setTimeout(() => {
                              scrollToKeyword(contentSearchQuery);
                            }, 300);
                          }}
                          className="w-full text-left p-6 rounded-2xl bg-white dark:bg-white/5 hover:cursor-pointer shadow-sm mb-4"
                        >
                          {/* Chapter title - tối đa 1 dòng */}
                          <div className="font-medium text-gray-900 dark:text-white line-clamp-1 mb-2">
                            {result.document.chapter || 'Không rõ'}
                          </div>
                          {/* Content snippet - tối đa 2 dòng, có highlight */}
                          <div 
                            className="text-gray-600 dark:text-gray-300 line-clamp-2"
                            dangerouslySetInnerHTML={{ __html: highlightKeyword(snippet.text, contentSearchQuery) }}
                          />
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : contentSearchQuery.trim() ? (
              /* Không tìm thấy kết quả */
              <div className="h-full flex items-center justify-center">
                <div className="text-gray-400 dark:text-gray-500">Không tìm thấy kết quả</div>
              </div>
            ) : (
              /* Hiện danh sách chapter khi không có keyword */
              <div className="h-full overflow-y-auto px-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-700">
                {loadingContent ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-gray-400 dark:text-gray-500">Đang tải...</div>
                  </div>
                ) : chaptersToShow.length > 0 ? (
                  <div className="space-y-1">
                    {chaptersToShow.map(({ groupIndex, docIndex, document, group }) => {
                      const isSelected = selectedDocumentIndex?.groupIndex === groupIndex && 
                                         selectedDocumentIndex?.docIndex === docIndex;
                      return (
                        <button
                          key={`${groupIndex}-${docIndex}-${document.id}`}
                          onClick={() => {
                            setSelectedDocumentIndex({ groupIndex, docIndex });
                            setIsSearchFocused(false);
                          }}
                          className={`w-full text-left px-6 py-4 rounded-2xl transition-all ${
                            isSelected
                              ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                              : 'text-gray-500 dark:text-gray-300 hover:cursor-pointer hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          <div className="line-clamp-2">
                            {document.chapter || 'Không rõ'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-400 dark:text-gray-500 text-sm">
                    Không có dữ liệu
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Hiện markdown content khi không focus vào search */
          <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-700" ref={markdownContentRef}>
            {loadingContent ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-gray-400 dark:text-gray-500">Đang tải nội dung...</div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-red-400">{error}</div>
              </div>
            ) : currentDocument && currentDocument.content ? (
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <MarkdownWithHighlight 
                  content={currentDocument.content}
                  searchQuery={contentSearchQuery}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center py-20">
                <div className="text-gray-400 dark:text-gray-500">
                  {selectedDocumentIndex ? 'Không có nội dung' : 'Chọn một tài liệu để xem nội dung'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Render list view
  return (
    <div ref={containerRef} className="bg-gray-100/60 dark:bg-white/5 flex flex-col h-full">
      {/* Header của panel */}
      <div className="flex items-center gap-4 p-4">
        {/* Menu icon - luôn hiện */}
        <button
          className="p-2 rounded transition-colors flex-shrink-0 hover:cursor-not-allowed opacity-20"
          disabled
          aria-label="Menu"
        >
          <svg
            className="text-gray-700 dark:text-gray-300"
            width="18"
            height="14"
            viewBox="0 0 18 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="18" height="4" rx="2" fill="currentColor" />
            <rect y="10" width="12" height="4" rx="2" fill="currentColor" />
          </svg>
        </button>

        {/* Search input - luôn hiện, nằm chính giữa */}
        <div className="flex-1 flex justify-center">
          <div className="relative max-w-sm w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const newValue = e.target.value;
                setSearchQuery(newValue);
              }}
              placeholder="Tìm kiếm..."
              className="w-full rounded-full bg-white dark:bg-white/5 px-8 py-4 pr-16 text-gray-900 dark:text-white placeholder:text-gray-400 focus-within:bg-white dark:focus-within:bg-white/10 border-2 border-transparent focus-within:border-2 border-white/5 focus-within:border-white/10 focus:outline-none shadow-sm focus-within:shadow-none"
              autoComplete="off"
            />
            <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex-shrink-0"
          aria-label="Đóng"
        >
          <svg
            className="w-6 h-6 text-gray-700 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 px-4 py-3">
        <button
          onClick={() => setActiveTab('sach')}
          className={`px-6 py-2 rounded-full font-medium hover:scale-105 transition-all duration-200 border-2 ${
            activeTab === 'sach'
              ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm border-transparent'
              : 'bg-transparent dark:bg-white/5 text-gray-500 dark:text-white/50 border-gray-200 dark:border-white/10'
          }`}
        >
          Sách
        </button>
        <button
          onClick={() => setActiveTab('web')}
          className={`px-6 py-2 rounded-full font-medium hover:scale-105 transition-all duration-200 border-2 ${
            activeTab === 'web'
              ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm border-transparent'
              : 'bg-transparent dark:bg-white/5 text-gray-500 dark:text-white/50 border-gray-200 dark:border-white/10'
          }`}
        >
          Web
        </button>
        <button
          onClick={() => setActiveTab('anh')}
          className={`px-6 py-2 rounded-full font-medium hover:scale-105 transition-all duration-200 border-2 ${
            activeTab === 'anh'
              ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm border-transparent'
              : 'bg-transparent dark:bg-white/5 text-gray-500 dark:text-white/50 border-gray-200 dark:border-white/10'
          }`}
        >
          Ảnh
        </button>
        <button
          onClick={() => setActiveTab('video')}
          className={`px-6 py-2 rounded-full font-medium hover:scale-105 transition-all duration-200 border-2 ${
            activeTab === 'video'
              ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm border-transparent'
              : 'bg-transparent dark:bg-white/5 text-gray-500 dark:text-white/50 border-gray-200 dark:border-white/10'
          }`}
        >
          Video
        </button>
      </div>

      {/* Nội dung panel */}
      <div className="flex-1 overflow-hidden">
        <div 
          ref={scrollContainerRef}
          className="h-full overflow-y-auto p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-700"
        >
          {/* Tab Sách - hiển thị documents */}
          {activeTab === 'sach' && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-gray-400 dark:text-gray-500">Đang tải...</div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-red-400">{error}</div>
                </div>
              ) : (
                <>
                  {filteredGroups.length > 0 ? (
                    <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
                      {filteredGroups.map((group, index) => {
                        const { bg, text } = getColorPair(index);
                        return (
                          <div
                            key={`${group.university}-${group.bookTitle}-${index}`}
                            onClick={() => handleCardClick(group)}
                            className="rounded-3xl w-full min-w-[200px] aspect-[200/280] cursor-pointer hover:scale-105 transition-all overflow-hidden flex flex-col"
                            style={{ backgroundColor: bg }}
                          >
                            <div className="flex-1 flex flex-col justify-end p-6">
                              {/* {group.author && (
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1 line-clamp-1">
                                  {group.author}
                                </p>
                              )}
                              {(group.publisher || group.publishYear) && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                  {group.publisher && <span>{group.publisher}</span>}
                                  {group.publisher && group.publishYear && <span> • </span>}
                                  {group.publishYear && <span>{group.publishYear}</span>}
                                </p>
                              )} */}
                              {group.university && (
                                <p className="line-clamp-2 flex-1 text-lg font-medium" 
                                style={{ color: text }}>
                                  {group.university}
                                </p>
                              )}
                              
                              <h2 
                                className="text-2xl text-gray-800 dark:text-white font-semibold line-clamp-4"
                              >
                                {group.bookTitle}
                              </h2>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <p className="text-gray-400 dark:text-gray-500">
                        {searchQuery.trim() 
                          ? `Không tìm thấy kết quả nào cho "${searchQuery}"`
                          : 'Không có dữ liệu'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Tab Web/Ảnh/Video - hiển thị Google Search results */}
          {(activeTab === 'web' || activeTab === 'anh' || activeTab === 'video') && (
            <>
              {loadingGoogleSearch && googleSearchResults.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-gray-400 dark:text-gray-500">Đang tìm kiếm...</div>
                </div>
              ) : googleSearchError ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-red-400">{googleSearchError}</div>
                </div>
              ) : !searchQuery.trim() ? (
                <div className="text-center py-20">
                  <p className="text-gray-400 dark:text-gray-500">Nhập từ khóa để tìm kiếm</p>
                </div>
              ) : googleSearchResults.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-gray-400 dark:text-gray-500">
                    Không tìm thấy kết quả nào cho "{searchQuery}"
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Kết quả tìm kiếm */}
                  {activeTab === 'web' && (
                    <div className="space-y-3">
                      {googleSearchResults.map((result, index) => {
                        const { text: displayLinkColor } = getColorPair(index);
                        return (
                        <a
                          key={index}
                          href={result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-6 rounded-2xl bg-white shadow-sm hover:cursor-pointer dark:hover:bg-white/5 hover:scale-105 transition-all duration-200"
                        >
                          <div className="text-xs font-medium mb-2" style={{ color: displayLinkColor }}>
                            {result.displayLink}
                          </div>
                          <h3 
                            className="text-lg font-medium text-[#8D71FF] dark:text-blue-400 mb-1 line-clamp-1"
                            dangerouslySetInnerHTML={{ __html: highlightKeyword(result.title || '', searchQuery) }}
                          />
                          <p 
                            className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2"
                            dangerouslySetInnerHTML={{ __html: highlightKeyword(result.snippet || '', searchQuery) }}
                          />
                        </a>
                        );
                      })}
                    </div>
                  )}

                  {activeTab === 'anh' && (
                    <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
                      {googleSearchResults.map((result, index) => {
                        const { bg } = getColorPair(index);
                        return (
                          <a
                            key={index}
                            href={result.image?.contextLink || result.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative rounded-3xl w-full min-w-[200px] aspect-[200/280] cursor-pointer hover:scale-105 transition-all overflow-hidden flex flex-col"
                            style={{ backgroundColor: bg }}
                          >
                            <div className="w-full h-full flex items-center justify-center shadow-sm">
                              {result.link ? (
                                <img
                                  src={result.link}
                                  alt={result.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                  <span className="text-gray-400 dark:text-gray-500 text-xs">Không có ảnh</span>
                                </div>
                              )}
                            </div>
                            {/* Tooltip snippet khi hover */}
                            {result.snippet && (
                              <div className="absolute inset-0 bg-[#8D71FF]/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:cursor-pointer flex items-end justify-end p-6">
                                <p className="text-2xl text-white font-semibold line-clamp-6">
                                  {result.snippet}
                                </p>
                              </div>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {activeTab === 'video' && (
                    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' }}>
                      {googleSearchResults.map((result, index) => {
                        const { bg } = getColorPair(index);
                        const thumbnailUrl = getYouTubeThumbnail(result.link) || result.image?.thumbnailLink || null;
                        return (
                          <a
                            key={index}
                            href={result.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group w-full cursor-pointer hover:scale-105 transition-all overflow-hidden flex flex-col rounded-3xl bg-white shadow-sm"
                          >
                            <div className="w-full aspect-video flex items-center justify-center">
                              {thumbnailUrl ? (
                                <img
                                  src={thumbnailUrl}
                                  alt={result.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    // Fallback về hqdefault nếu maxresdefault không có
                                    const videoId = getYouTubeVideoId(result.link);
                                    if (videoId) {
                                      (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                  <span className="text-gray-400 dark:text-gray-500 text-xs">Không có ảnh</span>
                                </div>
                              )}
                            </div>
                            {/* Title nằm dưới thumbnail */}
                            <div className="px-6 py-4">
                              <h3 className="text-gray-700 dark:text-white line-clamp-3">
                                {result.title}
                              </h3>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {/* Loading indicator khi đang tải thêm */}
                  {loadingGoogleSearch && googleSearchResults.length > 0 && (
                    <div className="flex justify-center py-4">
                      <div className="text-gray-400 dark:text-gray-500 text-sm">Đang tải thêm...</div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentsPanel;

