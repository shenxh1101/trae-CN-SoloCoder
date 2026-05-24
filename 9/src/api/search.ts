import { get, type ApiResponse } from './request'

export interface SearchRequest {
  keyword: string
  page?: number
  size?: number
  departmentId?: number
  categoryId?: number
  creatorId?: number
  status?: string
  tag?: string
  sortBy?: 'RELEVANCE' | 'CREATED_AT' | 'UPDATED_AT' | 'VIEW_COUNT' | 'LIKE_COUNT'
  sortDir?: 'ASC' | 'DESC'
  highlight?: boolean
  fragmentSize?: number
}

export interface SearchHit {
  id: number
  title: string
  summary: string
  content: string
  departmentId: number
  departmentName: string
  categoryId: number
  categoryName: string
  creatorId: number
  creatorName: string
  status: string
  tags: string
  viewCount: number
  likeCount: number
  commentCount: number
  score: number
  highlightTitle: string
  highlightSummary: string
  highlightContent: string
  createdAt: string
  updatedAt: string
}

export interface SearchResult {
  content: SearchHit[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
  suggestions: string[]
  searchTime: number
}

export const search = (params: SearchRequest): Promise<ApiResponse<SearchResult>> => {
  return get<SearchResult>('/search', {
    keyword: params.keyword,
    page: params.page,
    size: params.size
  })
}

export const quickSearch = (keyword: string, size = 10): Promise<ApiResponse<SearchResult>> => {
  return get<SearchResult>('/search', { keyword, size })
}

export const getSearchSuggestions = (keyword: string, size = 10): Promise<ApiResponse<string>> => {
  return get<string>('/search/suggest', { keyword })
}

export const searchByCategory = (
  categoryId: number,
  keyword: string,
  page = 0,
  size = 20
): Promise<ApiResponse<SearchResult>> => {
  return get<SearchResult>('/search', { keyword, page, size })
}

export const searchByDepartment = (
  departmentId: number,
  keyword: string,
  page = 0,
  size = 20
): Promise<ApiResponse<SearchResult>> => {
  return get<SearchResult>('/search', { keyword, page, size })
}
