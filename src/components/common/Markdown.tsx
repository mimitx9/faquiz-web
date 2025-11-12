import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  content: string;
  className?: string;
}

const linkStyle = { color: '#2563EB', textDecoration: 'underline' } as React.CSSProperties;

const Markdown: React.FC<MarkdownProps> = ({ content, className }) => {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a
              {...props}
              style={linkStyle}
              target="_blank"
              rel="noopener noreferrer nofollow"
            />
          ),
          h1: ({ node, ...props }) => (
            <h1 {...props} className="text-2xl font-bold mt-4 mb-3" />
          ),
          h2: ({ node, ...props }) => (
            <h2 {...props} className="text-xl font-bold mt-4 mb-3" />
          ),
          h3: ({ node, ...props }) => (
            <h3 {...props} className="text-lg font-bold mt-4 mb-2" />
          ),
          ul: ({ node, ...props }) => (
            <ul {...props} className="list-disc pl-6 my-2 space-y-1" />
          ),
          ol: ({ node, ...props }) => (
            <ol {...props} className="list-decimal pl-6 my-2 space-y-1" />
          ),
          p: ({ node, ...props }) => (
            <p {...props} className="my-2" />
          ),
          strong: ({ node, ...props }) => (
            <strong {...props} className="font-semibold" />
          ),
          em: ({ node, ...props }) => (
            <em {...props} className="italic" />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote {...props} className="border-l-4 pl-3 my-3 text-gray-600" />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default Markdown;



