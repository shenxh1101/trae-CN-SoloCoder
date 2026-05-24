import { get, post, put, del, type ApiResponse } from './request'
import type { PageResult } from './document'

export interface DocumentTemplate {
  id: number
  name: string
  description: string
  content: string
  fileName?: string
  filePath?: string
  fileSize?: number
  fileType?: string
  categoryId?: number
  category?: string
  thumbnail?: string
  usageCount: number
  sortOrder?: number
  enabled: boolean
  isPublic: boolean
  contentType?: 'MARKDOWN' | 'RICH_TEXT'
  contentHtml?: string
  icon?: string
  color?: string
  isSystem?: boolean
  isEnabled?: boolean
  creatorId?: number
  creatorName?: string
  createdAt: string
  updatedAt: string
}

export interface CreateTemplateRequest {
  name: string
  description?: string
  content: string
  categoryId?: number
  thumbnail?: string
  sortOrder?: number
  enabled?: boolean
  isPublic?: boolean
}

export interface UpdateTemplateRequest {
  name?: string
  description?: string
  content?: string
  categoryId?: number
  thumbnail?: string
  sortOrder?: number
  enabled?: boolean
  isPublic?: boolean
}

export const getTemplateList = (params: {
  page?: number
  size?: number
  category?: string
  keyword?: string
  isEnabled?: boolean
}): Promise<ApiResponse<PageResult<DocumentTemplate>>> => {
  return get<PageResult<DocumentTemplate>>('/templates', params)
}

export const getTemplateDetail = (id: number): Promise<ApiResponse<DocumentTemplate>> => {
  return get<DocumentTemplate>(`/templates/${id}`)
}

export const createTemplate = (data: CreateTemplateRequest): Promise<ApiResponse<DocumentTemplate>> => {
  return post<DocumentTemplate>('/templates', data)
}

export const updateTemplate = (id: number, data: UpdateTemplateRequest): Promise<ApiResponse<DocumentTemplate>> => {
  return put<DocumentTemplate>(`/templates/${id}`, data)
}

export const deleteTemplate = (id: number): Promise<ApiResponse<null>> => {
  return del<null>(`/templates/${id}`)
}

export const getTemplateCategories = (): Promise<ApiResponse<string[]>> => {
  return get<string[]>('/templates/categories')
}

export const createDocumentFromTemplate = (templateId: number): Promise<ApiResponse<number>> => {
  return post<number>(`/templates/${templateId}/create-document`)
}
