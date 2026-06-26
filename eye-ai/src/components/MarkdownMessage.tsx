import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import { useState } from 'react';
import 'highlight.js/styles/github-dark.css';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button className="code-copy-btn" onClick={handleCopy}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

interface MarkdownMessageProps {
  content: string;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeSanitize]}
        components={{
          pre({ children, ...props }) {
            const codeEl = (children as any)?.[0];
            const codeText = codeEl?.props?.children?.[0] ?? '';
            return (
              <div style={{ position: 'relative' }}>
                <CopyButton text={typeof codeText === 'string' ? codeText : ''} />
                <pre {...props}>{children}</pre>
              </div>
            );
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
