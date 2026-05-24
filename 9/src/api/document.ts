import { get, post, put, del, upload, type ApiResponse } from './request'

export interface Document {
  id: number
  title: string
  summary: string
  content: string
  contentHtml: string
  contentType: 'RICH_TEXT' | 'MARKDOWN'
  departmentId: number
  departmentName: string
  categoryId: number
  categoryName: string
  tags: string
  creatorId: number
  creatorName: string
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED' | 'DELETED'
  version: number
  viewCount: number
  likeCount: number
  commentCount: number
  favoriteCount: number
  enableWatermark: boolean
  watermarkText: string
  isDeleted: boolean
  deletedAt: string
  publishedAt: string
  createdAt: string
  updatedAt: string
}

export interface DocumentVersion {
  id: number
  documentId: number
  version: number
  title: string
  content: string
  contentHtml: string
  contentType: 'RICH_TEXT' | 'MARKDOWN'
  changeLog: string
  creatorId: number
  creatorName: string
  createdAt: string
}

export interface DocumentLink {
  id: number
  sourceDocumentId: number
  targetDocumentId: number
  targetTitle: string
  targetStatus: string
  createdAt: string
}

export interface CreateDocumentRequest {
  title: string
  summary?: string
  content: string
  contentHtml: string
  departmentId: number
  categoryId?: number
  tags?: string
  enableWatermark?: boolean
  watermarkText?: string
}

export interface UpdateDocumentRequest {
  title?: string
  summary?: string
  content?: string
  contentHtml?: string
  categoryId?: number
  tags?: string
  enableWatermark?: boolean
  watermarkText?: string
  changeLog?: string
}

export interface LikeResult {
  liked: boolean
  likeCount: number
}

export interface FavoriteResult {
  favorited: boolean
  favoriteCount: number
}

export interface UploadImageResult {
  url: string
  filename: string
}

export interface DocumentListParams {
  page?: number
  size?: number
  keyword?: string
  status?: string
  departmentId?: number
  creatorId?: number
  tag?: string
  sortBy?: string
  sortDir?: string
}

export interface PageResult<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
}

export const getDocumentList = (params: DocumentListParams): Promise<ApiResponse<PageResult<Document>>> => {
  return get<PageResult<Document>>('/documents', params)
}

export const getDocumentDetail = (id: number): Promise<ApiResponse<Document>> => {
  return get<Document>(`/documents/${id}`)
}

export const getDocument = (id: number): Promise<ApiResponse<Document>> => {
  return get<Document>(`/documents/${id}`)
}

export const getMyDocuments = (page = 0, size = 20, status?: string): Promise<ApiResponse<PageResult<Document>>> => {
  return get<PageResult<Document>>('/documents/my', { page, size, status })
}

export const getMyFavorites = (page = 0, size = 20): Promise<ApiResponse<PageResult<Document>>> => {
  return get<PageResult<Document>>('/documents/favorites', { page, size })
}

export const createDocument = (data: CreateDocumentRequest): Promise<ApiResponse<Document>> => {
  return post<Document>('/documents', data)
}

export const updateDocument = (id: number, data: UpdateDocumentRequest): Promise<ApiResponse<Document>> => {
  return put<Document>(`/documents/${id}`, data)
}

export const deleteDocument = (id: number): Promise<ApiResponse<null>> => {
  return del<null>(`/documents/${id}`)
}

export const publishDocument = (id: number): Promise<ApiResponse<Document>> => {
  return post<Document>(`/documents/${id}/publish`)
}

export const getDocumentVersions = (id: number): Promise<ApiResponse<DocumentVersion[]>> => {
  return get<DocumentVersion[]>(`/documents/${id}/versions`)
}

export const getDocumentVersion = (id: number, versionId: number): Promise<ApiResponse<DocumentVersion>> => {
  return get<DocumentVersion>(`/documents/${id}/versions/${versionId}`)
}

export const rollbackVersion = (id: number, versionId: number): Promise<ApiResponse<Document>> => {
  return post<Document>(`/documents/${id}/versions/${versionId}/rollback`)
}

export const getDocumentLinks = (id: number): Promise<ApiResponse<DocumentLink[]>> => {
  return get<DocumentLink[]>(`/documents/${id}/links`)
}

export const getDocumentBacklinks = (id: number): Promise<ApiResponse<Document[]>> => {
  return get<Document[]>(`/documents/${id}/backlinks`)
}

export const likeDocument = (id: number): Promise<ApiResponse<LikeResult>> => {
  return post<LikeResult>(`/documents/${id}/like`)
}

export const favoriteDocument = (id: number): Promise<ApiResponse<FavoriteResult>> => {
  return post<FavoriteResult>(`/documents/${id}/favorite`)
}

export const uploadImage = (file: File): Promise<ApiResponse<UploadImageResult>> => {
  const formData = new FormData()
  formData.append('file', file)
  return upload<UploadImageResult>('/documents/upload-image', formData)
}

export const saveBase64Image = (data: string): Promise<ApiResponse<string>> => {
  return post<string>('/documents/save-base64-image', { data })
}

export const batchDeleteDocuments = (ids: number[]): Promise<ApiResponse<null>> => {
  return del<null>('/documents/batch', ids)
}

export const batchUpdateStatus = (ids: number[], status: string): Promise<ApiResponse<null>> => {
  return put<null>('/documents/batch/status', { ids, status })
}

export const getPopularDocuments = (page = 0, size = 10): Promise<ApiResponse<PageResult<Document>>> => {
  return get<PageResult<Document>>('/documents/popular', { page, size })
}

export const getRecentDocuments = (page = 0, size = 10): Promise<ApiResponse<PageResult<Document>>> => {
  return get<PageResult<Document>>('/documents/recent', { page, size })
}
