'use strict';

const { getHelpTopics, getHelpTopic } = require('../../src/webapp/services/session/help');

describe('session help service', () => {
  it('lists markdown help topics from directory entries', () => {
    const store = {
      readdir: () => ['intro.md', 'faq.md', 'notes.txt', { name: 'troubleshooting.md' }],
    };

    const topics = getHelpTopics(store, '/help');

    expect(topics).toEqual([
      { slug: 'intro', file: 'intro.md' },
      { slug: 'faq', file: 'faq.md' },
      { slug: 'troubleshooting', file: 'troubleshooting.md' },
    ]);
  });

  it('handles object-style directory entries consistently', () => {
    const store = {
      readdir: () => [{ name: 'alpha.md' }, { name: 'beta.md' }, { name: 'skip.txt' }],
    };

    expect(getHelpTopics(store, '/help')).toEqual([
      { slug: 'alpha', file: 'alpha.md' },
      { slug: 'beta', file: 'beta.md' },
    ]);
  });

  it('returns an empty list when directory read throws', () => {
    const store = {
      readdir: () => {
        throw new Error('disk unavailable');
      },
    };

    expect(getHelpTopics(store, '/help')).toEqual([]);
  });

  it('filters correctly with mixed string and object entries', () => {
    const store = {
      readdir: () => [
        'readme.md',
        { name: 'guide.md' },
        'config.json',
        { name: 'style.css' },
        'tutorial.md',
      ],
    };

    const topics = getHelpTopics(store, '/docs');
    expect(topics).toHaveLength(3);
    expect(topics.map((t) => t.file)).toEqual(['readme.md', 'guide.md', 'tutorial.md']);
  });

  it('handles empty directory', () => {
    const store = {
      readdir: () => [],
    };

    expect(getHelpTopics(store, '/empty')).toEqual([]);
  });

  it('reads sanitized help topic content and returns null when missing', () => {
    const reads = [];
    const store = {
      exists: (filePath) => filePath.endsWith('getting-started.md'),
      readFile: (filePath) => {
        reads.push(filePath);
        return '# Getting Started';
      },
    };

    const found = getHelpTopic(store, '/help', 'getting-started!!');
    const missing = getHelpTopic(store, '/help', 'unknown-topic');

    expect(found).toEqual({ topic: 'getting-started', content: '# Getting Started' });
    expect(reads).toHaveLength(1);
    expect(missing).toBeNull();
  });

  it('handles special characters in topic slugs', () => {
    const store = {
      exists: (filePath) => filePath.includes('best-practices.md'),
      readFile: () => '# Best Practices',
    };

    const result = getHelpTopic(store, '/help', 'best-@practices!??');
    expect(result.topic).toBe('best-practices');
  });

  it('reads content exactly as-is from store', () => {
    const expectedContent = '# Title\n\nSome **bold** and _italic_ text\n\n```code\nblock\n```';
    const store = {
      exists: () => true,
      readFile: () => expectedContent,
    };

    const result = getHelpTopic(store, '/help', 'details');
    expect(result.content).toBe(expectedContent);
  });
});
