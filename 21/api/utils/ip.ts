import type { Request } from 'express'

export function getClientIp(req: Request): string {
  const xForwardedFor = req.headers['x-forwarded-for']
  if (xForwardedFor) {
    const ips = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor.split(',')[0]
    return ips.trim()
  }

  const xRealIp = req.headers['x-real-ip']
  if (xRealIp) {
    return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp
  }

  const xClientIp = req.headers['x-client-ip']
  if (xClientIp) {
    return Array.isArray(xClientIp) ? xClientIp[0] : xClientIp
  }

  const cfConnectingIp = req.headers['cf-connecting-ip']
  if (cfConnectingIp) {
    return Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp
  }

  const forwardedFor = req.headers['forwarded-for']
  if (forwardedFor) {
    return Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
  }

  const forwarded = req.headers['forwarded']
  if (forwarded) {
    const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded
    const match = forwardedStr.match(/for=(\[?[\d.:]+\]?)/)
    if (match) {
      return match[1].replace(/^\[|\]$/g, '')
    }
  }

  const remoteAddress = req.socket.remoteAddress || req.ip
  return remoteAddress || '127.0.0.1'
}
