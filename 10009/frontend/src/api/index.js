import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

request.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  response => response.data,
  error => Promise.reject(error)
)

export const sendCode = (phone) => request.post('/auth/send-code', { phone })
export const login = (phone, code) => request.post('/auth/login', { phone, code })
export const getProfile = () => request.get('/user/profile')
export const getPrizes = () => request.get('/prizes')
export const draw = () => request.post('/user/draw')
export const getMyRecords = () => request.get('/user/my-records')
export const getRecentRecords = () => request.get('/records/recent')

export const adminGetPrizes = () => request.get('/admin/prizes')
export const adminCreatePrize = (data) => request.post('/admin/prizes', data)
export const adminUpdatePrize = (id, data) => request.put(`/admin/prizes/${id}`, data)
export const adminDeletePrize = (id) => request.delete(`/admin/prizes/${id}`)
export const adminGetRecords = (params) => request.get('/admin/records', { params })
export const exportRecords = () => request.get('/admin/records/export', { responseType: 'blob' })
export const validateProbability = () => request.post('/admin/prizes/validate-probability')

export default request
