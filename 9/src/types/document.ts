/**
 * 文档相关类型定义
 */

import type { User } from './user';

/**
 * 部门接口
 */
export interface Department {
  /** 部门ID */
  id: number;
  /** 部门名称 */
  name: string;
  /** 部门编码 */
  code: string;
  /** 父部门ID */
  parentId: number | null;
  /** 部门路径，如 /总公司/技术部 */
  path: string;
  /** 排序号 */
  sortOrder: number;
  /** 部门描述 */
  description: string;
  /** 创建时间（ISO格式） */
  createdAt: string;
  /** 更新时间（ISO格式） */
  updatedAt: string;
}

/**
 * 权限类型枚举
 * VIEW - 查看权限
 * EDIT - 编辑权限
 * MANAGE - 管理权限
 * DENY - 拒绝权限
 */
export type PermissionType = 'VIEW' | 'EDIT' | 'MANAGE' | 'DENY';

/**
 * 文档接口
 */
export interface Document {
  /** 文档ID */
  id: number;
  /** 文档标题 */
  title: string;
  /** 文档内容（原始格式） */
  content: string;
  /** 文档内容（HTML格式） */
  contentHtml: string;
  /** 内容类型：RICH_TEXT-富文本，MARKDOWN-Markdown */
  contentType: 'RICH_TEXT' | 'MARKDOWN';
  /** 文档摘要 */
  summary: string;
  /** 封面图片URL */
  coverImage: string;
  /** 所属部门ID */
  departmentId: number;
  /** 所属部门名称 */
  departmentName: string;
  /** 创建者ID */
  creatorId: number;
  /** 创建者姓名 */
  creatorName: string;
  /** 文档状态：DRAFT-草稿，PENDING-待审批，PUBLISHED-已发布，REJECTED-已驳回 */
  status: 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED';
  /** 当前版本号 */
  version: number;
  /** 浏览次数 */
  viewCount: number;
  /** 点赞次数 */
  likeCount: number;
  /** 评论次数 */
  commentCount: number;
  /** 标签列表 */
  tags: string[];
  /** 分类ID */
  categoryId: number;
  /** 分类名称 */
  categoryName: string;
  /** 使用的模板ID */
  templateId: number | null;
  /** 是否已删除 */
  isDeleted: boolean;
  /** 删除时间（ISO格式） */
  deletedAt: string | null;
  /** 创建时间（ISO格式） */
  createdAt: string;
  /** 更新时间（ISO格式） */
  updatedAt: string;
  /** 发布时间（ISO格式） */
  publishedAt: string | null;
}

/**
 * 文档版本接口
 */
export interface DocumentVersion {
  /** 版本ID */
  id: number;
  /** 关联文档ID */
  documentId: number;
  /** 版本号 */
  version: number;
  /** 版本标题 */
  title: string;
  /** 版本内容（原始格式） */
  content: string;
  /** 版本内容（HTML格式） */
  contentHtml: string;
  /** 内容类型：RICH_TEXT-富文本，MARKDOWN-Markdown */
  contentType: 'RICH_TEXT' | 'MARKDOWN';
  /** 变更说明 */
  changeLog: string;
  /** 创建者ID */
  creatorId: number;
  /** 创建者姓名 */
  creatorName: string;
  /** 创建时间（ISO格式） */
  createdAt: string;
}

/**
 * 文档链接接口
 */
export interface DocumentLink {
  /** 链接ID */
  id: number;
  /** 源文档ID */
  sourceDocumentId: number;
  /** 源文档标题 */
  sourceDocumentTitle: string;
  /** 目标文档ID */
  targetDocumentId: number;
  /** 目标文档标题 */
  targetDocumentTitle: string;
  /** 链接类型：INTERNAL-内部链接，EXTERNAL-外部链接 */
  linkType: 'INTERNAL' | 'EXTERNAL';
  /** 创建时间（ISO格式） */
  createdAt: string;
}

/**
 * 文档模板接口
 */
export interface DocumentTemplate {
  /** 模板ID */
  id: number;
  /** 模板名称 */
  name: string;
  /** 模板分类 */
  category: string;
  /** 模板内容 */
  content: string;
  /** 内容类型：RICH_TEXT-富文本，MARKDOWN-Markdown */
  contentType: 'RICH_TEXT' | 'MARKDOWN';
  /** 创建者ID */
  creatorId: number;
  /** 是否为系统模板 */
  isSystem: boolean;
  /** 创建时间（ISO格式） */
  createdAt: string;
  /** 更新时间（ISO格式） */
  updatedAt: string;
}

/**
 * 创建文档请求接口
 */
export interface CreateDocumentRequest {
  /** 文档标题 */
  title: string;
  /** 内容类型：RICH_TEXT-富文本，MARKDOWN-Markdown */
  contentType: 'RICH_TEXT' | 'MARKDOWN';
  /** 所属部门ID */
  departmentId: number;
  /** 分类ID */
  categoryId: number;
  /** 使用的模板ID */
  templateId: number | null;
  /** 标签列表 */
  tags: string[];
}

/**
 * 更新文档请求接口
 */
export interface UpdateDocumentRequest {
  /** 文档标题 */
  title: string;
  /** 文档内容 */
  content: string;
  /** 内容类型：RICH_TEXT-富文本，MARKDOWN-Markdown */
  contentType: 'RICH_TEXT' | 'MARKDOWN';
  /** 标签列表 */
  tags: string[];
  /** 分类ID */
  categoryId: number;
  /** 变更说明 */
  changeLog: string;
}

/**
 * 文档权限接口
 */
export interface DocumentPermission {
  /** 权限ID */
  id: number;
  /** 关联文档ID */
  documentId: number;
  /** 关联用户ID（用户权限时使用） */
  userId: number | null;
  /** 关联部门ID（部门权限时使用） */
  departmentId: number | null;
  /** 关联用户信息 */
  user: User | null;
  /** 关联部门信息 */
  department: Department | null;
  /** 权限类型 */
  permissionType: PermissionType;
  /** 是否为继承权限 */
  isInherited: boolean;
  /** 创建时间（ISO格式） */
  createdAt: string;
}
