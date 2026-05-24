import { get, post, put, del, type ApiResponse, type PaginationParams, type PaginationResult } from './request'
import type { User } from './user'

export interface Department {
  id: string
  name: string
  code: string
  parentId: string | null
  parentName: string | null
  sort: number
  leaderId: string | null
  leaderName: string | null
  memberCount: number
  createdAt: string
  updatedAt: string
  children?: Department[]
}

export interface DepartmentListParams extends PaginationParams {
  keyword?: string
  parentId?: string
}

export interface DepartmentMemberParams extends PaginationParams {
  departmentId: string
  keyword?: string
}

export interface CreateDepartmentParams {
  name: string
  code: string
  parentId?: string
  sort?: number
  leaderId?: string
}

export interface UpdateDepartmentParams {
  id: string
  name?: string
  code?: string
  parentId?: string
  sort?: number
  leaderId?: string
}

export const getDepartmentTree = (): Promise<ApiResponse<Department[]>> => {
  return get<Department[]>('/department/tree')
}

export const getDepartmentList = (params: DepartmentListParams): Promise<ApiResponse<PaginationResult<Department>>> => {
  return get<PaginationResult<Department>>('/department/list', params)
}

export const getDepartmentMembers = (params: DepartmentMemberParams): Promise<ApiResponse<PaginationResult<User>>> => {
  return get<PaginationResult<User>>(`/department/${params.departmentId}/members`, params)
}

export const createDepartment = (params: CreateDepartmentParams): Promise<ApiResponse<Department>> => {
  return post<Department>('/department', params)
}

export const updateDepartment = (params: UpdateDepartmentParams): Promise<ApiResponse<Department>> => {
  return put<Department>(`/department/${params.id}`, params)
}

export const deleteDepartment = (id: string): Promise<ApiResponse<null>> => {
  return del<null>(`/department/${id}`)
}
