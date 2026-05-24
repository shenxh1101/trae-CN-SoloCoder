import { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import mermaid from 'mermaid';
import 'highlight.js/styles/github-dark.css';
import { useSettingsStore } from '../../store/useSettingsStore';
import { parseWikiLinks, parseTags } from '../../utils/linkParser';

interface MarkdownPreviewProps {
  content: string;
  onWikiLinkClick?: (targetName: string, anchor?: string) => void;
  onTagClick?: (tag: string) => void;
  className?: string;
}

export default function MarkdownPreview({
  content,
  onWikiLinkClick,
  onTagClick,
  className = '',
}: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [processedContent, setProcessedContent] = useState(content);
  const { settings } = useSettingsStore();

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: settings.theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'strict',
    });
  }, [settings.theme]);

  useEffect(() => {
    if (onWikiLinkClick) {
      (window as unknown as { handleWikiLinkClick: (target: string, anchor: string) => void }).handleWikiLinkClick = (
        targetName: string,
        anchor: string
      ) => {
        onWikiLinkClick(targetName, anchor || undefined);
      };
    }
    if (onTagClick) {
      (window as unknown as { handleTagClick: (tag: string) => void }).handleTagClick = (tag: string) => {
        onTagClick(tag);
      };
    }
  }, [onWikiLinkClick, onTagClick]);

  const processContent = useCallback(
    (markdownContent: string): string => {
      let processed = markdownContent;

      if (onWikiLinkClick) {
        const links = parseWikiLinks(processed);
        for (let i = links.length - 1; i >= 0; i--) {
          const link = links[i];
          const original = processed.slice(link.position, link.position + link.length);
          const display = original.match(/\|([^\]]+)\]\]/)?.[1] || link.targetName;
          const wikilinkHtml = `<span class="wikilink" onclick="window.handleWikiLinkClick('${encodeURIComponent(link.targetName)}', '${encodeURIComponent(link.anchor || '')}')">${display}</span>`;
          processed = processed.slice(0, link.position) + wikilinkHtml + processed.slice(link.position + link.length);
        }
      }

      if (onTagClick) {
        const tags = parseTags(processed);
        tags.forEach((tag) => {
          const tagRegex = new RegExp(`#${tag}(?!\\w)`, 'g');
          processed = processed.replace(
            tagRegex,
            `<span class="tag" onclick="window.handleTagClick('${tag}')">#${tag}</span>`
          );
        });
      }

      return processed;
    },
    [onWikiLinkClick, onTagClick]
  );

  useEffect(() => {
    setProcessedContent(processContent(content));
  }, [content, processContent]);

  useEffect(() => {
    if (containerRef.current) {
      const mermaidDiagrams = containerRef.current.querySelectorAll('.language-mermaid');
      mermaidDiagrams.forEach(async (el, index) => {
        try {
          const code = el.textContent || '';
          const uniqueId = `mermaid-${Date.now()}-${index}`;
          const { svg } = await mermaid.render(uniqueId, code);
          const parent = el.parentElement;
          if (parent && parent.parentElement) {
            const div = document.createElement('div');
            div.className = 'mermaid';
            div.innerHTML = svg;
            parent.parentElement.replaceWith(div);
          }
        } catch (error) {
          console.error('Mermaid render error:', error);
          const parent = el.parentElement;
          if (parent && parent.parentElement) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'mermaid-error';
            errorDiv.style.cssText = 'padding: 16px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; color: #ef4444; margin-bottom: 1em;';
            errorDiv.innerHTML = `<strong>Mermaid 渲染错误</strong><pre style="margin-top: 8px; font-size: 12px; overflow: auto;">${error instanceof Error ? error.message : String(error)}</pre>`;
            parent.parentElement.replaceWith(errorDiv);
          }
        }
      });
    }
  }, [processedContent]);

  return (
    <div
      ref={containerRef}
      className={`markdown-preview ${className}`}
      style={{
        fontFamily: settings.fontFamily,
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineHeight,
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          rehypeKatex,
          [
            rehypeSanitize,
            {
              tagNames: [
                'address', 'article', 'aside', 'blockquote', 'details', 'div', 'dt', 'figcaption',
                'figure', 'footer', 'header', 'hgroup', 'main', 'nav', 'section', 'summary',
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre', 'div', 'span',
                'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn', 'em', 'i',
                'kbd', 'mark', 'q', 'rb', 'rp', 'rt', 'rtc', 'ruby', 's', 'samp', 'small',
                'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr',
                'caption', 'col', 'colgroup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr',
                'dd', 'dl', 'dt', 'li', 'ol', 'ul',
                'img',
                'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse',
                'text', 'g', 'defs', 'marker', 'linearGradient', 'stop',
                'input',
                'del', 'ins',
                'style', 'hr',
                'annotation', 'semantics', 'math', 'mrow', 'mi', 'mn', 'mo', 'ms', 'mtext',
                'mspace', 'mglyph', 'maligngroup', 'malignmark',
                'menclose', 'merror', 'mfenced', 'mfrac', 'mpadded', 'mphantom', 'mroot',
                'mrow', 'msqrt', 'mstyle', 'msub', 'msubsup', 'msup', 'mtable', 'mtd', 'mtext',
                'mtr', 'munder', 'munderover', 'mover', 'mlabeledtr', 'mtable',
                'font',
              ],
              attributes: {
                '*': ['id', 'className', 'class', 'style', 'align', 'width', 'height', 'title', 'name'],
                a: ['href', 'target', 'rel', 'onclick'],
                img: ['src', 'alt', 'width', 'height', 'loading'],
                svg: ['xmlns', 'width', 'height', 'viewBox', 'preserveAspectRatio', 'style', 'role', 'aria-labelledby', 'shape-rendering'],
                path: ['d', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'transform', 'opacity'],
                circle: ['cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width', 'opacity'],
                rect: ['x', 'y', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'rx', 'ry', 'opacity'],
                line: ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width', 'stroke-linecap', 'opacity'],
                polyline: ['points', 'fill', 'stroke', 'stroke-width', 'opacity'],
                polygon: ['points', 'fill', 'stroke', 'stroke-width', 'opacity'],
                ellipse: ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke', 'stroke-width', 'opacity'],
                text: ['x', 'y', 'fill', 'font-family', 'font-size', 'text-anchor', 'dominant-baseline', 'font-weight', 'font-style'],
                tspan: ['x', 'y', 'fill', 'font-family', 'font-size', 'text-anchor', 'dominant-baseline', 'font-weight', 'font-style'],
                g: ['transform', 'fill', 'stroke', 'stroke-width', 'font-family', 'font-size', 'opacity', 'stroke-linecap', 'stroke-linejoin'],
                marker: ['id', 'viewBox', 'refX', 'refY', 'markerWidth', 'markerHeight', 'orient', 'markerUnits'],
                linearGradient: ['id', 'x1', 'y1', 'x2', 'y2', 'gradientUnits', 'gradientTransform'],
                radialGradient: ['id', 'cx', 'cy', 'r', 'fx', 'fy', 'gradientUnits', 'gradientTransform'],
                stop: ['offset', 'stop-color', 'stop-opacity'],
                defs: [],
                input: ['type', 'checked', 'disabled'],
                code: ['className', 'class', 'data-language'],
                pre: ['className', 'class'],
                span: ['className', 'class', 'style', 'onclick'],
                style: ['type'],
                math: ['xmlns', 'display', 'style'],
                annotation: ['encoding'],
                semantics: [],
                mi: ['mathvariant'],
                mn: [],
                mo: ['stretchy', 'fence', 'separator', 'lspace', 'rspace', 'symmetric', 'mathsize'],
                mfrac: ['linethickness', 'numalign', 'denomalign', 'bevelled'],
                msqrt: [],
                mroot: [],
                mfenced: ['open', 'close', 'separators'],
                msub: [],
                msup: [],
                msubsup: [],
                munder: ['accentunder'],
                mover: ['accent'],
                munderover: ['accent', 'accentunder'],
                mtable: ['columnalign', 'rowalign', 'columnspacing', 'rowspacing', 'frame', 'framespacing'],
                mtr: ['rowalign'],
                mtd: ['columnalign', 'rowspan', 'columnspan'],
                mpadded: ['width', 'height', 'depth', 'lspace', 'voffset'],
                menclose: ['notation'],
                mspace: ['width', 'height', 'depth'],
                mstyle: ['mathvariant', 'mathsize', 'mathcolor', 'mathbackground', 'displaystyle'],
                font: ['color', 'face', 'size'],
              },
              protocols: {
                href: ['http', 'https', 'mailto', '#'],
                src: ['http', 'https', 'data'],
              },
              clobberPrefix: 'user-content-',
            },
          ],
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
        ]}
        components={{
          a: ({ href, children, ...props }) => {
            if (href?.startsWith('http')) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.preventDefault();
                    if (window.electronAPI) {
                      window.electronAPI.app.openExternal(href);
                    }
                  }}
                  {...props}
                >
                  {children}
                </a>
              );
            }
            return (
              <a href={href} {...props}>
                {children}
              </a>
            );
          },
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            if (isInline) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
