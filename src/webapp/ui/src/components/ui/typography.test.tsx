import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Heading, Text, InlineCode, CodeBlock } from './typography';

describe('Heading', () => {
  it('renders h2 by default', () => {
    render(<Heading>Title</Heading>);
    const el = screen.getByText('Title');
    expect(el.tagName).toBe('H2');
  });

  it.each([1, 2, 3, 4, 5, 6] as const)('renders h%i for level=%i', (level) => {
    render(<Heading level={level}>H</Heading>);
    expect(screen.getByText('H').tagName).toBe(`H${level}`);
  });

  it('supports visual level different from semantic', () => {
    render(
      <Heading level={1} as={3}>
        Visual H1, Semantic H3
      </Heading>
    );
    const el = screen.getByText('Visual H1, Semantic H3');
    expect(el.tagName).toBe('H3');
    expect(el.className).toMatch(/text-4xl/);
  });
});

describe('Text', () => {
  it('renders a paragraph by default', () => {
    render(<Text>Paragraph</Text>);
    expect(screen.getByText('Paragraph').tagName).toBe('P');
  });

  it('renders as span', () => {
    render(<Text as="span">Inline</Text>);
    expect(screen.getByText('Inline').tagName).toBe('SPAN');
  });

  it('applies muted style', () => {
    render(<Text muted>Muted</Text>);
    expect(screen.getByText('Muted').className).toMatch(/text-muted-foreground/);
  });
});

describe('InlineCode', () => {
  it('renders code element with font-mono', () => {
    render(<InlineCode>const x = 1</InlineCode>);
    const el = screen.getByText('const x = 1');
    expect(el.tagName).toBe('CODE');
    expect(el.className).toMatch(/font-mono/);
  });
});

describe('CodeBlock', () => {
  it('renders pre > code structure', () => {
    render(<CodeBlock>block code</CodeBlock>);
    const pre = screen.getByText('block code').closest('pre');
    expect(pre).toBeInTheDocument();
    expect(pre!.className).toMatch(/font-mono/);
  });
});
