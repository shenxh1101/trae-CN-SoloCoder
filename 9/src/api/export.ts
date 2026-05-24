import { post, type ApiResponse } from './request'

export interface ExportParams {
  documentId: string
  includeStyles?: boolean
  includeImages?: boolean
  pageSize?: 'A4' | 'Letter'
  orientation?: 'portrait' | 'landscape'
}

export interface ExportResult {
  url: string
  filename: string
  size: number
  expiresAt: string
}

export const exportToPdf = (params: ExportParams): Promise<ApiResponse<ExportResult>> => {
  return post<ExportResult>('/export/pdf', params)
}

export const exportToWord = (params: ExportParams): Promise<ApiResponse<ExportResult>> => {
  return post<ExportResult>('/export/word', params)
}
