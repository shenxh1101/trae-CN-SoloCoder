import * as net from 'net';
import * as tls from 'tls';
import { EventEmitter } from 'events';
import { ServerConfig, MailFolder, EmailFlags, Email, Attachment, EmailBody, EmailContact } from '../../shared/types';

export interface ImapResponse {
  tag: string;
  status: 'OK' | 'NO' | 'BAD' | 'PREAUTH' | 'BYE';
  message: string;
  data: string[];
}

export interface ImapFetchOptions {
  bodies?: string[];
  flags?: boolean;
  uid?: boolean;
  size?: boolean;
  envelope?: boolean;
  internalDate?: boolean;
}

export interface ImapSearchCriteria {
  all?: boolean;
  answered?: boolean;
  bcc?: string;
  before?: Date;
  body?: string;
  cc?: string;
  deleted?: boolean;
  draft?: boolean;
  flagged?: boolean;
  from?: string;
  header?: [string, string];
  keyword?: string;
  larger?: number;
  new?: boolean;
  not?: ImapSearchCriteria;
  old?: boolean;
  on?: Date;
  or?: [ImapSearchCriteria, ImapSearchCriteria];
  recent?: boolean;
  seen?: boolean;
  sentBefore?: Date;
  sentOn?: Date;
  sentSince?: Date;
  since?: Date;
  smaller?: number;
  subject?: string;
  text?: string;
  to?: string;
  uid?: string;
  unanswered?: boolean;
  undeleted?: boolean;
  undraft?: boolean;
  unflagged?: boolean;
  unkeyword?: string;
  unseen?: boolean;
}

export interface ImapIdleOptions {
  timeout?: number;
}

export class ImapClient extends EventEmitter {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private config: ServerConfig;
  private connected: boolean = false;
  private authenticated: boolean = false;
  private tagCounter: number = 0;
  private responseBuffer: string = '';
  private commandQueue: Array<{
    tag: string;
    command: string;
    resolve: (response: ImapResponse) => void;
    reject: (error: Error) => void;
  }> = [];
  private currentCommand: typeof this.commandQueue[0] | null = null;
  private selectedMailbox: string | null = null;
  private mailboxDelimiter: string = '/';
  private idleTimeoutMs: number = 1740000;
  private idleTimeout: NodeJS.Timeout | null = null;
  private idleActive: boolean = false;

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

      const onReady = (response: ImapResponse) => {
        if (response.status === 'OK' || response.status === 'PREAUTH') {
          resolve();
        } else {
          reject(new Error(`Connection failed: ${response.message}`));
        }
      };

