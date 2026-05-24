import { Email, EmailContact, EmailBody, EmailFlags, Attachment } from '../../shared/types';

export interface MimeHeader {
  [key: string]: string | string[];
}

export interface MimePart {
  headers: MimeHeader;
  body: string;
  parts?: MimePart[];
  contentType: string;
  charset?: string;
  encoding?: string;
  filename?: string;
  contentId?: string;
  isAttachment?: boolean;
  isInline?: boolean;
  size?: number;
}

export interface ParseResult {
  headers: MimeHeader;
  body: EmailBody;
  attachments: Attachment[];
  hasTracking: boolean;
  from?: EmailContact;
  to: EmailContact[];
  cc: EmailContact[];
  bcc: EmailContact[];
  replyTo?: EmailContact;
  subject: string;
  date: number;
  messageId?: string;
  inReplyTo?: string;
  references: string[];
}

export class MailParser {
  static parse(raw: string | Buffer): ParseResult {
    const text = typeof raw === 'string' ? raw : raw.toString('utf8');
    
    const headerEnd = text.indexOf('\r\n\r\n');
    const headerSection = headerEnd !== -1 ? text.substring(0, headerEnd) : text;
    const bodySection = headerEnd !== -1 ? text.substring(headerEnd + 4) : '';

    const headers = this.parseHeaders(headerSection);
    const contentType = this.getHeaderValue(headers, 'Content-Type') || 'text/plain';
    const contentTransferEncoding = this.getHeaderValue(headers, 'Content-Transfer-Encoding') || '7bit';

    const rootPart: MimePart = {
      headers,
      body: bodySection,
      contentType: contentType.toLowerCase(),
      encoding: contentTransferEncoding,
    };

    const parsedParts = this.parseMimePart(rootPart);
    const body = this.extractBody(parsedParts);
    const attachments = this.extractAttachments(parsedParts);
    const hasTracking = this.detectTrackingPixels(body.html || body.plain || '');

    const from = this.parseAddress(this.getHeaderValue(headers, 'From') || '');
    const to = this.parseAddressList(this.getHeaderValue(headers, 'To') || '');
    const cc = this.parseAddressList(this.getHeaderValue(headers, 'Cc') || '');
    const bcc = this.parseAddressList(this.getHeaderValue(headers, 'Bcc') || '');
    const replyTo = this.parseAddress(this.getHeaderValue(headers, 'Reply-To') || '');
    const subject = this.decodeRfc2047(this.getHeaderValue(headers, 'Subject') || '');
    
    const dateStr = this.getHeaderValue(headers, 'Date') || '';
    const date = dateStr ? new Date(dateStr).getTime() : Date.now();
    
    const messageId = this.getHeaderValue(headers, 'Message-Id') || this.getHeaderValue(headers, 'Message-ID');
    const inReplyTo = this.getHeaderValue(headers, 'In-Reply-To') || this.getHeaderValue(headers, 'In-reply-to');
    const references = this.parseReferences(this.getHeaderValue(headers, 'References') || '');

    return {
      headers,
      body,
      attachments,
      hasTracking,
      from,
      to,
      cc,
      bcc,
      replyTo,
      subject,
      date,
      messageId,
      inReplyTo,
      references,
    };
  }

  static parseToEmail(raw: string | Buffer, partial: Partial<Email> = {}): Email {
    const parsed = this.parse(raw);
    
    return {
      id: '',
      accountId: '',
      folderId: '',
      messageId: parsed.messageId || '',
      threadId: '',
      uid: 0,
      flags: {
        seen: false,
        answered: false,
        flagged: false,
        deleted: false,
        draft: false,
        recent: false,
        forwarded: false,
        custom: [],
      },
      from: parsed.from || { name: '', email: '' },
      to: parsed.to,
      cc: parsed.cc,
      bcc: parsed.bcc,
      replyTo: parsed.replyTo,
      subject: parsed.subject,
      body: parsed.body,
      date: parsed.date,
      internalDate: Date.now(),
      size: typeof raw === 'string' ? Buffer.from(raw).length : raw.length,
      attachments: parsed.attachments,
      references: parsed.references,
      inReplyTo: parsed.inReplyTo,
      labels: [],
      isRead: false,
      isStarred: false,
      hasTracking: parsed.hasTracking,
      isEncrypted: false,
      isSigned: false,
      preview: this.generatePreview(parsed.body),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...partial,
    };
  }

