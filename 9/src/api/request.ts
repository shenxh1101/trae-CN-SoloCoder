import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
  timestamp?: number
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginationResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data
    
    if (res.code === 200) {
      return response
    }
    
    if (res.code === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
      return Promise.reject(new Error(res.message || '登录已过期'))
    }
    
    if (res.code === 403) {
      return Promise.reject(new Error(res.message || '没有权限'))
    }
    
    if (res.code === 404) {
      return Promise.reject(new Error(res.message || '资源不存在'))
    }
    
    if (res.code === 500) {
      return Promise.reject(new Error(res.message || '服务器内部错误'))
    }
    
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  (error) => {
    console.error('Response error:', error)
    
    if (error.response) {
      const status = error.response.status
      
      if (status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(new Error('登录已过期，请重新登录'))
      }
      
      if (status === 403) {
        return Promise.reject(new Error('没有权限访问'))
      }
      
      if (status === 404) {
        return Promise.reject(new Error('请求的资源不存在'))
      }
      
      if (status >= 500) {
        return Promise.reject(new Error('服务器错误，请稍后重试'))
      }
      
      const message = error.response.data?.message || error.message || '请求失败'
      return Promise.reject(new Error(message))
    }
    
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('请求超时，请稍后重试'))
    }
    
    if (error.message.includes('Network Error')) {
      return Promise.reject(new Error('网络错误，请检查网络连接'))
    }
    
    return Promise.reject(new Error(error.message || '网络错误'))
  }
)

export const request = <T = unknown>(config: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  return service.request<ApiResponse<T>>(config).then((res) => res.data)
}

export const get = <T = unknown>(url: string, params?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  return request<T>({ method: 'GET', url, params, ...config })
}

export const post = <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  return request<T>({ method: 'POST', url, data, ...config })
}

export const put = <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  return request<T>({ method: 'PUT', url, data, ...config })
}

export const del = <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  return request<T>({ method: 'DELETE', url, data, ...config })
}

export const patch = <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  return request<T>({ method: 'PATCH', url, data, ...config })
}

export const upload = <T = unknown>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  return request<T>({
    method: 'POST',
    url,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    ...config
  })
}

export default service
