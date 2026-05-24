import { get, type ApiResponse } from './request'

export interface WeeklyRankingItem {
  rank: number
  documentId: string
  documentTitle: string
  category: string
  viewCount: number
  likeCount: number
  commentCount: number
  score: number
  creatorName: string
}

export interface CategoryRankingItem {
  rank: number
  category: string
  categoryName: string
  documentCount: number
  viewCount: number
  likeCount: number
  score: number
}

export const getWeeklyRanking = (): Promise<ApiResponse<WeeklyRankingItem[]>> => {
  return get<WeeklyRankingItem[]>('/ranking/weekly')
}

export const getCategoryRanking = (): Promise<ApiResponse<CategoryRankingItem[]>> => {
  return get<CategoryRankingItem[]>('/ranking/category')
}