  static parseHeaders(headerSection: string): MimeHeader {
    const headers: MimeHeader = {};
    const unfolded = headerSection.replace(/\r\n[ \t]+/g, ' ');
    const lines = unfolded.split('\r\n');

    for (const line of lines) {
      if (!line || line[0] === ' ' || line[0] === '\t') continue;

      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      const lowerKey = key.toLowerCase();

      if (headers[lowerKey]) {
        if (Array.isArray(headers[lowerKey])) {
          (headers[lowerKey] as string[]).push(value);
        } else {
          headers[lowerKey] = [headers[lowerKey] as string, value];
        }
      } else {
        headers[lowerKey] = value;
      }
    }

    return headers;
  }

  static parseMimePart(part: MimePart): MimePart {
    const contentTypeParams = this.parseContentType(part.contentType);
    part.charset = contentTypeParams.charset;
    part.filename = contentTypeParams.filename;
    part.contentId = this.getHeaderValue(part.headers, 'Content-Id') || this.getHeaderValue(part.headers, 'Content-ID');
    
    const contentDisposition = this.getHeaderValue(part.headers, 'Content-Disposition');
    if (contentDisposition) {
      const dispParams = this.parseContentDisposition(contentDisposition);
      part.isAttachment = dispParams.type === 'attachment';
      part.isInline = dispParams.type === 'inline';
      if (dispParams.filename && !part.filename) {
        part.filename = dispParams.filename;
      }
    }

    const decodedBody = this.decodeBody(part.body, part.encoding || '7bit', part.charset);
    part.body = decodedBody;
    part.size = Buffer.from(decodedBody).length;

    if (contentTypeParams.type.startsWith('multipart/')) {
      const boundary = contentTypeParams.boundary;
      if (boundary) {
        part.parts = this.splitMultipart(part.body, boundary).map(subBody => {
          const subHeaderEnd = subBody.indexOf('\r\n\r\n');
          const subHeaders = subHeaderEnd !== -1 
            ? this.parseHeaders(subBody.substring(0, subHeaderEnd))
            : {};
          const subContentType = this.getHeaderValue(subHeaders, 'Content-Type') || 'text/plain';
          const subEncoding = this.getHeaderValue(subHeaders, 'Content-Transfer-Encoding') || '7bit';

          return this.parseMimePart({
            headers: subHeaders,
            body: subHeaderEnd !== -1 ? subBody.substring(subHeaderEnd + 4) : '',
            contentType: subContentType.toLowerCase(),
            encoding: subEncoding,
          });
        });
      }
    }

    return part;
  }

  static extractBody(part: MimePart): EmailBody {
    const result: EmailBody = {};

    if (part.parts && part.parts.length > 0) {
      for (const subPart of part.parts) {
        if (subPart.parts && subPart.parts.length > 0) {
          const subBody = this.extractBody(subPart);
          if (subBody.plain && !result.plain) result.plain = subBody.plain;
          if (subBody.html && !result.html) result.html = subBody.html;
          if (subBody.markdown && !result.markdown) result.markdown = subBody.markdown;
        } else if (!subPart.isAttachment) {
          const contentType = subPart.contentType.toLowerCase();
          if (contentType.includes('text/plain') && !result.plain) {
            result.plain = subPart.body;
          } else if (contentType.includes('text/html') && !result.html) {
            result.html = subPart.body;
          } else if (contentType.includes('text/markdown') && !result.markdown) {
            result.markdown = subPart.body;
          }
        }
      }
    } else if (!part.isAttachment) {
      const contentType = part.contentType.toLowerCase();
      if (contentType.includes('text/plain')) {
        result.plain = part.body;
      } else if (contentType.includes('text/html')) {
        result.html = part.body;
      } else if (contentType.includes('text/markdown')) {
        result.markdown = part.body;
      }
    }

    return result;
  }

  static extractAttachments(part: MimePart): Attachment[] {
    const attachments: Attachment[] = [];
    let counter = 0;

    const walk = (p: MimePart): void => {
      if (p.isAttachment || (p.filename && !p.isInline)) {
        attachments.push({
          id: `attach_${Date.now()}_${counter++}`,
          emailId: '',
          filename: this.decodeRfc2047(p.filename || 'unnamed'),
          contentType: p.contentType.split(';')[0].trim(),
          size: p.size || Buffer.from(p.body).length,
          contentId: p.contentId?.replace(/^<|>$/g, ''),
          isInline: p.isInline || false,
          encoding: p.encoding || '7bit',
          content: Buffer.from(p.body, p.charset as BufferEncoding || 'utf8'),
        });
      }

      if (p.parts) {
        for (const subPart of p.parts) {
          walk(subPart);
        }
      }
    };

    walk(part);
    return attachments;
  }

