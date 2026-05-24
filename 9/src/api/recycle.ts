import { get, post, del, type ApiResponse, type PaginationParams, type PaginationResult } from './request'

export interface RecycleItem {
  id: string
  documentId: string
  documentTitle: string
  category: string
  deleterId: string
  deleterName: string
  deletedAt: string
  expireAt: string
}

export interface RecycleListParams extends PaginationParams {
  keyword?: string
  category?: string
  startDate?: string
  endDate?: string
}

export const getRecycleList = (params: RecycleListParams): Promise<ApiResponse<PaginationResult<RecycleItem>>> => {
  return get<PaginationResult<RecycleItem>>('/recycle/list', params)
}

export const restoreDocument = (id: string): Promise<ApiResponse<null>> => {
  return post<null>(`/recycle/${id}/restore`)
}

export const permanentlyDelete = (id: string): Promise<ApiResponse<null>> => {
  return del<null>(`/recycle/${id}`)
}

export const clearExpired = (): Promise<ApiResponse<{ count: number }>> => {
  return post<{ count: number }>('/recycle/clear-expired')
}
