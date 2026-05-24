import type { LinkInfo, BacklinkInfo } from '../types';
import { generateId } from './helpers';

const WIKILINK_REGEX = /\[\[([^\]#|]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
const TAG_REGEX = /#([a-zA-Z0-9_\u4e00-\u9fa5]+)/g;

export function parseWikiLinks(content: string): LinkInfo[] {
  const links: LinkInfo[] = [];
  let match;

  while ((match = WIKILINK_REGEX.exec(content)) !== null) {
    links.push({
      targetName: match[1].trim(),
      anchor: match[2]?.trim(),
      position: match.index,
      length: match[0].length,
    });
  }

  return links;
}

export function parseTags(content: string): string[] {
  const tags: string[] = [];
  let match;

  while ((match = TAG_REGEX.exec(content)) !== null) {
    const tag = match[1].trim();
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return tags;
}

export function replaceWikiLinks(
  content: string,
  onLinkClick: (targetName: string, anchor?: string) => void
): string {
  return content.replace(WIKILINK_REGEX, (match, targetName, anchor, displayText) => {
    const display = displayText || targetName;
    const targetId = generateId();
    return `<span class="wikilink" data-target="${encodeURIComponent(targetName)}" data-anchor="${encodeURIComponent(anchor || '')}" id="wikilink-${targetId}" onclick="window.handleWikiLinkClick(decodeURIComponent('${encodeURIComponent(targetName)}'), decodeURIComponent('${encodeURIComponent(anchor || '')}'))">${display}</span>`;
  });
}

export function replaceTags(content: string, onTagClick: (tag: string) => void): string {
  return content.replace(TAG_REGEX, (match, tag) => {
    const targetId = generateId();
    return `<span class="tag" data-tag="${tag}" id="tag-${targetId}" onclick="window.handleTagClick('${tag}')">${match}</span>`;
  });
}

export function findNotesByTitle(notes: { id: string; title: string; path: string }[], title: string): { id: string; title: string; path: string } | null {
  const normalizedTitle = title.trim().toLowerCase();
  return (
    notes.find(
      (n) =>
        n.title.toLowerCase() === normalizedTitle ||
        n.title.toLowerCase().includes(normalizedTitle)
    ) || null
  );
}

export function extractNoteTitles(content: string): string[] {
  const titleRegex = /^#\s+(.+)$/gm;
  const titles: string[] = [];
  let match;

  while ((match = titleRegex.exec(content)) !== null) {
    titles.push(match[1].trim());
  }

  return titles;
}

export function buildBacklinks(
  notes: { id: string; title: string; path: string; content: string }[]
): Map<string, BacklinkInfo[]> {
  const backlinks = new Map<string, BacklinkInfo[]>();

  notes.forEach((sourceNote) => {
    const links = parseWikiLinks(sourceNote.content);
    links.forEach((link) => {
      const targetNote = findNotesByTitle(notes, link.targetName);
      if (targetNote && targetNote.id !== sourceNote.id) {
        const existing = backlinks.get(targetNote.id) || [];
        if (!existing.find((bl) => bl.sourceNoteId === sourceNote.id)) {
          existing.push({
            sourceNoteId: sourceNote.id,
            sourceNoteTitle: sourceNote.title,
            sourceNotePath: sourceNote.path,
            anchor: link.anchor,
          });
          backlinks.set(targetNote.id, existing);
        }
      }
    });
  });

  return backlinks;
}

export function generateAnchorFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function findAnchorPosition(content: string, anchor: string): number {
  const normalizedAnchor = anchor.toLowerCase().replace(/-/g, ' ');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^#{1,6}\s+(.+)$/);
    if (headerMatch) {
      const headerText = headerMatch[1].trim().toLowerCase();
      if (headerText === normalizedAnchor || headerText.includes(normalizedAnchor)) {
        return content.indexOf(line);
      }
    }
  }

  return -1;
}