  static detectTrackingPixels(html: string): boolean {
    if (!html) return false;

    const trackingPatterns = [
      /<img[^>]*\ssrc\s*=\s*["'][^"']*track(?:ing|er)?[^"']*["']/gi,
      /<img[^>]*\ssrc\s*=\s*["'][^"']*pixel[^"']*["']/gi,
      /<img[^>]*\ssrc\s*=\s*["'][^"']*open[^"']*["']/gi,
      /<img[^>]*\ssrc\s*=\s*["'][^"']*beacon[^"']*["']/gi,
      /<img[^>]*\sheight\s*=\s*["']\s*1\s*px?\s*["'][^>]*\swidth\s*=\s*["']\s*1\s*px?\s*["']/gi,
      /<img[^>]*\swidth\s*=\s*["']\s*1\s*px?\s*["'][^>]*\sheight\s*=\s*["']\s*1\s*px?\s*["']/gi,
      /<img[^>]*\ssrc\s*=\s*["']data:image[^"']*["']/gi,
    ];

    for (const pattern of trackingPatterns) {
      if (pattern.test(html)) {
        return true;
      }
    }

    const imgTagPattern = /<img[^>]*>/gi;
    let match;
    while ((match = imgTagPattern.exec(html)) !== null) {
      const imgTag = match[0];
      const widthMatch = imgTag.match(/width\s*=\s*["']?(\d+)\s*(?:px)?["']?/i);
      const heightMatch = imgTag.match(/height\s*=\s*["']?(\d+)\s*(?:px)?["']?/i);
      
      if (widthMatch && heightMatch) {
        const width = parseInt(widthMatch[1], 10);
        const height = parseInt(heightMatch[1], 10);
        if (width <= 2 && height <= 2) {
          return true;
        }
      }
    }

    return false;
  }

  static decodeBody(body: string, encoding: string, charset?: string): string {
    const enc = encoding.toLowerCase().trim();

    switch (enc) {
      case 'base64':
        try {
          const cleaned = body.replace(/\s+/g, '');
          const buffer = Buffer.from(cleaned, 'base64');
          return buffer.toString(charset as BufferEncoding || 'utf8');
        } catch {
          return body;
        }

      case 'quoted-printable':
      case 'qp':
        return this.decodeQuotedPrintable(body, charset);

      case '7bit':
      case '8bit':
      case 'binary':
      default:
        try {
          if (charset && charset.toLowerCase() !== 'utf-8') {
            return Buffer.from(body, 'binary').toString(charset as BufferEncoding || 'utf8');
          }
          return body;
        } catch {
          return body;
        }
    }
  }

  static decodeQuotedPrintable(str: string, charset?: string): string {
    let decoded = str.replace(/=\r?\n/g, '');
    let result = '';
    let i = 0;

    while (i < decoded.length) {
      if (decoded[i] === '=' && i + 2 < decoded.length) {
        const hex = decoded.substring(i + 1, i + 3);
        if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
          result += String.fromCharCode(parseInt(hex, 16));
          i += 3;
        } else {
          result += decoded[i];
          i++;
        }
      } else if (decoded[i] === '_') {
        result += ' ';
        i++;
      } else {
        result += decoded[i];
        i++;
      }
    }

    try {
      if (charset && charset.toLowerCase() !== 'utf-8') {
        return Buffer.from(result, 'binary').toString(charset as BufferEncoding || 'utf8');
      }
      return Buffer.from(result, 'binary').toString('utf8');
    } catch {
      return result;
    }
  }

  static decodeRfc2047(str: string): string {
    if (!str) return '';

    const rfc2047Pattern = /=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g;
    let result = str;
    let match;

    while ((match = rfc2047Pattern.exec(str)) !== null) {
      const fullMatch = match[0];
      const charset = match[1];
      const encoding = match[2].toUpperCase();
      const encodedText = match[3];

      try {
        let decoded: string;
        if (encoding === 'B') {
          decoded = Buffer.from(encodedText, 'base64').toString(charset as BufferEncoding || 'utf8');
        } else {
          decoded = this.decodeQuotedPrintable(encodedText, charset);
        }
        result = result.replace(fullMatch, decoded);
      } catch {
        // Keep original on error
      }
    }

    return result.replace(/\s+/g, ' ').trim();
  }

  static parseAddress(addressStr: string): EmailContact | undefined {
    if (!addressStr) return undefined;

    const decoded = this.decodeRfc2047(addressStr);
    
    const angleMatch = decoded.match(/^([^<]*?)\s*<([^>]+)>\s*$/);
    if (angleMatch) {
      const name = angleMatch[1].replace(/^"|"$/g, '').trim();
      const email = angleMatch[2].trim().toLowerCase();
      return { name, email };
    }

    const emailMatch = decoded.match(/([^\s<>]+@[^\s<>]+)/);
    if (emailMatch) {
      return { name: '', email: emailMatch[1].toLowerCase() };
    }

    return { name: '', email: decoded.toLowerCase() };
  }

  static parseAddressList(addressesStr: string): EmailContact[] {
    if (!addressesStr) return [];

    const addresses: EmailContact[] = [];
    let current = '';
    let inQuotes = false;
    let inAngle = false;

    for (let i = 0; i < addressesStr.length; i++) {
      const char = addressesStr[i];

      if (char === '"' && addressesStr[i - 1] !== '\\') {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === '<' && !inQuotes) {
        inAngle = true;
        current += char;
      } else if (char === '>' && !inQuotes) {
        inAngle = false;
        current += char;
      } else if (char === ',' && !inQuotes && !inAngle) {
        const addr = this.parseAddress(current.trim());
        if (addr) addresses.push(addr);
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      const addr = this.parseAddress(current.trim());
      if (addr) addresses.push(addr);
    }

    return addresses;
  }

  static parseReferences(refsStr: string): string[] {
    if (!refsStr) return [];

    const refs: string[] = [];
    const refPattern = /<([^>]+)>/g;
    let match;

    while ((match = refPattern.exec(refsStr)) !== null) {
      refs.push(match[1]);
    }

    return refs;
  }

  static parseContentType(contentType: string): {
    type: string;
    charset?: string;
    boundary?: string;
    filename?: string;
  } {
    if (!contentType) {
      return { type: 'text/plain' };
    }

    const result: ReturnType<typeof this.parseContentType> = { type: '' };
    const parts = contentType.split(';');

    result.type = parts[0].trim().toLowerCase();

    for (let i = 1; i < parts.length; i++) {
      const param = parts[i].trim();
      const equalsIndex = param.indexOf('=');
      if (equalsIndex !== -1) {
        const key = param.substring(0, equalsIndex).trim().toLowerCase();
        let value = param.substring(equalsIndex + 1).trim();
        value = value.replace(/^"|"$/g, '');
        value = this.decodeRfc2047(value);

        if (key === 'charset') {
          result.charset = value;
        } else if (key === 'boundary') {
          result.boundary = value;
        } else if (key === 'filename' || key === 'name') {
          result.filename = value;
        }
      }
    }

    return result;
  }

  static parseContentDisposition(disposition: string): {
    type: string;
    filename?: string;
  } {
    if (!disposition) {
      return { type: '' };
    }

    const result: ReturnType<typeof this.parseContentDisposition> = { type: '' };
    const parts = disposition.split(';');

    result.type = parts[0].trim().toLowerCase();

    for (let i = 1; i < parts.length; i++) {
      const param = parts[i].trim();
      const equalsIndex = param.indexOf('=');
      if (equalsIndex !== -1) {
        const key = param.substring(0, equalsIndex).trim().toLowerCase();
        let value = param.substring(equalsIndex + 1).trim();
        value = value.replace(/^"|"$/g, '');
        value = this.decodeRfc2047(value);

        if (key === 'filename') {
          result.filename = value;
        }
      }
    }

    return result;
  }

  static parseFlags(flags: string[]): EmailFlags {
    return {
      seen: flags.includes('\\Seen'),
      answered: flags.includes('\\Answered'),
      flagged: flags.includes('\\Flagged'),
      deleted: flags.includes('\\Deleted'),
      draft: flags.includes('\\Draft'),
      recent: flags.includes('\\Recent'),
      forwarded: flags.includes('$Forwarded'),
      custom: flags.filter(f => !f.startsWith('\\') && f !== '$Forwarded'),
    };
  }

  private static getHeaderValue(headers: MimeHeader, key: string): string | undefined {
    const lowerKey = key.toLowerCase();
    const value = headers[lowerKey];
    if (Array.isArray(value)) {
      return value[value.length - 1];
    }
    return value;
  }

  private static splitMultipart(body: string, boundary: string): string[] {
    const parts: string[] = [];
    const boundaryRegex = new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:--)?\r?\n`, 'g');
    
    let match;
    let lastIndex = 0;

    while ((match = boundaryRegex.exec(body)) !== null) {
      if (lastIndex !== 0) {
        const part = body.substring(lastIndex, match.index);
        if (part.trim() && !part.startsWith('--')) {
          parts.push(part.replace(/\r?\n$/, ''));
        }
      }
      lastIndex = boundaryRegex.lastIndex;
    }

    return parts;
  }

  private static generatePreview(body: EmailBody): string {
    const text = body.plain || body.html ? this.stripHtml(body.html || '') : body.markdown || '';
    const cleaned = text.replace(/\s+/g, ' ').trim();
    return cleaned.substring(0, 200);
  }

  private static stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}

export default MailParser;
