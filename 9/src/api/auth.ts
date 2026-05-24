import { post, get, type ApiResponse } from './request'

export interface LoginParams {
  username: string
  password: string
}

export interface LdapLoginParams {
  username: string
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
  userInfo: UserInfo
}

export interface UserInfo {
  id: number
  username: string
  realName: string
  email: string
  phone: string
  avatar: string
  departmentId: number | null
  departmentName: string | null
  position: string
  isAdmin: boolean
}

export interface RefreshTokenParams {
  refreshToken: string
}

export interface RefreshTokenResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

export const login = (params: LoginParams): Promise<ApiResponse<LoginResult>> => {
  return post<LoginResult>('/auth/login', params)
}

export const logout = (): Promise<ApiResponse<null>> => {
  return post<null>('/auth/logout')
}

export const getUserInfo = (): Promise<ApiResponse<UserInfo>> => {
  return get<UserInfo>('/auth/user-info')
}

export const refreshToken = (params: RefreshTokenParams): Promise<ApiResponse<RefreshTokenResult>> => {
  return post<RefreshTokenResult>('/auth/refresh-token', params)
}

export const ldapLogin = (params: LdapLoginParams): Promise<ApiResponse<LoginResult>> => {
  return post<LoginResult>('/auth/ldap-login', null, { params })
}

export const register = (params: { username: string; password: string; realName: string; email?: string; phone?: string }): Promise<ApiResponse<LoginResult>> => {
  return post<LoginResult>('/auth/register', params)
}

export const validateToken = (token: string): Promise<ApiResponse<boolean>> => {
  return get<boolean>('/auth/validate', { token })
}
