import DOMPurify from 'dompurify';
import { createElement, type ReactNode } from 'react';

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

function domNodeToReact(node: Node, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as Element;
  const props: Record<string, string> = { key };

  for (const attr of Array.from(element.attributes)) {
    if (attr.name === 'class') {
      props.className = attr.value;
      continue;
    }
    props[attr.name] = attr.value;
  }

  const children = Array.from(element.childNodes).map((child, index) =>
    domNodeToReact(child, `${key}-${index}`)
  );

  return createElement(element.tagName.toLowerCase(), props, ...children);
}

function parseSanitizedHtmlToReact(html: string): ReactNode[] {
  if (typeof DOMParser === 'undefined') {
    return [html];
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.body.childNodes).map((node, index) =>
    domNodeToReact(node, `trusted-html-${index}`)
  );
}

export function TrustedHtml({ html, className }: TrustedHtmlProps) {
  const sanitized = sanitizeHtml(html);
  const content = parseSanitizedHtmlToReact(sanitized);
  return <div className={className}>{content}</div>;
}
