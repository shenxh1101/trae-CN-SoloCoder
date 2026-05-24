/**
 * 审批相关类型定义
 */

import type { User } from './user';

/**
 * 审批流接口
 */
export interface Approval {
  /** 审批ID */
  id: number;
  /** 关联文档ID */
  documentId: number;
  /** 关联文档标题 */
  documentTitle: string;
  /** 流程实例ID */
  processInstanceId: string;
  /** 审批状态：PENDING-待审批，APPROVED-已通过，REJECTED-已驳回，CANCELED-已取消 */
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
  /** 审批类型：ALL_SIGN-会签（所有人同意），OR_SIGN-或签（一人同意即可） */
  approvalType: 'ALL_SIGN' | 'OR_SIGN';
  /** 发起人ID */
  initiatorId: number;
  /** 发起人姓名 */
  initiatorName: string;
  /** 当前节点ID */
  currentNodeId: number;
  /** 当前节点名称 */
  currentNodeName: string;
  /** 创建时间（ISO格式） */
  createdAt: string;
  /** 完成时间（ISO格式） */
  completedAt: string | null;
}

/**
 * 审批节点接口
 */
export interface ApprovalNode {
  /** 节点ID */
  id: number;
  /** 关联审批ID */
  approvalId: number;
  /** 节点名称 */
  nodeName: string;
  /** 节点顺序 */
  nodeOrder: number;
  /** 审批人ID列表 */
  approverIds: number[];
  /** 审批人列表 */
  approvers: User[];
  /** 审批类型：ALL_SIGN-会签，OR_SIGN-或签 */
  approvalType: 'ALL_SIGN' | 'OR_SIGN';
  /** 节点状态：PENDING-待处理，APPROVED-已通过，REJECTED-已驳回，SKIPPED-已跳过 */
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  /** 通过时间（ISO格式） */
  approvedAt: string | null;
}

/**
 * 审批记录接口
 */
export interface ApprovalRecord {
  /** 记录ID */
  id: number;
  /** 关联审批ID */
  approvalId: number;
  /** 关联节点ID */
  nodeId: number;
  /** 审批人ID */
  approverId: number;
  /** 审批人姓名 */
  approverName: string;
  /** 操作类型：APPROVE-同意，REJECT-驳回，TRANSFER-转交 */
  action: 'APPROVE' | 'REJECT' | 'TRANSFER';
  /** 审批意见 */
  comment: string;
  /** 创建时间（ISO格式） */
  createdAt: string;
}

/**
 * 提交审批请求接口
 */
export interface SubmitApprovalRequest {
  /** 关联文档ID */
  documentId: number;
  /** 审批类型：ALL_SIGN-会签，OR_SIGN-或签 */
  approvalType: 'ALL_SIGN' | 'OR_SIGN';
  /** 审批人ID列表 */
  approverIds: number[];
  /** 抄送人ID列表 */
  ccIds: number[];
}

/**
 * 审批操作请求接口
 */
export interface ProcessApprovalRequest {
  /** 审批ID */
  approvalId: number;
  /** 操作类型：APPROVE-同意，REJECT-驳回 */
  action: 'APPROVE' | 'REJECT';
  /** 审批意见 */
  comment: string;
}
