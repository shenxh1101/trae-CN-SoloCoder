import * as dns from 'dns';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { ServerConfig } from '../shared/types';

interface ProviderConfig {
  provider: string;
  imap: ServerConfig;
  smtp: ServerConfig;
}

interface DnsSrvRecord {
  priority: number;
  weight: number;
  port: number;
  name: string;
}

const KNOWN_PROVIDERS: Record<string, ProviderConfig> = {
  'gmail.com': {
    provider: 'gmail',
    imap: { host: 'imap.gmail.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.gmail.com', port: 465, secure: true, username: '', password: '' }
  },
  'googlemail.com': {
    provider: 'gmail',
    imap: { host: 'imap.gmail.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.gmail.com', port: 465, secure: true, username: '', password: '' }
  },
  'outlook.com': {
    provider: 'outlook',
    imap: { host: 'outlook.office365.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.office365.com', port: 587, secure: false, username: '', password: '' }
  },
  'hotmail.com': {
    provider: 'outlook',
    imap: { host: 'outlook.office365.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.office365.com', port: 587, secure: false, username: '', password: '' }
  },
  'live.com': {
    provider: 'outlook',
    imap: { host: 'outlook.office365.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.office365.com', port: 587, secure: false, username: '', password: '' }
  },
  'msn.com': {
    provider: 'outlook',
    imap: { host: 'outlook.office365.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.office365.com', port: 587, secure: false, username: '', password: '' }
  },
  'office365.com': {
    provider: 'outlook',
    imap: { host: 'outlook.office365.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.office365.com', port: 587, secure: false, username: '', password: '' }
  },
  'qq.com': {
    provider: 'qq',
    imap: { host: 'imap.qq.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.qq.com', port: 465, secure: true, username: '', password: '' }
  },
  'vip.qq.com': {
    provider: 'qq',
    imap: { host: 'imap.vip.qq.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.vip.qq.com', port: 465, secure: true, username: '', password: '' }
  },
  'foxmail.com': {
    provider: 'qq',
    imap: { host: 'imap.qq.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.qq.com', port: 465, secure: true, username: '', password: '' }
  },
  '163.com': {
    provider: 'other',
    imap: { host: 'imap.163.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.163.com', port: 465, secure: true, username: '', password: '' }
  },
  '126.com': {
    provider: 'other',
    imap: { host: 'imap.126.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.126.com', port: 465, secure: true, username: '', password: '' }
  },
  'yeah.net': {
    provider: 'other',
    imap: { host: 'imap.yeah.net', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.yeah.net', port: 465, secure: true, username: '', password: '' }
  },
  'sina.com': {
    provider: 'other',
    imap: { host: 'imap.sina.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.sina.com', port: 465, secure: true, username: '', password: '' }
  },
  'sina.cn': {
    provider: 'other',
    imap: { host: 'imap.sina.cn', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.sina.cn', port: 465, secure: true, username: '', password: '' }
  },
  'sohu.com': {
    provider: 'other',
    imap: { host: 'imap.sohu.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.sohu.com', port: 465, secure: true, username: '', password: '' }
  },
  '139.com': {
    provider: 'other',
    imap: { host: 'imap.139.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.139.com', port: 465, secure: true, username: '', password: '' }
  },
  '189.cn': {
    provider: 'other',
    imap: { host: 'imap.189.cn', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.189.cn', port: 465, secure: true, username: '', password: '' }
  },
  'aliyun.com': {
    provider: 'other',
    imap: { host: 'imap.aliyun.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.aliyun.com', port: 465, secure: true, username: '', password: '' }
  },
  'yahoo.com': {
    provider: 'other',
    imap: { host: 'imap.mail.yahoo.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.mail.yahoo.com', port: 465, secure: true, username: '', password: '' }
  },
  'yahoo.co.jp': {
    provider: 'other',
    imap: { host: 'imap.mail.yahoo.co.jp', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.mail.yahoo.co.jp', port: 465, secure: true, username: '', password: '' }
  },
  'aol.com': {
    provider: 'other',
    imap: { host: 'imap.aol.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.aol.com', port: 465, secure: true, username: '', password: '' }
  },
  'icloud.com': {
    provider: 'other',
    imap: { host: 'imap.mail.me.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.mail.me.com', port: 587, secure: false, username: '', password: '' }
  },
  'me.com': {
    provider: 'other',
    imap: { host: 'imap.mail.me.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.mail.me.com', port: 587, secure: false, username: '', password: '' }
  },
  'mac.com': {
    provider: 'other',
    imap: { host: 'imap.mail.me.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.mail.me.com', port: 587, secure: false, username: '', password: '' }
  },
  'protonmail.com': {
    provider: 'other',
    imap: { host: '127.0.0.1', port: 1143, secure: false, username: '', password: '' },
    smtp: { host: '127.0.0.1', port: 1025, secure: false, username: '', password: '' }
  },
  'tutanota.com': {
    provider: 'other',
    imap: { host: 'imap.tutanota.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.tutanota.com', port: 465, secure: true, username: '', password: '' }
  },
  'zoho.com': {
    provider: 'other',
    imap: { host: 'imap.zoho.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.zoho.com', port: 465, secure: true, username: '', password: '' }
  },
  'yandex.com': {
    provider: 'other',
    imap: { host: 'imap.yandex.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.yandex.com', port: 465, secure: true, username: '', password: '' }
  },
  'yandex.ru': {
    provider: 'other',
    imap: { host: 'imap.yandex.ru', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.yandex.ru', port: 465, secure: true, username: '', password: '' }
  },
  'mail.ru': {
    provider: 'other',
    imap: { host: 'imap.mail.ru', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.mail.ru', port: 465, secure: true, username: '', password: '' }
  },
  'list.ru': {
    provider: 'other',
    imap: { host: 'imap.mail.ru', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.mail.ru', port: 465, secure: true, username: '', password: '' }
  },
  'bk.ru': {
    provider: 'other',
    imap: { host: 'imap.mail.ru', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.mail.ru', port: 465, secure: true, username: '', password: '' }
  },
  'inbox.ru': {
    provider: 'other',
    imap: { host: 'imap.mail.ru', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.mail.ru', port: 465, secure: true, username: '', password: '' }
  },
  'gmx.com': {
    provider: 'other',
    imap: { host: 'imap.gmx.com', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.gmx.com', port: 465, secure: true, username: '', password: '' }
  },
  'gmx.net': {
    provider: 'other',
    imap: { host: 'imap.gmx.net', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.gmx.net', port: 465, secure: true, username: '', password: '' }
  },
  'gmx.de': {
    provider: 'other',
    imap: { host: 'imap.gmx.net', port: 993, secure: true, username: '', password: '' },
    smtp: { host: 'smtp.gmx.net', port: 465, secure: true, username: '', password: '' }
  }
};

export class AutoDiscoverService {
  private dnsResolver: dns.promises.Resolver;

  constructor() {
    this.dnsResolver = new dns.promises.Resolver();
    this.dnsResolver.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1']);
  }

  async discover(email: string, password: string): Promise<{ imap: ServerConfig; smtp: ServerConfig; provider: string }> {
    try {
      if (!this.isValidEmail(email)) {
        throw new Error('Invalid email address');
      }

      const domain = this.getDomain(email);
      const username = email;

      const knownConfig = this.tryKnownProvider(domain);
      if (knownConfig) {
        return this.fillCredentials(knownConfig, username, password);
      }

      try {
        const dnsConfig = await this.tryDnsSrv(domain);
        if (dnsConfig) {
          return this.fillCredentials(dnsConfig, username, password);
        }
      } catch (error) {
        console.debug('DNS SRV discovery failed:', error);
      }

      try {
        const autodiscoverConfig = await this.tryAutodiscover(email, password);
        if (autodiscoverConfig) {
          return this.fillCredentials(autodiscoverConfig, username, password);
        }
      } catch (error) {
        console.debug('Autodiscover XML/RPC failed:', error);
      }

      const guessConfig = this.guessConfig(domain);
      return this.fillCredentials(guessConfig, username, password);
    } catch (error) {
      console.error('Auto-discover failed:', error);
      throw error instanceof Error ? error : new Error('Auto-discover failed');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private getDomain(email: string): string {
    return email.split('@')[1].toLowerCase();
  }

  private tryKnownProvider(domain: string): ProviderConfig | null {
    const config = KNOWN_PROVIDERS[domain];
    if (config) {
      console.debug(`Found known provider for domain: ${domain}`);
      return { ...config };
    }

    const parts = domain.split('.');
    for (let i = 0; i < parts.length - 1; i++) {
      const baseDomain = parts.slice(i).join('.');
      const baseConfig = KNOWN_PROVIDERS[baseDomain];
      if (baseConfig) {
        console.debug(`Found known provider for base domain: ${baseDomain}`);
        return { ...baseConfig };
      }
    }

    return null;
  }

  private async tryDnsSrv(domain: string): Promise<ProviderConfig | null> {
    console.debug('Trying DNS SRV discovery for:', domain);

    const [imapRecords, smtpRecords] = await Promise.all([
      this.resolveSrv(`_imaps._tcp.${domain}`),
      this.resolveSrv(`_submissions._tcp.${domain}`)
    ]);

    const imapRecord = this.selectBestSrvRecord(imapRecords);
    const smtpRecord = this.selectBestSrvRecord(smtpRecords);

    if (!imapRecord || !smtpRecord) {
      return null;
    }

    console.debug('DNS SRV discovery successful');
    return {
      provider: 'other',
      imap: {
        host: imapRecord.name,
        port: imapRecord.port,
        secure: true,
        username: '',
        password: ''
      },
      smtp: {
        host: smtpRecord.name,
        port: smtpRecord.port,
        secure: true,
        username: '',
        password: ''
      }
    };
  }

  private async resolveSrv(name: string): Promise<DnsSrvRecord[]> {
    try {
      const records = await this.dnsResolver.resolveSrv(name);
      return records as DnsSrvRecord[];
    } catch (error) {
      console.debug(`DNS SRV resolution failed for ${name}:`, error);
      return [];
    }
  }

  private selectBestSrvRecord(records: DnsSrvRecord[]): DnsSrvRecord | null {
    if (records.length === 0) return null;

    const sorted = [...records].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.weight - a.weight;
    });

    return sorted[0];
  }

  private async tryAutodiscover(email: string, password: string): Promise<ProviderConfig | null> {
    const domain = this.getDomain(email);
    console.debug('Trying Autodiscover for:', domain);

    const urls = [
      `https://${domain}/autodiscover/autodiscover.xml`,
      `https://autodiscover.${domain}/autodiscover/autodiscover.xml`,
      `http://${domain}/autodiscover/autodiscover.xml`,
      `http://autodiscover.${domain}/autodiscover/autodiscover.xml`
    ];

    const autodiscoverXml = `<?xml version="1.0" encoding="utf-8"?>
<Autodiscover xmlns="http://schemas.microsoft.com/exchange/autodiscover/outlook/requestschema/2006">
  <Request>
    <EMailAddress>${email}</EMailAddress>
    <AcceptableResponseSchema>http://schemas.microsoft.com/exchange/autodiscover/outlook/responseschema/2006a</AcceptableResponseSchema>
  </Request>
</Autodiscover>`;

    for (const url of urls) {
      try {
        const response = await this.makeAutodiscoverRequest(url, autodiscoverXml, email, password);
        const config = this.parseAutodiscoverResponse(response);
        if (config) {
          console.debug('Autodiscover successful from:', url);
          return config;
        }
      } catch (error) {
        console.debug(`Autodiscover failed for ${url}:`, error);
      }
    }

    return null;
  }

  private makeAutodiscoverRequest(url: string, xml: string, email: string, password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const auth = Buffer.from(`${email}:${password}`).toString('base64');

      const options: http.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Content-Length': Buffer.byteLength(xml),
          'Authorization': `Basic ${auth}`
        },
        timeout: 10000
      };

      const req = client.request(options, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
          const location = res.headers.location;
          if (location) {
            this.makeAutodiscoverRequest(location, xml, email, password).then(resolve).catch(reject);
            return;
          }
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve(data));
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy(new Error('Request timeout'));
      });

      req.write(xml);
      req.end();
    });
  }

  private parseAutodiscoverResponse(xml: string): ProviderConfig | null {
    try {
      const imapMatch = xml.match(/<Protocol[^>]*>[\s\S]*?<Type>IMAP<\/Type>[\s\S]*?<Server>([^<]+)<\/Server>[\s\S]*?<Port>(\d+)<\/Port>[\s\S]*?<SSL>([^<]+)<\/SSL>[\s\S]*?<\/Protocol>/i);
      const smtpMatch = xml.match(/<Protocol[^>]*>[\s\S]*?<Type>SMTP<\/Type>[\s\S]*?<Server>([^<]+)<\/Server>[\s\S]*?<Port>(\d+)<\/Port>[\s\S]*?<SSL>([^<]+)<\/SSL>[\s\S]*?<\/Protocol>/i);

      if (!imapMatch || !smtpMatch) {
        return null;
      }

      return {
        provider: 'other',
        imap: {
          host: imapMatch[1].trim(),
          port: parseInt(imapMatch[2], 10),
          secure: imapMatch[3].toLowerCase() === 'on' || imapMatch[3].toLowerCase() === 'true',
          username: '',
          password: ''
        },
        smtp: {
          host: smtpMatch[1].trim(),
          port: parseInt(smtpMatch[2], 10),
          secure: smtpMatch[3].toLowerCase() === 'on' || smtpMatch[3].toLowerCase() === 'true',
          username: '',
          password: ''
        }
      };
    } catch (error) {
      console.error('Failed to parse autodiscover response:', error);
      return null;
    }
  }

  private guessConfig(domain: string): ProviderConfig {
    console.debug('Guessing config for domain:', domain);

    const commonImapHosts = [`imap.${domain}`, `mail.${domain}`, `${domain}`];
    const commonSmtpHosts = [`smtp.${domain}`, `mail.${domain}`, `${domain}`];

    return {
      provider: 'other',
      imap: {
        host: commonImapHosts[0],
        port: 993,
        secure: true,
        username: '',
        password: ''
      },
      smtp: {
        host: commonSmtpHosts[0],
        port: 465,
        secure: true,
        username: '',
        password: ''
      }
    };
  }

  private fillCredentials(config: ProviderConfig, username: string, password: string): { imap: ServerConfig; smtp: ServerConfig; provider: string } {
    return {
      provider: config.provider,
      imap: {
        ...config.imap,
        username,
        password
      },
      smtp: {
        ...config.smtp,
        username,
        password
      }
    };
  }
}
