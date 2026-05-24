import { randomBytes } from 'crypto'
import prisma from './prisma.js'

const SHORT_CODE_LENGTH = 6
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const MAX_RETRIES = 10

export interface ShortCodeOptions {
  length?: number
  customPrefix?: string
}

export const generateShortCode = (options: ShortCodeOptions = {}): string => {
  const { length = SHORT_CODE_LENGTH, customPrefix = '' } = options
  const actualLength = length - customPrefix.length

  if (actualLength <= 0) {
    throw new Error('Custom prefix too long for the specified code length')
  }

  const bytes = randomBytes(actualLength)
  let result = ''

  for (let i = 0; i < actualLength; i++) {
    const index = bytes.readUInt8(i) % CHARSET.length
    result += CHARSET[index]
  }

  return customPrefix + result
}

export const generateUniqueShortCode = async (
  options: ShortCodeOptions = {},
): Promise<string> => {
  let attempts = 0

  while (attempts < MAX_RETRIES) {
    const shortCode = generateShortCode(options)

    const existing = await prisma.snippet.findUnique({
      where: { shortCode },
      select: { id: true },
    })

    if (!existing) {
      return shortCode
    }

    attempts++
  }

  const longerOptions = { ...options, length: (options.length || SHORT_CODE_LENGTH) + 1 }
  return generateUniqueShortCode(longerOptions)
}

export const validateShortCode = (code: string): boolean => {
  const regex = new RegExp(`^[${CHARSET}]+$`)
  return regex.test(code) && code.length >= 3 && code.length <= 32
}

export default {
  generate: generateShortCode,
  generateUnique: generateUniqueShortCode,
  validate: validateShortCode,
}
