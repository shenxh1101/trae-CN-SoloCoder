import * as cheerio from 'cheerio';
import { URL } from 'url';

interface TrackingDetectionResult {
  hasTracking: boolean;
  trackingUrls: string[];
  trackingPixels: string[];
  cleanedHtml: string;
}

interface UrlCleanResult {
  originalUrl: string;
  cleanedUrl: string;
  removedParams: string[];
}

const TRACKING_PIXEL_PATTERNS = [
  /pixel/i,
  /track/i,
  /beacon/i,
  /open/i,
  /view/i,
  /hit/i,
  /event/i,
  /analytics/i,
  /stat/i,
  /count/i,
  /log/i,
  /gif/i,
  /1x1/i,
  /transparent/i,
  /blank/i,
  /spacer/i
];

const TRACKING_HOST_PATTERNS = [
  /mailchimp\.com/i,
  /mandrillapp\.com/i,
  /sendgrid\.net/i,
  /sendinblue\.com/i,
  /mailgun\.net/i,
  /postmarkapp\.com/i,
  /sparkpostmail\.com/i,
  /elasticemail\.com/i,
  /activecampaign\.com/i,
  /convertkit\.com/i,
  /aweber\.com/i,
  /getresponse\.com/i,
  /constantcontact\.com/i,
  /cmail1\.com/i,
  /campaignmonitor\.com/i,
  /hubspot\.com/i,
  /hubspotemail\.net/i,
  /salesforce\.com/i,
  /exacttarget\.com/i,
  /marketo\.com/i,
  /pardot\.com/i,
  /google-analytics\.com/i,
  /googletagmanager\.com/i,
  /facebook\.com\/tr/i,
  /facebook\.net\/tr/i,
  /twitter\.com\/i\/jot/i,
  /linkedin\.com\/comm\/tracking/i,
  /pinterest\.com\/r/i,
  /quora\.com\/qPixel/i,
  /reddit\.com\/r.gif/i,
  /youtube\.com\/api\/stats/i,
  /doubleclick\.net/i,
  /adnxs\.com/i,
  /rubiconproject\.com/i,
  /openx\.net/i,
  /pubmatic\.com/i,
  /criteo\.com/i,
  /outbrain\.com/i,
  /taboola\.com/i,
  /chartbeat\.com/i,
  /newrelic\.com/i,
  /datadoghq\.com/i,
  /sentry\.io/i,
  /hotjar\.com/i,
  /intercom\.io/i,
  /drift\.com/i,
  /olark\.com/i,
  /zendesk\.com/i,
  /helpscout\.com/i,
  /freshdesk\.com/i,
  /userreport\.com/i,
  /scorecardresearch\.com/i,
  /quantcast\.com/i,
  /comscore\.com/i,
  /alexa\.com/i,
  /moatads\.com/i,
  /mediaforge\.com/i,
  /rakutenmarketing\.com/i,
  /affiliatewindow\.com/i,
  /cj\.com/i,
  /linksynergy\.com/i,
  /shareasale\.com/i,
  /impactradius\.com/i,
  /pepperjamnetwork\.com/i
];

