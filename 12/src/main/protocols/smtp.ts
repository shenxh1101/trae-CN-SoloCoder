import * as net from 'net';
import * as tls from 'tls';
import { EventEmitter } from 'events';
import { ServerConfig, EmailContact, Attachment } from '../../shared/types';

export interface SmtpResponse {
  code: number;
  message: string;
  data: string[];
}

export interface SmtpSendOptions {
  from: string | EmailContact;
  to: Array<string | EmailContact>;
  cc?: Array<string | EmailContact>;
  bcc?: Array<string | EmailContact>;
  replyTo?: string | EmailContact;
  subject: string;
  body: {
    plain?: string;
    html?: string;
    markdown?: string;
  };
  attachments?: Attachment[];
  inReplyTo?: string;
  references?: string[];
  dsn?: {
    notify?: 'SUCCESS' | 'FAILURE' | 'DELAY' | 'NEVER';
    ret?: 'FULL' | 'HDRS';
  };
}

export interface SmtpCapabilities {
  [key: string]: boolean | string | number | string[] | undefined;
  '8BITMIME': boolean;
  AUTH: string[];
  PIPELINING: boolean;
  DSN: boolean;
  STARTTLS: boolean;
  SIZE: number;
}

export class SmtpClient extends EventEmitter {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private config: ServerConfig;
  private connected: boolean = false;
  private authenticated: boolean = false;
  private responseBuffer: string = '';
  private capabilities: SmtpCapabilities = {
    '8BITMIME': false,
    AUTH: [],
    PIPELINING: false,
    DSN: false,
    STARTTLS: false,
    SIZE: 0,
  };

  constructor(config: ServerConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve();
        return;
      }

      const connectHandler = () => {
        if (this.config.secure && this.socket instanceof tls.TLSSocket) {
          if (!this.socket.authorized) {
            this.emit('error', new Error('TLS authorization failed: ' + this.socket.authorizationError?.message));
          }
        }
      };

      if (this.config.secure) {
        this.socket = tls.connect({
          host: this.config.host,
          port: this.config.port,
          rejectUnauthorized: false,
          servername: this.config.host,
        }, connectHandler);
      } else {
        this.socket = net.connect({
          host: this.config.host,
          port: this.config.port,
        }, connectHandler);
      }

      this.socket.setEncoding('utf8');

      this.socket.on('data', (data: string) => {
        this.handleData(data);
      });

      this.socket.on('error', (error: Error) => {
        this.emit('error', error);
        reject(error);
      });

      this.socket.on('close', () => {
        this.connected = false;
        this.authenticated = false;
        this.emit('close');
      });

      this.socket.on('connect', () => {
        this.connected = true;
      });

      const onGreeting = (response: SmtpResponse) => {
        if (response.code === 220) {
          resolve();
        } else {
          reject(new Error(`Connection failed: ${response.message}`));
        }
      };

