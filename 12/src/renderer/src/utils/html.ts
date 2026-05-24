import DOMPurify from 'dompurify';
import * as cheerio from 'cheerio';
import type { CheerioAPI, Cheerio } from 'cheerio';
import type { Element } from 'domhandler';

export const sanitizeHtml = (html: string, options?: {
  allowExternalImages?: boolean;
  allowStyles?: boolean;
  allowScripts?: boolean;
}): string => {
  const {
    allowExternalImages = false,
    allowStyles = true,
    allowScripts = false
  } = options || {};

  const config = {
    USE_PROFILES: { html: true } as const,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    ADD_ATTR: ['target', 'rel'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus'],
    FORBID_TAGS: allowScripts ? [] : ['script', 'noscript', 'iframe', 'frame'],
  };

  if (!allowStyles) {
    config.FORBID_ATTR = [...config.FORBID_ATTR, 'style'];
    config.FORBID_TAGS = [...config.FORBID_TAGS, 'style'];
  }

  let sanitized: string = DOMPurify.sanitize(html, config as any) as unknown as string;

  if (!allowExternalImages) {
    const $: CheerioAPI = cheerio.load(sanitized);
    $('img').each((_: number, el: Element) => {
      const src = $(el).attr('src') || '';
      if (src.startsWith('http://') || src.startsWith('https://')) {
        $(el).replaceWith(`<span class="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs rounded">[图片已阻止]</span>`);
      }
    });
    sanitized = $.html() as string;
  }

  const $: CheerioAPI = cheerio.load(sanitized);
  $('a').each((_: number, el: Element) => {
    const href = $(el).attr('href') || '';
    if (href.startsWith('http://') || href.startsWith('https://')) {
      $(el).attr('target', '_blank');
      $(el).attr('rel', 'noopener noreferrer nofollow');
    }
  });

  return $.html();
};

export const highlightKeywords = (text: string, keywords: string[], className = 'bg-yellow-200 dark:bg-yellow-800'): string => {
  if (!text || !keywords || keywords.length === 0) return text;

  const escapedKeywords = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(k => k.length > 0);
  if (escapedKeywords.length === 0) return text;

  const pattern = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');
  return text.replace(pattern, `<mark class="${className}">$1</mark>`);
};

export const highlightHtml = (html: string, keywords: string[]): string => {
  if (!html || !keywords || keywords.length === 0) return html;

  const $ = cheerio.load(html);
  const escapedKeywords = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(k => k.length > 0);
  if (escapedKeywords.length === 0) return html;

  const pattern = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');

  const highlightNode = (node: Cheerio<any>) => {
    node.contents().each((_: number, el: any) => {
      if (el.type === 'text') {
        const text = $(el).text();
        if (pattern.test(text)) {
          const highlighted = text.replace(pattern, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
          $(el).replaceWith(highlighted);
        }
      } else if (el.type === 'tag' && el.name !== 'script' && el.name !== 'style') {
        highlightNode($(el));
      }
    });
  };

  highlightNode($('body'));
  return $.html();
};

export const extractTextFromHtml = (html: string): string => {
  if (!html) return '';
  const $: CheerioAPI = cheerio.load(html);
  return $('body').text().replace(/\s+/g, ' ').trim();
};

export const extractPlainText = (html: string): string => {
  if (!html) return '';
  const $: CheerioAPI = cheerio.load(html);
  $('script, style, noscript').remove();
  return $.text().replace(/\s+/g, ' ').trim();
};

export const removeTrackingPixels = (html: string): { html: string; trackingCount: number } => {
  if (!html) return { html: '', trackingCount: 0 };

  const $ = cheerio.load(html);
  let trackingCount = 0;

  $('img').each((_: number, el: Element) => {
    const src = $(el).attr('src') || '';
    const width = $(el).attr('width');
    const height = $(el).attr('height');
    const style = $(el).attr('style') || '';

    const isTracking = (
      (width === '1' || width === '0' || width === '1px' || width === '0px') &&
      (height === '1' || height === '0' || height === '1px' || height === '0px')
    ) || style.includes('display:none') || style.includes('visibility:hidden') || src.includes('track') || src.includes('pixel');

    if (isTracking) {
      $(el).remove();
      trackingCount++;
    }
  });

  return { html: $.html(), trackingCount };
};

export const hasTrackingPixels = (html: string): boolean => {
  if (!html) return false;
  const { trackingCount } = removeTrackingPixels(html);
  return trackingCount > 0;
};

export const stripHtml = (html: string): string => {
  if (!html) return '';
  const $: CheerioAPI = cheerio.load(html);
  return $.text().trim();
};

export const truncateHtml = (html: string, maxLength: number): string => {
  if (!html) return '';
  const text = extractTextFromHtml(html);
  if (text.length <= maxLength) return html;

  const $: CheerioAPI = cheerio.load(html);
  let currentLength = 0;
  let truncated = false;

  const truncateNode = (node: Cheerio<any>): boolean => {
    const contents = node.contents();
    for (let i = 0; i < contents.length; i++) {
      const el: any = contents[i];
      if (el.type === 'text') {
        const text = $(el).text();
        if (currentLength + text.length > maxLength) {
          const remaining = maxLength - currentLength;
          if (remaining > 0) {
            $(el).replaceWith(text.slice(0, remaining) + '...');
          } else {
            $(el).remove();
          }
          truncated = true;
          return true;
        }
        currentLength += text.length;
      } else if (el.type === 'tag') {
        if (truncateNode($(el))) {
          return true;
        }
      }
    }
    return truncated;
  };

  truncateNode($('body'));
  return $.html();
};
