import { get, post, del, type ApiResponse, type PaginationParams, type PaginationResult } from './request'

export interface ApiToken {
  id: string
  name: string
  token: string
  permissions: string[]
  rateLimit: number
  callCount: number
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
  isRevoked: boolean
}

export interface ApiCallLog {
  id: string
  tokenId: string
  tokenName: string
  endpoint: string
  method: string
  status: number
  duration: number
  ip: string
  userAgent: string
  createdAt: string
}

export interface ApiTokenListParams extends PaginationParams {
  keyword?: string
  isRevoked?: boolean
}

export interface ApiCallLogParams extends PaginationParams {
  tokenId?: string
  endpoint?: string
  status?: number
  startDate?: string
  endDate?: string
}

export interface CreateApiTokenParams {
  name: string
  permissions: string[]
  rateLimit?: number
  expiresAt?: string
}

export const getApiTokenList = (params: ApiTokenListParams): Promise<ApiResponse<PaginationResult<ApiToken>>> => {
  return get<PaginationResult<ApiToken>>('/openapi/tokens', params)
}

export const createApiToken = (params: CreateApiTokenParams): Promise<ApiResponse<ApiToken>> => {
  return post<ApiToken>('/openapi/tokens', params)
}

export const revokeApiToken = (id: string): Promise<ApiResponse<null>> => {
  return post<null>(`/openapi/tokens/${id}/revoke`)
}

export const getApiCallLogs = (params: ApiCallLogParams): Promise<ApiResponse<PaginationResult<ApiCallLog>>> => {
  return get<PaginationResult<ApiCallLog>>('/openapi/call-logs', params)
}
