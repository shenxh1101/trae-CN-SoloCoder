import { get, post, put, del, type ApiResponse } from './request'

export interface DocumentPermission {
  id: string
  documentId: string
  targetType: 'user' | 'department' | 'role'
  targetId: string
  targetName: string
  permission: 'read' | 'write' | 'admin'
  createdAt: string
}

export interface DepartmentPermission {
  id: string
  departmentId: string
  targetType: 'user' | 'department' | 'role'
  targetId: string
  targetName: string
  permission: 'read' | 'write' | 'admin'
  createdAt: string
}

export interface SetDocumentPermissionParams {
  documentId: string
  targetType: 'user' | 'department' | 'role'
  targetId: string
  permission: 'read' | 'write' | 'admin'
}

export interface SetDepartmentPermissionParams {
  departmentId: string
  targetType: 'user' | 'department' | 'role'
  targetId: string
  permission: 'read' | 'write' | 'admin'
}

export const getDocumentPermissions = (documentId: string): Promise<ApiResponse<DocumentPermission[]>> => {
  return get<DocumentPermission[]>(`/permission/document/${documentId}`)
}

export const setDocumentPermission = (params: SetDocumentPermissionParams): Promise<ApiResponse<DocumentPermission>> => {
  return post<DocumentPermission>('/permission/document', params)
}

export const deleteDocumentPermission = (id: string): Promise<ApiResponse<null>> => {
  return del<null>(`/permission/document/${id}`)
}

export const getDepartmentPermissions = (departmentId: string): Promise<ApiResponse<DepartmentPermission[]>> => {
  return get<DepartmentPermission[]>(`/permission/department/${departmentId}`)
}

export const setDepartmentPermission = (params: SetDepartmentPermissionParams): Promise<ApiResponse<DepartmentPermission>> => {
  return post<DepartmentPermission>('/permission/department', params)
}
