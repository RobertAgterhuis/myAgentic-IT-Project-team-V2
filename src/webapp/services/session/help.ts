// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'path';

interface HelpStoreLike {
  readdir(dirPath: string): Array<string | { name: string }>;
  exists(filePath: string): boolean;
  readFile(filePath: string): string;
}

export function getHelpTopics(
  store: HelpStoreLike,
  helpDir: string
): Array<{ slug: string; file: string }> {
  try {
    const files = store.readdir(helpDir).filter((f) => {
      const name = typeof f === 'string' ? f : f.name;
      return name.endsWith('.md');
    });

    return files.map((f) => {
      const name = typeof f === 'string' ? f : f.name;
      return { slug: name.replace('.md', ''), file: name };
    });
  } catch {
    return [];
  }
}

export function getHelpTopic(
  store: HelpStoreLike,
  helpDir: string,
  topic: string
): { topic: string; content: string } | null {
  const safe = topic.replace(/[^a-z0-9_-]/gi, '');
  const file = path.join(helpDir, `${safe}.md`);
  if (!store.exists(file)) return null;
  return { topic: safe, content: store.readFile(file) };
}