const TRACKING_QUERY_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'gclid',
  'gclsrc',
  'dclid',
  'fbclid',
  'msclkid',
  'igshid',
  'twclid',
  'li_fat_id',
  'mc_cid',
  'mc_eid',
  'mkt_tok',
  'mkt_hndshk',
  'hsa_',
  'hs_',
  'pk_',
  'piwik_',
  'mtm_',
  'ga_',
  'gbraid',
  'wbraid',
  'srsltid',
  '_bta_tid',
  '_bta_c',
  'trk_contact',
  'trk_module',
  'trk_sid',
  'ml_subscriber',
  'ml_subscriber_hash',
  'mc_eid',
  'mc_cid',
  'tracking_code',
  'track',
  'ref_src',
  'ref_url',
  'referrer',
  'source',
  'medium',
  'campaign',
  'term',
  'content',
  'cid',
  'sid',
  'aff_id',
  'affiliate_id',
  'click_id',
  'ad_id',
  'creative_id',
  'adgroup_id',
  'campaign_id',
  'placement_id',
  'site_id',
  'app_id',
  'device_id',
  'user_id',
  'uuid',
  'guid',
  'session_id',
  'visitor_id',
  'browser_id',
  'fingerprint',
  'fp',
  'fl',
  'ifl',
  'el',
  'email',
  'e',
  'uid',
  'u',
  'mid',
  'm',
  'newsletterId',
  'n',
  'subscriberId',
  's',
  'listId',
  'l',
  'contactId',
  'c',
  'recipientId',
  'r',
  'messageId',
  'msg',
  'campaignId',
  'sendId',
  'senderId',
  'accountId',
  'clientId',
  'customerId',
  'userId',
  'memberId',
  'subId',
  'transactionId',
  'orderId',
  'cartId',
  'productId',
  'itemId',
  'sku',
  'price',
  'value',
  'currency',
  'event',
  'action',
  'type',
  'category',
  'label',
  'redirect_url',
  'redirect',
  'next',
  'go',
  'rurl',
  'dest',
  'destination',
  'u',
  'url',
  'link',
  'href',
  'page',
  'p',
  'path',
  'view',
  'v',
  'key',
  'k',
  'token',
  't',
  'auth',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'code',
  'state',
  'nonce',
  'challenge',
  'response_type',
  'client_secret',
  'signature',
  'sig',
  's',
  'hash',
  'checksum',
  'verify',
  'valid',
  'expires',
  'exp',
  'timestamp',
  'ts',
  'time',
  'date',
  'dt',
  'callback',
  'cb',
  'jsonp',
  'function',
  'fn',
  'callback',
  '_',
  'cache_buster',
  'cbuster',
  'nocache',
  'nc',
  'random',
  'rand',
  'rnd',
  'version',
  'v',
  'ver',
  'build',
  'b',
  'env',
  'debug',
  'test',
  'preview',
  'demo'
];

const TRACKING_DOMAIN_SUFFIXES = [
  '.track',
  '.tracking',
  '.stats',
  '.analytics',
  '-tracker',
  '-analytics',
  '-stats',
  'tracker.',
  'analytics.',
  'stats.',
  'metrics.',
  'telemetry.',
  'logging.',
  'events.',
  'beacons.',
  'pixels.'
];

export class TrackerBlockerService {
  detectAndRemoveTracking(html: string): TrackingDetectionResult {
    try {
      const $ = cheerio.load(html, {
        xmlMode: false,
        recognizeSelfClosing: true
      } as cheerio.CheerioOptions);

      const trackingUrls: string[] = [];
      const trackingPixels: string[] = [];

      $('img').each((_, element) => {
        const src = $(element).attr('src');
        const width = $(element).attr('width');
        const height = $(element).attr('height');
        const style = $(element).attr('style');
        const alt = $(element).attr('alt');

        if (src) {
          const isTrackingPixel = this.isTrackingPixel(src, width, height, style, alt);
          if (isTrackingPixel) {
            trackingPixels.push(src);
            trackingUrls.push(src);
            $(element).remove();
          }
        }
      });

      $('img, a, link, script, iframe, video, audio, source, track, embed, object').each((_, element) => {
        const src = $(element).attr('src');
        const href = $(element).attr('href');
        const url = src || href;

        if (url && !trackingUrls.includes(url)) {
          if (this.isTrackingUrl(url)) {
            trackingUrls.push(url);
            if (element.tagName === 'img' || element.tagName === 'script' || element.tagName === 'iframe') {
              $(element).remove();
            } else {
              $(element).removeAttr('src');
              $(element).removeAttr('href');
            }
          }
        }
      });

      $('*').each((_, element) => {
        const attribs = $(element).attr();
        if (attribs) {
          for (const [key, value] of Object.entries(attribs)) {
            if (key.startsWith('on') || key.toLowerCase().includes('track') || key.toLowerCase().includes('analytics')) {
              $(element).removeAttr(key);
            }
            if (value && typeof value === 'string' && (value.startsWith('data:image') || value.includes(';base64,'))) {
              if (this.isBase64TrackingPixel(value)) {
                trackingPixels.push(`[data:image] ${key}`);
                $(element).removeAttr(key);
              }
            }
          }
        }
      });

      $('style, link[rel="stylesheet"]').each((_, element) => {
        const css = $(element).html();
        if (css) {
          const urlMatches = css.match(/url\(['"]?([^'")]+)['"]?\)/g);
          if (urlMatches) {
            for (const match of urlMatches) {
              const urlMatch = match.match(/url\(['"]?([^'")]+)['"]?\)/);
              if (urlMatch && urlMatch[1]) {
                const cssUrl = urlMatch[1];
                if (this.isTrackingUrl(cssUrl)) {
                  trackingUrls.push(cssUrl);
                }
              }
            }
          }
        }
      });

      const cleanedHtml = $.html();
      const hasTracking = trackingUrls.length > 0 || trackingPixels.length > 0;

      return {
        hasTracking,
        trackingUrls: [...new Set(trackingUrls)],
        trackingPixels: [...new Set(trackingPixels)],
        cleanedHtml
      };
    } catch (error) {
      console.error('Failed to process tracking detection:', error);
      return {
        hasTracking: false,
        trackingUrls: [],
        trackingPixels: [],
        cleanedHtml: html
      };
    }
  }

