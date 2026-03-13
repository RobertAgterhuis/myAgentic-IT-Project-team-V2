import type { Meta, StoryObj } from '@storybook/react';
import { Heading, Text, InlineCode, CodeBlock } from './typography';

/* ---------- Heading stories ---------- */

const headingMeta = {
  title: 'UI/Typography/Heading',
  component: Heading,
  tags: ['autodocs'],
} satisfies Meta<typeof Heading>;

export default headingMeta;
type HeadingStory = StoryObj<typeof headingMeta>;

export const AllHeadings: HeadingStory = {
  render: () => (
    <div className="space-y-4">
      <Heading level={1}>Heading 1</Heading>
      <Heading level={2}>Heading 2</Heading>
      <Heading level={3}>Heading 3</Heading>
      <Heading level={4}>Heading 4</Heading>
      <Heading level={5}>Heading 5</Heading>
      <Heading level={6}>Heading 6</Heading>
    </div>
  ),
};

export const SemanticOverride: HeadingStory = {
  args: { level: 1, as: 4, children: 'Looks like H1, renders as H4' },
};

/* ---------- Text stories (inline) ---------- */

export const TextVariants: HeadingStory = {
  render: () => (
    <div className="space-y-2">
      <Text size="xl" weight="bold">
        Extra-large bold
      </Text>
      <Text size="lg">Large text</Text>
      <Text>Base text (default)</Text>
      <Text size="sm" muted>
        Small muted text
      </Text>
      <Text size="xs">Extra-small text</Text>
    </div>
  ),
};

/* ---------- Code stories (inline) ---------- */

export const CodeExamples: HeadingStory = {
  render: () => (
    <div className="space-y-4">
      <Text>
        Use <InlineCode>npm install</InlineCode> to install dependencies.
      </Text>
      <CodeBlock>{`function hello() {\n  return "world";\n}`}</CodeBlock>
    </div>
  ),
};