      this.commandQueue.push({
        tag: '*',
        command: '',
        resolve: onReady as any,
        reject,
      });
    });
  }

  async login(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    const authPlain = Buffer.from(
      `\0${this.config.username}\0${this.config.password}`,
      'utf8'
    ).toString('base64');

    try {
      await this.executeCommand(`AUTHENTICATE PLAIN ${authPlain}`);
      this.authenticated = true;
      this.emit('authenticated');
    } catch {
      try {
        await this.executeCommand(`LOGIN "${this.escapeString(this.config.username)}" "${this.escapeString(this.config.password)}"`);
        this.authenticated = true;
        this.emit('authenticated');
      } catch (loginError) {
        throw loginError;
      }
    }
  }

  async logout(): Promise<void> {
    if (this.idleActive) {
      await this.stopIdle();
    }

    if (this.authenticated) {
      await this.executeCommand('LOGOUT');
      this.authenticated = false;
    }

    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }

    this.connected = false;
    this.emit('logout');
  }

  async list(reference: string = '', pattern: string = '*'): Promise<MailFolder[]> {
    this.checkAuthenticated();

    const response = await this.executeCommand(`LIST "${this.escapeString(reference)}" "${this.escapeString(pattern)}"`);
    const folders: MailFolder[] = [];

    for (const line of response.data) {
      const listMatch = line.match(/^\* LIST \((.*?)\) "([^"]+)" (.+)$/);
      if (listMatch) {
        const attributes = listMatch[1].split(' ').filter(Boolean);
        const delimiter = listMatch[2];
        const name = listMatch[3].replace(/^"|"$/g, '');
        
        this.mailboxDelimiter = delimiter;

        folders.push({
          id: '',
          accountId: '',
          name: name.split(delimiter).pop() || name,
          path: name,
          delimiter,
          attributes,
          uidValidity: 0,
          uidNext: 0,
          totalMessages: 0,
          unreadCount: 0,
          isSyncing: false,
          lastSyncedAt: 0,
        });
      }
    }

    return folders;
  }

  async select(mailbox: string, readOnly: boolean = false): Promise<{
    exists: number;
    recent: number;
    uidValidity: number;
    uidNext: number;
    unseen: number;
  }> {
    this.checkAuthenticated();

    const command = readOnly ? 'EXAMINE' : 'SELECT';
    const response = await this.executeCommand(`${command} "${this.escapeString(mailbox)}"`);

    let exists = 0;
    let recent = 0;
    let uidValidity = 0;
    let uidNext = 0;
    let unseen = 0;

    for (const line of response.data) {
      const existsMatch = line.match(/^\* (\d+) EXISTS$/);
      if (existsMatch) {
        exists = parseInt(existsMatch[1], 10);
      }

      const recentMatch = line.match(/^\* (\d+) RECENT$/);
      if (recentMatch) {
        recent = parseInt(recentMatch[1], 10);
      }

      const uidValidityMatch = line.match(/\[UIDVALIDITY (\d+)\]/);
      if (uidValidityMatch) {
        uidValidity = parseInt(uidValidityMatch[1], 10);
      }

      const uidNextMatch = line.match(/\[UIDNEXT (\d+)\]/);
      if (uidNextMatch) {
        uidNext = parseInt(uidNextMatch[1], 10);
      }

      const unseenMatch = line.match(/\[UNSEEN (\d+)\]/);
      if (unseenMatch) {
        unseen = parseInt(unseenMatch[1], 10);
      }
    }

    this.selectedMailbox = mailbox;
    this.emit('mailboxSelected', mailbox);

    return { exists, recent, uidValidity, uidNext, unseen };
  }

  async fetch(
    sequence: string,
    options: ImapFetchOptions = {}
  ): Promise<Array<{
    seq: number;
    uid?: number;
    flags?: string[];
    size?: number;
    internalDate?: string;
    envelope?: any;
    body?: { [section: string]: string };
  }>> {
    this.checkAuthenticated();
    this.checkSelected();

    const attributes: string[] = [];

    if (options.uid) {
      attributes.push('UID');
    }

    if (options.flags) {
      attributes.push('FLAGS');
    }

    if (options.size) {
      attributes.push('RFC822.SIZE');
    }

    if (options.envelope) {
      attributes.push('ENVELOPE');
    }

    if (options.internalDate) {
      attributes.push('INTERNALDATE');
    }

    if (options.bodies) {
      for (const body of options.bodies) {
        attributes.push(`BODY.PEEK[${body}]`);
      }
    }

    const command = options.uid
      ? `UID FETCH ${sequence} (${attributes.join(' ')})`
      : `FETCH ${sequence} (${attributes.join(' ')})`;

    const response = await this.executeCommand(command);
    const results: Array<{
      seq: number;
      uid?: number;
      flags?: string[];
      size?: number;
      internalDate?: string;
      envelope?: any;
      body?: { [section: string]: string };
    }> = [];

    let i = 0;
    while (i < response.data.length) {
      const line = response.data[i];
      const fetchMatch = line.match(/^\* (\d+) FETCH \((.*)\)$/);

      if (fetchMatch) {
        const seq = parseInt(fetchMatch[1], 10);
        const result: any = { seq };
        const fetchData = fetchMatch[2];

        const uidMatch = fetchData.match(/UID (\d+)/);
        if (uidMatch) {
          result.uid = parseInt(uidMatch[1], 10);
        }

        const flagsMatch = fetchData.match(/FLAGS \(([^)]*)\)/);
        if (flagsMatch) {
          result.flags = flagsMatch[1].split(' ').filter(Boolean);
        }

        const sizeMatch = fetchData.match(/RFC822\.SIZE (\d+)/);
        if (sizeMatch) {
          result.size = parseInt(sizeMatch[1], 10);
        }

        const dateMatch = fetchData.match(/INTERNALDATE "([^"]+)"/);
        if (dateMatch) {
          result.internalDate = dateMatch[1];
        }

        const envMatch = fetchData.match(/ENVELOPE \((.+)\)\s*$/);
        if (envMatch) {
          result.envelope = this.parseEnvelope(envMatch[1]);
        }

        if (options.bodies) {
          result.body = {};
          for (const bodySection of options.bodies!) {
            const bodyRegex = new RegExp(
              `BODY\\.PEEK\\[${bodySection.replace(/[\[\]]/g, '\\$&')}\\] \\{\\d+\\}`
            );
            const bodyMatch = fetchData.match(bodyRegex);
            if (bodyMatch && i + 1 < response.data.length) {
              i++;
              result.body[bodySection] = response.data[i];
            }
          }
        }

        results.push(result);
      }
      i++;
    }

    return results;
  }

  async store(
    sequence: string,
    action: 'add' | 'remove' | 'set',
    flags: string[],
    useUid: boolean = false
  ): Promise<void> {
    this.checkAuthenticated();
    this.checkSelected();

    const actionPrefix = action === 'add' ? '+' : action === 'remove' ? '-' : '';
    const flagsStr = flags.join(' ');
    const command = useUid
      ? `UID STORE ${sequence} ${actionPrefix}FLAGS (${flagsStr})`
      : `STORE ${sequence} ${actionPrefix}FLAGS (${flagsStr})`;

    await this.executeCommand(command);
  }

  async copy(
    sequence: string,
    destination: string,
    useUid: boolean = false
  ): Promise<void> {
    this.checkAuthenticated();
    this.checkSelected();

    const command = useUid
      ? `UID COPY ${sequence} "${this.escapeString(destination)}"`
      : `COPY ${sequence} "${this.escapeString(destination)}"`;

    await this.executeCommand(command);
  }

  async move(
    sequence: string,
    destination: string,
    useUid: boolean = false
  ): Promise<void> {
    this.checkAuthenticated();
    this.checkSelected();

    try {
      const command = useUid
        ? `UID MOVE ${sequence} "${this.escapeString(destination)}"`
        : `MOVE ${sequence} "${this.escapeString(destination)}"`;
      await this.executeCommand(command);
    } catch {
      await this.copy(sequence, destination, useUid);
      await this.store(sequence, 'add', ['\\Deleted'], useUid);
      await this.expunge();
    }
  }

  async append(
    mailbox: string,
    message: string | Buffer,
    flags?: string[],
    date?: Date
  ): Promise<void> {
    this.checkAuthenticated();

    const flagStr = flags && flags.length > 0 ? `(${flags.join(' ')})` : '';
    const dateStr = date ? `"${this.formatDate(date)}"` : '';

    const messageBuffer = typeof message === 'string' ? Buffer.from(message, 'utf8') : message;
    const size = messageBuffer.length;

    const command = `APPEND "${this.escapeString(mailbox)}" ${flagStr} ${dateStr} {${size}}`;
    const tag = this.generateTag();

    return new Promise((resolve, reject) => {
      this.commandQueue.push({
        tag,
        command,
        resolve: (response) => {
          if (response.status === 'OK') {
            resolve();
          } else {
            reject(new Error(`APPEND failed: ${response.message}`));
          }
        },
        reject,
      });

      this.processQueue();

      const onContinue = () => {
        this.removeListener('continue', onContinue);
        if (this.socket) {
          this.socket.write(messageBuffer);
          this.socket.write('\r\n');
        }
      };

      this.once('continue', onContinue);
    });
  }

  async search(
    criteria: ImapSearchCriteria,
    useUid: boolean = false
  ): Promise<number[]> {
    this.checkAuthenticated();
    this.checkSelected();

    const searchString = this.buildSearchCriteria(criteria);
    const command = useUid
      ? `UID SEARCH ${searchString}`
      : `SEARCH ${searchString}`;

    const response = await this.executeCommand(command);

    for (const line of response.data) {
      const searchMatch = line.match(/^\* SEARCH (.*)$/);
      if (searchMatch) {
        return searchMatch[1].split(' ').filter(Boolean).map(Number);
      }
    }

    return [];
  }

  async expunge(): Promise<void> {
    this.checkAuthenticated();
    this.checkSelected();
    await this.executeCommand('EXPUNGE');
  }

  async startIdle(options: ImapIdleOptions = {}): Promise<void> {
    this.checkAuthenticated();
    this.checkSelected();

    if (this.idleActive) {
      return;
    }

    const timeout = options.timeout || 1740000;
    this.idleTimeoutMs = timeout;

    try {
      await this.executeCommand('IDLE');
      this.idleActive = true;
      this.emit('idleStarted');

      this.idleTimeout = setTimeout(() => {
        this.resetIdle();
      }, timeout);

      this.on('idleData', this.handleIdleData.bind(this));
    } catch (error) {
      throw error;
    }
  }

  async stopIdle(): Promise<void> {
    if (!this.idleActive) {
      return;
    }

    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }

    if (this.socket) {
      this.socket.write('DONE\r\n');
    }

    this.idleActive = false;
    this.removeListener('idleData', this.handleIdleData.bind(this));
    this.emit('idleStopped');
  }

  private async resetIdle(): Promise<void> {
    if (!this.idleActive) {
      return;
    }

    await this.stopIdle();
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.startIdle({ timeout: this.idleTimeoutMs });
  }

  private handleIdleData(line: string): void {
    const existsMatch = line.match(/^\* (\d+) EXISTS$/);
    if (existsMatch) {
      this.emit('newMessage', parseInt(existsMatch[1], 10));
    }

    const fetchMatch = line.match(/^\* (\d+) FETCH \((.*)\)$/);
    if (fetchMatch) {
      const seq = parseInt(fetchMatch[1], 10);
      const flagsMatch = fetchMatch[2].match(/FLAGS \(([^)]*)\)/);
      if (flagsMatch) {
        this.emit('messageUpdated', seq, flagsMatch[1].split(' ').filter(Boolean));
      }
    }

    const expungeMatch = line.match(/^\* (\d+) EXPUNGE$/);
    if (expungeMatch) {
      this.emit('messageExpunged', parseInt(expungeMatch[1], 10));
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getSelectedMailbox(): string | null {
    return this.selectedMailbox;
  }

  private handleData(data: string): void {
    this.responseBuffer += data;

    let lineEnd;
    while ((lineEnd = this.responseBuffer.indexOf('\r\n')) !== -1) {
      const line = this.responseBuffer.substring(0, lineEnd);
      this.responseBuffer = this.responseBuffer.substring(lineEnd + 2);

      if (line === '+') {
        this.emit('continue');
        continue;
      }

      if (line.startsWith('+ ')) {
        this.emit('continue');
        continue;
      }

      if (this.idleActive) {
        this.emit('idleData', line);
        continue;
      }

      if (this.currentCommand) {
        if (line.startsWith('* ')) {
          (this.currentCommand as any).data = (this.currentCommand as any).data || [];
          (this.currentCommand as any).data.push(line);
        } else if (line.startsWith(this.currentCommand.tag + ' ')) {
          const response = this.parseTaggedResponse(line, (this.currentCommand as any).data || []);
          
          if (response.status === 'OK') {
            this.currentCommand.resolve(response);
          } else {
            this.currentCommand.reject(new Error(`${response.status}: ${response.message}`));
          }

          this.currentCommand = null;
          this.processQueue();
        } else if (line.startsWith('* BYE')) {
          this.emit('bye', line.substring(6));
        }
      } else if (this.commandQueue.length > 0 && this.commandQueue[0].tag === '*') {
        const untaggedCmd = this.commandQueue.shift()!;
        const match = line.match(/^\* (OK|NO|BAD|PREAUTH|BYE) (.+)$/);
        if (match) {
          untaggedCmd.resolve({
            tag: '*',
            status: match[1] as any,
            message: match[2],
            data: [],
          });
        }
      }
    }
  }

  private parseTaggedResponse(line: string, data: string[]): ImapResponse {
    const match = line.match(/^(\S+) (OK|NO|BAD) (.+)$/);
    if (!match) {
      return { tag: '', status: 'BAD', message: 'Invalid response', data };
    }

    return {
      tag: match[1],
      status: match[2] as 'OK' | 'NO' | 'BAD',
      message: match[3],
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
      this.socket.write(`${this.currentCommand.tag} ${this.currentCommand.command}\r\n`);
    }
  }

  private executeCommand(command: string): Promise<ImapResponse> {
    return new Promise((resolve, reject) => {
      const tag = this.generateTag();
      this.commandQueue.push({ tag, command, resolve, reject });
      this.processQueue();
    });
  }

  private generateTag(): string {
    return `A${++this.tagCounter}`;
  }

  private escapeString(str: string): string {
    return str.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
  }

  private checkAuthenticated(): void {
    if (!this.authenticated) {
      throw new Error('Not authenticated');
    }
  }

  private checkSelected(): void {
    if (!this.selectedMailbox) {
      throw new Error('No mailbox selected');
    }
  }

  private formatDate(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const day = days[date.getDay()];
    const dateNum = date.getDate().toString().padStart(2, ' ');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const tzOffset = -date.getTimezoneOffset();
    const tzHours = Math.floor(Math.abs(tzOffset) / 60).toString().padStart(2, '0');
    const tzMinutes = (Math.abs(tzOffset) % 60).toString().padStart(2, '0');
    const tzSign = tzOffset >= 0 ? '+' : '-';

    return `${day}, ${dateNum}-${month}-${year} ${hours}:${minutes}:${seconds} ${tzSign}${tzHours}${tzMinutes}`;
  }

  private parseEnvelope(envStr: string): any {
    const parts: string[] = [];
    let depth = 0;
    let current = '';

    for (let i = 0; i < envStr.length; i++) {
      const char = envStr[i];
      
      if (char === '(') {
        if (depth > 0) current += char;
        depth++;
      } else if (char === ')') {
        depth--;
        if (depth > 0) current += char;
        if (depth === 0 && current) {
          parts.push(current);
          current = '';
        }
      } else if (char === ' ' && depth === 1) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    const parseAddress = (addrStr: string): EmailContact | null => {
      if (!addrStr || addrStr === 'NIL') return null;
      const addrParts = addrStr.split(' ');
      const name = this.decodeImapString(addrParts[0] || '');
      const email = (addrParts[2] || '') + '@' + (addrParts[3] || '');
      return { name, email };
    };

    const parseAddressList = (listStr: string): EmailContact[] => {
      if (!listStr || listStr === 'NIL') return [];
      const addresses: EmailContact[] = [];
      let addrStr = '';
      let parenDepth = 0;
      
      for (let i = 0; i < listStr.length; i++) {
        const char = listStr[i];
        if (char === '(') {
          parenDepth++;
          if (parenDepth > 1) addrStr += char;
        } else if (char === ')') {
          parenDepth--;
          if (parenDepth > 0) addrStr += char;
          if (parenDepth === 0 && addrStr) {
            const addr = parseAddress(addrStr);
            if (addr) addresses.push(addr);
            addrStr = '';
          }
        } else {
          if (parenDepth > 0) addrStr += char;
        }
      }
      
      return addresses;
    };

    return {
      date: parts[0] ? this.decodeImapString(parts[0]) : null,
      subject: parts[1] ? this.decodeImapString(parts[1]) : null,
      from: parseAddressList(parts[2] || ''),
      sender: parseAddressList(parts[3] || ''),
      replyTo: parseAddressList(parts[4] || ''),
      to: parseAddressList(parts[5] || ''),
      cc: parseAddressList(parts[6] || ''),
      bcc: parseAddressList(parts[7] || ''),
      inReplyTo: parts[8] ? this.decodeImapString(parts[8]) : null,
      messageId: parts[9] ? this.decodeImapString(parts[9]) : null,
    };
  }

  private decodeImapString(str: string): string {
    if (!str || str === 'NIL') return '';
    
    str = str.replace(/^"|"$/g, '');
    
    const encodedMatch = str.match(/=\?([^?]+)\?([BQ])\?([^?]+)\?=/i);
    if (encodedMatch) {
      const charset = encodedMatch[1].toUpperCase();
      const encoding = encodedMatch[2].toUpperCase();
      const encoded = encodedMatch[3];
      
      try {
        if (encoding === 'B') {
          return Buffer.from(encoded, 'base64').toString(charset as BufferEncoding || 'utf8');
        } else if (encoding === 'Q') {
          return this.decodeQuotedPrintable(encoded, charset);
        }
      } catch {
        return str;
      }
    }
    
    return str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }

  private decodeQuotedPrintable(str: string, charset: string): string {
    let decoded = str.replace(/_/g, ' ');
    let result = '';
    let i = 0;
    
    while (i < decoded.length) {
      if (decoded[i] === '=' && i + 2 < decoded.length) {
        const hex = decoded.substring(i + 1, i + 3);
        result += String.fromCharCode(parseInt(hex, 16));
        i += 3;
      } else {
        result += decoded[i];
        i++;
      }
    }
    
    try {
      return Buffer.from(result, 'latin1').toString(charset as BufferEncoding || 'utf8');
    } catch {
      return result;
    }
  }

  private buildSearchCriteria(criteria: ImapSearchCriteria, prefix: string = ''): string {
    const parts: string[] = [];

    if (criteria.all) parts.push('ALL');
    if (criteria.answered) parts.push('ANSWERED');
    if (criteria.deleted) parts.push('DELETED');
    if (criteria.draft) parts.push('DRAFT');
    if (criteria.flagged) parts.push('FLAGGED');
    if (criteria.new) parts.push('NEW');
    if (criteria.old) parts.push('OLD');
    if (criteria.recent) parts.push('RECENT');
    if (criteria.seen) parts.push('SEEN');
    if (criteria.unanswered) parts.push('UNANSWERED');
    if (criteria.undeleted) parts.push('UNDELETED');
    if (criteria.undraft) parts.push('UNDRAFT');
    if (criteria.unflagged) parts.push('UNFLAGGED');
    if (criteria.unseen) parts.push('UNSEEN');

    if (criteria.bcc) parts.push(`BCC "${this.escapeString(criteria.bcc)}"`);
    if (criteria.body) parts.push(`BODY "${this.escapeString(criteria.body)}"`);
    if (criteria.cc) parts.push(`CC "${this.escapeString(criteria.cc)}"`);
    if (criteria.from) parts.push(`FROM "${this.escapeString(criteria.from)}"`);
    if (criteria.subject) parts.push(`SUBJECT "${this.escapeString(criteria.subject)}"`);
    if (criteria.text) parts.push(`TEXT "${this.escapeString(criteria.text)}"`);
    if (criteria.to) parts.push(`TO "${this.escapeString(criteria.to)}"`);
    if (criteria.uid) parts.push(`UID ${criteria.uid}`);
    if (criteria.keyword) parts.push(`KEYWORD ${criteria.keyword}`);
    if (criteria.unkeyword) parts.push(`UNKEYWORD ${criteria.unkeyword}`);

    if (criteria.larger) parts.push(`LARGER ${criteria.larger}`);
    if (criteria.smaller) parts.push(`SMALLER ${criteria.smaller}`);

    if (criteria.before) parts.push(`BEFORE "${this.formatDate(criteria.before)}"`);
    if (criteria.on) parts.push(`ON "${this.formatDate(criteria.on)}"`);
    if (criteria.since) parts.push(`SINCE "${this.formatDate(criteria.since)}"`);
    if (criteria.sentBefore) parts.push(`SENTBEFORE "${this.formatDate(criteria.sentBefore)}"`);
    if (criteria.sentOn) parts.push(`SENTON "${this.formatDate(criteria.sentOn)}"`);
    if (criteria.sentSince) parts.push(`SENTSINCE "${this.formatDate(criteria.sentSince)}"`);

    if (criteria.header) {
      parts.push(`HEADER "${this.escapeString(criteria.header[0])}" "${this.escapeString(criteria.header[1])}"`);
    }

    if (criteria.not) {
      parts.push(`NOT (${this.buildSearchCriteria(criteria.not)})`);
    }

    if (criteria.or) {
      parts.push(`OR (${this.buildSearchCriteria(criteria.or[0])}) (${this.buildSearchCriteria(criteria.or[1])})`);
    }

    return parts.join(' ');
  }

  parseFlags(flags: string[]): EmailFlags {
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

  flagsToString(flags: EmailFlags): string[] {
    const result: string[] = [];
    if (flags.seen) result.push('\\Seen');
    if (flags.answered) result.push('\\Answered');
    if (flags.flagged) result.push('\\Flagged');
    if (flags.deleted) result.push('\\Deleted');
    if (flags.draft) result.push('\\Draft');
    if (flags.recent) result.push('\\Recent');
    if (flags.forwarded) result.push('$Forwarded');
    result.push(...flags.custom);
    return result;
  }

  async close(): Promise<void> {
    await this.logout();
  }
}

export default ImapClient;