  cleanTrackingParams(url: string): UrlCleanResult {
    try {
      const parsedUrl = new URL(url);
      const removedParams: string[] = [];

      const paramsToRemove: string[] = [];
      parsedUrl.searchParams.forEach((_, key) => {
        const lowerKey = key.toLowerCase();
        const shouldRemove = TRACKING_QUERY_PARAMS.some(param =>
          lowerKey === param.toLowerCase() ||
          lowerKey.startsWith(param.toLowerCase() + '_') ||
          lowerKey.endsWith('_' + param.toLowerCase())
        );
        if (shouldRemove) {
          paramsToRemove.push(key);
        }
      });

      for (const param of paramsToRemove) {
        removedParams.push(param);
        parsedUrl.searchParams.delete(param);
      }

      const cleanedUrl = parsedUrl.toString();

      return {
        originalUrl: url,
        cleanedUrl,
        removedParams
      };
    } catch (error) {
      console.error('Failed to clean tracking params:', error);
      return {
        originalUrl: url,
        cleanedUrl: url,
        removedParams: []
      };
    }
  }

  cleanAllUrlsInHtml(html: string): { cleanedHtml: string; cleanedUrls: UrlCleanResult[] } {
    try {
      const $ = cheerio.load(html, {
        xmlMode: false
      } as cheerio.CheerioOptions);

      const cleanedUrls: UrlCleanResult[] = [];

      $('a, link, img, script, iframe, video, audio, source, track, embed, object, area, base').each((_, element) => {
        const src = $(element).attr('src');
        const href = $(element).attr('href');

        if (src && this.isValidUrl(src)) {
          const result = this.cleanTrackingParams(src);
          if (result.removedParams.length > 0) {
            cleanedUrls.push(result);
            $(element).attr('src', result.cleanedUrl);
          }
        }

        if (href && this.isValidUrl(href)) {
          const result = this.cleanTrackingParams(href);
          if (result.removedParams.length > 0) {
            cleanedUrls.push(result);
            $(element).attr('href', result.cleanedUrl);
          }
        }
      });

      const cleanedHtml = $.html();

      return {
        cleanedHtml,
        cleanedUrls
      };
    } catch (error) {
      console.error('Failed to clean URLs in HTML:', error);
      return {
        cleanedHtml: html,
        cleanedUrls: []
      };
    }
  }

