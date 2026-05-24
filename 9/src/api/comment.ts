import { get, post, put, del, type ApiResponse, type PaginationParams, type PaginationResult } from './request'

export interface Comment {
  id: string
  documentId: string
  content: string
  parentId: string | null
  userId: string
  username: string
  userAvatar: string
  likeCount: number
  isLiked: boolean
  createdAt: string
  updatedAt: string
  replies?: Comment[]
}

export interface CommentListParams extends PaginationParams {
  documentId: string
}

export interface CreateCommentParams {
  documentId: string
  content: string
  parentId?: string
}

export interface UpdateCommentParams {
  id: string
  content: string
}

export const getComments = (params: CommentListParams): Promise<ApiResponse<PaginationResult<Comment>>> => {
  return get<PaginationResult<Comment>>('/comment/list', params)
}

export const createComment = (params: CreateCommentParams): Promise<ApiResponse<Comment>> => {
  return post<Comment>('/comment', params)
}

export const updateComment = (params: UpdateCommentParams): Promise<ApiResponse<Comment>> => {
  return put<Comment>(`/comment/${params.id}`, params)
}

export const deleteComment = (id: string): Promise<ApiResponse<null>> => {
  return del<null>(`/comment/${id}`)
}

export const likeComment = (id: string): Promise<ApiResponse<{ likeCount: number; isLiked: boolean }>> => {
  return post<{ likeCount: number; isLiked: boolean }>(`/comment/${id}/like`)
}
