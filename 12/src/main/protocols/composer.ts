import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { marked } from 'marked';
import * as openpgp from 'openpgp';
import { EmailContact, Attachment, EmailBody, EmailSignature, GpgKey } from '../../shared/types';

export interface ComposeOptions {
  from: string | EmailContact;
  to: Array<string | EmailContact>;
  cc?: Array<string | EmailContact>;
  bcc?: Array<string | EmailContact>;
  replyTo?: string | EmailContact;
  subject: string;
  body: EmailBody;
  attachments?: Array<Attachment | string>;
  inReplyTo?: string;
  references?: string[];
  headers?: Record<string, string>;
  signature?: EmailSignature;
  signKey?: GpgKey;
  encryptKeys?: GpgKey[];
  priority?: 'high' | 'normal' | 'low';
  requestReadReceipt?: boolean;
}

export interface ComposeResult {
  raw: string;
  messageId: string;
  date: Date;
  isEncrypted: boolean;
  isSigned: boolean;
}

export class MailComposer {
  static async compose(options: ComposeOptions): Promise<ComposeResult> {
    const messageId = this.generateMessageId(options.from);
    const date = new Date();

    let body = { ...options.body };

    if (body.markdown && !body.html) {
      body.html = await this.markdownToHtml(body.markdown);
    }

    if (body.markdown && !body.plain) {
      body.plain = this.markdownToPlain(body.markdown);
    }

    if (body.html && !body.plain) {
      body.plain = this.htmlToPlain(body.html);
    }

    if (options.signature) {
      if (body.plain) {
        body.plain += '\r\n\r\n-- \r\n' + options.signature.plain;
      }
      if (body.html) {
        body.html += '<br><br>--<br>' + options.signature.html;
      }
    }

    const attachments = await this.processAttachments(options.attachments || []);

    let raw = this.buildMimeMessage({
      ...options,
      body,
      attachments,
      messageId,
      date,
    });

    let isSigned = false;
    let isEncrypted = false;

    if (options.signKey) {
      raw = await this.signMessage(raw, options.signKey);
      isSigned = true;
    }

    if (options.encryptKeys && options.encryptKeys.length > 0) {
      raw = await this.encryptMessage(raw, options.encryptKeys, options.signKey);
      isEncrypted = true;
    }

    return {
      raw,
      messageId,
      date,
      isEncrypted,
      isSigned,
    };
  }