      this.commandQueue.push({
        command: '',
        resolve: onGreeting as any,
        reject,
      });
    });
  }

  async ehlo(): Promise<SmtpCapabilities> {
    this.checkConnected();

    const hostname = require('os').hostname();
    const response = await this.executeCommand(`EHLO ${hostname}`);

    if (response.code === 250) {
      this.parseCapabilities(response.data);
      
      if (!this.config.secure && this.capabilities.STARTTLS) {
        await this.startTls();
        await this.ehlo();
      }
    } else if (response.code === 500 || response.code === 502) {
      await this.executeCommand(`HELO ${hostname}`);
    }

    return this.capabilities;
  }

  private async startTls(): Promise<void> {
    const response = await this.executeCommand('STARTTLS');

    if (response.code !== 220) {
      throw new Error(`STARTTLS failed: ${response.message}`);
    }

    if (this.socket && !(this.socket instanceof tls.TLSSocket)) {
      const plainSocket = this.socket as net.Socket;
      
      this.socket = tls.connect({
        socket: plainSocket,
        rejectUnauthorized: false,
        servername: this.config.host,
      });

      this.socket.setEncoding('utf8');
      
      this.socket.on('data', (data: string) => {
        this.handleData(data);
      });

      this.socket.on('error', (error: Error) => {
        this.emit('error', error);
      });

      this.socket.on('close', () => {
        this.connected = false;
        this.authenticated = false;
        this.emit('close');
      });
    }
  }

  async login(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    await this.ehlo();

    const authMethods = this.capabilities.AUTH || [];

    if (authMethods.includes('PLAIN')) {
      await this.authPlain();
    } else if (authMethods.includes('LOGIN')) {
      await this.authLogin();
    } else {
      throw new Error('No supported authentication methods available');
    }

    this.authenticated = true;
    this.emit('authenticated');
  }

  private async authPlain(): Promise<void> {
    const authString = Buffer.from(
      `\0${this.config.username}\0${this.config.password}`,
      'utf8'
    ).toString('base64');

    const response = await this.executeCommand(`AUTH PLAIN ${authString}`);

    if (response.code !== 235) {
      throw new Error(`AUTH PLAIN failed: ${response.message}`);
    }
  }

  private async authLogin(): Promise<void> {
    let response = await this.executeCommand('AUTH LOGIN');
    
    if (response.code !== 334) {
      throw new Error(`AUTH LOGIN failed: ${response.message}`);
    }

    const usernameB64 = Buffer.from(this.config.username, 'utf8').toString('base64');
    response = await this.executeCommand(usernameB64);

    if (response.code !== 334) {
      throw new Error(`AUTH LOGIN username failed: ${response.message}`);
    }

    const passwordB64 = Buffer.from(this.config.password, 'utf8').toString('base64');
    response = await this.executeCommand(passwordB64);

    if (response.code !== 235) {
      throw new Error(`AUTH LOGIN password failed: ${response.message}`);
    }
  }

  async send(options: SmtpSendOptions): Promise<string> {
    this.checkAuthenticated();

    const from = this.getEmailAddress(options.from);
    const recipients = [
      ...options.to.map(r => this.getEmailAddress(r)),
      ...(options.cc || []).map(r => this.getEmailAddress(r)),
      ...(options.bcc || []).map(r => this.getEmailAddress(r)),
    ];

    let mailFromCmd = `MAIL FROM:<${from}>`;
    
    if (this.capabilities.DSN && options.dsn) {
      if (options.dsn.notify) {
        mailFromCmd += ` NOTIFY=${options.dsn.notify}`;
      }
      if (options.dsn.ret) {
        mailFromCmd += ` RET=${options.dsn.ret}`;
      }
    }

    if (this.capabilities['8BITMIME']) {
      mailFromCmd += ' BODY=8BITMIME';
    }

    let response = await this.executeCommand(mailFromCmd);
    
    if (response.code !== 250) {
      throw new Error(`MAIL FROM failed: ${response.message}`);
    }

    if (this.capabilities.PIPELINING) {
      const rcptCommands = recipients.map(r => {
        let cmd = `RCPT TO:<${r}>`;
        if (this.capabilities.DSN && options.dsn?.notify && options.dsn.notify !== 'NEVER') {
          cmd += ` NOTIFY=${options.dsn.notify}`;
        }
        return cmd;
      });

      const responses = await this.executeCommands([...rcptCommands, 'DATA']);
      
      for (let i = 0; i < responses.length - 1; i++) {
        if (responses[i].code !== 250 && responses[i].code !== 251) {
          throw new Error(`RCPT TO failed for ${recipients[i]}: ${responses[i].message}`);
        }
      }

      response = responses[responses.length - 1];
    } else {
      for (const recipient of recipients) {
        let rcptCmd = `RCPT TO:<${recipient}>`;
        if (this.capabilities.DSN && options.dsn?.notify && options.dsn.notify !== 'NEVER') {
          rcptCmd += ` NOTIFY=${options.dsn.notify}`;
        }

        response = await this.executeCommand(rcptCmd);
        
        if (response.code !== 250 && response.code !== 251) {
          throw new Error(`RCPT TO failed for ${recipient}: ${response.message}`);
        }
      }

      response = await this.executeCommand('DATA');
    }

    if (response.code !== 354) {
      throw new Error(`DATA failed: ${response.message}`);
    }

    const message = await this.buildMessage(options);
    const dotEscaped = message.replace(/^\./gm, '..');

    response = await this.executeCommand(`${dotEscaped}\r\n.`);

    if (response.code !== 250) {
      throw new Error(`Send failed: ${response.message}`);
    }

    const match = response.message.match(/\b([A-Za-z0-9]{10,})\b/);
    return match ? match[1] : response.message;
  }

  async quit(): Promise<void> {
    if (this.authenticated) {
      try {
        await this.executeCommand('QUIT');
      } catch {
        // Ignore errors on quit
      }
      this.authenticated = false;
    }

    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }

    this.connected = false;
    this.emit('logout');
  }

  async reset(): Promise<void> {
    this.checkAuthenticated();
    await this.executeCommand('RSET');
  }

  async verify(email: string): Promise<boolean> {
    this.checkAuthenticated();

    try {
      const response = await this.executeCommand(`VRFY ${email}`);
      return response.code === 250 || response.code === 251;
    } catch {
      return false;
    }
  }

  async expand(alias: string): Promise<string[]> {
    this.checkAuthenticated();

    const response = await this.executeCommand(`EXPN ${alias}`);
    
    if (response.code !== 250) {
      throw new Error(`EXPN failed: ${response.message}`);
    }

    return response.data.map(line => {
      const match = line.match(/^\d{3}[-\s](.*)$/);
      return match ? match[1] : line;
    });
  }

  async noop(): Promise<void> {
    this.checkConnected();
    await this.executeCommand('NOOP');
  }

  isConnected(): boolean {
    return this.connected;
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getCapabilities(): SmtpCapabilities {
    return { ...this.capabilities };
  }

  private commandQueue: Array<{
    command: string;
    resolve: (response: SmtpResponse) => void;
    reject: (error: Error) => void;
  }> = [];

  private currentCommand: typeof this.commandQueue[0] | null = null;

  private handleData(data: string): void {
    this.responseBuffer += data;

    let lineEnd;
    while ((lineEnd = this.responseBuffer.indexOf('\r\n')) !== -1) {
      const line = this.responseBuffer.substring(0, lineEnd);
      this.responseBuffer = this.responseBuffer.substring(lineEnd + 2);

      if (this.currentCommand) {
        (this.currentCommand as any).data = (this.currentCommand as any).data || [];
        (this.currentCommand as any).data.push(line);

        if (line.length >= 3 && !isNaN(parseInt(line.substring(0, 3)))) {
          if (line[3] !== '-') {
            const response = this.parseResponse((this.currentCommand as any).data || []);
            
            if (response.code >= 400) {
              this.currentCommand.reject(new Error(`${response.code} ${response.message}`));
            } else {
              this.currentCommand.resolve(response);
            }

            this.currentCommand = null;
            this.processQueue();
          }
        }
      } else if (this.commandQueue.length > 0 && this.commandQueue[0].command === '') {
        const greetingCmd = this.commandQueue.shift()!;
        const match = line.match(/^(\d{3})\s(.*)$/);
        
        if (match) {
          greetingCmd.resolve({
            code: parseInt(match[1], 10),
            message: match[2],
            data: [line],
          });
        }
      }
    }
  }

  private parseResponse(data: string[]): SmtpResponse {
    const lastLine = data[data.length - 1] || '';
    const match = lastLine.match(/^(\d{3})\s(.*)$/);
    
    if (!match) {
      return {
        code: 500,
        message: 'Invalid response',
        data,
      };
    }

    return {
      code: parseInt(match[1], 10),
      message: match[2],
      data,
    };
  }

  private processQueue(): void {
    if (this.currentCommand || this.commandQueue.length === 0 || !this.socket) {
      return;
    }

    this.currentCommand = this.commandQueue.shift()!;
    (this.currentCommand as any).data = [];

    if (this.currentCommand.command) {
      this.socket.write(`${this.currentCommand.command}\r\n`);
    }
  }

  private executeCommand(command: string): Promise<SmtpResponse> {
    return new Promise((resolve, reject) => {
      this.commandQueue.push({ command, resolve, reject });
      this.processQueue();
    });
  }

  private async executeCommands(commands: string[]): Promise<SmtpResponse[]> {
    if (!this.socket) {
      throw new Error('Not connected');
    }

    const promises: Promise<SmtpResponse>[] = [];

    for (const command of commands) {
      promises.push(new Promise<SmtpResponse>((resolve, reject) => {
        this.commandQueue.push({ command, resolve, reject });
      }));
      
      this.socket.write(`${command}\r\n`);
    }

    this.processQueue();

    return Promise.all(promises);
  }

  private parseCapabilities(data: string[]): void {
    this.capabilities = {
      '8BITMIME': false,
      AUTH: [],
      PIPELINING: false,
      DSN: false,
      STARTTLS: false,
      SIZE: 0,
    };

    for (const line of data) {
      const match = line.match(/^\d{3}[-\s](\S+)(?:\s+(.*))?$/);
      if (!match) continue;

      const capability = match[1].toUpperCase();
      const params = match[2] || '';

      switch (capability) {
        case '8BITMIME':
          this.capabilities['8BITMIME'] = true;
          break;
        case 'AUTH':
          this.capabilities.AUTH = params.split(' ').filter(Boolean);
          break;
        case 'PIPELINING':
          this.capabilities.PIPELINING = true;
          break;
        case 'DSN':
          this.capabilities.DSN = true;
          break;
        case 'STARTTLS':
          this.capabilities.STARTTLS = true;
          break;
        case 'SIZE':
          this.capabilities.SIZE = parseInt(params, 10) || 0;
          break;
        default:
          this.capabilities[capability] = params || true;
      }
    }
  }

  private getEmailAddress(contact: string | EmailContact): string {
    if (typeof contact === 'string') {
      return contact;
    }
    return contact.email;
  }

  private formatEmailAddress(contact: string | EmailContact): string {
    if (typeof contact === 'string') {
      return contact;
    }
    if (contact.name) {
      const encodedName = this.encodeMimeWord(contact.name);
      return `${encodedName} <${contact.email}>`;
    }
    return contact.email;
  }

  private encodeMimeWord(str: string): string {
    if (/^[\x20-\x7E]*$/.test(str)) {
      return `"${str.replace(/"/g, '\\"')}"`;
    }
    const encoded = Buffer.from(str, 'utf8').toString('base64');
    return `=?UTF-8?B?${encoded}?=`;
  }

  private async buildMessage(options: SmtpSendOptions): Promise<string> {
    const lines: string[] = [];

    lines.push(`Date: ${this.formatDate(new Date())}`);
    lines.push(`From: ${this.formatEmailAddress(options.from)}`);
    lines.push(`To: ${options.to.map(r => this.formatEmailAddress(r)).join(', ')}`);
    
    if (options.cc && options.cc.length > 0) {
      lines.push(`Cc: ${options.cc.map(r => this.formatEmailAddress(r)).join(', ')}`);
    }
    
    if (options.replyTo) {
      lines.push(`Reply-To: ${this.formatEmailAddress(options.replyTo)}`);
    }

    lines.push(`Subject: ${this.encodeMimeWord(options.subject)}`);
    lines.push('MIME-Version: 1.0');

    const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 15)}@${this.getEmailAddress(options.from).split('@')[1]}>`;
    lines.push(`Message-Id: ${messageId}`);

    if (options.inReplyTo) {
      lines.push(`In-Reply-To: ${options.inReplyTo}`);
    }

    if (options.references && options.references.length > 0) {
      lines.push(`References: ${options.references.join(' ')}`);
    }

    const hasAttachments = options.attachments && options.attachments.length > 0;
    const hasHtml = !!options.body.html;
    const hasPlain = !!options.body.plain;
    const hasMarkdown = !!options.body.markdown;

    if (hasAttachments) {
      const mixedBoundary = this.generateBoundary();
      lines.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
      lines.push('');
      lines.push(`--${mixedBoundary}`);

      if (hasHtml || hasMarkdown) {
        const altBoundary = this.generateBoundary();
        lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
        lines.push('');

        if (hasPlain) {
          lines.push(`--${altBoundary}`);
          lines.push('Content-Type: text/plain; charset=utf-8');
          lines.push('Content-Transfer-Encoding: quoted-printable');
          lines.push('');
          lines.push(this.encodeQuotedPrintable(options.body.plain!));
        }

        if (hasMarkdown) {
          lines.push(`--${altBoundary}`);
          lines.push('Content-Type: text/markdown; charset=utf-8');
          lines.push('Content-Transfer-Encoding: quoted-printable');
          lines.push('');
          lines.push(this.encodeQuotedPrintable(options.body.markdown!));
        }

        if (hasHtml) {
          lines.push(`--${altBoundary}`);
          lines.push('Content-Type: text/html; charset=utf-8');
          lines.push('Content-Transfer-Encoding: quoted-printable');
          lines.push('');
          lines.push(this.encodeQuotedPrintable(options.body.html!));
        }

        lines.push(`--${altBoundary}--`);
      } else if (hasPlain) {
        lines.push('Content-Type: text/plain; charset=utf-8');
        lines.push('Content-Transfer-Encoding: quoted-printable');
        lines.push('');
        lines.push(this.encodeQuotedPrintable(options.body.plain!));
      }

      if (options.attachments) {
        for (const attachment of options.attachments) {
          lines.push('');
          lines.push(`--${mixedBoundary}`);
          
          const disposition = attachment.isInline ? 'inline' : 'attachment';
          const filename = this.encodeMimeWord(attachment.filename);
          
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
            const fs = require('fs');
            content = await fs.promises.readFile(attachment.localPath);
          } else {
            continue;
          }

          const base64 = content.toString('base64');
          for (let i = 0; i < base64.length; i += 76) {
            lines.push(base64.substring(i, i + 76));
          }
        }
      }

      lines.push('');
      lines.push(`--${mixedBoundary}--`);
    } else if (hasHtml || hasMarkdown) {
      const altBoundary = this.generateBoundary();
      lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
      lines.push('');

      if (hasPlain) {
        lines.push(`--${altBoundary}`);
        lines.push('Content-Type: text/plain; charset=utf-8');
        lines.push('Content-Transfer-Encoding: quoted-printable');
        lines.push('');
        lines.push(this.encodeQuotedPrintable(options.body.plain!));
      }

      if (hasMarkdown) {
        lines.push(`--${altBoundary}`);
        lines.push('Content-Type: text/markdown; charset=utf-8');
        lines.push('Content-Transfer-Encoding: quoted-printable');
        lines.push('');
        lines.push(this.encodeQuotedPrintable(options.body.markdown!));
      }

      if (hasHtml) {
        lines.push(`--${altBoundary}`);
        lines.push('Content-Type: text/html; charset=utf-8');
        lines.push('Content-Transfer-Encoding: quoted-printable');
        lines.push('');
        lines.push(this.encodeQuotedPrintable(options.body.html!));
      }

      lines.push(`--${altBoundary}--`);
    } else if (hasPlain) {
      lines.push('Content-Type: text/plain; charset=utf-8');
      lines.push('Content-Transfer-Encoding: quoted-printable');
      lines.push('');
      lines.push(this.encodeQuotedPrintable(options.body.plain!));
    }

    return lines.join('\r\n');
  }

  private generateBoundary(): string {
    return `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private encodeQuotedPrintable(str: string): string {
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

  private formatDate(date: Date): string {
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

  private checkConnected(): void {
    if (!this.connected || !this.socket) {
      throw new Error('Not connected');
    }
  }

  private checkAuthenticated(): void {
    if (!this.authenticated) {
      throw new Error('Not authenticated');
    }
  }

  async close(): Promise<void> {
    await this.quit();
  }
}

export default SmtpClient;
