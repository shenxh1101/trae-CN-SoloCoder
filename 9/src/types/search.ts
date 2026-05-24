/**
 * 搜索相关类型定义
 */

/**
 * 搜索排序方式
 * RELEVANCE - 按相关度排序
 * NEWEST - 按最新时间排序
 * MOST_VIEWED - 按浏览量排序
 * MOST_LIKED - 按点赞量排序
 */
export type SearchSortBy = 'RELEVANCE' | 'NEWEST' | 'MOST_VIEWED' | 'MOST_LIKED';

/**
 * 搜索请求接口
 */
export interface SearchRequest {
  /** 搜索关键词 */
  keyword: string;
  /** 部门ID筛选 */
  departmentId?: number;
  /** 分类ID筛选 */
  categoryId?: number;
  /** 内容类型筛选：RICH_TEXT-富文本，MARKDOWN-Markdown */
  contentType?: 'RICH_TEXT' | 'MARKDOWN';
  /** 创建者ID筛选 */
  creatorId?: number;
  /** 开始日期（ISO格式） */
  dateFrom?: string;
  /** 结束日期（ISO格式） */
  dateTo?: string;
  /** 排序方式 */
  sortBy?: SearchSortBy;
  /** 页码，从1开始 */
  page: number;
  /** 每页条数 */
  pageSize: number;
}

/**
 * 搜索结果接口
 */
export interface SearchResult {
  /** 文档ID */
  documentId: number;
  /** 文档标题 */
  title: string;
  /** 标题高亮（带HTML标签） */
  titleHighlight: string;
  /** 文档摘要 */
  summary: string;
  /** 摘要高亮（带HTML标签） */
  summaryHighlight: string;
  /** 内容类型：RICH_TEXT-富文本，MARKDOWN-Markdown */
  contentType: 'RICH_TEXT' | 'MARKDOWN';
  /** 所属部门ID */
  departmentId: number;
  /** 所属部门名称 */
  departmentName: string;
  /** 创建者姓名 */
  creatorName: string;
  /** 标签列表 */
  tags: string[];
  /** 浏览次数 */
  viewCount: number;
  /** 点赞次数 */
  likeCount: number;
  /** 搜索评分 */
  score: number;
  /** 更新时间（ISO格式） */
  updatedAt: string;
}
