import DOMPurify from 'dompurify';

interface TrustedHtmlProps {
  html: string;
  className?: string;
}

const ALLOWED_TAGS = [
  'a',
  'p',
  'br',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'code',
  'pre',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'span',
  'div',
];

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'id', 'class'];

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: [
      'onerror',
      'onload',
      'onclick',
      'onmouseover',
      'onfocus',
      'onmouseenter',
      'onmouseleave',
      'srcset',
    ],
  });
}

export function TrustedHtml({ html, className }: TrustedHtmlProps) {
  const sanitized = sanitizeHtml(html);
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
