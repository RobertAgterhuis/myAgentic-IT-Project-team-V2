import fs from 'node:fs';
import path from 'node:path';
import BrowserFS from 'browserfs';
import type { FsClient } from 'isomorphic-git';

export interface BrowserFsGitAdapter {
  fs: FsClient;
  dir: string;
  gitdir: string;
}

function configureBrowserFs(): Promise<typeof fs> {
  return new Promise((resolve, reject) => {
    BrowserFS.configure(
      {
        fs: 'InMemory',
        options: {},
      },
      (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(BrowserFS.BFSRequire('fs') as unknown as typeof fs);
      }
    );
  });
}

function ensureDirectory(targetFs: typeof fs, targetPath: string): void {
  if (targetPath === '/' || targetPath === '.') {
    return;
  }

  const normalized = path.posix.normalize(targetPath);
  const segments = normalized.split('/').filter(Boolean);
  let current = '';

  for (const segment of segments) {
    current = `${current}/${segment}`;
    if (!targetFs.existsSync(current)) {
      targetFs.mkdirSync(current);
    }
  }
}

function mirrorEntry(sourcePath: string, targetPath: string, targetFs: typeof fs): void {
  const stat = fs.statSync(sourcePath);

  if (stat.isDirectory()) {
    ensureDirectory(targetFs, targetPath);

    for (const entry of fs.readdirSync(sourcePath, { withFileTypes: true })) {
      const childSource = path.join(sourcePath, entry.name);
      const childTarget = path.posix.join(targetPath, entry.name);
      mirrorEntry(childSource, childTarget, targetFs);
    }
    return;
  }

  ensureDirectory(targetFs, path.posix.dirname(targetPath));
  targetFs.writeFileSync(targetPath, fs.readFileSync(sourcePath));
}

export async function createBrowserFsGitAdapter(
  workspaceDir: string
): Promise<BrowserFsGitAdapter> {
  const resolvedWorkspaceDir = path.resolve(workspaceDir);
  const gitPath = path.join(resolvedWorkspaceDir, '.git');

  if (!fs.existsSync(gitPath)) {
    throw new Error(`No .git directory found under ${resolvedWorkspaceDir}`);
  }

  const browserFs = await configureBrowserFs();
  mirrorEntry(gitPath, '/.git', browserFs);

  return {
    fs: browserFs as FsClient,
    dir: '/',
    gitdir: '/.git',
  };
}
