import { get, post, type ApiResponse } from './request'
import type { PageResult } from './document'

export interface Approval {
  id: number
  documentId: number
  documentTitle: string
  applyReason: string
  priority: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED' | 'TIMEOUT'
  currentNodeId: number
  submitterId: number
  submitterName: string
  submittedAt: string
  completedAt: string
  createdAt: string
  updatedAt: string
}

export interface ApprovalNode {
  id: number
  approvalId: number
  nodeId: number
  nodeName: string
  approverId: number
  approverName: string
  type: 'ALL' | 'ANY' | 'ONE'
  status: 'WAITING' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED'
  comment: string
  signImage: string
  completed: boolean
  processedAt: string
  orderedIndex: number
}

export interface ApprovalRecord {
  id: number
  approvalId: number
  nodeId: number
  nodeName: string
  approverId: number
  approverName: string
  action: 'APPROVED' | 'REJECTED' | 'SKIPPED' | 'CANCELED'
  comment: string
  signImage: string
  processedAt: string
  duration: number
}

export interface SubmitApprovalRequest {
  documentId: number
  applyReason: string
  priority?: number
  nodes: ApprovalNodeConfig[]
}

export interface ApprovalNodeConfig {
  nodeName: string
  approverId: number
  approverName: string
  type: 'ALL' | 'ANY' | 'ONE'
  orderedIndex: number
}

export interface ProcessApprovalRequest {
  approvalId: number
  action: 'APPROVED' | 'REJECTED'
  comment?: string
  signImage?: string
}

export interface ApprovalDetailResponse {
  approval: Approval
  nodes: ApprovalNode[]
  records: ApprovalRecord[]
}

export interface ApprovalStatistics {
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  submittedCount: number
}

export const submitApproval = (data: SubmitApprovalRequest): Promise<ApiResponse<Approval>> => {
  return post<Approval>('/approvals', data)
}

export const processApproval = (data: ProcessApprovalRequest): Promise<ApiResponse<Approval>> => {
  return post<Approval>('/approvals/process', data)
}

export const cancelApproval = (id: number): Promise<ApiResponse<Approval>> => {
  return post<Approval>(`/approvals/${id}/cancel`)
}

export const getApprovalDetail = (id: number): Promise<ApiResponse<ApprovalDetailResponse>> => {
  return get<ApprovalDetailResponse>(`/approvals/${id}`)
}

export const getPendingApprovals = (page = 0, size = 20): Promise<ApiResponse<PageResult<Approval>>> => {
  return get<PageResult<Approval>>('/approvals/pending', { page, size })
}

export const getMySubmittedApprovals = (page = 0, size = 20): Promise<ApiResponse<PageResult<Approval>>> => {
  return get<PageResult<Approval>>('/approvals/initiated', { page, size })
}

export const getMyApprovedApprovals = (page = 0, size = 20): Promise<ApiResponse<PageResult<Approval>>> => {
  return get<PageResult<Approval>>('/approvals/history', { page, size })
}

export const getApprovalStatistics = (): Promise<ApiResponse<ApprovalStatistics>> => {
  return get<ApprovalStatistics>('/approvals/stats')
}

export const getApprovalList = (params: {
  page?: number
  size?: number
  status?: string
  documentId?: number
}): Promise<ApiResponse<PageResult<Approval>>> => {
  return get<PageResult<Approval>>('/approvals', params)
}
