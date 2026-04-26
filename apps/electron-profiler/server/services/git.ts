/**
 * Git Service — reads git history from target Electron app directories.
 */

import { execSync } from 'child_process';

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: number; // epoch ms
}

export class GitService {
  getRemote(directory: string): string | null {
    try {
      return execSync('git remote get-url origin', {
        cwd: directory,
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();
    } catch {
      return null;
    }
  }

  getHeadCommit(directory: string): { hash: string; message: string } | null {
    try {
      const raw = execSync('git log -1 --format="%H|%s"', {
        cwd: directory,
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();
      const [hash, ...rest] = raw.split('|');
      return { hash, message: rest.join('|') };
    } catch {
      return null;
    }
  }

  getCommitsBetween(directory: string, fromSha: string, toSha: string): GitCommit[] {
    try {
      const raw = execSync(`git log --format="%H|%h|%s|%an|%at" ${fromSha}..${toSha}`, {
        cwd: directory,
        encoding: 'utf-8',
        timeout: 15000,
      });
      return raw
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [hash, shortHash, message, author, dateStr] = line.split('|');
          return { hash, shortHash, message, author, date: parseInt(dateStr) * 1000 };
        });
    } catch {
      return [];
    }
  }

  getDiffStat(directory: string, fromSha: string, toSha: string): string {
    try {
      return execSync(`git diff --stat ${fromSha}..${toSha}`, {
        cwd: directory,
        encoding: 'utf-8',
        timeout: 15000,
      }).trim();
    } catch {
      return '';
    }
  }

  getTags(directory: string): Array<{ tag: string; commit: string }> {
    try {
      const raw = execSync('git tag -l --format="%(refname:short)|%(objectname:short)"', {
        cwd: directory,
        encoding: 'utf-8',
        timeout: 5000,
      });
      return raw
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [tag, commit] = line.split('|');
          return { tag, commit };
        });
    } catch {
      return [];
    }
  }

  getRecentCommits(directory: string, limit = 50): GitCommit[] {
    try {
      const raw = execSync(`git log --format="%H|%h|%s|%an|%at" -n ${limit}`, {
        cwd: directory,
        encoding: 'utf-8',
        timeout: 10000,
      });
      return raw
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [hash, shortHash, message, author, dateStr] = line.split('|');
          return { hash, shortHash, message, author, date: parseInt(dateStr) * 1000 };
        });
    } catch {
      return [];
    }
  }
}
