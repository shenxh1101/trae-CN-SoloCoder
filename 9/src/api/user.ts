import { get, post, put, del, type ApiResponse, type PaginationParams, type PaginationResult } from './request'

export interface User {
  id: string
  username: string
  nickname: string
  email: string
  phone: string
  avatar: string
  role: string
  status: number
  departmentId: string
  departmentName: string
  createdAt: string
  updatedAt: string
}

export interface UserListParams extends PaginationParams {
  keyword?: string
  role?: string
  status?: number
  departmentId?: string
}

export interface CreateUserParams {
  username: string
  password: string
  nickname: string
  email: string
  phone?: string
  role: string
  departmentId: string
}

export interface UpdateUserParams {
  id: string
  nickname?: string
  email?: string
  phone?: string
  role?: string
  status?: number
  departmentId?: string
  password?: string
}

export const getUserList = (params: UserListParams): Promise<ApiResponse<PaginationResult<User>>> => {
  return get<PaginationResult<User>>('/user/list', params)
}

export const getUserDetail = (id: string): Promise<ApiResponse<User>> => {
  return get<User>(`/user/${id}`)
}

export const createUser = (params: CreateUserParams): Promise<ApiResponse<User>> => {
  return post<User>('/user', params)
}

export const updateUser = (params: UpdateUserParams): Promise<ApiResponse<User>> => {
  return put<User>(`/user/${params.id}`, params)
}

export const deleteUser = (id: string): Promise<ApiResponse<null>> => {
  return del<null>(`/user/${id}`)
}