  processOutgoingEmail(html: string): { html: string; text: string; cleanedUrls: UrlCleanResult[] } {
    try {
      const { cleanedHtml, cleanedUrls } = this.cleanAllUrlsInHtml(html);

      let text = this.htmlToText(html);
      const urlRegex = /https?:\/\/[^\s<>"']+/g;
      const textUrls = text.match(urlRegex) || [];

      for (const url of textUrls) {
        if (this.isValidUrl(url)) {
          const result = this.cleanTrackingParams(url);
          if (result.removedParams.length > 0) {
            cleanedUrls.push(result);
            text = text.replace(url, result.cleanedUrl);
          }
        }
      }

      return {
        html: cleanedHtml,
        text,
        cleanedUrls
      };
    } catch (error) {
      console.error('Failed to process outgoing email:', error);
      return {
        html,
        text: this.htmlToText(html),
        cleanedUrls: []
      };
    }
  }

  private isTrackingPixel(src: string, width?: string, height?: string, style?: string, alt?: string): boolean {
    try {
      const lowerSrc = src.toLowerCase();

      if (width && height) {
        const w = parseInt(width, 10);
        const h = parseInt(height, 10);
        if (!isNaN(w) && !isNaN(h) && w <= 2 && h <= 2) {
          return true;
        }
      }

      if (style) {
        const lowerStyle = style.toLowerCase();
        if (lowerStyle.includes('width:1px') || lowerStyle.includes('width: 1px') ||
            lowerStyle.includes('height:1px') || lowerStyle.includes('height: 1px') ||
            lowerStyle.includes('display:none') || lowerStyle.includes('visibility:hidden') ||
            lowerStyle.includes('opacity:0') || lowerStyle.includes('opacity: 0')) {
          return true;
        }
      }

      if (alt && alt.trim() === '') {
        return true;
      }

      for (const pattern of TRACKING_PIXEL_PATTERNS) {
        if (pattern.test(lowerSrc)) {
          return true;
        }
      }

      if (this.isTrackingUrl(src)) {
        return true;
      }

      try {
        const parsed = new URL(src);
        if (parsed.pathname.endsWith('.gif') || parsed.pathname.endsWith('.png') || parsed.pathname.endsWith('.jpg')) {
          for (const [key, value] of parsed.searchParams.entries()) {
            if (value && value.length > 20) {
              if (/^[a-f0-9]{20,}$/i.test(value) || /^[A-Za-z0-9+/=]{20,}$/.test(value)) {
                return true;
              }
            }
          }
        }
      } catch {
        // Ignore invalid URLs
      }

      return false;
    } catch (error) {
      console.error('Error checking tracking pixel:', error);
      return false;
    }
  }

  private isTrackingUrl(url: string): boolean {
    try {
      const lowerUrl = url.toLowerCase();

      for (const pattern of TRACKING_HOST_PATTERNS) {
        if (pattern.test(lowerUrl)) {
          return true;
        }
      }

      try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();

        for (const suffix of TRACKING_DOMAIN_SUFFIXES) {
          if (hostname.startsWith(suffix) || hostname.endsWith(suffix)) {
            return true;
          }
        }

        if (hostname.includes('track') && !hostname.includes('trade') && !hostname.includes('tracker') && hostname.length < 20) {
          return true;
        }

        if (hostname.includes('analytics') && hostname.length < 25) {
          return true;
        }

        for (const [key] of parsed.searchParams) {
          const lowerKey = key.toLowerCase();
          for (const param of TRACKING_QUERY_PARAMS) {
            if (lowerKey === param.toLowerCase() || lowerKey.startsWith(param.toLowerCase() + '_')) {
              return true;
            }
          }
        }

        const pathname = parsed.pathname.toLowerCase();
        for (const pattern of TRACKING_PIXEL_PATTERNS) {
          if (pattern.test(pathname)) {
            return true;
          }
        }
      } catch {
        // Ignore invalid URLs
      }

      return false;
    } catch (error) {
      console.error('Error checking tracking URL:', error);
      return false;
    }
  }

  private isBase64TrackingPixel(data: string): boolean {
    try {
      if (!data.includes(';base64,')) return false;

      const base64Match = data.match(/data:image\/(png|gif|jpeg);base64,(.+)/i);
      if (!base64Match) return false;

      const base64Data = base64Match[2];
      const buffer = Buffer.from(base64Data, 'base64');

      if (buffer.length < 100) {
        return true;
      }

      const width = this.getImageDimension(buffer, base64Match[1].toLowerCase(), 0);
      const height = this.getImageDimension(buffer, base64Match[1].toLowerCase(), 1);

      if (width !== null && height !== null && width <= 2 && height <= 2) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking base64 tracking pixel:', error);
      return false;
    }
  }

  private getImageDimension(buffer: Buffer, format: string, index: number): number | null {
    try {
      if (format === 'png') {
        if (buffer.slice(1, 4).toString() !== 'PNG') return null;
        return buffer.readUInt32BE(16 + index * 4);
      } else if (format === 'gif') {
        return buffer.readUInt16LE(6 + index * 2);
      } else if (format === 'jpeg' || format === 'jpg') {
        let offset = 2;
        while (offset < buffer.length) {
          if (buffer[offset] !== 0xFF) return null;
          const marker = buffer[offset + 1];
          if (marker === 0xC0 || marker === 0xC2) {
            return buffer.readUInt16BE(offset + 5 + index * 2);
          }
          offset += 2 + buffer.readUInt16BE(offset + 2);
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  private htmlToText(html: string): string {
    try {
      const $ = cheerio.load(html);
      $('script, style, noscript, iframe').remove();
      return $.text().replace(/\s+/g, ' ').trim();
    } catch {
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }
}