  private static buildMimeMessage(options: ComposeOptions & {
    messageId: string;
    date: Date;
    attachments: Attachment[];
  }): string {
    const lines: string[] = [];

    lines.push(`Date: ${this.formatDate(options.date)}`);
    lines.push(`From: ${this.formatAddress(options.from)}`);
    lines.push(`To: ${options.to.map(a => this.formatAddress(a)).join(', ')}`);

    if (options.cc && options.cc.length > 0) {
      lines.push(`Cc: ${options.cc.map(a => this.formatAddress(a)).join(', ')}`);
    }

    if (options.bcc && options.bcc.length > 0) {
      lines.push(`Bcc: ${options.bcc.map(a => this.formatAddress(a)).join(', ')}`);
    }

    if (options.replyTo) {
      lines.push(`Reply-To: ${this.formatAddress(options.replyTo)}`);
    }

    lines.push(`Subject: ${this.encodeRfc2047(options.subject)}`);
    lines.push('MIME-Version: 1.0');
    lines.push(`Message-Id: ${options.messageId}`);

    if (options.inReplyTo) {
      lines.push(`In-Reply-To: ${options.inReplyTo}`);
    }

    if (options.references && options.references.length > 0) {
      lines.push(`References: ${options.references.join(' ')}`);
    }

    if (options.priority) {
      const priorityMap: Record<string, string> = {
        high: '1 (Highest)',
        normal: '3 (Normal)',
        low: '5 (Lowest)',
      };
      lines.push(`X-Priority: ${priorityMap[options.priority]}`);
      lines.push(`Importance: ${options.priority}`);
    }

    if (options.requestReadReceipt) {
      lines.push(`Disposition-Notification-To: ${this.formatAddress(options.from)}`);
      lines.push(`Return-Receipt-To: ${this.formatAddress(options.from)}`);
    }

    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        lines.push(`${key}: ${value}`);
      }
    }

    const hasAttachments = options.attachments.length > 0;
    const hasHtml = !!options.body.html;
    const hasPlain = !!options.body.plain;
    const hasMarkdown = !!options.body.markdown;

    if (hasAttachments) {
      const mixedBoundary = this.generateBoundary();
      lines.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
      lines.push('');
      lines.push(`--${mixedBoundary}`);

      this.buildAlternativeContent(lines, options.body, mixedBoundary);

      for (const attachment of options.attachments) {
        lines.push('');
        lines.push(`--${mixedBoundary}`);
        this.buildAttachmentPart(lines, attachment);
      }

      lines.push('');
      lines.push(`--${mixedBoundary}--`);
    } else {
      this.buildAlternativeContent(lines, options.body, null);
    }

    return lines.join('\r\n');
  }

  private static buildAlternativeContent(
    lines: string[],
    body: EmailBody,
    mixedBoundary: string | null
  ): void {
    const hasHtml = !!body.html;
    const hasPlain = !!body.plain;
    const hasMarkdown = !!body.markdown;

    if (hasHtml || hasMarkdown) {
      const altBoundary = this.generateBoundary();
      lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
      lines.push('');

      if (hasPlain) {
        lines.push(`--${altBoundary}`);
        lines.push('Content-Type: text/plain; charset=utf-8');
        lines.push('Content-Transfer-Encoding: quoted-printable');
        lines.push('');
        lines.push(this.encodeQuotedPrintable(body.plain!));
      }

      if (hasMarkdown) {
        lines.push(`--${altBoundary}`);
        lines.push('Content-Type: text/markdown; charset=utf-8');
        lines.push('Content-Transfer-Encoding: quoted-printable');
        lines.push('');
        lines.push(this.encodeQuotedPrintable(body.markdown!));
      }

      if (hasHtml) {
        lines.push(`--${altBoundary}`);
        lines.push('Content-Type: text/html; charset=utf-8');
        lines.push('Content-Transfer-Encoding: quoted-printable');
        lines.push('');
        lines.push(this.encodeQuotedPrintable(body.html!));
      }

      lines.push(`--${altBoundary}--`);
    } else if (hasPlain) {
      lines.push('Content-Type: text/plain; charset=utf-8');
      lines.push('Content-Transfer-Encoding: quoted-printable');
      lines.push('');
      lines.push(this.encodeQuotedPrintable(body.plain!));
    }
  }

  private static buildAttachmentPart(lines: string[], attachment: Attachment): void {
    const disposition = attachment.isInline ? 'inline' : 'attachment';
    const filename = this.encodeRfc2047(attachment.filename);

    lines.push(`Content-Type: ${attachment.contentType}; name="${filename}"`);
    lines.push(`Content-Disposition: ${disposition}; filename="${filename}"`);

    if (attachment.contentId) {
      lines.push(`Content-ID: <${attachment.contentId}>`);
    }

    lines.push('Content-Transfer-Encoding: base64');
    lines.push('');

    let content: Buffer;
    if (attachment.content) {
      content = attachment.content;
    } else if (attachment.localPath) {
      content = fs.readFileSync(attachment.localPath);
    } else {
      return;
    }

    const base64 = content.toString('base64');
    for (let i = 0; i < base64.length; i += 76) {
      lines.push(base64.substring(i, i + 76));
    }
  }

  private static async processAttachments(
    attachments: Array<Attachment | string>
  ): Promise<Attachment[]> {
    const result: Attachment[] = [];
    let counter = 0;

    for (const att of attachments) {
      if (typeof att === 'string') {
        const stats = fs.statSync(att);
        const content = fs.readFileSync(att);
        const ext = path.extname(att).toLowerCase();
        const contentType = this.getContentType(ext);

        result.push({
          id: `attach_${Date.now()}_${counter++}`,
          emailId: '',
          filename: path.basename(att),
          contentType,
          size: stats.size,
          isInline: false,
          encoding: 'base64',
          content,
          localPath: att,
        });
      } else {
        if (!att.content && att.localPath) {
          att.content = fs.readFileSync(att.localPath);
          att.size = att.content.length;
        }
        result.push({ ...att, id: att.id || `attach_${Date.now()}_${counter++}` });
      }
    }

    return result;
  }

  private static getContentType(ext: string): string {
    const types: Record<string, string> = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.html': 'text/html',
      '.htm': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm',
    };
    return types[ext] || 'application/octet-stream';
  }

  private static async signMessage(raw: string, signKey: GpgKey): Promise<string> {
    const privateKey = await openpgp.readPrivateKey({ armoredKey: signKey.armored });

    const signed = await openpgp.sign({
      message: await openpgp.createCleartextMessage({ text: raw }),
      signingKeys: privateKey,
      format: 'armored',
    });

    return signed as string;
  }

  private static async encryptMessage(
    raw: string,
    encryptKeys: GpgKey[],
    signKey?: GpgKey
  ): Promise<string> {
    const publicKeys = await Promise.all(
      encryptKeys.map(k => openpgp.readKey({ armoredKey: k.armored }))
    );

    const message = await openpgp.createMessage({ text: raw });

    const encryptionOptions: openpgp.EncryptOptions & { format: 'armored' } = {
      message,
      encryptionKeys: publicKeys,
      format: 'armored',
    };

    if (signKey) {
      const privateKey = await openpgp.readPrivateKey({ armoredKey: signKey.armored });
      encryptionOptions.signingKeys = privateKey;
    }

    const encrypted = await openpgp.encrypt(encryptionOptions);
    return encrypted as string;
  }

  static async generateDkimSignature(
    raw: string,
    domain: string,
    selector: string,
    privateKeyPem: string
  ): Promise<string> {
    const lines = raw.split('\r\n');
    const headerLines: string[] = [];
    let bodyLines: string[] = [];
    let inBody = false;

    for (const line of lines) {
      if (inBody) {
        bodyLines.push(line);
      } else if (line === '') {
        inBody = true;
      } else {
        headerLines.push(line);
      }
    }

    while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1] === '') {
      bodyLines.pop();
    }

    const canonicalizedBody = bodyLines.join('\r\n') + '\r\n';
    const bodyHash = crypto.createHash('sha256').update(canonicalizedBody).digest('base64');

    const signedHeaders = headerLines
      .map(l => l.split(':')[0].toLowerCase())
      .filter(h => !h.startsWith('dkim-'))
      .join(':');

    const canonicalizedHeaders = headerLines
      .filter(l => !l.toLowerCase().startsWith('dkim-'))
      .map(l => {
        const [key, ...valueParts] = l.split(':');
        const value = valueParts.join(':').replace(/\s+/g, ' ').trim();
        return `${key.toLowerCase()}:${value}`;
      })
      .join('\r\n') + '\r\n';

    const dkimParams = [
      `v=1`,
      `a=rsa-sha256`,
      `c=relaxed/simple`,
      `d=${domain}`,
      `s=${selector}`,
      `h=${signedHeaders}`,
      `bh=${bodyHash}`,
      `b=`,
    ].join('; ');

    const dkimHeader = `DKIM-Signature: ${dkimParams}`;
    const signInput = canonicalizedHeaders + dkimHeader.toLowerCase().split(':')[0] + ':' +
      dkimHeader.split(':').slice(1).join(':').replace(/\s+/g, ' ').trim();

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signInput);
    const signature = sign.sign(privateKeyPem, 'base64');

    return dkimParams.replace(`b=`, `b=${signature}`);
  }

  private static formatAddress(address: string | EmailContact): string {
    if (typeof address === 'string') {
      return address;
    }
    if (address.name) {
      const encodedName = this.encodeRfc2047(address.name);
      return `${encodedName} <${address.email}>`;
    }
    return address.email;
  }

  private static getEmail(address: string | EmailContact): string {
    if (typeof address === 'string') {
      const match = address.match(/<([^>]+)>/);
      return match ? match[1] : address;
    }
    return address.email;
  }

  private static generateMessageId(from: string | EmailContact): string {
    const email = this.getEmail(from);
    const domain = email.split('@')[1];
    const rand = crypto.randomBytes(16).toString('hex');
    return `<${Date.now()}.${rand}@${domain}>`;
  }

  private static generateBoundary(): string {
    return `----=_Part_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private static formatDate(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const day = days[date.getDay()];
    const dateNum = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const tzOffset = -date.getTimezoneOffset();
    const tzHours = Math.floor(Math.abs(tzOffset) / 60).toString().padStart(2, '0');
    const tzMinutes = (Math.abs(tzOffset) % 60).toString().padStart(2, '0');
    const tzSign = tzOffset >= 0 ? '+' : '-';

    return `${day}, ${dateNum} ${month} ${year} ${hours}:${minutes}:${seconds} ${tzSign}${tzHours}${tzMinutes}`;
  }

  private static encodeRfc2047(str: string): string {
    if (/^[\x20-\x7E]*$/.test(str)) {
      if (str.includes('"') || str.includes('\\')) {
        return `"${str.replace(/"/g, '\\"').replace(/\\/g, '\\\\')}"`;
      }
      if (str.includes(' ') || str.length === 0) {
        return `"${str}"`;
      }
      return str;
    }

    const encoded = Buffer.from(str, 'utf8').toString('base64');
    return `=?UTF-8?B?${encoded}?=`;
  }

  private static encodeQuotedPrintable(str: string): string {
    const utf8Bytes = Buffer.from(str, 'utf8');
    let result = '';
    let lineLength = 0;

    for (let i = 0; i < utf8Bytes.length; i++) {
      const byte = utf8Bytes[i];
      let encoded: string;

      if (byte === 0x20 || byte === 0x09) {
        if (i === utf8Bytes.length - 1) {
          encoded = `=${byte.toString(16).toUpperCase().padStart(2, '0')}`;
        } else {
          encoded = String.fromCharCode(byte);
        }
      } else if (byte >= 0x21 && byte <= 0x3C) {
        encoded = String.fromCharCode(byte);
      } else if (byte >= 0x3E && byte <= 0x7E) {
        encoded = String.fromCharCode(byte);
      } else {
        encoded = `=${byte.toString(16).toUpperCase().padStart(2, '0')}`;
      }

      if (lineLength + encoded.length > 76) {
        result += '=\r\n';
        lineLength = 0;
      }

      result += encoded;
      lineLength += encoded.length;
    }

    return result;
  }

  private static async markdownToHtml(markdown: string): Promise<string> {
    return marked.parse(markdown) as string;
  }

  private static markdownToPlain(markdown: string): string {
    return markdown
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      .replace(/^>\s+/gm, '')
      .replace(/^[-*+]\s+/gm, '• ')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/^---+$/gm, '---')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private static htmlToPlain(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<h[1-6][^>]*>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<a[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      .replace(/^ +/gm, '');
  }

  static createReply(original: {
    from: EmailContact;
    to: EmailContact[];
    cc?: EmailContact[];
    subject: string;
    messageId?: string;
    references?: string[];
    body: EmailBody;
    date: number;
  }, replyAll: boolean = false): Partial<ComposeOptions> {
    const subject = original.subject.startsWith('Re:')
      ? original.subject
      : `Re: ${original.subject}`;

    const to: EmailContact[] = [original.from];
    const cc: EmailContact[] = replyAll ? [...(original.to || []), ...(original.cc || [])]
      .filter(c => c.email !== original.from.email) : [];

    const quoteText = this.generateQuote(original);

    return {
      to,
      cc,
      subject,
      body: {
        plain: quoteText.plain,
        html: quoteText.html,
      },
      inReplyTo: original.messageId,
      references: [...(original.references || []), original.messageId!].filter(Boolean),
    };
  }

  static createForward(original: {
    from: EmailContact;
    to: EmailContact[];
    cc?: EmailContact[];
    subject: string;
    date: number;
    body: EmailBody;
    attachments?: Attachment[];
  }): Partial<ComposeOptions> {
    const subject = original.subject.startsWith('Fwd:') || original.subject.startsWith('Forward:')
      ? original.subject
      : `Fwd: ${original.subject}`;

    const forwardText = this.generateForwardHeader(original);

    return {
      subject,
      body: {
        plain: forwardText.plain + '\r\n\r\n' + (original.body.plain || ''),
        html: forwardText.html + '<br><br>' + (original.body.html || ''),
      },
      attachments: original.attachments,
    };
  }

  private static generateQuote(original: {
    from: EmailContact;
    date: number;
    body: EmailBody;
  }): EmailBody {
    const dateStr = new Date(original.date).toLocaleString();
    const fromStr = original.from.name
      ? `${original.from.name} <${original.from.email}>`
      : original.from.email;

    const plainQuote = `\r\n\r\nOn ${dateStr}, ${fromStr} wrote:\r\n` +
      (original.body.plain || '').split('\n').map((l: string) => `> ${l}`).join('\n');

    const htmlQuote = `<br><br>On ${dateStr}, ${fromStr} wrote:<br>` +
      `<blockquote style="margin:0 0 0 .8ex;border-left:1px #ccc solid;padding-left:1ex">` +
      (original.body.html || '') +
      `</blockquote>`;

    return {
      plain: plainQuote,
      html: htmlQuote,
    };
  }

  private static generateForwardHeader(original: {
    from: EmailContact;
    to: EmailContact[];
    cc?: EmailContact[];
    date: number;
    subject: string;
  }): EmailBody {
    const dateStr = new Date(original.date).toLocaleString();
    const toStr = original.to.map(a => a.name ? `${a.name} <${a.email}>` : a.email).join(', ');
    const ccStr = original.cc?.map(a => a.name ? `${a.name} <${a.email}>` : a.email).join(', ') || '';

    const plainHeader =
      `---------- Forwarded message ---------\r\n` +
      `From: ${original.from.name ? `${original.from.name} <${original.from.email}>` : original.from.email}\r\n` +
      `Date: ${dateStr}\r\n` +
      `Subject: ${original.subject}\r\n` +
      `To: ${toStr}\r\n` +
      (ccStr ? `Cc: ${ccStr}\r\n` : '');

    const htmlHeader =
      `<div style="border:1px solid #ccc;padding:10px;margin:10px 0">\r\n` +
      `<p style="margin:0 0 5px 0"><strong>---------- Forwarded message ----------</strong></p>\r\n` +
      `<p style="margin:2px 0"><strong>From:</strong> ${original.from.name ? `${original.from.name} &lt;${original.from.email}&gt;` : original.from.email}</p>\r\n` +
      `<p style="margin:2px 0"><strong>Date:</strong> ${dateStr}</p>\r\n` +
      `<p style="margin:2px 0"><strong>Subject:</strong> ${original.subject}</p>\r\n` +
      `<p style="margin:2px 0"><strong>To:</strong> ${toStr}</p>\r\n` +
      (ccStr ? `<p style="margin:2px 0"><strong>Cc:</strong> ${ccStr}</p>\r\n` : '') +
      `</div>`;

    return {
      plain: plainHeader,
      html: htmlHeader,
    };
  }
}

export default MailComposer;
